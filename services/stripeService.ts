import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

export const createCheckoutSession = async (priceId: string, mode: 'subscription' | 'payment' = 'subscription') => {
    const functions = getFunctions(getApp());
    const createSession = httpsCallable(functions, 'createCheckoutSession');

    try {
        const result = await createSession({
            priceId,
            mode,
            origin: window.location.origin
        });
        const { url } = result.data as { url: string };
        if (url) {
            window.location.href = url;
        }
    } catch (error) {
        console.error("Error creating checkout session:", error);
        throw error;
    }
};

export const createPortalSession = async () => {
    const functions = getFunctions(getApp());
    const createSession = httpsCallable(functions, 'createPortalSession');

    try {
        const result = await createSession({
            origin: window.location.origin
        });
        const { url } = result.data as { url: string };
        if (url) {
            window.location.href = url;
        }
    } catch (error) {
        console.error("Error creating portal session:", error);
        throw error;
    }
};

export const getCheckoutSession = async (sessionId: string) => {
    const functions = getFunctions(getApp());
    const getSession = httpsCallable(functions, 'getCheckoutSession');
    try {
        const result = await getSession({ sessionId });
        return result.data as {
            id: string;
            email: string;
            payment_status: string;
            amount_total: number;
            currency: string;
        };
    } catch (error) {
        console.error("Error getting checkout session:", error);
        throw error;
    }
};

export const claimSubscription = async (sessionId: string) => {
    const functions = getFunctions(getApp());
    const claim = httpsCallable(functions, 'claimSubscription');
    try {
        const result = await claim({ sessionId });
        return result.data as { success: boolean };
    } catch (error) {
        console.error("Error claiming subscription:", error);
        throw error;
    }
};
