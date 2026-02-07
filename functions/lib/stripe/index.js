"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutRedirect = exports.claimSubscription = exports.getCheckoutSession = exports.stripeWebhook = exports.createPortalSession = exports.createCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const stripe_1 = require("stripe");
const params_1 = require("firebase-functions/params");
const config_1 = require("./config");
const webhookHandlers = require("./webhookHandlers");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
// Initialize Stripe on function invocation to ensure secret is available
const getStripe = () => {
    return new stripe_1.default(stripeSecretKey.value(), { apiVersion: "2026-01-28.clover" }); // Updated to match installed types
};
exports.createCheckoutSession = (0, https_1.onCall)({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    var _a, _b;
    const { priceId, mode = "subscription" } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const userEmail = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token.email;
    const stripe = getStripe();
    // Check if it's the Pro plan to add trial period
    const isPro = priceId === config_1.STRIPE_CONFIG.products.pro.priceId;
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
    }
    catch (error) {
        console.error("Stripe Checkout Error:", error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
exports.createPortalSession = (0, https_1.onCall)({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userId = request.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const customerId = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!customerId) {
        throw new https_1.HttpsError('failed-precondition', 'User does not have a Stripe Customer ID.');
    }
    const stripe = getStripe();
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${request.data.origin}/settings`,
        });
        return { url: session.url };
    }
    catch (error) {
        console.error("Stripe Portal Error:", error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
exports.stripeWebhook = (0, https_1.onRequest)({
    secrets: [stripeSecretKey, stripeWebhookSecret],
    cors: true
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = getStripe();
    const endpointSecret = stripeWebhookSecret.value();
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(`Webhook Handler Error: ${err.message}`);
        res.status(500).send(`Webhook Handler Error: ${err.message}`);
    }
});
exports.getCheckoutSession = (0, https_1.onCall)({
    secrets: [stripeSecretKey],
    cors: true
}, async (request) => {
    var _a;
    const { sessionId } = request.data;
    if (!sessionId)
        throw new https_1.HttpsError('invalid-argument', 'Missing sessionId');
    const stripe = getStripe();
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return {
            id: session.id,
            email: ((_a = session.customer_details) === null || _a === void 0 ? void 0 : _a.email) || session.customer_email,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency
        };
    }
    catch (error) {
        console.error("Error retrieving session:", error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
exports.claimSubscription = (0, https_1.onCall)({
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to claim a subscription.');
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
            throw new https_1.HttpsError('not-found', 'Subscription not found or not ready. Please try again in a moment.');
        }
        const pendingData = pendingDoc.data();
        if ((pendingData === null || pendingData === void 0 ? void 0 : pendingData.status) !== 'pending_claim') {
            throw new https_1.HttpsError('failed-precondition', 'Subscription already claimed.');
        }
        const customerId = pendingData.customerId;
        // 2. Link to user
        await db.collection('users').doc(userId).update({
            stripeCustomerId: customerId,
        });
        // 3. Delete pending doc (or mark claimed)
        await db.collection('pending_subscriptions').doc(sessionId).delete();
        return { success: true };
    }
    catch (error) {
        console.error("Error claiming subscription:", error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
exports.checkoutRedirect = (0, https_1.onRequest)({
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
    const isPro = priceId === config_1.STRIPE_CONFIG.products.pro.priceId;
    // Determine the origin for redirects. 
    // Usually we want to go back to the app, not the landing.
    const origin = 'https://app.racketgrid.com';
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
            success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/payment/cancel`,
            subscription_data: mode === "subscription" ? {
                trial_period_days: isPro ? 30 : undefined,
            } : undefined,
        });
        if (session.url) {
            res.redirect(303, session.url);
        }
        else {
            res.status(500).send('Failed to create session URL');
        }
    }
    catch (error) {
        console.error("Stripe Redirect Error:", error);
        res.status(500).send(error.message);
    }
});
//# sourceMappingURL=index.js.map