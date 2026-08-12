import { createClient } from 'redis';
import { Resend } from 'resend';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error('Server configuration error: Missing Resend environment variables.');
        return response.status(500).json({ error: 'Server is not configured correctly. Please contact support.' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await redis.connect();
        const { transactionId } = request.body;

        if (!transactionId) {
            return response.status(400).json({ error: 'Transaction ID is required.' });
        }

        const purchaseData = await redis.get(transactionId);

        if (!purchaseData) {
            return response.status(404).json({ error: 'Transaction ID not found. It may be invalid, or the lesson may have already been scheduled.' });
        }

        // Data is stored as a JSON string: { tutor: '...', email: '...' }
        const { tutor, email } = JSON.parse(purchaseData);
        const tutorName = tutor.charAt(0).toUpperCase() + tutor.slice(1);

        if (!tutor || !email) {
            // This might happen if the data format in Redis is old or corrupted
            console.error(`Corrupted data in Redis for transactionId: ${transactionId}`);
            return response.status(500).json({ error: 'Could not retrieve purchase details. Please contact support.' });
        }

        const scheduleUrl = `https://language-tutoring-liard.vercel.app/schedule.html?tutor=${tutor}&transactionId=${transactionId}`;

        // Resend the email
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: [email],
            subject: 'Your Lesson Scheduling Link (Resent)',
            html: `<h1>Here is your scheduling link!</h1>
                   <p>As requested, we are resending the link to schedule your lesson with ${tutorName}. After you schedule, your tutor will send a Google Meet invitation to your email.</p>
                   <p><a href="${scheduleUrl}">Schedule Your Lesson</a></p>
                   <p>This link is valid for 90 days from purchase and can only be used once.</p>
                   <p>If you have any questions, please reply to this email.</p>
                   <p>Thank you,<br>The Polyglot Hub</p>`,
        });

        console.log(`Successfully resent scheduling email to ${email} for transaction ${transactionId}.`);
        return response.status(200).json({ message: `An email has been sent to the address used for purchase. Please check your inbox.` });

    } catch (error) {
        console.error('Error in resend-link endpoint:', error);
        return response.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
    } finally {
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}