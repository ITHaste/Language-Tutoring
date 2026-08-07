// This is a Vercel Serverless Function for handling contact form submissions.
// It will be accessible at /api/contact
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
    // Only allow POST requests for security
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, message } = request.body;

        // Basic validation
        if (!name || !email || !message) {
            return response.status(400).json({ error: 'All fields are required.' });
        }

        // Send the email using Resend
        const { data, error } = await resend.emails.send({
            from: 'Polyglot Hub Contact Form <onboarding@resend.dev>', // The "from" address for testing
            to: ['djkevin3107@gmail.com'], // <-- IMPORTANT: Change this to your actual email address
            subject: `New Message from ${name} on Polyglot Hub`,
            reply_to: email, // Set the user's email as the reply-to address
            html: `
                <p>You have a new contact form submission:</p>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `,
        });

        if (error) {
            return response.status(400).json({ error: error.message });
        }

        response.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Server error:', error);
        response.status(500).json({ error: 'Failed to send message.' });
    }
}