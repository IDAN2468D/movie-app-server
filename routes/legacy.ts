import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Ticket from '../models/Ticket';

const router = express.Router();

type StandardGenre = 'action' | 'comedy' | 'sci-fi' | 'horror' | 'drama';

// @route   GET api/legacy
// @desc    Get user's cinema legacy profile (genre ratios, level, rank) based on tickets bought
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch all tickets bought by the user
    const tickets = await Ticket.find({ user: userId });

    const genreCounts: Record<StandardGenre, number> = {
      action: 0,
      comedy: 0,
      'sci-fi': 0,
      horror: 0,
      drama: 0,
    };

    let totalTickets = 0;

    const isStandardGenre = (g: string): g is StandardGenre => {
      return ['action', 'comedy', 'sci-fi', 'horror', 'drama'].includes(g);
    };

    tickets.forEach((ticket) => {
      if (ticket.theme && ticket.theme.genre) {
        const genre = ticket.theme.genre.toLowerCase();
        // Map any unexpected variations to standard keys if necessary
        const standardGenre = genre === 'scifi' ? 'sci-fi' : genre;
        if (isStandardGenre(standardGenre)) {
          genreCounts[standardGenre] += ticket.seats.length; // Count by seats bought
          totalTickets += ticket.seats.length;
        } else {
          // If genre is not standard, map to drama by default
          genreCounts.drama += ticket.seats.length;
          totalTickets += ticket.seats.length;
        }
      } else {
        // Fallback to drama if no theme/genre is recorded
        genreCounts.drama += ticket.seats.length;
        totalTickets += ticket.seats.length;
      }
    });

    // Compute ratios
    const genreRatios: Record<string, number> = {};
    if (totalTickets > 0) {
      Object.keys(genreCounts).forEach((key) => {
        const standardKey = key as StandardGenre;
        genreRatios[key] = parseFloat((genreCounts[standardKey] / totalTickets).toFixed(2));
      });
    } else {
      // Default equal ratios if user has no tickets
      Object.keys(genreCounts).forEach((key) => {
        genreRatios[key] = 0.2;
      });
    }

    // Determine dominant genre
    let dominantGenre: StandardGenre = 'drama';
    let maxCount = -1;
    Object.keys(genreCounts).forEach((key) => {
      const standardKey = key as StandardGenre;
      if (genreCounts[standardKey] > maxCount) {
        maxCount = genreCounts[standardKey];
        dominantGenre = standardKey;
      }
    });

    // If no tickets purchased, set default title
    let rankName = 'שומר המורשת הקולנועית';
    if (totalTickets > 0) {
      switch (dominantGenre as string) {
        case 'action':
          rankName = 'לוחם מסך אגדי ⚔️';
          break;
        case 'comedy':
          rankName = 'נסיך ההומור והצחוק 🎭';
          break;
        case 'sci-fi':
          rankName = 'נווט קוסמי בין כוכבים 🚀';
          break;
        case 'horror':
          rankName = 'שורד לילות האימה 💀';
          break;
        case 'drama':
        default:
          rankName = 'מאסטר הדרמה והרגש 🎬';
          break;
      }
    }

    const legacyLevel = 1 + Math.floor(tickets.length / 2);
    const totalWatchTime = tickets.length * 120; // 120 minutes per movie

    res.json({
      success: true,
      data: {
        genreRatios,
        totalWatchTime,
        legacyLevel,
        rankName,
        totalTickets: tickets.length,
      },
    });
  } catch (error) {
    console.error('🔥 Fetch Legacy Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
