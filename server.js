const http = require('http');

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function handleOptions(req, res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

async function callOllama(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'You are the NexusNights Intelligence Engine, an expert in short-term rental arbitrage and yield gap analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  // For /api/chat, the final message is usually at data.message.content
  const content = data?.message?.content || '';
  return { raw: data, content };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }

  if (req.method === 'GET' && req.url === '/') {
    return sendJson(res, 200, {
      status: 'ok',
      message: 'NexusNights Intelligence Engine backend is running.',
      endpoints: ['/nexus/intel']
    });
  }

  if (req.method === 'POST' && req.url === '/nexus/intel') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const prompt =
          parsed.prompt ||
          'Analyze this market for short-term rental arbitrage opportunities.';

        const result = await callOllama(prompt);

        return sendJson(res, 200, {
          ok: true,
          model: OLLAMA_MODEL,
          prompt,
          response: result.content,
          raw: result.raw
        });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, {
          ok: false,
          error: err.message || 'Unknown error calling Ollama'
        });
      }
    });

    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`NexusNights backend listening on http://localhost:${PORT}`);
  console.log(`Using Ollama at ${OLLAMA_URL} with model "${OLLAMA_MODEL}"`);
});

