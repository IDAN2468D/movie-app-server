import express, { Response } from 'express';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import crypto from 'crypto';

const router = express.Router();

const paymentMethodSchema = z.object({
  last4: z.string().length(4),
  brand: z.string(),
  expiryDate: z.string(),
  holderName: z.string(),
});

// @route   GET api/users/payment-methods
// @desc    Get user payment methods
router.get('/payment-methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user.paymentMethods || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/users/payment-methods
// @desc    Add a payment method
router.post('/payment-methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = paymentMethodSchema.parse(req.body);
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.paymentMethods) {
      user.paymentMethods = [];
    }

    const newMethod = {
      id: crypto.randomUUID(),
      ...validatedData,
    };

    user.paymentMethods.push(newMethod);
    await user.save();

    res.status(201).json({ success: true, data: newMethod });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE api/users/payment-methods/:id
// @desc    Delete a payment method
router.delete('/payment-methods/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.paymentMethods = user.paymentMethods.filter(m => m.id !== req.params.id);
    await user.save();

    res.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const redeemSchema = z.object({
  rewardTitle: z.string(),
  points: z.number(),
});

// @route   POST api/users/loyalty/redeem
// @desc    Redeem loyalty points for a reward
router.post('/loyalty/redeem', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = redeemSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if ((user.loyaltyPoints || 0) < validatedData.points) {
      return res.status(400).json({ success: false, message: 'אין מספיק נקודות מועדון' });
    }

    user.loyaltyPoints -= validatedData.points;
    user.loyaltyActivity.push({
      action: `מימוש הטבה: ${validatedData.rewardTitle}`,
      points: `-${validatedData.points}`,
      date: new Date(),
    });

    await user.save();

    res.json({
      success: true,
      message: 'ההטבה מומשה בהצלחה!',
      data: {
        loyaltyPoints: user.loyaltyPoints,
        loyaltyActivity: user.loyaltyActivity,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
