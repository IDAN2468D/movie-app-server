import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import SquadSession from '../models/SquadSession';
import User from '../models/User';
import { z } from 'zod';

const router = express.Router();

const createSquadSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  moviePoster: z.string(),
  date: z.string(),
  showtimeId: z.string(),
  showtimeTime: z.string(),
  showtimeHall: z.string()
});

const joinSquadSchema = z.object({
  squadCode: z.string().min(4).max(10)
});

// Helper: Generate random 6-character squad code
function generateSquadCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// @route   POST api/squad/create
// @desc    Create a new squad booking session
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createSquadSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Try generating code until unique
    let squadCode = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      squadCode = generateSquadCode();
      const existing = await SquadSession.findOne({ squadCode });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ success: false, message: 'Could not generate unique squad code' });
    }

    const newSession = new SquadSession({
      squadCode,
      ...validatedData,
      hostId: req.userId!,
      members: [{
        userId: req.userId!,
        name: user.name || 'Host',
        email: user.email,
        joinedAt: new Date()
      }],
      lockedSeats: []
    });

    await newSession.save();

    res.status(201).json({
      success: true,
      data: newSession
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Error creating squad session:', error);
    res.status(500).json({ success: false, message: 'Server error creating squad session' });
  }
});

// @route   POST api/squad/join
// @desc    Join an existing squad booking session
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { squadCode } = joinSquadSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const session = await SquadSession.findOne({ squadCode: squadCode.toUpperCase().trim() });
    if (!session) {
      return res.status(444).json({ success: false, message: 'קוד הקבוצה אינו תקין או פג תוקף' });
    }

    // Check if user is already a member
    const memberExists = session.members.some(m => m.userId === req.userId!);
    if (!memberExists) {
      session.members.push({
        userId: req.userId!,
        name: user.name || 'Friend',
        email: user.email,
        joinedAt: new Date()
      });
      await session.save();
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Error joining squad session:', error);
    res.status(500).json({ success: false, message: 'Server error joining squad session' });
  }
});

// @route   GET api/squad/:code
// @desc    Get squad session details
router.get('/:code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const code = req.params.code as string;
    const session = await SquadSession.findOne({ squadCode: code.toUpperCase() });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Squad session not found' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching squad details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching squad details' });
  }
});

export default router;
