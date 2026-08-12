import { createClient } from 'redis';
import { Resend } from 'resend';

// This function receives a webhook from Ko-fi after a purchase
// and stores the transaction ID in a temporary database (Vercel Redis).
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables for Resend
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error('Server configuration error: Missing Resend environment variables.');
        // Still return 200 to Ko-fi, but log the error. The purchase is still valid.
        return response.status(200).json({ message: 'Webhook received, but server email config is incomplete.' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await redis.connect();
        console.log('Ko-fi Webhook received raw body:', request.body);
        const kofiData = JSON.parse(request.body.data);

        if (kofiData.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        if ((kofiData.type === 'Shop' || kofiData.type === 'Shop Order') && kofiData.shop_items && kofiData.shop_items.length > 0) {
            const transactionId = kofiData.kofi_transaction_id;
            const buyerEmail = kofiData.email;
            const productName = kofiData.shop_items[0].item_name; // Get product name for better logging
            const linkCode = kofiData.shop_items[0].direct_link_code;

            if (transactionId && buyerEmail && linkCode) {
                const tutorLinkCodes = {
                    'kevin': ['a4c28eaeee', 'e0c959c5a6', 'd7b16e8c8c'],
                    'calvina': ['926297d50a', 'ebb17c203b', '4cc0c5c6d7']
                };

                let tutorName = null;
                if (tutorLinkCodes.kevin.includes(linkCode)) {
                    tutorName = 'kevin';
                } else if (tutorLinkCodes.calvina.includes(linkCode)) {
                    tutorName = 'calvina';
                }

                if (tutorName) {
                    console.log(`Ko-fi Webhook: Processing purchase for ${productName} (${tutorName}). Transaction ID: ${transactionId}, Buyer Email: ${buyerEmail}`);
                    // Store purchase details in Redis, expiring in 90 days.
                    const purchaseDetails = JSON.stringify({ tutor: tutorName, email: buyerEmail });
                    await redis.set(transactionId, purchaseDetails, { EX: 3600 * 24 * 90 });

                    const scheduleUrl = `https://language-tutoring-liard.vercel.app/schedule.html?tutor=${tutorName}&transactionId=${transactionId}`;
                    
                    try {
                        await resend.emails.send({
                            from: process.env.RESEND_FROM_EMAIL,
                            to: [buyerEmail],
                            subject: 'Your Lesson is Ready to be Scheduled!',
                            html: `<h1>Thank you for your purchase!</h1>
                                   <p>You can schedule your lesson with ${tutorName.charAt(0).toUpperCase() + tutorName.slice(1)} by clicking the link below:</p>
                                   <p><a href="${scheduleUrl}">Schedule Your Lesson</a></p>
                                   <p>This link is valid for 90 days and can only be used once.</p>
                                   <p>If you have any questions, please reply to this email.</p>
                                   <p>Thank you,<br>The Polyglot Hub</p>`
                        });
                        console.log(`Successfully sent scheduling email to ${buyerEmail} for tutor ${tutorName}.`);
                    } catch (emailError) {
                        console.error({
                            message: 'CRITICAL: Failed to send scheduling email via Resend.',
                            buyerEmail: buyerEmail,
                            transactionId: transactionId,
                            error: emailError
                        });
                        // Don't fail the webhook for an email error, just log it. The purchase is still valid in Redis.
                    }
                } else {
                    console.warn(`Ko-fi Webhook: Could not find tutor for shop item with link code: ${linkCode}. Transaction ID: ${transactionId}, Product: ${productName}`);
                }
            } else {
                console.warn(`Ko-fi Webhook: Missing critical data (transaction ID, email, or link code) in payload. Full data: ${JSON.stringify(kofiData)}`);
            }
        }

        response.status(200).json({ message: 'Webhook received successfully.' });

    } catch (error) {
        console.error('Error processing Ko-fi webhook:', error);
        response.status(500).json({ error: 'Failed to process webhook.' });
    } finally {
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}