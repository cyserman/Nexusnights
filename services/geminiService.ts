
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Property, AlphaWeights, NotebookEntry, Contract, KnowledgeBaseEntry } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const scrubRegion = async (
  region: string, 
  weights: AlphaWeights, 
  notebook: NotebookEntry[]
): Promise<Property[]> => {
  const ai = getAI();
  const notebookContext = notebook.map(n => n.content).join("\n");
  
  const prompt = `You are the NexusNights STR Scraper. 
  Scrub the region: "${region}".
  
  Context from Nexus Notebook:
  ${notebookContext}
  
  Find 10 high-potential Short-Term Rental (STR) properties (real or highly realistic based on market data).
  For each property, provide:
  1. Financials (ADR, Occupancy, Revenue).
  2. Market Comps (Neighborhood average ADR/Revenue).
  3. Amenities and Photo Quality.
  4. A 'Nexus Alpha Score' (0-100) based on these weights:
     - Yield Gap: ${weights.yield_gap}%
     - Aesthetic Debt: ${weights.aesthetic_debt}%
     - Amenity Arbitrage: ${weights.amenity_arbitrage}%
     - Pricing Inefficiency: ${weights.pricing_inefficiency}%
     - Review Velocity: ${weights.review_velocity}%
  5. A Knowledge Base (5 Q&A entries) for potential investors or guests.
  6. Approximate latitude and longitude (decimal degrees) for each property so it can be plotted on a map UI.
  
  Return as a JSON array of Property objects.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            location: { type: Type.STRING },
            address: { type: Type.STRING },
            owner_name: { type: Type.STRING },
            listing_url: { type: Type.STRING },
            latitude: { type: Type.NUMBER },
            longitude: { type: Type.NUMBER },
            current_adr: { type: Type.NUMBER },
            occupancy_rate: { type: Type.NUMBER },
            estimated_annual_revenue: { type: Type.NUMBER },
            review_count: { type: Type.NUMBER },
            last_review_date: { type: Type.STRING },
            amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
            photo_quality_score: { type: Type.NUMBER },
            photo_count: { type: Type.NUMBER },
            market_comp_adr: { type: Type.NUMBER },
            market_comp_revenue: { type: Type.NUMBER },
            alpha_score: { type: Type.NUMBER },
            investment_thesis: { type: Type.STRING },
            knowledge_base: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["question", "answer", "category"]
              }
            }
          },
          required: [
            "id", "name", "location", "address", "owner_name", "listing_url", 
            "current_adr", "occupancy_rate", "estimated_annual_revenue", 
            "review_count", "last_review_date", "amenities", "photo_quality_score", 
            "photo_count", "market_comp_adr", "market_comp_revenue", "alpha_score", 
            "investment_thesis", "knowledge_base"
          ]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Scrubbing failed", e);
    return [];
  }
};

export const draftContract = async (property: Property): Promise<Contract> => {
  const ai = getAI();
  const prompt = `Draft an intense, professional acquisition contract for the property: ${property.name} at ${property.address}.
  
  Property Data:
  - Alpha Score: ${property.alpha_score}
  - Current Revenue: $${property.estimated_annual_revenue}
  - Market Potential: $${property.market_comp_revenue}
  - Aesthetic Debt: ${100 - property.photo_quality_score}
  
  Generate:
  1. Purchase Price (suggested based on a 15-20% discount if Alpha is high).
  2. Closing Date (Standard 30-day or Fast 10-day).
  3. Proof of Funds Timeline.
  4. A 'Value-Add Clause' justifying the offer based on renovation needs.
  5. A 'Seller Reality Check' one-pager summary.
  
  Return as JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          property_id: { type: Type.STRING },
          purchase_price: { type: Type.NUMBER },
          closing_date: { type: Type.STRING },
          proof_of_funds_days: { type: Type.NUMBER },
          value_add_clause: { type: Type.STRING },
          seller_reality_check: { type: Type.STRING }
        },
        required: ["property_id", "purchase_price", "closing_date", "proof_of_funds_days", "value_add_clause", "seller_reality_check"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say with a professional, authoritative, and high-intensity tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
  } catch (err) {
    console.error("Speech generation failed", err);
  }
  return undefined;
};
