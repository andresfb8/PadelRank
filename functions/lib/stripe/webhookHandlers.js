"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSubscriptionDeleted = exports.handleSubscriptionUpdated = exports.handleCheckoutSessionCompleted = void 0;
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("./config");
const db = admin.firestore();
const handleCheckoutSessionCompleted = async (session) => {
    var _a, _b;
    const userId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId;
    const customerId = session.customer;
    if (!userId) {
        // Case: User not logged in during purchase.
        // Store in pending_subscriptions to be claimed later.
        await db.collection('pending_subscriptions').doc(session.id).set({
            sessionId: session.id,
            customerId: customerId,
            email: ((_b = session.customer_details) === null || _b === void 0 ? void 0 : _b.email) || session.customer_email,
            status: 'pending_claim',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            planData: {
                // We might want to store plan info here to be safe, easier for frontend
                amount_total: session.amount_total,
            }
        });
        console.log(`Saved pending subscription for session ${session.id}`);
        return;
    }
    // Update user with Stripe Customer ID
    await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
    });
};
exports.handleCheckoutSessionCompleted = handleCheckoutSessionCompleted;
const handleSubscriptionUpdated = async (subscription) => {
    const customerId = subscription.customer;
    const status = subscription.status;
    const priceId = subscription.items.data[0].price.id;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const currentPeriodEnd = subscription.current_period_end;
    // Find user by stripeCustomerId
    const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
    if (usersSnapshot.empty) {
        console.error(`User not found for Stripe Customer: ${customerId}`);
        return;
    }
    const userDoc = usersSnapshot.docs[0];
    let newPlan;
    // Map Price ID to Plan
    if (priceId === config_1.STRIPE_CONFIG.products.basic.priceId)
        newPlan = 'basic';
    if (priceId === config_1.STRIPE_CONFIG.products.pro.priceId)
        newPlan = 'pro';
    if (priceId === config_1.STRIPE_CONFIG.products.star.priceId)
        newPlan = 'star';
    // Weekend is one-off, handled differently usually, but let's assume sub for now or check product type
    const updates = {
        subscriptionStatus: status,
        planExpiry: firestore_1.Timestamp.fromMillis(currentPeriodEnd * 1000).toMillis(), // Store as millis
    };
    if (newPlan) {
        updates.plan = newPlan;
    }
    if (cancelAtPeriodEnd) {
        updates.isCancelled = true;
    }
    else {
        updates.isCancelled = false;
    }
    await userDoc.ref.update(updates);
};
exports.handleSubscriptionUpdated = handleSubscriptionUpdated;
const handleSubscriptionDeleted = async (subscription) => {
    const customerId = subscription.customer;
    const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
    if (usersSnapshot.empty) {
        console.error(`User not found for Stripe Customer: ${customerId}`);
        return;
    }
    const userDoc = usersSnapshot.docs[0];
    await userDoc.ref.update({
        subscriptionStatus: 'canceled',
        plan: admin.firestore.FieldValue.delete(),
        // Usually keep basic or just mark unnecessary fields as null.
        // Spec says: "lose access at end of period". Webhook fires at end.
        // So here we actually remove the plan.
        planExpiry: admin.firestore.FieldValue.delete(),
    });
};
exports.handleSubscriptionDeleted = handleSubscriptionDeleted;
//# sourceMappingURL=webhookHandlers.js.map