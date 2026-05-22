import express, { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Review from '../models/Review';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

const reviewCreateSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z.string().min(2, 'הביקורת קצרה מדי').max(1000, 'הביקורת ארוכה מדי'),
  isSpoiler: z.boolean().default(false),
});

// @route   GET api/reviews/movie/:movieId
// @desc    Get all reviews for a movie along with rating aggregate statistics
router.get('/movie/:movieId', async (req, res: Response) => {
  try {
    const movieId = parseInt(req.params.movieId as string);
    if (isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    const reviews = await Review.find({ movieId }).sort({ createdAt: -1 });
    
    // Calculate stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });

    res.json({
      success: true,
      data: reviews,
      stats: {
        total: totalReviews,
        average: parseFloat(avgRating.toFixed(1)),
        distribution
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/reviews/movie/:movieId
// @desc    Create a new review for a movie
router.post('/movie/:movieId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const movieId = parseInt(req.params.movieId as string);
    if (isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.userId as string;

    const validatedData = reviewCreateSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user has already reviewed this movie
    const existingReview = await Review.findOne({ movieId, userId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'כבר כתבת ביקורת לסרט זה!' });
    }

    const newReview = new Review({
      movieId,
      userId,
      userName: user.name,
      userProfileImage: user.profileImage || '',
      rating: validatedData.rating,
      content: validatedData.content,
      isSpoiler: validatedData.isSpoiler,
      likes: []
    });

    await newReview.save();

    // Reward the user with 15 loyalty points for reviewing a movie!
    const rewardPoints = 15;
    user.loyaltyPoints = (user.loyaltyPoints || 0) + rewardPoints;
    user.loyaltyActivity.push({
      action: `כתיבת ביקורת סרט - ${newReview.rating} כוכבים`,
      points: `+${rewardPoints}`,
      date: new Date()
    });

    // Check for a new achievement "מבקר קולנוע" if they've reviewed their first movie!
    const reviewCount = await Review.countDocuments({ userId });
    const newTrophies = [...(user.loyaltyTrophies || [])];
    if (reviewCount >= 1 && !newTrophies.includes('מבקר קולנוע')) {
      newTrophies.push('מבקר קולנוע');
      user.loyaltyActivity.push({
        action: 'הישג חדש: מבקר קולנוע 🏆',
        points: '+0',
        date: new Date(),
      });
      user.loyaltyTrophies = newTrophies;
    }

    await user.save();

    res.status(201).json({
      success: true,
      data: newReview,
      message: 'הביקורת פורסמה בהצלחה! קיבלת 15 נקודות מועדון.'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/reviews/:reviewId/like
// @desc    Toggle helpful like on a review
router.post('/:reviewId/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const likeIndex = review.likes.findIndex(id => id.toString() === req.userId);

    let isLiked = false;
    if (likeIndex > -1) {
      // Already liked, so unlike it
      review.likes.splice(likeIndex, 1);
    } else {
      // Not liked yet, so like it
      review.likes.push(new mongoose.Types.ObjectId(req.userId) as any);
      isLiked = true;
    }

    await review.save();

    res.json({
      success: true,
      likesCount: review.likes.length,
      isLiked
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE api/reviews/:reviewId
// @desc    Delete a review
router.delete('/:reviewId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Only allow owner or admin to delete
    if (review.userId.toString() !== req.userId) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    res.json({ success: true, message: 'הביקורת נמחקה בהצלחה' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
