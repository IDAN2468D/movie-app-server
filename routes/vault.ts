import express, { Response } from 'express';
import Collectible from '../models/Collectible';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper: Determine badge type based on ticket criteria
function determineBadgeType(ticket: any): 'bronze' | 'silver' | 'gold' | 'glass' {
  const hasVip = ticket.seats.some((s: any) => s.type.toLowerCase().includes('vip') || s.type.includes('ויפ') || s.type.includes('פראייר') || s.type.includes('פרמיום'));
  if (hasVip) return 'glass';
  
  const seatsCount = ticket.seats.length;
  if (seatsCount >= 3) return 'gold';
  if (seatsCount === 2) return 'silver';
  return 'bronze';
}

// Helper: Determine shard styling code
function generateShardId(genre: string, badgeType: string): string {
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit suffix
  return `shard_${genre || 'drama'}_${badgeType}_${randomSuffix}`;
}

// @route   GET api/vault
// @desc    Get user's CineVault collectibles
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const collectibles = await Collectible.find({ user: req.userId! }).sort({ earnedAt: -1 });
    res.json({
      success: true,
      data: collectibles.map(c => ({ id: c._id, ...c.toObject() }))
    });
  } catch (error) {
    console.error('Error fetching collectibles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/vault/sync
// @desc    Sync collectibles from past bookings
router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Find all user tickets
    const tickets = await Ticket.find({ user: userId });
    if (tickets.length === 0) {
      return res.json({
        success: true,
        message: 'No tickets found to sync',
        data: []
      });
    }

    // Find existing collectibles to avoid duplicates
    const existingCollectibles = await Collectible.find({ user: userId });
    const existingMovieIds = new Set(existingCollectibles.map(c => c.movieId));

    const newCollectibles = [];
    let pointsAwardedTotal = 0;

    for (const ticket of tickets) {
      if (!existingMovieIds.has(ticket.movieId)) {
        const genre = ticket.theme?.genre || 'drama';
        const badgeType = determineBadgeType(ticket);
        const shardId = generateShardId(genre, badgeType);

        const collectible = new Collectible({
          user: userId,
          movieId: ticket.movieId,
          movieTitle: ticket.movieTitle,
          moviePoster: ticket.moviePoster,
          genre,
          badgeType,
          shardId,
          earnedAt: ticket.bookingDate || new Date()
        });

        await collectible.save();
        newCollectibles.push(collectible);
        pointsAwardedTotal += 50; // Award 50 CinePass loyalty points for each collectible earned
      }
    }

    if (pointsAwardedTotal > 0) {
      const user = await User.findById(userId);
      if (user) {
        user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsAwardedTotal;
        user.loyaltyActivity.push({
          action: `צבירת גבישי זכוכית ב-CineVault (${newCollectibles.length} סרטים)`,
          points: `+${pointsAwardedTotal}`,
          date: new Date()
        });
        await user.save();
      }
    }

    const allCollectibles = await Collectible.find({ user: userId }).sort({ earnedAt: -1 });

    res.json({
      success: true,
      message: `Successfully synced. Earned ${newCollectibles.length} new collectibles and ${pointsAwardedTotal} CinePass points!`,
      data: allCollectibles.map(c => ({ id: c._id, ...c.toObject() }))
    });
  } catch (error) {
    console.error('Error syncing collectibles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
