import { createClient } from 'redis';

// This function is called by the schedule.html page to verify a transaction ID.
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    try {
        const { transactionId } = request.body;

        if (!transactionId) {
            return response.status(400).json({ error: 'Transaction ID is required.' });
        }

        // 1. Check if the transaction ID exists in our Redis store.
        const purchaseExists = await redis.get(transactionId);

        if (purchaseExists) {
            // 2. If it exists, delete it immediately to make it single-use.
            await redis.del(transactionId);
            return response.status(200).json({ message: 'Verification successful.' });
        } else {
            console.log(`Verification failed: Transaction ID "${transactionId}" not found in Redis.`);
            return response.status(404).json({ error: 'Invalid or expired transaction ID.' });
        }
    } catch (error) {
        console.error('Error verifying purchase:', error);
        return response.status(500).json({ error: 'An internal error occurred.' });
    } finally {
        // Ensure the Redis client connection is closed
        await redis.quit();
    }
}