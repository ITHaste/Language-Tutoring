// api/create-checkout-session.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { productName, unitAmount, quantity = 1, tutorName, cancelPath } = req.body;

    if (!productName || !unitAmount) {
        return res.status(400).json({ error: 'Missing product details.' });
    }

    try {
        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur', // Assuming Euro as your currency
                        product_data: {
                            name: `${productName} with ${tutorName}`,
                            // You can add images or descriptions here if needed
                        },
                        unit_amount: Math.round(unitAmount * 100), // Stripe expects amount in cents
                    },
                    quantity: quantity,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}${cancelPath || '/'}`, // Redirect back to the page they came from
            metadata: {
                productName: productName,
                tutorName: tutorName,
            },
        });

        // Return the session ID to the client
        res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Error creating Stripe Checkout session:', error);
        res.status(500).json({ error: error.message || 'Failed to create checkout session.' });
    }
}