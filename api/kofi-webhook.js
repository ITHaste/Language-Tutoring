import { createClient } from 'redis';

// This function receives a webhook from Ko-fi after a purchase
// and stores the transaction ID in a temporary database (Vercel Redis).
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    try {
        const kofiData = JSON.parse(request.body.data);

        if (kofiData.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        if (kofiData.type === 'Shop') {
            const transactionId = kofiData.kofi_transaction_id;

            if (transactionId) {
                console.log(`Received Ko-fi Shop Order. Storing transaction ID: ${transactionId}`);
                // Store the transaction ID in Redis with an expiration of 1 hour (3600 seconds)
                await redis.set(transactionId, 'true', { EX: 3600 });
            } else {
                console.warn('Ko-fi webhook received without a transaction ID.');
            }
        }

        response.status(200).json({ message: 'Webhook received successfully.' });

    } catch (error) {
        console.error('Error processing Ko-fi webhook:', error);
        response.status(500).json({ error: 'Failed to process webhook.' });
    } finally {
        // Ensure the Redis client connection is closed
        await redis.quit();
    }
}