import express, { Response } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import StoryboardPitch from '../models/StoryboardPitch';

const router = express.Router();

const pitchRequestSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  prompt: z.string(),
  castList: z.array(z.string()),
});

// Helper: Local fallback generator if both Gemini and Ollama fail
function generateLocalScriptFallback(movieTitle: string, prompt: string, castList: string[]) {
  const actor1 = castList[0] || 'גיבור';
  const actor2 = castList[1] || 'נבל';
  const actor3 = castList[2] || 'סיידקיק';

  const cleanPrompt = prompt.replace(/[?.!]/g, '').trim();

  let scene1Visual = `סצנת פתיחה קולנועית מתוך ${movieTitle}. ההתרחשות מתחילה בהשראת הרעיון: "${cleanPrompt}".`;
  let scene1Dialogue = `${actor1}: "איך הגענו למצב הזה? הכל קורה כל כך מהר."`;

  let scene2Visual = `המצב מסתבך מחוץ לגבולות המוכרים. ${actor2} נכנס לתמונה עם תפנית דרמטית בהשראת "${cleanPrompt}".`;
  let scene2Dialogue = `${actor2}: "אם חשבת שתוכל לברוח מזה, טעית בגדול."`;

  let scene3Visual = `ההכרעה הסופית של העלילה. ${actor3} מנסה להציל את המצב ברגע האחרון.`;
  let scene3Dialogue = `${actor3}: "זה הרגע שלנו לפעול, אין לנו הזדמנות שנייה!"`;

  return [
    { sceneNumber: 1, visualPrompt: scene1Visual, dialogue: scene1Dialogue },
    { sceneNumber: 2, visualPrompt: scene2Visual, dialogue: scene2Dialogue },
    { sceneNumber: 3, visualPrompt: scene3Visual, dialogue: scene3Dialogue },
  ];
}

// @route   POST api/director/pitch
// @desc    Generate a custom script & storyboard pitch based on a user prompt and cast
router.post('/pitch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = pitchRequestSchema.parse(req.body);
    const { movieId, movieTitle, prompt, castList } = validatedData;

    const actor1 = castList[0] || 'שחקן 1';
    const actor2 = castList[1] || 'שחקן 2';
    const actor3 = castList[2] || 'שחקן 3';

    let generatedScenes: any[] = [];
    let posterConcept = `כרזה קולנועית אפלה ומעוררת השראה עבור הסרט המבוסס על ${movieTitle}.`;

    const systemInstruction = `אתה תסריטאי ובמאי קולנוע מומחה. תפקידך ליצור תסריט לסרט קצר ולוח התרחשויות (storyboard) המבוסס על רעיון של המשתמש.`;

    const modelPrompt = `צור תסריט קצר וסצנות storyboard מפורטות לסרט המבוסס על הסרט "${movieTitle}".
הרעיון הכללי של המשתמש הוא: "${prompt}"
השחקנים הראשיים שלוהקו לתפקיד הם: ${castList.join(', ')}

אנא צור בדיוק 3 סצנות מפתח. החזר תוצאה במבנה JSON תקין בלבד, ללא קוד markdown, ללא הקדמות וללא הערות.
מבנה ה-JSON חייב להיות בדיוק כזה:
{
  "posterConcept": "תיאור קולנועי מרהיב בעברית של כרזת הסרט המתאימה לאווירה (עד 20 מילים)",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualPrompt": "תיאור ויזואלי מפורט של הסצנה עבור הבמאי/צייר בעברית (עד 15 מילים)",
      "dialogue": "שורת דיאלוג דרמטית בעברית המיוחסת לאחד מהשחקנים שלוהקו (למשל, ${actor1}: 'שלום עולם')"
    },
    {
      "sceneNumber": 2,
      "visualPrompt": "תיאור ויזואלי של הסצנה השנייה בעברית (עד 15 מילים)",
      "dialogue": "שורת דיאלוג של שחקן אחר (למשל, ${actor2}: 'אני כאן')"
    },
    {
      "sceneNumber": 3,
      "visualPrompt": "תיאור ויזואלי של הסצנה השלישית בעברית (עד 15 מילים)",
      "dialogue": "שורת דיאלוג נוספת (למשל, ${actor3}: 'הסוף הגיע')"
    }
  ]
}
הקפד לכתוב את כל הדיאלוגים והתיאורים בעברית רהוטה וקולנועית.`;

    // Try Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    let geminiSuccess = false;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          systemInstruction
        });

        const result = await model.generateContent(modelPrompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.scenes && parsed.scenes.length === 3) {
          generatedScenes = parsed.scenes;
          posterConcept = parsed.posterConcept || posterConcept;
          geminiSuccess = true;
          console.log('🎬 Storyboard generated successfully via Google Gemini API.');
        }
      } catch (geminiError) {
        console.warn('⚠️ Google Gemini API failed or rate limited. Redirecting to local Ollama fallback...');
      }
    }

    // Fallback 1: Local Ollama Server (gemma2:2b)
    if (!geminiSuccess) {
      try {
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma2:2b',
            prompt: `${systemInstruction}\n\n${modelPrompt}`,
            stream: false,
          }),
        });

        if (ollamaResponse.ok) {
          const ollamaData: any = await ollamaResponse.json();
          const text = ollamaData.response;
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonStr);

          if (parsed.scenes && parsed.scenes.length === 3) {
            generatedScenes = parsed.scenes;
            posterConcept = parsed.posterConcept || posterConcept;
            geminiSuccess = true;
            console.log('🤖 Storyboard generated successfully via Local Ollama (gemma2:2b).');
          }
        }
      } catch (ollamaError) {
        console.warn('⚠️ Local Ollama server is offline or unreachable. Using rule-based fallback generator...');
      }
    }

    // Fallback 2: Rule-Based Fallback Engine (100% Uptime Guaranteed)
    if (!geminiSuccess) {
      generatedScenes = generateLocalScriptFallback(movieTitle, prompt, castList);
      console.log('🛡️ Storyboard generated successfully via Rule-Based Offline Fallback.');
    }

    // Save pitch to MongoDB
    const newPitch = new StoryboardPitch({
      user: req.userId!,
      movieId,
      movieTitle,
      prompt,
      castList,
      storyboardCards: generatedScenes.map((s, idx) => ({
        sceneNumber: s.sceneNumber || idx + 1,
        visualPrompt: s.visualPrompt,
        dialogue: s.dialogue,
      })),
    });

    await newPitch.save();

    res.status(201).json({
      success: true,
      data: {
        id: newPitch._id,
        movieTitle: newPitch.movieTitle,
        posterConcept,
        scenes: newPitch.storyboardCards
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('🔥 Error creating storyboard pitch:', error);
    res.status(500).json({ success: false, message: 'Server error generating storyboard pitch' });
  }
});

const saveRequestSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  prompt: z.string(),
  castList: z.array(z.string()),
  posterConcept: z.string(),
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    visualPrompt: z.string(),
    dialogue: z.string(),
  })),
});

// @route   POST api/director/pitch/save
// @desc    Save a client-side generated pitch & storyboard in MongoDB
router.post('/pitch/save', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = saveRequestSchema.parse(req.body);
    const { movieId, movieTitle, prompt, castList, posterConcept, scenes } = validatedData;

    const newPitch = new StoryboardPitch({
      user: req.userId!,
      movieId,
      movieTitle,
      prompt,
      castList,
      storyboardCards: scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        visualPrompt: s.visualPrompt,
        dialogue: s.dialogue,
      })),
    });

    await newPitch.save();

    res.status(201).json({
      success: true,
      data: {
        id: newPitch._id,
        movieTitle: newPitch.movieTitle,
        posterConcept,
        scenes: newPitch.storyboardCards
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('🔥 Error saving storyboard pitch:', error);
    res.status(500).json({ success: false, message: 'Server error saving storyboard pitch' });
  }
});

export default router;
