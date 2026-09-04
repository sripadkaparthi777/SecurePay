import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function validateAnalysisInput(body) {
  if (!isPlainObject(body)) {
    return 'Request body must be a JSON object.';
  }

  const { transaction, apiResponse } = body;

  if (typeof transaction === 'undefined' &&
      typeof apiResponse === 'undefined') {
    return "Must provide 'transaction' or 'apiResponse'.";
  }

  if (
    typeof transaction !== 'undefined' &&
    !isPlainObject(transaction)
  ) {
    return "'transaction' must be a JSON object.";
  }

  if (
    typeof apiResponse !== 'undefined' &&
    !isPlainObject(apiResponse)
  ) {
    return "'apiResponse' must be a JSON object.";
  }

  return null;
}

export async function analyzeSecurity(req, res) {
  const errorReference = crypto.randomUUID();

  try {
    const validationError =
      validateAnalysisInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const {
      transaction = {},
      apiResponse = {},
    } = req.body;

    const prompt = `
You are a payment API security analyzer.

Analyze the following payment transaction and API response.

Transaction:
${JSON.stringify(transaction, null, 2)}

API Response:
${JSON.stringify(apiResponse, null, 2)}

Check for:
1. Authentication problems
2. Authorization / BOLA / IDOR
3. Input validation problems
4. Excessive data exposure
5. Rate limiting issues
6. Replay attack possibilities
7. Amount manipulation
8. Other suspicious behavior

Return JSON matching:
{
  "securityScore": number,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "vulnerabilities": [
    {
      "name": string,
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "description": string
    }
  ],
  "explanation": string,
  "recommendations": [string]
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
      structuredAnalysis =
        JSON.parse(response.text);
    } catch {
      structuredAnalysis = {
        securityScore: 50,
        riskLevel: 'UNKNOWN',
        vulnerabilities: [],
        explanation: 'Analysis returned a non-JSON response.',
        recommendations: [],
      };
    }

    return res.json({
      success: true,
      analysis: structuredAnalysis,
    });

  } catch (error) {
    console.error(
      `[AI-SECURITY-ERROR ${errorReference}]`,
      error?.message || error
    );

    return res.status(503).json({
      success: false,
      error:
        'Security analysis service is temporarily unavailable.',
      errorReference,
    });
  }
}
