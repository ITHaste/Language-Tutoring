import { createClient } from 'redis';

// THIS IS A TEMPORARY TESTING ENDPOINT.
// It allows you to manually add a transaction ID to Redis for testing.
// Example for Kevin: /api/test/add-id?id=test123
// Example for Calvina: /api/test/add-id?id=test456&tutor=calvina
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    try {
        const { id, tutor } = request.query;

        if (!id) {
            return response.status(400).json({ error: 'Please provide an "id" in the query string. Example: ?id=test123' });
        }

        const tutorName = tutor === 'calvina' ? 'calvina' : 'kevin';

        // Store the test ID in Redis with an expiration of 5 minutes (300 seconds)
        await redis.set(id, 'true', { EX: 300 });
        
        console.log(`TEST: Manually added transaction ID: ${id} for tutor: ${tutorName}`);

        response.status(200).json({ 
            message: `Successfully added test ID "${id}" for ${tutorName}. It will expire in 5 minutes.`,
            testUrl: `/schedule.html?tutor=${tutorName}&transactionId=${id}`
        });

    } catch (error) {
        console.error('Error in test endpoint:', error);
        response.status(500).json({ error: 'Failed to add test ID.' });
    } finally {
        await redis.quit();
    }
}