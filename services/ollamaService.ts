
export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export const queryOllama = async (
  endpoint: string,
  model: string,
  prompt: string,
  system?: string,
  options?: { temperature?: number; top_p?: number; num_predict?: number }
): Promise<string> => {
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          top_p: options?.top_p ?? 0.9,
          num_predict: options?.num_predict ?? 512,
        }
      })
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (err) {
    console.error("Ollama query failed", err);
    throw err;
  }
};
