import { Property, AlphaWeights, NotebookEntry, Contract, KnowledgeBaseEntry } from "../types";

const OPENROUTER_API_KEY = 'openrouter_api_key';
const OPENROUTER_MODEL_KEY = 'openrouter_model';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(OPENROUTER_API_KEY);
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(OPENROUTER_API_KEY, key);
};

export const getStoredModel = (): string => {
  return localStorage.getItem(OPENROUTER_MODEL_KEY) || 'qwen/qwen2.5-7b-instruct';
};

export const setStoredModel = (model: string): void => {
  localStorage.setItem(OPENROUTER_MODEL_KEY, model);
};

const AVAILABLE_MODELS = [
  { id: 'qwen/qwen2.5-7b-instruct', name: 'Qwen 2.5 7B', desc: 'Fast & capable' },
  { id: 'qwen/qwen2.5-14b-instruct', name: 'Qwen 2.5 14B', desc: 'Balanced' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', desc: 'Meta' },
  { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', desc: 'Google' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B', desc: 'Mistral' },
];

export const getAvailableModels = () => AVAILABLE_MODELS;

export const queryOpenRouter = async (
  apiKey: string,
  model: string,
  message: string,
  systemPrompt: string
): Promise<string> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'NexusNights'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const scrubRegion = async (
  apiKey: string,
  model: string,
  region: string,
  weights: AlphaWeights,
  notebook: NotebookEntry[]
): Promise<Property[]> => {
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

  const result = await queryOpenRouter(
    apiKey,
    model,
    prompt,
    "You are NexusNights, a real estate investment AI. Return valid JSON only."
  );

  try {
    return JSON.parse(result);
  } catch (e) {
    console.error("Scrubbing failed", e);
    return [];
  }
};

export const draftContract = async (
  apiKey: string,
  model: string,
  property: Property
): Promise<Contract> => {
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

  const result = await queryOpenRouter(
    apiKey,
    model,
    prompt,
    "You are NexusNights Contract AI. Return valid JSON only."
  );

  return JSON.parse(result);
};

export const generateSpeech = async (_text: string): Promise<string | undefined> => {
  return undefined;
};
