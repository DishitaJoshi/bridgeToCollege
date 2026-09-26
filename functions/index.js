const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.post("/gemini", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined.");
      return res.status(500).json({ error: "API key is not configured on the backend." });
    }

    const { contents } = req.body;
    if (!contents) {
      return res.status(400).json({ error: "Missing contents in request body" });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Error in gemini proxy:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Export the express app as "api" — GEMINI_API_KEY is loaded from Firebase Secrets
exports.api = onRequest({ secrets: ["GEMINI_API_KEY"] }, app);
