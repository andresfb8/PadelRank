import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Search Grounding for Padel Rules
export const searchPadelRules = async (query: string): Promise<{text: string, sources: any[]}> => {
  try {
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
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return { text: "Error consultando las reglas.", sources: [] };
  }
};

// Image Analysis for Scorecards
export const analyzeScorecardImage = async (base64Image: string): Promise<any> => {
  try {
    // We use gemini-3-pro-preview for high reasoning capabilities on handwriting/images
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
};

// TTS for Announcements
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
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

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};