import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import SynapseMap from '../models/SynapseMap';

const router = express.Router();

const emotionNodeSchema = z.object({
  timestamp: z.string(), // e.g. "00:45:12"
  sentimentScore: z.number().min(-1).max(1),
  vibe: z.string().min(1).max(50),
  note: z.string().max(200).optional()
});

const synapseSaveSchema = z.object({
  emotionNodes: z.array(emotionNodeSchema)
});

// @route   GET api/synapse/movie/:movieId
// @desc    Get aggregated emotional timeline & user's personal timeline for a movie
router.get('/movie/:movieId', async (req: AuthRequest, res: Response) => {
  try {
    const movieId = parseInt(req.params.movieId as string);
    if (isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    // Get all maps for this movie to create global emotional pulse
    const allMaps = await SynapseMap.find({ movieId });

    // Aggregate nodes by rough timestamp or return a bucketed average
    // For simplicity and high visual fidelity, return the global raw nodes compiled
    const globalNodes: any[] = [];
    
    // Simplistic bucket aggregation by 5-minute intervals
    const buckets: Record<string, { sum: number; count: number; vibes: Record<string, number> }> = {};

    allMaps.forEach(map => {
      map.emotionNodes.forEach(node => {
        // Round to nearest 5 mins, format: HH:MM:SS -> convert to minutes
        const parts = node.timestamp.split(':');
        let mins = 0;
        const part0 = parts[0];
        const part1 = parts[1];
        if (parts.length === 3 && part0 && part1) {
          mins = parseInt(part0) * 60 + parseInt(part1);
        } else if (parts.length === 2 && part0) {
          mins = parseInt(part0);
        }
        // Round to 5 min block
        const bucketKey = `${Math.floor(mins / 5) * 5}m`;
        
        if (!buckets[bucketKey]) {
          buckets[bucketKey] = { sum: 0, count: 0, vibes: {} };
        }
        buckets[bucketKey].sum += node.sentimentScore;
        buckets[bucketKey].count += 1;
        
        buckets[bucketKey].vibes[node.vibe] = (buckets[bucketKey].vibes[node.vibe] || 0) + 1;
      });
    });

    const aggregatedTimeline = Object.entries(buckets).map(([timeLabel, data]) => {
      const avgScore = data.sum / data.count;
      const topVibe = Object.entries(data.vibes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
      return {
        timeLabel,
        sentimentScore: parseFloat(avgScore.toFixed(2)),
        vibe: topVibe,
        density: data.count
      };
    }).sort((a, b) => {
      const aVal = parseInt(a.timeLabel);
      const bVal = parseInt(b.timeLabel);
      return aVal - bVal;
    });

    // If request contains token, find current user's map
    let userTimeline = null;
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const JWT_SECRET = process.env.JWT_SECRET || 'cinebook_secret_key_2026_premium';
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, JWT_SECRET);
        const map = await SynapseMap.findOne({ movieId, userId: decoded.userId });
        if (map) {
          userTimeline = map.emotionNodes;
        }
      } catch (err) {
        // Suppress auth error since this route is partially public
      }
    }

    res.json({
      success: true,
      data: {
        aggregatedTimeline,
        userTimeline
      }
    });
  } catch (error) {
    console.error('Error fetching CineSynapse data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/synapse/movie/:movieId
// @desc    Save or update user's personal emotional timeline for a movie
router.post('/movie/:movieId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const movieId = parseInt(req.params.movieId as string);
    if (isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.userId;

    const validated = synapseSaveSchema.parse(req.body);

    let synapseMap = await SynapseMap.findOne({ movieId, userId });

    if (synapseMap) {
      synapseMap.emotionNodes = validated.emotionNodes as any;
      await synapseMap.save();
    } else {
      synapseMap = new SynapseMap({
        userId,
        movieId,
        emotionNodes: validated.emotionNodes as any
      });
      await synapseMap.save();
    }

    res.json({
      success: true,
      data: synapseMap.emotionNodes,
      message: 'מפת הרגשות נשמרה בהצלחה!'
    });
  } catch (error) {
    console.error('Error saving CineSynapse data:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'פרמטרים לא תקינים', errors: (error as any).errors });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
