import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { STRIPE_CONFIG } from "./config";
import * as webhookHandlers from "./webhookHandlers";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Initialize Stripe on function invocation to ensure secret is available
const getStripe = () => {
    return new Stripe(stripeSecretKey.value(), { apiVersion: "2026-01-28.clover" }); // Updated to match installed types
};

export const createCheckoutSession = onCall({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    const { priceId, mode = "subscription" } = request.data;
    const userId = request.auth?.uid;
    const userEmail = request.auth?.token.email;

    const stripe = getStripe();

    // Check if it's the Pro plan to add trial period
    const isPro = priceId === STRIPE_CONFIG.products.pro.priceId;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: mode,
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            customer_email: userEmail,
            metadata: userId ? { userId } : undefined,
            success_url: `${request.data.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.data.origin}/payment/cancel`,
            subscription_data: mode === "subscription" ? {
                metadata: userId ? { userId } : undefined,
                trial_period_days: isPro ? 30 : undefined,
            } : undefined,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

export const createPortalSession = onCall({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const userId = request.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
        throw new HttpsError('failed-precondition', 'User does not have a Stripe Customer ID.');
    }

    const stripe = getStripe();

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${request.data.origin}/settings`,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

export const stripeWebhook = onRequest({
    secrets: [stripeSecretKey, stripeWebhookSecret],
    cors: true
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = getStripe();
    const endpointSecret = stripeWebhookSecret.value();

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig as string, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await webhookHandlers.handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'customer.subscription.updated':
                await webhookHandlers.handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await webhookHandlers.handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (err: any) {
        console.error(`Webhook Handler Error: ${err.message}`);
        res.status(500).send(`Webhook Handler Error: ${err.message}`);
    }
});

export const getCheckoutSession = onCall({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) throw new HttpsError('invalid-argument', 'Missing sessionId');

    const stripe = getStripe();
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return {
            id: session.id,
            email: session.customer_details?.email || session.customer_email,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency
        };
    } catch (error: any) {
        console.error("Error retrieving session:", error);
        throw new HttpsError('internal', error.message);
    }
});

export const claimSubscription = onCall({
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to claim a subscription.');
    }

    const { sessionId } = request.data;
    const userId = request.auth.uid;
    const db = admin.firestore();

    try {
        // 1. Check if pending subscription exists
        const pendingDoc = await db.collection('pending_subscriptions').doc(sessionId).get();
        if (!pendingDoc.exists) {
            // Check if already claimed?
            // Maybe check user doc if stripeCustomerId matches?
            // For now, assume if not pending, it's either invalid or already processed.
            // But webhook might be slow? If webhook hasn't fired yet, pending won't exist.
            // This is a race condition.
            // Strategy: If not found, check Stripe directly via sessionId?
            // But we want to rely on our DB for the "claim" process.
            // If webhook is slow, user waits.
            throw new HttpsError('not-found', 'Subscription not found or not ready. Please try again in a moment.');
        }

        const pendingData = pendingDoc.data();
        if (pendingData?.status !== 'pending_claim') {
            throw new HttpsError('failed-precondition', 'Subscription already claimed.');
        }

        const customerId = pendingData.customerId;

        // 2. Link to user
        await db.collection('users').doc(userId).update({
            stripeCustomerId: customerId,
        });

        // 3. Delete pending doc (or mark claimed)
        await db.collection('pending_subscriptions').doc(sessionId).delete();

        return { success: true };

    } catch (error: any) {
        console.error("Error claiming subscription:", error);
        throw new HttpsError('internal', error.message);
    }
});
export const checkoutRedirect = onRequest({
    secrets: [stripeSecretKey],
    cors: true
}, async (req, res) => {
    const { priceId, plan } = req.query;

    if (!priceId) {
        res.status(400).send('Missing priceId');
        return;
    }

    const stripe = getStripe();
    const mode = plan === 'weekend' ? 'payment' : 'subscription';
    const isPro = priceId === STRIPE_CONFIG.products.pro.priceId;

    // Determine the origin for redirects. 
    // Usually we want to go back to the app, not the landing.
    const origin = 'https://app.racketgrid.com';

    try {
        const session = await stripe.checkout.sessions.create({
            mode: mode as any,
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId as string,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/payment/cancel`,
            subscription_data: mode === "subscription" ? {
                trial_period_days: isPro ? 30 : undefined,
            } : undefined,
        });

        if (session.url) {
            res.redirect(303, session.url);
        } else {
            res.status(500).send('Failed to create session URL');
        }
    } catch (error: any) {
        console.error("Stripe Redirect Error:", error);
        res.status(500).send(error.message);
    }
});
