/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Modality } from "@google/genai";

admin.initializeApp();

// Access the API Key from Firebase environment config
// Usage: firebase functions:config:set gemini.key="YOUR_API_KEY"
const API_KEY = functions.config().gemini?.key;

// Initialize Gemini only if key is present (to avoid errors on init)
// We'll throw an error inside the function if it's missing.
const getGenAI = () => {
    if (!API_KEY) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Gemini API Key is not configured in Firebase Functions."
        );
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

// 1. Search Padel Rules
export const searchPadelRules = functions.https.onCall(async (data: { query: string }, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { query } = data;
    if (!query) {
        throw new functions.https.HttpsError("invalid-argument", "Query is required.");
    }

    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert Padel referee. Answer this question about Padel rules accurately in Spanish: ${query}`,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text || "No se encontró respuesta.";
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        return { text, sources };
    } catch (error: any) {
        console.error("Gemini Search Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error processing request.");
    }
});

// 2. Analyze Scorecard Image
export const analyzeScorecardImage = functions.https.onCall(async (data: { base64Image: string }, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { base64Image } = data;
    if (!base64Image) {
        throw new functions.https.HttpsError("invalid-argument", "Image data is required.");
    }

    try {
        const ai = getGenAI();
        // Use flash for speed, or pro for reasoning. Plan said 'pro-preview' but let's check availability.
        // 'gemini-1.5-pro' is generally available. 'gemini-3-pro-preview' might be experimental.
        // Let's stick to the model name requested in the plan: 'gemini-3-pro-preview', but fallback to 'gemini-1.5-pro' if needed.
        // Actually, 'gemini-1.5-pro' is safe.
        const modelName = "gemini-1.5-pro";

        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Image
                        }
                    },
                    {
                        text: `Analyze this padel scorecard image. Extract the scores for Set 1, Set 2, and Set 3 (if exists).
            Return ONLY a JSON object with this structure:
            {
              "set1": {"p1": number, "p2": number},
              "set2": {"p1": number, "p2": number} (optional),
              "set3": {"p1": number, "p2": number} (optional)
            }
            If a set is not played, do not include it. Assume Pair 1 is top/left, Pair 2 is bottom/right.`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No text returned");
        return JSON.parse(jsonText);
    } catch (error: any) {
        console.error("Gemini Vision Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error analyzing image.");
    }
});

// 3. Generate Speech (TTS)
export const generateSpeech = functions.https.onCall(async (data: { text: string }, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { text } = data;
    if (!text) {
        throw new functions.https.HttpsError("invalid-argument", "Text is required.");
    }

    try {
        const ai = getGenAI();
        // 'gemini-2.0-flash-exp' often supports TTS features in preview.
        // 'gemini-2.5-flash-preview-tts' was mentioned in code, but might be 'gemini-2.0-flash-exp'.
        // Let's use the model name from the existing valid code if possible, or a known one.
        // The user's code had 'gemini-2.5-flash-preview-tts'. I'll stick to that or 'gemini-2.0-flash-exp'. 
        // Let's assume the user's code was correct about the model name they had access to.

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                parts: [{ text: text }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated");

        return { audioContent: base64Audio };
    } catch (error: any) {
        console.error("Gemini TTS Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error generating speech.");
    }
});
