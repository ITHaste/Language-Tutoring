// This is a Vercel Serverless Function for handling contact form submissions.
// It will be accessible at /api/contact

export default async function handler(request, response) {
    // Only allow POST requests for security
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, message } = request.body;

        // Basic validation
        if (!name || !email || !message) {
            return response.status(400).json({ message: 'All fields are required.' });
        }

        // --- In a real application, you would integrate with an email service here ---
        // Example: Using a service like SendGrid, Mailgun, or Nodemailer
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(process.env.SENDGRID_API_KEY); // API key stored as Vercel Environment Variable
        // await sgMail.send({
        //     to: 'your-email@example.com',
        //     from: 'noreply@yourdomain.com',
        //     subject: `New Contact Form Submission from ${name}`,
        //     html: `<p>Name: ${name}</p><p>Email: ${email}</p><p>Message: ${message}</p>`,
        // });

        response.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending message:', error);
        response.status(500).json({ message: 'Failed to send message.', error: error.message });
    }
}