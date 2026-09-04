import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

export async function analyzeSecurity(req, res) {
  try {
    const { transaction, apiResponse } = req.body || {};

    if (!transaction && !apiResponse) {
      return res.status(400).json({
        success: false,
        error: "Invalid request payload. Must provide 'transaction' or 'apiResponse'.",
      });
    }

    const prompt = `
You are a payment API security analyzer.

Analyze the following payment transaction and API response.

Transaction:
${JSON.stringify(transaction ?? {}, null, 2)}

API Response:
${JSON.stringify(apiResponse ?? {}, null, 2)}

Check for:
1. Authentication problems
2. Authorization / BOLA / IDOR
3. Input validation problems
4. Excessive data exposure
5. Rate limiting issues
6. Replay attack possibilities
7. Amount manipulation
8. Other suspicious behavior

You MUST return your analysis strictly as a JSON object matching this schema:
{
  "securityScore": number (0 to 100),
  "riskLevel": string ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL"),
  "vulnerabilities": array of objects [
    {
      "name": string,
      "severity": string ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL"),
      "description": string
    }
  ],
  "explanation": string,
  "recommendations": array of strings
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let structuredAnalysis;
    try {
      structuredAnalysis = JSON.parse(response.text);
    } catch (parseErr) {
      structuredAnalysis = {
        securityScore: 50,
        riskLevel: 'UNKNOWN',
        vulnerabilities: [],
        explanation: response.text,
        recommendations: [],
      };
    }

    return res.json({
      success: true,
      analysis: structuredAnalysis,
    });
  } catch (error) {
    console.error('Gemini error:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to perform security analysis. Please try again.',
    });
  }
}
