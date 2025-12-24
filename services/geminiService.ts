
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedReceipt, Suggestion, PurchaseRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseReceiptImage = async (base64Image: string): Promise<ParsedReceipt> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Extract the list of items from this shopping receipt. Return the items, their prices, and quantities. If you can identify the total amount, include it. Return only valid JSON.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
                quantity: { type: Type.STRING },
              },
              required: ["name", "price", "quantity"]
            }
          },
          total: { type: Type.NUMBER },
          date: { type: Type.STRING }
        },
        required: ["items", "total"]
      },
    },
  });

  return JSON.parse(response.text);
};

export const getSmartSuggestions = async (history: PurchaseRecord[]): Promise<Suggestion[]> => {
  if (history.length < 3) return [];

  const historySummary = history.map(h => ({
    name: h.name,
    date: new Date(h.date).toLocaleDateString()
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on the following purchase history, predict 5 items the user might need to buy soon. Consider purchase frequency and typical household consumption rates.
    
    History: ${JSON.stringify(historySummary)}
    
    Return a JSON array of suggestions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
            reason: { type: Type.STRING, description: "Why this is suggested" },
            category: { type: Type.STRING }
          },
          required: ["name", "confidence", "reason", "category"]
        }
      },
    },
  });

  return JSON.parse(response.text);
};
