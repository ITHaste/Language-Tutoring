import { createClient } from 'redis';
import { Resend } from 'resend';

// This function receives a webhook from Trakteer after a purchase
// and stores the transaction ID in a temporary database (Vercel Redis).
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables
    if (!process.env.TRAKTEER_VERIFICATION_TOKEN) {
        console.error('Server configuration error: Missing TRAKTEER_VERIFICATION_TOKEN environment variable.');
        // Return 200 to Trakteer to prevent retries, but log the server-side error.
        return response.status(200).json({ message: 'Webhook received, but server is not configured.' });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error('Server configuration error: Missing Resend environment variables.');
        return response.status(200).json({ message: 'Webhook received, but server email config is incomplete.' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await redis.connect();
        console.log('--- TRAKTEER WEBHOOK RECEIVED ---');
        console.log('HEADERS:', JSON.stringify(request.headers, null, 2));
        console.log('RAW BODY:', JSON.stringify(request.body, null, 2));

        let trakteerData;

        // Scenario 1: Vercel has already parsed the JSON body because Content-Type was application/json.
        if (typeof request.body === 'object' && request.body !== null && !request.body.data) {
            console.log('Interpreting body as pre-parsed JSON.');
            trakteerData = request.body;
        } 
        // Scenario 2: Body is form-urlencoded, with a 'data' field (like Ko-fi).
        else if (request.body && typeof request.body.data === 'string') {
            console.log("Interpreting body as form-urlencoded with a 'data' field.");
            try {
                trakteerData = JSON.parse(request.body.data);
            } catch (e) {
                console.error('Failed to parse request.body.data JSON string:', e);
                console.error('request.body.data was:', request.body.data);
                return response.status(400).json({ error: 'Invalid JSON in data field.' });
            }
        } 
        // Fallback for other unexpected formats
        else {
            console.error('Unrecognized webhook body format. Could not find data to process.');
            return response.status(400).json({ error: 'Unrecognized body format.' });
        }

        console.log('PARSED TRAKTEER DATA:', JSON.stringify(trakteerData, null, 2));

        // 1. VERIFY THE WEBHOOK
        // Trakteer sends the verification token in the 'x-webhook-token' header.
        const token = request.headers['x-webhook-token'];
        if (token !== process.env.TRAKTEER_VERIFICATION_TOKEN) {
            console.warn(`Unauthorized Trakteer webhook attempt. Token received: ${token}`);
            return response.status(401).json({ error: 'Unauthorized' });
        }

        // 2. PROCESS THE PURCHASE
        // IMPORTANT: The payload structure below is an assumption based on common patterns.
        // You MUST check Trakteer's documentation and adjust field names like `order_id`, `items`, etc.
        if (trakteerData.type === 'treat' && trakteerData.items && trakteerData.items.length > 0) {
            const transactionId = trakteerData.order_id;
            const buyerEmail = trakteerData.email;
            const firstItem = trakteerData.items[0];
            const itemId = firstItem.item_id;
            const itemName = firstItem.item_name;

            if (transactionId && buyerEmail && itemId) {
                // TODO: Replace placeholder IDs with your actual Trakteer Item IDs from your dashboard.
                const trakteerItemToTutor = {
                    // --- Kevin's Items ---
                    'TRAKTEER_KEVIN_TRIAL_ID': 'kevin',
                    'TRAKTEER_KEVIN_5_PACK_ID': 'kevin',
                    'TRAKTEER_KEVIN_10_PACK_ID': 'kevin',
                    // --- Calvina's Items ---
                    'TRAKTEER_CALVINA_TRIAL_ID': 'calvina',
                    'TRAKTEER_CALVINA_5_PACK_ID': 'calvina',
                    'TRAKTEER_CALVINA_10_PACK_ID': 'calvina',
                };

                const tutorName = trakteerItemToTutor[itemId];

                if (tutorName) {
                    console.log(`Trakteer Webhook: Processing purchase for ${itemName} (${tutorName}). Order ID: ${transactionId}, Buyer Email: ${buyerEmail}`);
                    
                    // Store purchase details in Redis, expiring in 90 days.
                    const purchaseDetails = JSON.stringify({ tutor: tutorName, email: buyerEmail });
                    await redis.set(transactionId, purchaseDetails, { EX: 3600 * 24 * 90 });

                    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                    const scheduleUrl = `${baseUrl}/schedule?tutor=${tutorName}&transactionId=${transactionId}`;

                    try {
                        await resend.emails.send({
                            from: process.env.RESEND_FROM_EMAIL,
                            to: [buyerEmail],
                            subject: 'Your Lesson is Ready to be Scheduled!',
                            html: `<h1>Thank you for your purchase!</h1><p>You can schedule your lesson with ${tutorName.charAt(0).toUpperCase() + tutorName.slice(1)} by clicking the link below. After you schedule, your tutor will send a Google Meet invitation to your email.</p><p><a href="${scheduleUrl}">Schedule Your Lesson</a></p><p>This link is valid for 90 days and can only be used once.</p><p>If you have any questions, please reply to this email.</p><p>Thank you,<br>The Polyglot Hub</p>`,
                        });
                        console.log(`Successfully sent scheduling email to ${buyerEmail} for tutor ${tutorName}.`);
                    } catch (emailError) {
                        console.error({ message: 'CRITICAL: Failed to send scheduling email via Resend for Trakteer purchase.', buyerEmail, transactionId, error: emailError });
                    }
                } else {
                    console.warn(`Trakteer Webhook: Could not find tutor for item ID: ${itemId}. Order ID: ${transactionId}, Item Name: ${itemName}`);
                }
            } else {
                console.warn(`Trakteer Webhook: Missing critical data (order_id, email, or item_id) in payload. Full data: ${JSON.stringify(trakteerData)}`);
            }
        }

        response.status(200).json({ message: 'Webhook received successfully.' });

    } catch (error) {
        console.error('Error processing Trakteer webhook:', error);
        return response.status(500).json({ error: 'Failed to process webhook due to an internal error.' });
    } finally {
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}