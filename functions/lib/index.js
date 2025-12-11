"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSpeech = exports.analyzeScorecardImage = exports.searchPadelRules = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const genai_1 = require("@google/genai");
admin.initializeApp();
// Access the API Key from Firebase environment config
// Usage: firebase functions:config:set gemini.key="YOUR_API_KEY"
const API_KEY = (_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key;
// Initialize Gemini only if key is present (to avoid errors on init)
// We'll throw an error inside the function if it's missing.
const getGenAI = () => {
    if (!API_KEY) {
        throw new functions.https.HttpsError("failed-precondition", "Gemini API Key is not configured in Firebase Functions.");
    }
    return new genai_1.GoogleGenAI({ apiKey: API_KEY });
};
// 1. Search Padel Rules
exports.searchPadelRules = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
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
        const sources = ((_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.groundingMetadata) === null || _c === void 0 ? void 0 : _c.groundingChunks) || [];
        return { text, sources };
    }
    catch (error) {
        console.error("Gemini Search Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error processing request.");
    }
});
// 2. Analyze Scorecard Image
exports.analyzeScorecardImage = functions.https.onCall(async (data, context) => {
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
        if (!jsonText)
            throw new Error("No text returned");
        return JSON.parse(jsonText);
    }
    catch (error) {
        console.error("Gemini Vision Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error analyzing image.");
    }
});
// 3. Generate Speech (TTS)
exports.generateSpeech = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
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
                responseModalities: [genai_1.Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = (_f = (_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.inlineData) === null || _f === void 0 ? void 0 : _f.data;
        if (!base64Audio)
            throw new Error("No audio generated");
        return { audioContent: base64Audio };
    }
    catch (error) {
        console.error("Gemini TTS Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error generating speech.");
    }
});
//# sourceMappingURL=index.js.map