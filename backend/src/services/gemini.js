import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const FALLBACK_CLASSIFY = {
  category: 'other',
  severity: 'medium',
  summary: 'Infrastructure issue reported by citizen requiring inspection.',
  humanReadable: 'Uncategorized infrastructure issue reported by citizen.',
  reasoning: 'Fallback classification used due to system error. Requires manual inspection.',
  confidence: 0.5,
};

const FALLBACK_PATTERN = {
  is_systemic: true,
  insight: 'Recurring issues suggest underlying infrastructure maintenance deficit in this area.',
  recommended_priority: 'high',
};

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;
  return new GoogleGenerativeAI(apiKey);
}

export async function classifyReport(imageUrl, description) {
  const genAI = getGenAI();
  if (!genAI) {
    console.warn('Gemini not configured, using fallback classification');
    return FALLBACK_CLASSIFY;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are a civic issue classifier. Given an image and a short description, return ONLY valid JSON, no markdown formatting, no explanation:
{
  "category": "pothole" | "streetlight" | "garbage" | "water_leak" | "other",
  "severity": "low" | "medium" | "high",
  "summary": "<one sentence, max 20 words, describing the issue>",
  "humanReadable": "<a descriptive line as if a human inspector wrote it, e.g. 'Medium-depth pothole, ~60cm wide, on a main road'>",
  "reasoning": "<explain why this categorization and severity were chosen, specifically noting any urgency context like proximity to a school, hospital, or main road>",
  "confidence": <float between 0 and 1>
}
Severity rules: "high" = safety risk, blocks access/movement, OR near a school/hospital/main road; "medium" = ongoing inconvenience; "low" = minor/cosmetic.
IMPORTANT: You MUST detect urgency context from the image (like proximity to a school, hospital, or main road). If you see this, automatically raise severity to "high" and explain this in the "reasoning".`;

    let parts = [{ text: `${systemPrompt}\n\nDescription: ${description}` }];

    // Fetch image and pass as inline data
    if (imageUrl && !imageUrl.includes('placeholder')) {
      try {
        const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
        const contentType = imageResp.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(imageResp.data).toString('base64');
        parts.push({ inlineData: { mimeType: contentType, data: base64 } });
      } catch {
        console.warn('Could not fetch image for classification, using text only');
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini classify error:', err.message);
    return FALLBACK_CLASSIFY;
  }
}

export async function analyzePattern(reportSummaries, wardId, category) {
  const genAI = getGenAI();
  if (!genAI) {
    console.warn('Gemini not configured, using fallback pattern analysis');
    return FALLBACK_PATTERN;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a civic pattern analyst. Given this list of reports for one ward and category over the last 30 days: ${JSON.stringify(reportSummaries)}, return ONLY valid JSON:
{
  "is_systemic": <true/false>,
  "insight": "<one sentence describing the likely root cause, max 25 words>",
  "recommended_priority": "low" | "medium" | "high" | "urgent"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini pattern error:', err.message);
    return FALLBACK_PATTERN;
  }
}

export async function generateResolutionPlan(category, severity, description) {
  const genAI = getGenAI();
  if (!genAI) return { steps: ['Inspect issue manually', 'Allocate resources', 'Execute repair'], estimatedCost: 'Unknown', departments: ['Public Works'] };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an AI city planner and resolution agent. Create a practical resolution plan for this civic issue:
Category: ${category}
Severity: ${severity}
Description: ${description}

Return ONLY valid JSON (no markdown):
{
  "steps": ["Step 1 (Inspection)...", "Step 2 (Procurement/Action)...", "Step 3 (Verification)..."],
  "estimatedCost": "Provide a realistic estimate, e.g. '$500 - $1000' or 'Requires major budget'",
  "departments": ["Relevant City Department 1", "Relevant City Department 2"]
}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error('Gemini resolution plan error:', err.message);
    return { steps: ['Inspect issue manually'], estimatedCost: 'Unknown', departments: ['Public Works'] };
  }
}
