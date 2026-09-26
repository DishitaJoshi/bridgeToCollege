export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in environment variables.");
    return res.status(500).json({ error: "Backend configuration error: API key missing." });
  }

  const { contents } = req.body;
  if (!contents) {
    return res.status(400).json({ error: "Missing contents in request body" });
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return res.status(500).json({ error: "Internal server error connecting to Gemini API" });
  }
}
