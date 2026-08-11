import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    try {
        const { startOfWeek, tutor } = request.query;

        if (!startOfWeek || !tutor) {
            return response.status(400).json({ error: 'startOfWeek and tutor parameters are required.' });
        }

        const tutorSchedules = {
            'kevin': [7, 8, 9, 10, 11, 12, 13, 14, 15],
            'calvina': [2, 3, 4, 5, 6, 7, 8, 9, 10]
        };

        const availableUTCHours = tutorSchedules[tutor] || [];
        const weekStartDate = new Date(startOfWeek);
        const potentialKeys = [];

        // Generate all possible keys for the 5 workdays of the week
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStartDate);
            day.setUTCDate(weekStartDate.getUTCDate() + i);
            for (const hourUTC of availableUTCHours) {
                const time = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hourUTC, 0, 0));
                potentialKeys.push(`booked_slot:${time.toISOString()}`);
            }
        }

        if (potentialKeys.length === 0) {
            return response.status(200).json({ bookedSlots: [] });
        }

        // MGET returns an array of values for keys that exist, or null for those that don't.
        const bookingResults = await redis.mGet(potentialKeys);

        const bookedSlots = potentialKeys
            .filter((key, index) => bookingResults[index] !== null)
            .map(key => key.replace('booked_slot:', ''));

        return response.status(200).json({ bookedSlots });

    } catch (error) {
        console.error('Error fetching booked slots:', error);
        return response.status(500).json({ error: 'Failed to fetch schedule availability.' });
    } finally {
        await redis.quit();
    }
}