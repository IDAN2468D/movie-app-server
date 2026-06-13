import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import DebateSession from '../models/DebateSession';

const router = express.Router();

const startSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
});

const messageSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  message: z.string().min(1, 'ההודעה אינה יכולה להיות ריקה').max(1000, 'ההודעה ארוכה מדי'),
});

const SYSTEM_PROMPT = `אתה מבקר קולנוע מקצועי, אינטלקטואל, פילוסופי וציניקן משנת 2026.
תפקידך לשמש כפרקליט השטן ("Devil's Advocate") ולעמת את המשתמש לגבי הדעות שלו על הסרט.
לעולם אל תסכים עם המשתמש! אם המשתמש חושב שהסרט מדהים, מצא פגמים בתסריט, בבימוי או במשחק. אם המשתמש שונא את הסרט, הגן על הערך האמנותי שלו או על האומץ של הבמאי.
השתמש בשפה עברית רהוטה, קולנועית, ביקורתית ומתוחכמת.
שמור על תשובות קצרות וקולעות - עד 3 משפטים בלבד!
אל תסכים איתו לעולם, ותמיד תאתגר את תפיסת העולם הקולנועית שלו.`;

/**
 * Call Gemini API using native fetch
 */
async function callGemini(chatHistory: any[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing');
  }

  // Format history for Gemini
  // Gemini expects roles: 'user' and 'model'. Our db matches this.
  const contents = chatHistory.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.7,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const resText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error('Invalid response structure from Gemini API');
  }

  return resText.trim();
}

/**
 * Call Local Ollama (gemma2:2b) fallback
 */
async function callOllamaFallback(chatHistory: any[]): Promise<string> {
  const url = 'http://localhost:11434/api/chat';
  
  // Format history for Ollama chat format
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...chatHistory.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content
    }))
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemma2:2b',
      messages,
      stream: false,
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama fallback failed with status ${response.status}`);
  }

  const resJson = await response.json();
  const resText = resJson?.message?.content;
  if (!resText) {
    throw new Error('Invalid response structure from Ollama API');
  }

  return resText.trim();
}

/**
 * Last-resort simulation fallback if both API and Ollama fail
 */
function getSimulatedCriticResponse(userOpinion: string, movieTitle: string): string {
  const opinion = userOpinion.toLowerCase();
  
  const highQualityKeywords = ['מדהים', 'מעולה', 'אהבתי', 'טוב', 'יפה', 'גאוני', 'מרגש', 'ממליץ', 'מושלם', '10', '9', '8'];
  const lowQualityKeywords = ['גרוע', 'משעמם', 'ארוך', 'נורא', 'מאכזב', 'פח', 'לא אהבתי', 'בזבוז', '1', '2', '3', '4'];

  const isPositive = highQualityKeywords.some(keyword => opinion.includes(keyword));
  const isNegative = lowQualityKeywords.some(keyword => opinion.includes(keyword));

  if (isPositive) {
    return `השבחים שלך ל"${movieTitle}" מוכיחים שוב כיצד הקהל הרחב נופל במלכודת של מניפולציות רגשיות זולות וקיטש הוליוודי. אם נקלף את המעטפת הוויזואלית הבוהקת, נגלה תסריט דליל, צפוי ונטול כל עומק פילוסופי אמיתי. האם באמת קל לשכנע אותך באמצעות שחזור נוסחאות שחוקות?`;
  }

  if (isNegative) {
    return `הביקורת השטחית שלך על "${movieTitle}" מתעלמת לחלוטין מהקומפוזיציה המורכבת של השוטים ומהאומץ האמנותי של הבמאי לפרוץ את גבולות הז'אנר. הקצב האיטי שאתה מכנה "משעמם" הוא למעשה בחירה מכוונת המייצרת מתח קיומי ומהדהדת את הריקנות הפוסט-מודרנית. אולי המניפסט הזה היה פשוט מתוחכם מדי עבור תפיסת הקולנוע השגרתית שלך?`;
  }

  return `העמדה הניטרלית או השגרתית שלך לגבי "${movieTitle}" מתחמקת מהדיון האמנותי המהותי שהסרט מנסה לעורר. מדובר ביצירה שאי אפשר להישאר אדישים אליה, שכן היא מפרקת את המבנה הנרטיבי המקובל ובונה אותו מחדש בחוצפה תיאטרלית. הגיע הזמן להעמיק בפרטים במקום לפזר אמירות כלליות.`;
}

// @route   POST api/debate/start
// @desc    Start or retrieve a debate session
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = startSchema.parse(req.body);
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let session = await DebateSession.findOne({ userId, movieId: validatedData.movieId });

    if (!session) {
      session = new DebateSession({
        userId,
        movieId: validatedData.movieId,
        movieTitle: validatedData.movieTitle,
        chatHistory: [],
      });
      await session.save();
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('🔥 Debate Start Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/debate/message
// @desc    Send a user message, trigger AI response and save both
router.post('/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = messageSchema.parse(req.body);
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let session = await DebateSession.findOne({ userId, movieId: validatedData.movieId });

    if (!session) {
      session = new DebateSession({
        userId,
        movieId: validatedData.movieId,
        movieTitle: validatedData.movieTitle,
        chatHistory: [],
      });
    }

    // Append user message
    session.chatHistory.push({
      role: 'user',
      content: validatedData.message,
      timestamp: new Date(),
    });

    let aiResponseText = '';

    try {
      console.log(`[DebateAI] Attempting Gemini API call for ${validatedData.movieTitle}...`);
      aiResponseText = await callGemini(session.chatHistory);
      console.log('[DebateAI] Gemini responded successfully.');
    } catch (geminiError) {
      console.warn('⚠️ Gemini API call failed. Exception:', geminiError);
      try {
        console.log('[DebateAI] Booting local Ollama fallback (gemma2:2b)...');
        aiResponseText = await callOllamaFallback(session.chatHistory);
        console.log('[DebateAI] Ollama fallback succeeded.');
      } catch (ollamaError) {
        console.warn('❌ Ollama fallback failed. Exception:', ollamaError);
        console.log('[DebateAI] Using simulated critic response generator.');
        aiResponseText = getSimulatedCriticResponse(validatedData.message, validatedData.movieTitle);
      }
    }

    // Append AI Critic response
    session.chatHistory.push({
      role: 'model',
      content: aiResponseText,
      timestamp: new Date(),
    });

    await session.save();

    res.json({
      success: true,
      data: {
        aiMessage: aiResponseText,
        history: session.chatHistory,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('🔥 Debate Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
