// This is a Vercel Serverless Function for handling contact form submissions.
// It will be accessible at /api/contact
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
    // Only allow POST requests for security
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error('Server configuration error: Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variables.');
        return response.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }
    try {
        const { name, email, message } = request.body;

        // Log the incoming data for debugging in Vercel
        console.log('Received submission:', { name, email });

        // Basic validation
        if (!name || !email || !message) {
            return response.status(400).json({ error: 'All fields are required.' });
        }

        console.log('Attempting to send email via Resend...');
        // Send the email using Resend
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL, // Use the configured "from" email for consistency
            to: ['contact@thepolyglothub.com'], // Send to your official contact email
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
            // Log the detailed error from Resend to see what's wrong
            console.error('Resend API Error:', JSON.stringify(error, null, 2));
            return response.status(400).json({ error: error.message });
        }

        console.log('Email sent successfully! ID:', data.id);
        response.status(200).json({ message: 'Message sent successfully!', id: data.id });
    } catch (error) {
        console.error('Server error:', error);
        response.status(500).json({ error: 'A server error occurred.' });
    }
}