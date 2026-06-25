import { Router } from 'express';
import { db } from '../config/firebase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // RAG: Fetch basic aggregated stats to give Gemini context
    const reportsSnap = await db.collection('reports').get();
    let openCount = 0;
    let resolvedCount = 0;
    const wards = {};
    const categories = {};

    reportsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === 'resolved') resolvedCount++;
      else openCount++;
      
      const ward = data.wardId || 'unknown';
      wards[ward] = (wards[ward] || 0) + 1;
      
      const cat = data.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const contextStr = `
Current System Context:
Total Open Issues: ${openCount}
Total Resolved Issues: ${resolvedCount}
Issues per Ward: ${JSON.stringify(wards)}
Issues per Category: ${JSON.stringify(categories)}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are CivicBot, an AI assistant for the CivicWatch accountability platform. 
Answer the user's question helpfully, concisely, and professionally. Use the following real-time system context if relevant. If they ask a general question, answer it. If they ask for statistics, use the context provided.
${contextStr}

User Question: ${message}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ reply: responseText });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
