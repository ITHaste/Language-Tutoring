import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Let createClient infer SSL/TLS directly from process.env.REDIS_URL
    const redis = createClient({
        url: process.env.REDIS_URL
    });

    try {
        await redis.connect();

        const { id, tutor } = request.query;

        if (!id) {
            return response.status(400).json({ error: 'Please provide an "id" in query string.' });
        }

        const tutorName = tutor === 'calvina' ? 'calvina' : 'kevin';

        await redis.set(id, 'true', { EX: 300 });

        return response.status(200).json({ 
            message: `Successfully added test ID "${id}" for ${tutorName}. It will expire in 5 minutes.`,
            testUrl: `/schedule.html?tutor=${tutorName}&transactionId=${id}`
        });

    } catch (error) {
        console.error('Error in test endpoint:', error);
        return response.status(500).json({ error: error.message || 'Failed to add test ID.' });
    } finally {
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}