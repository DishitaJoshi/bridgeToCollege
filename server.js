import http from 'http';

const port = 3000;

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle POST /api/gemini
  if (req.method === 'POST' && req.url === '/api/gemini') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        // Safe diagnostics (never logs the actual key)
        console.log(`[Proxy Request] Received POST /api/gemini`);
        if (!apiKey) {
          console.error(`[Error] GEMINI_API_KEY is undefined in process.env`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not defined in the environment variables.' }));
          return;
        } else {
          console.log(`[Diagnostics] Key loaded successfully.`);
          console.log(`[Diagnostics] Key length: ${apiKey.length}`);
          console.log(`[Diagnostics] Key has quotes: ${apiKey.startsWith('"') || apiKey.startsWith("'")}`);
          console.log(`[Diagnostics] Key has leading/trailing spaces: ${apiKey.trim().length !== apiKey.length}`);
        }

        const parsedBody = JSON.parse(body);
        const { contents } = parsedBody;

        if (!contents) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing contents in request body.' }));
          return;
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents }),
        });

        const dataText = await response.text();
        console.log(`[Proxy Response] Google returned status: ${response.status}`);
        
        // Print Google's exact response if it failed
        if (!response.ok) {
          console.error(`[Google API Error Response]:`, dataText);
        }
        
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(dataText);
      } catch (error) {
        console.error("Error in proxy handler:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  console.log(`🚀 Zero-dependency API Proxy running at http://localhost:${port}`);
});
