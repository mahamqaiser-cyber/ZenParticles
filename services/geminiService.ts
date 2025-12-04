import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { ParticleTheme } from '../types';

export const generateTheme = async (prompt: string): Promise<ParticleTheme | null> => {
  if (!process.env.API_KEY) {
    console.error("No API KEY");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a color theme and physics parameters for a particle system based on this description: "${prompt}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING, description: "Hex color code" },
            secondaryColor: { type: Type.STRING, description: "Hex color code" },
            particleSize: { type: Type.NUMBER, description: "Size between 0.05 and 0.5" },
            speed: { type: Type.NUMBER, description: "Speed multiplier between 0.5 and 3.0" }
          },
          required: ["primaryColor", "secondaryColor", "particleSize", "speed"]
        }
      }
    });

    const text = response.text;
    if (text) {
        return JSON.parse(text) as ParticleTheme;
    }
    return null;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};