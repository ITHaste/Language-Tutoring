// /api/stripe-webhook.js
import { createClient } from 'redis';
import Stripe from 'stripe';
import { getBaseUrl } from './utils/getBaseUrl.js';
import { sendSchedulingEmail } from './utils/sendSchedulingEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// This is required to get the raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to read raw body from request
async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(request, response) {
    const rawBody = await getRawBody(request);
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Stripe webhook signature error: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const redis = createClient({ url: process.env.REDIS_URL });

        try {
            await redis.connect();

            const transactionId = session.id;
            const buyerEmail = session.customer_details.email;
            const tutorName = session.metadata.tutorName;
            const productName = session.metadata.productName;

            if (!transactionId || !buyerEmail || !tutorName || !productName) {
                console.warn('Stripe Webhook: Missing critical data in session object.', session);
                return response.status(200).json({ received: true, message: 'Missing data.' });
            }

            console.log(`Stripe Webhook: Processing purchase for ${productName} (${tutorName}). Transaction ID: ${transactionId}`);

            const purchaseDetails = JSON.stringify({ tutor: tutorName.toLowerCase(), email: buyerEmail });
            await redis.set(transactionId, purchaseDetails, { EX: 3600 * 24 * 90 });

            const scheduleUrl = `${getBaseUrl()}/schedule?tutor=${tutorName.toLowerCase()}&transactionId=${transactionId}`;

            await sendSchedulingEmail({
                to: buyerEmail,
                tutorName: tutorName,
                scheduleUrl: scheduleUrl,
            });
        } catch (error) {
            console.error('Error processing Stripe webhook:', error);
            return response.status(500).json({ error: 'Failed to process webhook.' });
        } finally {
            if (redis.isOpen) await redis.quit();
        }
    }

    response.status(200).json({ received: true });
}