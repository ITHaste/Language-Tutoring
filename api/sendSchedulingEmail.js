// /api/utils/sendSchedulingEmail.js
import { Resend } from 'resend';

export async function sendSchedulingEmail({ to, tutorName, scheduleUrl }) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!process.env.RESEND_FROM_EMAIL) {
        throw new Error('Server configuration error: Missing Resend "from" email environment variable.');
    }

    const capitalizedTutorName = tutorName.charAt(0).toUpperCase() + tutorName.slice(1);

    return resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject: 'Your Lesson is Ready to be Scheduled!',
        html: `<h1>Thank you for your purchase!</h1><p>You can schedule your lesson with ${capitalizedTutorName} by clicking the link below. After you schedule, your tutor will send a Google Meet invitation to your email.</p><p><a href="${scheduleUrl}">Schedule Your Lesson</a></p><p>This link is valid for 90 days and can only be used once.</p><p>If you have any questions, please reply to this email.</p><p>Thank you,<br>The Polyglot Hub</p>`,
    });
}