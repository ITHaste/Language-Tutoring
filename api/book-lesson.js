import { Resend } from 'resend';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables
    if (!process.env.RESEND_API_KEY || !process.env.TUTOR_EMAIL || !process.env.RESEND_FROM_EMAIL) {
        console.error('Missing RESEND_API_KEY, TUTOR_EMAIL, or RESEND_FROM_EMAIL environment variables.');
        return response.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const tutorEmail = process.env.TUTOR_EMAIL;

    try {
        const { email, selectedTime, tutor } = request.body;

        if (!email || !selectedTime || !tutor) {
            return response.status(400).json({ error: 'Email, selected time, and tutor are required.' });
        }

        const bookingDate = new Date(selectedTime);
        const formattedDate = bookingDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'long',
        });

        const tutorName = tutor.charAt(0).toUpperCase() + tutor.slice(1);

        // Send email to the tutor
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL, // Must be a verified domain on Resend.
            to: [tutorEmail], // Your email address to receive notifications
            subject: `New Lesson Booking for ${tutorName}!`,
            html: `<h1>New Lesson Booking for ${tutorName}</h1><p>A student has requested a lesson at the following time:</p><ul><li><strong>Tutor:</strong> ${tutorName}</li><li><strong>Student Email:</strong> ${email}</li><li><strong>Requested Time:</strong> ${formattedDate}</li></ul><p>Please reach out to them to confirm and send a calendar invitation.</p>`,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return response.status(500).json({ error: 'Failed to send booking notification.' });
        }

        return response.status(200).json({ message: 'Booking successful! Your tutor has been notified and will send you a meeting invitation shortly.' });

    } catch (error) {
        console.error('Error processing booking request:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}