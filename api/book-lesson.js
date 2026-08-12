import { Resend } from 'resend';
import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for required environment variables
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.KEVIN_TUTOR_EMAIL || !process.env.CALVINA_TUTOR_EMAIL) {
        console.error('Server configuration error: Missing one or more required environment variables for email notifications.');
        return response.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    try {
        const { email, selectedTime, tutor } = request.body;

        if (!email || !selectedTime || !tutor) {
            return response.status(400).json({ error: 'Email, selected time, and tutor are required.' });
        }

        // --- Select the correct tutor email based on the 'tutor' parameter ---
        let tutorEmail;
        if (tutor === 'kevin') {
            tutorEmail = process.env.KEVIN_TUTOR_EMAIL;
        } else if (tutor === 'calvina') {
            tutorEmail = process.env.CALVINA_TUTOR_EMAIL;
        } else {
            // This case should ideally not be reached if the frontend is correct.
            console.error(`Invalid tutor specified during booking: ${tutor}`);
            return response.status(400).json({ error: 'Invalid tutor specified.' });
        }

        // --- ATOMIC BOOKING LOGIC ---
        // Create a unique key for the time slot.
        const bookingKey = `booked_slot:${selectedTime}`;
        // Try to set the key ONLY if it does not exist (NX: true).
        // Set an expiration of 90 days (7776000 seconds) to keep the DB clean.
        const result = await redis.set(bookingKey, email, { EX: 7776000, NX: true });

        if (result === null) {
            // The key already existed, so the slot is taken.
            console.log(`Booking failed: Slot ${selectedTime} is already taken.`);
            return response.status(409).json({ error: 'This time slot is no longer available. Please select another time.' });
        }

        // Determine the correct timezone for the tutor
        const bookingDate = new Date(selectedTime);
        let tutorTimeZone;
        if (tutor === 'kevin') {
            tutorTimeZone = 'Europe/Amsterdam'; // Handles CET/CEST automatically
        } else if (tutor === 'calvina') {
            tutorTimeZone = 'Asia/Jakarta'; // UTC+7
        } else {
            // Fallback for unknown tutor, though this should be caught earlier
            tutorTimeZone = 'UTC';
        }

        // Format the date for the tutor's local timezone
        const formattedDateForTutor = bookingDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: tutorTimeZone,
            timeZoneName: 'short', // 'short' for "CEST", "WIB", etc.
        });
        const tutorName = tutor.charAt(0).toUpperCase() + tutor.slice(1);

        // Send email to the tutor
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL, // Must be a verified domain on Resend.
            to: [tutorEmail], // Your email address to receive notifications
            subject: `New Lesson Booking for ${tutorName}!`,
            html: `<h1>New Lesson Booking for ${tutorName}</h1><p>A student has requested a lesson at the following time:</p><ul><li><strong>Tutor:</strong> ${tutorName}</li><li><strong>Student Email:</strong> ${email}</li><li><strong>Requested Time:</strong> ${formattedDateForTutor}</li></ul><p>Please reach out to them to confirm and send a Google Meet calendar invitation.</p>`,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return response.status(500).json({ error: 'Failed to send booking notification.' });
        }

        return response.status(200).json({ message: 'Booking successful! Your tutor has been notified and will send you a Google Meet invitation shortly.' });

    } catch (error) {
        console.error('Error processing booking request:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    } finally {
        // Ensure the Redis client connection is closed
        await redis.quit();
    }
}