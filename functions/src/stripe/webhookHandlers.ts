import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { STRIPE_CONFIG } from './config';

const db = admin.firestore();

export const handleCheckoutSessionCompleted = async (session: any) => {
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;

    if (!userId) {
        // Case: User not logged in during purchase.
        // Store in pending_subscriptions to be claimed later.
        await db.collection('pending_subscriptions').doc(session.id).set({
            sessionId: session.id,
            customerId: customerId,
            email: session.customer_details?.email || session.customer_email,
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

export const handleSubscriptionUpdated = async (subscription: any) => {
    const customerId = subscription.customer as string;
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
    let newPlan: 'basic' | 'pro' | 'star' | 'weekend' | 'trial' | undefined;

    // Map Price ID to Plan
    if (priceId === STRIPE_CONFIG.products.basic.priceId) newPlan = 'basic';
    if (priceId === STRIPE_CONFIG.products.pro.priceId) newPlan = 'pro';
    if (priceId === STRIPE_CONFIG.products.star.priceId) newPlan = 'star';
    // Weekend is one-off, handled differently usually, but let's assume sub for now or check product type

    const updates: any = {
        subscriptionStatus: status,
        planExpiry: Timestamp.fromMillis(currentPeriodEnd * 1000).toMillis(), // Store as millis
    };

    if (newPlan) {
        updates.plan = newPlan;
    }

    if (cancelAtPeriodEnd) {
        updates.isCancelled = true;
    } else {
        updates.isCancelled = false;
    }

    await userDoc.ref.update(updates);
};

export const handleSubscriptionDeleted = async (subscription: any) => {
    const customerId = subscription.customer as string;

    const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`User not found for Stripe Customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];

    await userDoc.ref.update({
        subscriptionStatus: 'canceled',
        plan: admin.firestore.FieldValue.delete(), // Remove plan access? Or keep basic? 
        // Usually keep basic or just mark unnecessary fields as null.
        // Spec says: "lose access at end of period". Webhook fires at end.
        // So here we actually remove the plan.
        planExpiry: admin.firestore.FieldValue.delete(),
    });
};

export const handleInvoicePaymentFailed = async (invoice: any) => {
    const customerId = invoice.customer as string;

    // Find user by stripeCustomerId
    const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`User not found for Stripe Customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    await userDoc.ref.update({
        hasFailedPayment: true,
        lastPaymentError: invoice.last_finalization_error?.message || 'Error de pago'
    });
};

export const handleInvoicePaymentSucceeded = async (invoice: any) => {
    const customerId = invoice.customer as string;

    // Find user by stripeCustomerId
    const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`User not found for Stripe Customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    await userDoc.ref.update({
        hasFailedPayment: false,
        lastPaymentError: admin.firestore.FieldValue.delete()
    });
};
