// /api/log-payment-redirect.js
export default function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { platform, product, tutor } = request.body;

        // Basic validation
        if (!platform || !product || !tutor) {
            console.warn('Incomplete payment redirect log received:', request.body);
            // Still return 200 so the client doesn't see an error.
            return response.status(200).json({ message: 'Log received but incomplete.' });
        }

        console.log(`PAYMENT REDIRECT: User clicked to go to ${platform}. Tutor: ${tutor}, Product: "${product}"`);

        return response.status(200).json({ message: 'Log received.' });
    } catch (error) {
        console.error('Error logging payment redirect:', error);
        // Don't send a 500, as this is a non-critical logging endpoint.
        return response.status(200).json({ message: 'Error processing log.' });
    }
}