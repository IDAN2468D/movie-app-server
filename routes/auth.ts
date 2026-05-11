import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { z } from 'zod';

import { authMiddleware, AuthRequest } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'cinebook_secret_key_2026_premium';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password } = validatedData;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          watchlist: user.watchlist,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/auth/google
// @desc    Authenticate with Google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID Token is required' });
    }

    // Verify Google Token
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID is not defined in environment variables');
    }

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Invalid Google Token payload' });
    }

    const { email, name, sub: googleId, picture } = payload;

    // Find or Create User
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      // We generate a random password since they use Google
      const randomPassword = Math.random().toString(36).slice(-10);
      user = new User({
        name: name || 'Google User',
        email,
        password: randomPassword,
        profileImage: picture,
      });
      await user.save();
    } else if (picture && user.profileImage !== picture) {
      user.profileImage = picture;
      await user.save();
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          watchlist: user.watchlist,
        },
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          watchlist: user.watchlist,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle Watchlist / Favorites
router.post('/favorites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { movieId } = req.body;
    if (!movieId) {
      return res.status(400).json({ success: false, message: 'movieId is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const index = user.watchlist.indexOf(movieId);
    if (index === -1) {
      user.watchlist.push(movieId);
    } else {
      user.watchlist.splice(index, 1);
    }

    await user.save();

    res.json({ success: true, data: user.watchlist });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        watchlist: user.watchlist,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/auth/test-email
// @desc    Send a test email to the current user
router.post('/test-email', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.email) {
      return res.status(404).json({ success: false, message: 'User or email not found' });
    }

    const { sendEmail } = await import('../utils/mailer.js');
    await sendEmail(
      user.email,
      'CineBook Test Email',
      `<h1>היי ${user.name}!</h1><p>זהו מייל בדיקה מ-CineBook. אם קיבלת אותו, הכל מוגדר נכון!</p>`
    );

    res.json({ success: true, message: 'Test email sent' });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send test email' });
  }
});

export default router;

