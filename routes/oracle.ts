import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import OracleBet from '../models/OracleBet';
import User from '../models/User';

const router = express.Router();

const betSchema = z.object({
  movieId: z.number(),
  predictionId: z.string(),
  question: z.string(),
  userChoice: z.string(),
  betAmount: z.number().min(5, 'הימור מינימלי הוא 5 נקודות').max(500, 'הימור מקסימלי הוא 500 נקודות'),
  odds: z.number()
});

// @route   GET api/oracle/movie/:movieId
// @desc    Get prediction prompts for a movie. Generates dynamically via Gemini if not cached.
router.get('/movie/:movieId', async (req: AuthRequest, res: Response) => {
  try {
    const movieId = parseInt(req.params.movieId as string);
    const movieTitle = req.query.title as string || 'הסרט';
    const genres = req.query.genres as string || 'Drama';

    if (isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    // Attempt dynamic prediction generation via Gemini
    let predictions = [];
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const systemPrompt = `You are a cinematic script trope analyst. Generate 3 engaging, creative binary (Yes/No) plot prediction questions for a viewer to bet on before or during the movie "${movieTitle}" (Genre: ${genres}).
Return ONLY a JSON array of objects with fields:
- id: string (e.g. "twist_1", "death_1")
- question: string (In Hebrew! Creative plot prediction)
- options: array of 2 strings (e.g. ["כן", "לא"])
- odds: array of 2 numbers (odds multiplier, e.g. [1.8, 2.1])`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Generate questions for: ${movieTitle}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          predictions = JSON.parse(text.trim());
        }
      } catch (err) {
        console.warn('Gemini failed for CineOracle, using local fallback:', err);
      }
    }

    // Fallback predictions if Gemini fails or is disabled
    if (!predictions || predictions.length === 0) {
      predictions = [
        {
          id: `twist_${movieId}_1`,
          question: `האם הדמות הראשית תגלה שמישהו קרוב אליה בגד בה במהלך הסרט?`,
          options: ['כן, תהיה בגידה', 'לא, הכל יישאר נאמן'],
          odds: [1.75, 2.10]
        },
        {
          id: `twist_${movieId}_2`,
          question: `האם הסוף יהיה סוף טוב קלאסי (Happy Ending)?`,
          options: ['כן, סוף טוב', 'לא, סוף פתוח או טרגי'],
          odds: [1.50, 2.50]
        },
        {
          id: `twist_${movieId}_3`,
          question: `האם תופיע סצנה מפתיעה לאחר כתוביות הסיום (Post-credits scene)?`,
          options: ['כן', 'לא'],
          odds: [1.90, 1.80]
        }
      ];
    }

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Error in oracle prompts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/oracle/bets
// @desc    Get user's active bets
router.get('/bets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const bets = await OracleBet.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: bets });
  } catch (error) {
    console.error('Error fetching bets:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/oracle/bet
// @desc    Place a bet using loyalty points
router.post('/bet', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.userId;

    const validated = betSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.loyaltyPoints < validated.betAmount) {
      return res.status(400).json({ success: false, message: 'אין לך מספיק נקודות נאמנות להימור זה!' });
    }

    // Check if user already placed a bet on this predictionId
    const existingBet = await OracleBet.findOne({ userId, predictionId: validated.predictionId });
    if (existingBet) {
      return res.status(400).json({ success: false, message: 'כבר ביצעת ניחוש עבור שאלה זו!' });
    }

    const newBet = new OracleBet({
      userId,
      movieId: validated.movieId,
      predictionId: validated.predictionId,
      question: validated.question,
      userChoice: validated.userChoice,
      betAmount: validated.betAmount,
      odds: validated.odds,
      isResolved: false,
      status: 'pending'
    });

    // Deduct points
    user.loyaltyPoints -= validated.betAmount;
    user.loyaltyActivity.push({
      action: `הימור עלילה: "${validated.question.substring(0, 30)}..."`,
      points: `-${validated.betAmount}`,
      date: new Date()
    });

    await newBet.save();
    await user.save();

    res.json({
      success: true,
      data: {
        bet: newBet,
        userPoints: user.loyaltyPoints
      },
      message: 'הניחוש התקבל בהצלחה! בהצלחה!'
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'פרמטרים לא תקינים', errors: (error as any).errors });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
