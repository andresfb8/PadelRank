import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase"; // Ensure 'app' is exported from here or initialize it
// Note: services/firebase.ts exports { app, auth, db }
// We need to get the functions instance
const functions = getFunctions(app);

// Search Grounding for Padel Rules
export const searchPadelRules = async (query: string): Promise<{ text: string, sources: any[] }> => {
  try {
    const searchRulesFn = httpsCallable<{ query: string }, { text: string, sources: any[] }>(functions, 'searchPadelRules');
    const response = await searchRulesFn({ query });
    return response.data;
  } catch (error) {
    console.error("Cloud Function Error (Search):", error);
    return { text: "Error consultando las reglas (Backend).", sources: [] };
  }
};

// Image Analysis for Scorecard
export const analyzeScorecardImage = async (base64Image: string): Promise<any> => {
  try {
    const analyzeFn = httpsCallable<{ base64Image: string }, any>(functions, 'analyzeScorecardImage');
    const response = await analyzeFn({ base64Image });
    return response.data;
  } catch (error) {
    console.error("Cloud Function Error (Vision):", error);
    throw error;
  }
};

// TTS for Announcements
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const speechFn = httpsCallable<{ text: string }, { audioContent: string }>(functions, 'generateSpeech');
    const response = await speechFn({ text });

    const base64Audio = response.data.audioContent;
    if (!base64Audio) throw new Error("No audio generated from backend");

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Cloud Function Error (TTS):", error);
    throw error;
  }
};
