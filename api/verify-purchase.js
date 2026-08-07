import { kv } from '@vercel/kv';

// This function is called by the schedule.html page to verify a transaction ID.
export default async function handler(request, response) {
    // --- DEBUGGING STEP ---
    // Log the environment variables to see if they are available to the function.
    console.log('--- KV Environment Variables Check ---');
    console.log(`KV_URL: ${process.env.KV_URL ? 'SET' : 'MISSING'}`);
    console.log(`KV_REST_API_URL: ${process.env.KV_REST_API_URL ? 'SET' : 'MISSING'}`);
    console.log(`KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? 'SET' : 'MISSING'}`);
    console.log('------------------------------------');
    // --- END DEBUGGING STEP ---

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { transactionId } = request.body;

        if (!transactionId) {
            return response.status(400).json({ error: 'Transaction ID is required.' });
        }

        // 1. Check if the transaction ID exists in our KV store.
        const purchaseExists = await kv.get(transactionId);

        if (purchaseExists) {
            // 2. If it exists, delete it to make it single-use.
            await kv.del(transactionId);
            return response.status(200).json({ message: 'Verification successful.' });
        } else {
            // 3. If it doesn't exist, it's invalid or has already been used.
            return response.status(404).json({ error: 'Invalid or expired transaction ID.' });
        }
    } catch (error) {
        console.error('Error verifying purchase:', error);
        return response.status(500).json({ error: 'An internal error occurred.' });
    }
}