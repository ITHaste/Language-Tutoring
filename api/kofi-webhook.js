import { kv } from '@vercel/kv';

// This function receives a webhook from Ko-fi after a purchase
// and stores the transaction ID in a temporary database (Vercel KV).
export default async function handler(request, response) {
    // 1. Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. The data from Ko-fi is URL-encoded, so we need to parse it.
        const kofiData = JSON.parse(request.body.data);

        // 3. Verify the webhook is from Ko-fi (important for security)
        // You should store this token in your Vercel Environment Variables
        if (kofiData.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        // 4. Check if it's a 'Shop Order' type of notification
        if (kofiData.type === 'Shop') {
            const transactionId = kofiData.kofi_transaction_id;

            if (transactionId) {
                console.log(`Received Ko-fi Shop Order. Storing transaction ID: ${transactionId}`);

                // 5. Store the transaction ID in Vercel KV with an expiration of 1 hour (3600 seconds)
                // We store 'true' as the value, just to confirm its existence.
                await kv.set(transactionId, true, { ex: 3600 });

            } else {
                console.warn('Ko-fi webhook received without a transaction ID.');
            }
        }

        // 6. Send a 200 OK response to Ko-fi to let them know we received the webhook
        response.status(200).json({ message: 'Webhook received successfully.' });

    } catch (error) {
        console.error('Error processing Ko-fi webhook:', error);
        response.status(500).json({ error: 'Failed to process webhook.' });
    }
}