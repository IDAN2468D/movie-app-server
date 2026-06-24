import express, { Response } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import CineVision from '../models/CineVision';
import LensResearch from '../models/LensResearch';
import CineArtAsset from '../models/CineArtAsset';
import CineJournal from '../models/CineJournal';
import SquadBudget from '../models/SquadBudget';
import CineSoundProfile from '../models/CineSoundProfile';
import SquadTransit from '../models/SquadTransit';
import SeatAuction from '../models/SeatAuction';
import CineChatSession from '../models/CineChatSession';
import CinemaMap from '../models/CinemaMap';
import AuraProfile from '../models/AuraProfile';
import MovieHaptics from '../models/MovieHaptics';
import CineQuizLobby from '../models/CineQuizLobby';
import CineCollectible from '../models/CineCollectible';
import SquadBooking from '../models/SquadBooking';
import CinePrediction from '../models/CinePrediction';
import User from '../models/User';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';

const journalSchema = z.object({
  movieId: z.string(),
  movieTitle: z.string(),
  userRating: z.number().min(1).max(10),
  userNotes: z.string(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().optional(),
});

const squadBudgetSchema = z.object({
  squadId: z.string(),
  movieTitle: z.string(),
  eventDate: z.string(),
  participants: z.array(z.string()),
  totalBudget: z.number(),
});

const pitchDeckSchema = z.object({
  movieTitle: z.string(),
  genre: z.string(),
  pitchPrompt: z.string(),
});

const router = express.Router();

const generateVideoSchema = z.object({
  movieId: z.string(),
  movieTitle: z.string(),
  prompt: z.string(),
});

const analyzePosterSchema = z.object({
  image: z.string(), // Base64 encoded poster image
});

const generateSvgSchema = z.object({
  movieId: z.string(),
  movieTitle: z.string(),
  genre: z.string(),
  tier: z.enum(['Standard', 'VIP', 'Legendary']),
});

// Helper for Gemini calls
async function callGemini(systemInstruction: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3.1-flash-lite',
    systemInstruction 
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// @route   POST api/mcp/generate-video (CineVision AI)
// @desc    Generate a custom mood trailer preview using AI
router.post('/generate-video', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = generateVideoSchema.parse(req.body);
    const { movieId, movieTitle, prompt } = validatedData;

    let videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-foggy-forest-42512-large.mp4'; // Premium default fallback
    let moodTags = ['Cinematic', 'Atmospheric'];

    try {
      const responseText = await callGemini(
        'You are a movie trailer editor. Generate a JSON containing a simulated video URL from standard cinematic assets and mood tags based on the prompt. Return ONLY JSON format: { "videoUrl": string, "moodTags": string[] }',
        `Movie: ${movieTitle}. Prompt: ${prompt}`
      );
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.videoUrl) videoUrl = parsed.videoUrl;
      if (parsed.moodTags) moodTags = parsed.moodTags;
    } catch (apiError) {
      console.warn('[CineVision API] Gemini failed or rate-limited. Using premium default video.');
    }

    const newVision = new CineVision({
      userId: req.userId!,
      movieId,
      prompt,
      videoUrl,
      moodTags,
    });

    await newVision.save();

    return res.status(201).json({
      success: true,
      data: newVision,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineVision API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating video' });
  }
});

// @route   POST api/mcp/analyze-poster (CineLens AI)
// @desc    Analyze a base64 image poster and return trivia and details
router.post('/analyze-poster', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = analyzePosterSchema.parse(req.body);

    // Default mock response when Gemini Vision is offline
    let analysis = {
      movieTitle: 'Inception',
      directorInfo: 'Christopher Nolan',
      cinematographyStyle: 'High-contrast anamorphic, practical gravity-defying effects',
      deepTrivia: [
        'הסצנה של המלון המסתובב צולמה בתוך האנגר מטוסים ענק שבו נבנה סט מסתובב באורך 30 מטרים.',
        'הסרט עוסק בשליטה בחלומות, והסוף נשאר פתוח בכוונה כדי לעורר דיון רב-שנים.'
      ]
    };

    try {
      // In production, you would convert base64 image into Part format for Gemini Multimodal API:
      // const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      // For this implementation, we utilize the text-based Gemini metadata match or fallback
      const responseText = await callGemini(
        'You are a movie analyzer. Identify the poster and return a JSON containing: movieTitle, directorInfo, cinematographyStyle, deepTrivia (array of 2 points in Hebrew). Return ONLY JSON format: { "movieTitle": string, "directorInfo": string, "cinematographyStyle": string, "deepTrivia": string[] }',
        'Analyze this movie poster request. Generate a representative film analysis.'
      );
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.movieTitle) analysis = parsed;
    } catch (apiError) {
      console.warn('[CineLens API] Gemini image analyzer failed. Using premium fallback.');
    }

    const newResearch = new LensResearch({
      userId: req.userId!,
      sourceImageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
      analysis,
    });

    await newResearch.save();

    return res.status(201).json({
      success: true,
      data: newResearch,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineLens API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error analyzing poster' });
  }
});

// @route   POST api/mcp/generate-svg (CineArt AI)
// @desc    Generate a custom SVG collectible ticket based on movie theme and tier
router.post('/generate-svg', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = generateSvgSchema.parse(req.body);
    const { movieId, movieTitle, genre, tier } = validatedData;

    // Premium default glassmorphic SVG Ticket
    let svgFrameData = `
      <svg width="100%" height="100%" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255, 255, 255, 0.12)" />
            <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
          </linearGradient>
          <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FF1464" />
            <stop offset="100%" stop-color="#9B1B30" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="380" height="580" rx="32" fill="url(#glassGrad)" stroke="url(#borderGrad)" stroke-width="2" />
        <text x="200" y="80" fill="#FAFAF7" font-size="28" font-family="Rubik-Bold" text-anchor="middle">CINEBOOK PASS</text>
        <text x="200" y="280" fill="#E5FF00" font-size="22" font-family="Rubik-Medium" text-anchor="middle">${movieTitle.toUpperCase()}</text>
        <text x="200" y="320" fill="#A1A1AA" font-size="14" font-family="Inter" text-anchor="middle">${genre} • ${tier} TICKET</text>
        <rect x="80" y="440" width="240" height="80" rx="16" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" />
        <path d="M 100 480 L 300 480" stroke="#FAFAF7" stroke-width="4" stroke-dasharray="6,4" />
      </svg>
    `.trim();

    try {
      const responseText = await callGemini(
        'You are an SVG designer. Generate a clean, complete, and valid SVG file containing a cinematic ticket with glassmorphic cards and gold/neon borders based on the movie name and tier. Return ONLY the SVG code without any explanations or formatting blocks.',
        `Movie: ${movieTitle}, Genre: ${genre}, Tier: ${tier}. Size 400x600.`
      );
      if (responseText.includes('<svg')) {
        const cleaned = responseText.substring(responseText.indexOf('<svg'), responseText.lastIndexOf('</svg>') + 6);
        svgFrameData = cleaned;
      }
    } catch (apiError) {
      console.warn('[CineArt API] Gemini failed to generate SVG. Using default glassmorphic ticket.');
    }

    const newArt = new CineArtAsset({
      userId: req.userId!,
      movieId,
      svgFrameData,
      styleMetadata: { genre, tier },
    });

    await newArt.save();

    return res.status(201).json({
      success: true,
      data: newArt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineArt API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating SVG ticket' });
  }
});

// @route   POST api/mcp/journal (CineJournal AI & Obsidian Sync)
router.post('/journal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = journalSchema.parse(req.body);
    const { movieId, movieTitle, userRating, userNotes } = validatedData;

    let triviaDetails = [
      'הסרט הופק בטכנולוגיות צילום מתקדמות.',
      'הצילומים נערכו במספר לוקיישנים בינלאומיים.'
    ];
    let markdownTemplate = '';

    try {
      const responseText = await callGemini(
        'You are a movie journal assistant. Generate a JSON containing 2 movie trivia bullet points in Hebrew and a markdownTemplate styled for a journal entry. Return ONLY JSON format: { "triviaDetails": string[], "markdownTemplate": string }',
        `Movie: ${movieTitle}. Rating: ${userRating}/10. Notes: ${userNotes}`
      );
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.triviaDetails) triviaDetails = parsed.triviaDetails;
      if (parsed.markdownTemplate) markdownTemplate = parsed.markdownTemplate;
    } catch (apiError) {
      console.warn('[CineJournal API] Gemini failed. Using defaults.');
      markdownTemplate = `# יומן צפייה: ${movieTitle}\n\n**דירוג:** ${userRating}/10\n\n**רשמים:**\n${userNotes}`;
    }

    const newJournal = new CineJournal({
      userId: req.userId!,
      movieId,
      movieTitle,
      userRating,
      userNotes,
      triviaDetails,
      obsidianPath: `CineJournal/${movieTitle.replace(/[^a-zA-Z0-9א-ת]/g, '_')}.md`
    });

    await newJournal.save();

    return res.status(201).json({
      success: true,
      data: newJournal,
      markdownContent: markdownTemplate
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineJournal API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating journal' });
  }
});

// @route   POST api/mcp/squad-budget (CineBudget & Shared Event Planner)
router.post('/squad-budget', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = squadBudgetSchema.parse(req.body);
    const { squadId, movieTitle, eventDate, participants, totalBudget } = validatedData;

    const newBudget = new SquadBudget({
      squadId,
      movieTitle,
      eventDate: new Date(eventDate),
      participants,
      totalBudget,
      googleSheetId: `mock-sheet-${Math.random().toString(36).substring(7)}`,
      googleCalendarEventId: `mock-event-${Math.random().toString(36).substring(7)}`
    });

    await newBudget.save();

    return res.status(201).json({
      success: true,
      data: newBudget
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineBudget API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating budget' });
  }
});

// Helper to get Google Drive/Slides tokens from local config or environment variables
async function getGoogleAuthClient(): Promise<OAuth2Client | null> {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const tokenPath = path.join(homeDir, '.config', 'google-drive-mcp', 'tokens.json');
    
    if (fs.existsSync(tokenPath)) {
      console.log('[Google Auth] Using local tokens.json');
      const tokensContent = fs.readFileSync(tokenPath, 'utf-8');
      const tokens = JSON.parse(tokensContent);
      
      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
      });
      await oauth2Client.getAccessToken();
      return oauth2Client;
    } else if (process.env.GOOGLE_REFRESH_TOKEN) {
      console.log('[Google Auth] Using GOOGLE_REFRESH_TOKEN from environment variables');
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      await oauth2Client.getAccessToken();
      return oauth2Client;
    } else {
      console.warn('[Google Auth] Neither tokens.json nor GOOGLE_REFRESH_TOKEN environment variable was found.');
      return null;
    }
  } catch (error) {
    console.error('[Google Auth] Failed to create OAuth client:', error);
    return null;
  }
}


// Function to create a real presentation on Google Slides
async function createSlidesOnGoogle(
  title: string,
  slides: Array<{ title: string; content: string }>
): Promise<string | null> {
  try {
    const auth = await getGoogleAuthClient();
    if (!auth) {
      console.warn('[Google Slides] Auth client not available. Cannot create presentation.');
      return null;
    }
    
    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) {
      console.warn('[Google Slides] Failed to get access token.');
      return null;
    }
    
    // 1. Create the presentation
    console.log(`[Google Slides] Creating presentation: "${title}"`);
    const createResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title
      })
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Google Slides] Create failed:', errorText);
      return null;
    }
    
    const presentation: any = await createResponse.json();
    const presentationId = presentation.presentationId;
    console.log('[Google Slides] Presentation created with ID:', presentationId);
    
    // 2. Add the slides using batchUpdate
    const requests: any[] = [];
    
    slides.forEach((slide, index) => {
      // Object IDs must be alphanumeric and start with a letter, 5-50 characters.
      const slideId = `slide_index_${index}_${Math.random().toString(36).substring(2, 7)}`;
      const titleId = `title_index_${index}_${Math.random().toString(36).substring(2, 7)}`;
      const bodyId = `body_index_${index}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Create blank slide
      requests.push({
        createSlide: {
          objectId: slideId,
          slideLayoutCategory: 'BLANK'
        }
      });
      
      // Title text box
      requests.push({
        createShape: {
          objectId: titleId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 6000000, unit: 'EMU' },
              height: { magnitude: 1000000, unit: 'EMU' }
            },
            transform: {
              scaleX: 1, scaleY: 1,
              translateX: 1000000, translateY: 500000,
              unit: 'EMU'
            }
          }
        }
      });
      
      requests.push({
        insertText: {
          objectId: titleId,
          text: slide.title
        }
      });
      
      // Format Title Text (Make it bold/larger)
      requests.push({
        updateTextStyle: {
          objectId: titleId,
          style: {
            fontSize: { magnitude: 24, unit: 'PT' },
            bold: true,
            foregroundColor: {
              opaqueColor: {
                rgbColor: { red: 0.1, green: 0.1, blue: 0.1 }
              }
            }
          },
          textRange: { type: 'ALL' },
          fields: 'fontSize,bold,foregroundColor'
        }
      });
      
      // Body text box
      requests.push({
        createShape: {
          objectId: bodyId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 6000000, unit: 'EMU' },
              height: { magnitude: 3500000, unit: 'EMU' }
            },
            transform: {
              scaleX: 1, scaleY: 1,
              translateX: 1000000, translateY: 1700000,
              unit: 'EMU'
            }
          }
        }
      });
      
      requests.push({
        insertText: {
          objectId: bodyId,
          text: slide.content
        }
      });
      
      // Format Body Text
      requests.push({
        updateTextStyle: {
          objectId: bodyId,
          style: {
            fontSize: { magnitude: 14, unit: 'PT' },
            foregroundColor: {
              opaqueColor: {
                rgbColor: { red: 0.3, green: 0.3, blue: 0.3 }
              }
            }
          },
          textRange: { type: 'ALL' },
          fields: 'fontSize,foregroundColor'
        }
      });
    });
    
    if (requests.length > 0) {
      console.log(`[Google Slides] Sending batchUpdate with ${requests.length} requests`);
      const updateResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: requests
        })
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[Google Slides] Batch update failed:', errorText);
      } else {
        console.log('[Google Slides] Presentation populated successfully!');
      }
    }
    
    return presentationId;
  } catch (err) {
    console.error('[Google Slides] Error creating slides:', err);
    return null;
  }
}

// @route   POST api/mcp/pitch-deck (CinePitch & Production Lab)
router.post('/pitch-deck', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = pitchDeckSchema.parse(req.body);
    const { movieTitle, genre, pitchPrompt } = validatedData;

    let generatedOutline = 'תקציר כללי ומבנה סצנות מפתח.';
    let slides: Array<{ title: string; content: string }> = [];

    try {
      const responseText = await callGemini(
        'You are a creative movie producer. Generate a detailed movie pitch presentation in Hebrew. Return ONLY a valid JSON containing: "outline" (1-sentence general concept logline in Hebrew) and "slides" (an array of 3-4 slides, where each slide has a "title" in Hebrew and "content" with 2-3 bullet points or paragraphs in Hebrew). Return ONLY the raw JSON without markdown formatting blocks.',
        `Title: ${movieTitle}. Genre: ${genre}. Prompt: ${pitchPrompt}`
      );
      
      // Sanitizing JSON response
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      if (parsed.outline) generatedOutline = parsed.outline;
      if (parsed.slides && Array.isArray(parsed.slides)) {
        slides = parsed.slides;
      }
    } catch (apiError) {
      console.warn('[CinePitch API] Gemini failed to generate JSON. Falling back to default outline.');
      
      // Simple text fallback
      try {
        generatedOutline = await callGemini(
          'You are a creative movie producer. Generate a detailed movie pitch outline and production plan in Hebrew. Return plain text.',
          `Title: ${movieTitle}. Genre: ${genre}. Prompt: ${pitchPrompt}`
        );
      } catch (e) {
        generatedOutline = 'סרט מרהיב במיוחד המציג עולם דיסטופי שבו בני האדם נלחמים על זכות הקיום.';
      }
    }

    // Default slides if none were structured
    if (slides.length === 0) {
      slides = [
        {
          title: `פיץ' לסרט: ${movieTitle}`,
          content: `ז'אנר: ${genre}\n\nקונספט מרכזי: ${pitchPrompt}`
        },
        {
          title: 'תקציר מנוהל AI',
          content: generatedOutline
        },
        {
          title: 'תוכנית הפקה וחזון',
          content: '• שלב א\': כתיבת תסריט ופיתוח דמויות\n• שלב ב\': ליהוק שחקנים מובילים וצילום באתרים נבחרים\n• שלב ג\': פוסט-פרודקשן, אפקטים ויזואליים ועיצוב פסקול'
        }
      ];
    }

    // Attempt to create real Google Slides
    let googleSlidesId = `mock-slides-${Math.random().toString(36).substring(7)}`;
    try {
      const realId = await createSlidesOnGoogle(`Pitch Deck: ${movieTitle}`, slides);
      if (realId) {
        googleSlidesId = realId;
        console.log(`[CinePitch API] Successfully created real Google Slides: ${googleSlidesId}`);
      } else {
        console.warn('[CinePitch API] Google Slides creation returned null. Using mock ID.');
      }
    } catch (slidesError) {
      console.error('[CinePitch API] Failed to create Google Slides, using mock ID:', slidesError);
    }

    return res.status(201).json({
      success: true,
      data: {
        movieTitle,
        genre,
        pitchPrompt,
        outline: generatedOutline,
        googleSlidesId
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CinePitch API] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating pitch deck' });
  }
});

// ── Zod Schemas for Next-Gen Features ──
const soundProfileSchema = z.object({
  showtimeId: z.string(),
  seatCode: z.string(),
  soundMode: z.enum(['Dolby Atmos', 'Spatial Stereo', 'DTS:X']),
  gyroState: z.boolean(),
  equalizer: z.object({
    bass: z.number().min(0).max(100),
    mid: z.number().min(0).max(100),
    treble: z.number().min(0).max(100),
  }),
  roomSimLevel: z.number().min(0).max(100),
});

const transitLocationSchema = z.object({
  squadId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  status: z.enum(['driving', 'passenger', 'arrived']),
});

const directorReimagineSchema = z.object({
  movieTitle: z.string(),
  genre: z.string(),
  sceneDescription: z.string(),
});

const createAuctionSchema = z.object({
  showtimeId: z.string(),
  originalSeat: z.string(),
  targetSeat: z.string().optional(),
  pointsRequired: z.number().min(1),
  durationMinutes: z.number().min(1).default(60),
});

const placeBidSchema = z.object({
  auctionId: z.string(),
  pointsBid: z.number().min(1),
});

// ── CineSound Spatial Tuning Endpoints ──

// @route   GET api/mcp/cinesound/profile/:showtimeId/:seatCode
// @desc    Get spatial audio settings profile for a seat
router.get('/cinesound/profile/:showtimeId/:seatCode', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { showtimeId, seatCode } = req.params;
    const profile = await CineSoundProfile.findOne({ userId: req.userId as any, showtimeId: showtimeId as string, seatCode: seatCode as string });
    if (!profile) {
      return res.json({
        success: true,
        data: {
          showtimeId,
          seatCode,
          soundMode: 'Dolby Atmos',
          gyroState: true,
          equalizer: { bass: 50, mid: 50, treble: 50 },
          roomSimLevel: 70,
        }
      });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('[CineSound API] Error fetching sound profile:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching sound profile' });
  }
});

// @route   POST api/mcp/cinesound/profile
// @desc    Save/update spatial audio settings profile
router.post('/cinesound/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = soundProfileSchema.parse(req.body);
    const { showtimeId, seatCode, soundMode, gyroState, equalizer, roomSimLevel } = validatedData;
    
    const profile = await CineSoundProfile.findOneAndUpdate(
      { userId: req.userId as any, showtimeId: showtimeId as string, seatCode: seatCode as string },
      { soundMode, gyroState, equalizer, roomSimLevel },
      { new: true, upsert: true }
    );
    
    return res.json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineSound API] Error saving sound profile:', error);
    return res.status(500).json({ success: false, message: 'Server error saving sound profile' });
  }
});

// ── CineSquad Live Transit Endpoints ──

// @route   POST api/mcp/cinesquad/transit/location
// @desc    Update current transit location coordinate of a user
router.post('/cinesquad/transit/location', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = transitLocationSchema.parse(req.body);
    const { squadId, latitude, longitude, status } = validatedData;
    
    const transit = await SquadTransit.findOneAndUpdate(
      { squadId: squadId as any, userId: req.userId as any },
      { coordinates: { latitude, longitude }, status, createdAt: new Date() },
      { new: true, upsert: true }
    );
    
    return res.json({ success: true, data: transit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineSquad API] Error updating transit location:', error);
    return res.status(500).json({ success: false, message: 'Server error updating transit location' });
  }
});

// @route   GET api/mcp/cinesquad/transit/positions/:squadId
// @desc    Get transit locations of all squad members
router.get('/cinesquad/transit/positions/:squadId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { squadId } = req.params;
    const positions = await SquadTransit.find({ squadId: squadId as string }).populate('userId', 'name profileImage');
    return res.json({ success: true, data: positions });
  } catch (error) {
    console.error('[CineSquad API] Error fetching squad coordinates:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching squad coordinates' });
  }
});

// ── CineDirector AI Reimagining Endpoint ──

// @route   POST api/mcp/director/reimagine
// @desc    Reimagine a movie scene into a specific genre
router.post('/director/reimagine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = directorReimagineSchema.parse(req.body);
    const { movieTitle, genre, sceneDescription } = validatedData;
    
    let reimaginedScene = '';
    let isLocalFallback = false;
    
    try {
      const responseText = await callGemini(
        `You are a movie director and screenwriter. Rewrite the following movie scene for the film "${movieTitle}" into the style of the genre "${genre}". Make the reimagined scene dramatic, highly creative, and written in Hebrew. Return ONLY the rewritten script/text, no explanations or markdown blocks.`,
        sceneDescription
      );
      reimaginedScene = responseText.trim();
    } catch (apiError) {
      console.warn('[CineDirector AI] Gemini failed. Using premium offline simulation.');
      // High quality static mock fallback
      reimaginedScene = `[הדמיית מאיץ יצירתי קולנועי]\nסצנה משוכתבת לסרט "${movieTitle}" בז'אנר "${genre}":\nהדמויות נכנסות לרקע דרמטי מעומעם, האורות משתנים לגוונים מודגשים המאפיינים את הז'אנר. הדיאלוגים מותאמים לקצב ולרוח היצירה הקולנועית, ומייצרים מתח חדש ומפתיע התואם את האווירה הנדרשת.`;
      isLocalFallback = true;
    }
    
    return res.json({
      success: true,
      data: {
        movieTitle,
        genre,
        reimaginedScene,
        isLocalFallback
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineDirector API] Error reimagining scene:', error);
    return res.status(500).json({ success: false, message: 'Server error reimagining scene' });
  }
});

// ── CineSeat Swap & Auction Endpoints ──

// @route   POST api/mcp/seatauction/create
// @desc    List a seat for swap/auction
router.post('/seatauction/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createAuctionSchema.parse(req.body);
    const { showtimeId, originalSeat, targetSeat, pointsRequired, durationMinutes } = validatedData;
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
    
    const auction = new SeatAuction({
      showtimeId,
      ownerId: req.userId!,
      originalSeat,
      targetSeat,
      status: 'open',
      pointsRequired,
      expiresAt
    });
    
    await auction.save();
    return res.status(201).json({ success: true, data: auction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[SeatAuction API] Error creating auction:', error);
    return res.status(500).json({ success: false, message: 'Server error creating seat auction' });
  }
});

// @route   GET api/mcp/seatauction/active/:showtimeId
// @desc    Get active auctions for a showtime
router.get('/seatauction/active/:showtimeId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { showtimeId } = req.params;
    const auctions = await SeatAuction.find({ 
      showtimeId: showtimeId as string, 
      status: 'open',
      expiresAt: { $gt: new Date() }
    }).populate('ownerId', 'name profileImage');
    return res.json({ success: true, data: auctions });
  } catch (error) {
    console.error('[SeatAuction API] Error fetching active auctions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching active auctions' });
  }
});

// @route   POST api/mcp/seatauction/bid
// @desc    Place a bid on a seat auction
router.post('/seatauction/bid', authMiddleware, async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const validatedData = placeBidSchema.parse(req.body);
    const { auctionId, pointsBid } = validatedData;

    const auction = await SeatAuction.findById(auctionId).session(session);
    if (!auction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    if (auction.status !== 'open' || auction.expiresAt < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Auction is closed or expired' });
    }

    if (pointsBid <= auction.highestBid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Bid must be higher than current highest bid' });
    }

    // Check user points
    const user = await User.findById(req.userId).session(session);
    if (!user || user.loyaltyPoints < pointsBid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Insufficient CinePass points' });
    }

    // Refund previous bidder
    if (auction.highestBidderId) {
      const prevBidder = await User.findById(auction.highestBidderId).session(session);
      if (prevBidder) {
        prevBidder.loyaltyPoints += auction.highestBid;
        prevBidder.loyaltyActivity.push({
          action: `החזר נקודות - הצעה גבוהה יותר על כסא ${auction.originalSeat}`,
          points: `+${auction.highestBid}`,
          date: new Date()
        });
        await prevBidder.save();
      }
    }

    // Deduct points from new bidder
    user.loyaltyPoints -= pointsBid;
    user.loyaltyActivity.push({
      action: `הצעת ביד על כסא ${auction.originalSeat} בהקרנה`,
      points: `-${pointsBid}`,
      date: new Date()
    });
    await user.save();

    // Update auction
    auction.highestBid = pointsBid;
    auction.highestBidderId = req.userId as any;
    await auction.save();

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, data: auction });
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[SeatAuction API] Bid placement error:', error);
    return res.status(500).json({ success: false, message: 'Server error placing bid' });
  }
});

// ── Feature 1: AI Cine-Concierge Routes ──

// @route   GET api/mcp/chat/sessions
// @desc    Get user's previous chat sessions
router.get('/chat/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await CineChatSession.find({ userId: req.userId! }).sort({ createdAt: -1 });
    return res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('[Cine-Concierge API] Error fetching sessions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching chat sessions' });
  }
});

// @route   POST api/mcp/chat/session
// @desc    Create a new chat session
router.post('/chat/session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const newSession = new CineChatSession({
      userId: req.userId!,
      messages: [],
      sentimentAura: 'neutral'
    });
    await newSession.save();
    return res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    console.error('[Cine-Concierge API] Error creating session:', error);
    return res.status(500).json({ success: false, message: 'Server error creating chat session' });
  }
});

// @route   POST api/mcp/chat/message
// @desc    Send a message to the AI Cine-Concierge
router.post('/chat/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = chatMessageSchema.parse(req.body);
    const { message, sessionId } = validatedData;

    let chatSession;
    if (sessionId) {
      chatSession = await CineChatSession.findOne({ _id: sessionId, userId: req.userId! });
    }

    if (!chatSession) {
      chatSession = new CineChatSession({
        userId: req.userId!,
        messages: [],
        sentimentAura: 'neutral'
      });
    }

    // Append user message
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare context for Gemini
    const chatHistory = chatSession.messages.map(m => `${m.role === 'user' ? 'User' : 'Model'}: ${m.content}`).join('\n');

    const systemInstruction = `You are CineBook's AI Cine-Concierge (AI קונסיירז' קולנועי).
You recommend movies, answer questions about cinema, and chat with users.
Keep replies helpful, engaging, relatively brief (under 3-4 sentences), and in Hebrew.
You must respond with a JSON block containing the text answer and a sentiment/vibe label.
The sentiment/vibe label should be one of: 'energetic', 'suspenseful', 'romantic', 'chill', 'neutral'.
Select:
- 'romantic' if user talks about romance, love, or emotional movies.
- 'suspenseful' for horror, action, thriller, mystery.
- 'energetic' for comedies, animations, high excitement.
- 'chill' for slow drama, sci-fi, philosophy, relaxed conversations.
- 'neutral' otherwise.

Return ONLY this JSON format (no backticks, no extra text):
{
  "response": "Hebrew text recommendation or answer",
  "sentiment": "energetic | suspenseful | romantic | chill | neutral"
}`;

    let aiResponseText = '';
    let sentiment = 'neutral';

    try {
      const geminiResult = await callGemini(systemInstruction, chatHistory);
      const cleaned = geminiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      aiResponseText = parsed.response || 'סליחה, אירעה שגיאה בעיבוד התשובה.';
      sentiment = parsed.sentiment || 'neutral';
    } catch (apiError) {
      console.warn('[Cine-Concierge API] Gemini failed or rate-limited. Using fallback recommendation.');
      // Local fallback keywords matching
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('אימה') || lowerMsg.includes('מפחיד') || lowerMsg.includes('מתח')) {
        aiResponseText = 'אני ממליץ לך לצפות בסרט האימה החדש "לחישות באפילה" המוקרן כעת באולם 4. סרט מותח במיוחד!';
        sentiment = 'suspenseful';
      } else if (lowerMsg.includes('אהבה') || lowerMsg.includes('רומנט') || lowerMsg.includes('דרמה')) {
        aiResponseText = 'אם בא לך משהו מרגש ורומנטי, כדאי לראות את "שקיעות סגולות" - דרמה רומנטית מקסימה שקיבלה ביקורות מצוינות.';
        sentiment = 'romantic';
      } else if (lowerMsg.includes('קומד') || lowerMsg.includes('מצחיק') || lowerMsg.includes('ילדים') || lowerMsg.includes('אנימצי')) {
        aiResponseText = 'בשביל צחוק ואנרגיה טובה, אני ממליץ על קומדיית האנימציה "שובבים בחלל" - מצחיק בטירוף ומתאים לכל המשפחה!';
        sentiment = 'energetic';
      } else {
        aiResponseText = 'שלום! אני הקונסיירז׳ הקולנועי שלך. אשמח להמליץ לך על סרטים מותאמים אישית. מה בא לך לראות היום? (דרמה, קומדיה, אימה, מדע בדיוני?)';
        sentiment = 'neutral';
      }
    }

    // Append model response
    chatSession.messages.push({
      role: 'model',
      content: aiResponseText,
      timestamp: new Date()
    });
    chatSession.sentimentAura = sentiment;
    await chatSession.save();

    return res.json({
      success: true,
      data: {
        session: chatSession,
        response: aiResponseText,
        sentiment
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[Cine-Concierge API] Error sending chat message:', error);
    return res.status(500).json({ success: false, message: 'Server error in chat' });
  }
});

// ── Feature 2: AR Cinema Wayfinder Routes ──

// @route   GET api/mcp/wayfinder/map/:venueId
// @desc    Get points of interest (POIs) map for a venue (seeds default if none exists)
router.get('/wayfinder/map/:venueId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { venueId } = req.params;

    if (typeof venueId !== 'string' || !mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ success: false, message: 'Invalid venue ID format' });
    }

    let map = await CinemaMap.findOne({ venueId: new mongoose.Types.ObjectId(venueId) });

    if (!map) {
      // Seed default map POIs for this venue
      map = new CinemaMap({
        venueId: new mongoose.Types.ObjectId(venueId),
        pois: [
          { name: 'פופקורן ומזנון מהיר', type: 'buffet', coordinates: { x: 4.5, y: 2.0, z: 0.0 } },
          { name: 'חדר שירותים מרכזי', type: 'restrooms', coordinates: { x: -6.2, y: 8.0, z: 0.0 } },
          { name: 'אולם ההקרנה 4', type: 'hall', coordinates: { x: 0.0, y: 15.5, z: 1.2 } },
          { name: 'יציאת חירום ראשית', type: 'exit', coordinates: { x: 12.0, y: 25.0, z: 0.0 } }
        ]
      });
      await map.save();
    }

    return res.json({ success: true, data: map });
  } catch (error) {
    console.error('[AR-Wayfinder API] Error fetching cinema map:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching cinema map' });
  }
});

// ── Feature 3: Aura-Match Social Circles Routes ──

// Cosine Similarity Helper for local calculation
function getCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    const val1 = v1[i];
    const val2 = v2[i];
    if (val1 !== undefined && val2 !== undefined) {
      dotProduct += val1 * val2;
      mA += val1 * val1;
      mB += val2 * val2;
    }
  }
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// @route   GET api/mcp/aura/profile
// @desc    Get user's Aura profile
router.get('/aura/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let profile = await AuraProfile.findOne({ userId: req.userId! }).populate('userId', 'name email profileImage');
    if (!profile) {
      profile = new AuraProfile({
        userId: req.userId!,
        genreVector: [0.5, 0.5, 0.5, 0.5, 0.5],
        auraColor: '#8A2BE2'
      });
      await profile.save();
      profile = await profile.populate('userId', 'name email profileImage');
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('[Aura-Match API] Error getting profile:', error);
    return res.status(500).json({ success: false, message: 'Server error getting Aura profile' });
  }
});

// @route   POST api/mcp/aura/profile
// @desc    Create or update user's Aura profile
router.post('/aura/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profileSchema = z.object({
      genreVector: z.array(z.number()).length(5),
      auraColor: z.string().startsWith('#'),
      isSearching: z.boolean().optional()
    });

    const validated = profileSchema.parse(req.body);
    const { genreVector, auraColor, isSearching } = validated;

    let profile = await AuraProfile.findOne({ userId: req.userId! });
    if (!profile) {
      profile = new AuraProfile({
        userId: req.userId!,
        genreVector,
        auraColor,
        isSearching: isSearching ?? false
      });
    } else {
      profile.genreVector = genreVector;
      profile.auraColor = auraColor;
      if (isSearching !== undefined) {
        profile.isSearching = isSearching;
      }
    }

    await profile.save();
    return res.json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[Aura-Match API] Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Server error updating Aura profile' });
  }
});

// @route   POST api/mcp/aura/search
// @desc    Toggle searching status and get matching profiles (using Cosine Similarity fallback)
router.post('/aura/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const searchSchema = z.object({
      isSearching: z.boolean()
    });
    const validated = searchSchema.parse(req.body);
    const { isSearching } = validated;

    // Update active user's status
    let userProfile = await AuraProfile.findOne({ userId: req.userId! });
    if (!userProfile) {
      userProfile = new AuraProfile({
        userId: req.userId!,
        genreVector: [0.5, 0.5, 0.5, 0.5, 0.5],
        auraColor: '#8A2BE2'
      });
    }
    userProfile.isSearching = isSearching;
    await userProfile.save();

    if (!isSearching) {
      return res.json({ success: true, message: 'Stopped searching', data: [] });
    }

    // Retrieve potential matches
    const allSearchingProfiles = await AuraProfile.find({
      userId: { $ne: req.userId! },
      isSearching: true
    }).populate('userId', 'name profileImage email');

    // Rank by cosine similarity
    const matches = allSearchingProfiles.map(p => {
      const similarity = getCosineSimilarity(userProfile!.genreVector, p.genreVector);
      return {
        profile: p,
        similarity
      };
    })
    .filter(m => m.similarity > 0.4) // threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // limit top 5

    return res.json({ success: true, data: matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[Aura-Match API] Error searching matches:', error);
    return res.status(500).json({ success: false, message: 'Server error matching Auras' });
  }
});

// ── Feature 4: Haptic Cinematic Previews Routes ──

// @route   GET api/mcp/haptics/timeline/:movieId
// @desc    Get haptic timeline for a movie trailer (seeds defaults if none exists)
router.get('/haptics/timeline/:movieId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { movieId } = req.params;
    if (typeof movieId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    let timeline = await MovieHaptics.findOne({ movieId });

    if (!timeline) {
      // Seed default timeline points
      timeline = new MovieHaptics({
        movieId,
        hapticTimeline: [
          { timeMs: 2000, type: 'light' },
          { timeMs: 4500, type: 'medium' },
          { timeMs: 8000, type: 'heavy' },
          { timeMs: 12500, type: 'light' },
          { timeMs: 16000, type: 'heavy' },
          { timeMs: 20000, type: 'medium' },
          { timeMs: 25000, type: 'success' }
        ]
      });
      await timeline.save();
    }

    return res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('[Movie-Haptics API] Error fetching haptics timeline:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching haptic timeline' });
  }
});

// ── Feature 5: CineQuiz AI Arena Routes ──
const createQuizSchema = z.object({
  genres: z.array(z.string()).default(['Action', 'Drama']),
});

const joinQuizSchema = z.object({
  lobbyToken: z.string().length(6),
  name: z.string(),
  avatar: z.string().optional(),
});

router.post('/quiz/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validated = createQuizSchema.parse(req.body);
    const { genres } = validated;

    // Generate random 6-character uppercase token
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Default fallback questions in Hebrew
    let questions = [
      {
        questionText: 'מי ביים את הסרט "התחלה" (Inception)?',
        options: ['כריסטופר נולאן', 'סטיבן ספילברג', 'קוונטין טרנטינו', 'ג׳יימס קמרון'],
        correctAnswerIndex: 0,
        points: 100,
      },
      {
        questionText: 'איזה סרט זכה בפרס האוסקר לסרט הטוב ביותר בשנת 2020?',
        options: ['1917', 'פרזיטים', 'ג׳וקר', 'היו זמנים בהוליווד'],
        correctAnswerIndex: 1,
        points: 100,
      },
      {
        questionText: 'מי שיחק את תפקיד הג׳וקר בסרט "האביר האפל" (2008)?',
        options: ['חואקין פיניקס', 'ג׳ארד לטו', 'הית׳ לדג׳ר', 'ג׳ק ניקולסון'],
        correctAnswerIndex: 2,
        points: 100,
      },
      {
        questionText: 'מהו הסרט המכניס ביותר בכל הזמנים (ללא התאמה לאינפלציה)?',
        options: ['נוקמים: סוף המשחק', 'טיטאניק', 'מלחמת הכוכבים: הכוח מתעורר', 'אוואטר'],
        correctAnswerIndex: 3,
        points: 100,
      },
      {
        questionText: 'באיזה סרט מופיעה הדמות "לוק סקייווקר"?',
        options: ['מלחמת הכוכבים', 'מסע בין כוכבים', 'שר הטבעות', 'הארי פוטר'],
        correctAnswerIndex: 0,
        points: 100,
      }
    ];

    try {
      const prompt = `Generate exactly 5 cinema trivia questions in Hebrew as a JSON array. Each question must have questionText (Hebrew), options (array of 4 Hebrew strings), correctAnswerIndex (integer 0-3), and points (integer, default 100). The questions should be about movie genres: ${genres.join(', ')}. Return ONLY JSON: [{ "questionText": string, "options": string[], "correctAnswerIndex": number, "points": number }]`;
      const responseText = await callGemini(
        'You are a cinema quiz generator. You return trivia questions in Hebrew as a strict JSON array.',
        prompt
      );
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        questions = parsed.map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          points: q.points || 100
        }));
      }
    } catch (apiError) {
      console.warn('[CineQuiz API] Gemini failed to generate questions. Using premium defaults.');
    }

    const user = await User.findById(req.userId);
    const creatorName = user ? user.name : 'שחקן';

    const lobby = new CineQuizLobby({
      lobbyToken: token,
      players: [
        {
          userId: req.userId!,
          name: creatorName,
          score: 0,
          ready: true,
        },
      ],
      questions,
      currentQuestionIndex: 0,
      status: 'waiting',
    });

    await lobby.save();

    return res.status(201).json({ success: true, data: lobby });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineQuiz API] Error creating quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error creating quiz' });
  }
});

router.post('/quiz/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validated = joinQuizSchema.parse(req.body);
    const { lobbyToken, name, avatar } = validated;

    const lobby = await CineQuizLobby.findOne({ lobbyToken: lobbyToken.toUpperCase() });
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'חדר המשחק לא נמצא' });
    }

    if (lobby.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'המשחק כבר התחיל' });
    }

    const userExists = lobby.players.some(p => p.userId.toString() === req.userId);
    if (!userExists) {
      lobby.players.push({
        userId: new mongoose.Types.ObjectId(req.userId),
        name,
        score: 0,
        ready: false,
        ...(avatar ? { avatar } : {})
      } as any);
      await lobby.save();
    }

    return res.json({ success: true, data: lobby });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineQuiz API] Error joining quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error joining quiz' });
  }
});

// ── Feature 6: CineCollect 3D Memorabilia Routes ──
const unlockCollectibleSchema = z.object({
  collectibleId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  rarity: z.enum(['common', 'rare', 'legendary']).default('common'),
  modelUrl: z.string(),
  colorGlow: z.string().default('#FF1464'),
});

router.get('/collectibles', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let list = await CineCollectible.find({ userId: req.userId! });

    // Seed default collectibles if none exist
    if (list.length === 0) {
      const defaults = [
        {
          userId: new mongoose.Types.ObjectId(req.userId!),
          collectibleId: 'col-golden-ticket',
          title: 'כרטיס הזהב הקולנועי',
          description: 'כרטיס זהב יוקרתי המוענק לחברי מועדון פרימיום.',
          rarity: 'legendary',
          modelUrl: 'ticket',
          colorGlow: '#E5FF00',
        },
        {
          userId: new mongoose.Types.ObjectId(req.userId!),
          collectibleId: 'col-projector',
          title: 'מקרן רטרו 1920',
          description: 'הולוגרמה של מקרן סרטים ישן ומכובד.',
          rarity: 'rare',
          modelUrl: 'projector',
          colorGlow: '#0AEFFF',
        },
        {
          userId: new mongoose.Types.ObjectId(req.userId!),
          collectibleId: 'col-popcorn',
          title: 'גביע פופקורן אינסופי',
          description: 'גביע פופקורן מנצנץ לחובבי קולנוע אמיתיים.',
          rarity: 'common',
          modelUrl: 'popcorn',
          colorGlow: '#FF1464',
        }
      ];

      await CineCollectible.insertMany(defaults);
      list = await CineCollectible.find({ userId: req.userId! });
    }

    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('[CineCollect API] Error fetching collectibles:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching collectibles' });
  }
});

router.post('/collectibles/unlock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validated = unlockCollectibleSchema.parse(req.body);
    const { collectibleId, title, description, rarity, modelUrl, colorGlow } = validated;

    let collectible = await CineCollectible.findOne({ userId: req.userId!, collectibleId });
    if (collectible) {
      return res.json({ success: true, message: 'כבר קיים באוסף', data: collectible });
    }

    collectible = new CineCollectible({
      userId: req.userId!,
      collectibleId,
      title,
      description,
      rarity,
      modelUrl,
      colorGlow,
    });

    await collectible.save();

    return res.status(201).json({ success: true, data: collectible });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CineCollect API] Error unlocking collectible:', error);
    return res.status(500).json({ success: false, message: 'Server error unlocking collectible' });
  }
});

// ── Feature 7: CineShare Seating Room Routes ──
const createSquadBookingSchema = z.object({
  showtimeId: z.string(),
  name: z.string(),
});

router.post('/squad-booking/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validated = createSquadBookingSchema.parse(req.body);
    const { showtimeId, name } = validated;

    // Generate random 6-character room token
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Assign a random glowing color to the creator
    const colors = ['#FF1464', '#E5FF00', '#0AEFFF', '#8A2BE2', '#00FF66'];
    const creatorColor = colors[Math.floor(Math.random() * colors.length)];

    const squad = new SquadBooking({
      squadToken: token,
      showtimeId: new mongoose.Types.ObjectId(showtimeId),
      creatorId: new mongoose.Types.ObjectId(req.userId),
      members: [
        {
          userId: new mongoose.Types.ObjectId(req.userId),
          name,
          colorCode: creatorColor,
        },
      ],
      lockedSeats: [],
    });

    await squad.save();

    return res.status(201).json({ success: true, data: squad });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[SquadBooking API] Error creating room:', error);
    return res.status(500).json({ success: false, message: 'Server error creating squad room' });
  }
});

router.get('/squad-booking/:squadToken', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { squadToken } = req.params;
    if (typeof squadToken !== 'string') {
      return res.status(400).json({ success: false, message: 'קוד חדר לא תקין' });
    }
    const squad = await SquadBooking.findOne({ squadToken: squadToken.toUpperCase() });
    if (!squad) {
      return res.status(404).json({ success: false, message: 'חדר קבוצתי לא נמצא' });
    }

    return res.json({ success: true, data: squad });
  } catch (error) {
    console.error('[SquadBooking API] Error fetching room:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching squad room' });
  }
});

// ── Feature 8: CinePredict Box-Office Oracle Routes ──
const submitPredictionSchema = z.object({
  tmdbId: z.number(),
  movieTitle: z.string(),
  predictedOpeningWeekend: z.number(),
  predictedRatingScore: z.number().min(0).max(100),
  pointsStaked: z.number().nonnegative().default(0),
});

router.get('/predictions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const predictions = await CinePrediction.find({ userId: req.userId! }).sort({ createdAt: -1 });
    return res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('[CinePredict API] Error fetching predictions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching predictions' });
  }
});

router.post('/predictions/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validated = submitPredictionSchema.parse(req.body);
    const { tmdbId, movieTitle, predictedOpeningWeekend, predictedRatingScore, pointsStaked } = validated;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'משתמש לא נמצא' });
    }

    if (user.loyaltyPoints < pointsStaked) {
      return res.status(400).json({ success: false, message: 'אין מספיק נקודות נאמנות להימור זה' });
    }

    // Deduct points
    if (pointsStaked > 0) {
      user.loyaltyPoints -= pointsStaked;
      user.loyaltyActivity.push({
        action: `הימור קופות עבור ${movieTitle}`,
        points: `-${pointsStaked}`,
        date: new Date(),
      });
      await user.save();
    }

    let oracleResponseText = 'האורקל רשם את התחזית שלך. נדע בקרוב אם צדקת!';

    try {
      const response = await callGemini(
        'You are the CinePredict Box-Office Oracle, a sarcastic, witty, and highly analytical movie critic. Answer in Hebrew. Analyze the user prediction and tell them if they are dreaming or if it is realistic.',
        `סרט: "${movieTitle}". חיזוי פתיחה: $${predictedOpeningWeekend} מיליון. ציון רייטינג חזוי: ${predictedRatingScore}/100. תן ביקורת קצרה והומוריסטית בעברית על ההימור.`
      );
      if (response) oracleResponseText = response.trim();
    } catch (apiError) {
      console.warn('[CinePredict API] Gemini failed. Using default oracle note.');
    }

    const prediction = new CinePrediction({
      userId: req.userId!,
      tmdbId,
      movieTitle,
      predictedOpeningWeekend,
      predictedRatingScore,
      pointsStaked,
      isResolved: false,
      oracleResponseText,
    });

    await prediction.save();

    return res.status(201).json({
      success: true,
      data: prediction,
      userLoyaltyPoints: user.loyaltyPoints,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('[CinePredict API] Error submitting prediction:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting prediction' });
  }
});

export default router;

