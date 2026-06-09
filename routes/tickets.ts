import express, { Request, Response } from 'express';
import { z } from 'zod';
import Ticket from '../models/Ticket';
import Collectible from '../models/Collectible';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/mailer';
import { getTicketEmailTemplate } from '../utils/emailTemplate';

const router = express.Router();

const snackSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  image: z.string(),
});

const ticketSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  moviePoster: z.string().optional(),
  date: z.string(),
  showtime: z.object({
    time: z.string(),
    format: z.string(),
    price: z.number(),
    hall: z.string(),
  }),
  seats: z.array(
    z.object({
      row: z.string(),
      number: z.number(),
      type: z.string(),
    })
  ),
  snacks: z.array(snackSchema).optional(),
  totalPrice: z.number(),
  deliveryMode: z.enum(['immediate', 'pre-sync']).optional().default('immediate'),
  targetDeliveryTime: z.string().or(z.date()).optional(),
});

// Helper: get movie theme based on title keywords
function getMovieTheme(title: string) {
  const t = title.toLowerCase();
  if (t.includes('מואנה') || t.includes('moana') || t.includes('comedy') || t.includes('אנימציה') || t.includes('קומדיה')) {
    return {
      primaryColor: '#FFE500', // Neon Yellow
      secondaryColor: '#00E5FF', // Electric Blue
      genre: 'comedy'
    };
  } else if (t.includes('דדפול') || t.includes('deadpool') || t.includes('גלדיאטור') || t.includes('gladiator') || t.includes('אקשן') || t.includes('action')) {
    return {
      primaryColor: '#FF1464', // Neon Crimson
      secondaryColor: '#FF8A00', // Orange Glow
      genre: 'action'
    };
  } else if (t.includes('רשע') || t.includes('wicked') || t.includes('מכשפה')) {
    return {
      primaryColor: '#D500F9', // Deep Purple
      secondaryColor: '#00E676', // Witch Green
      genre: 'sci-fi'
    };
  } else if (t.includes('אימה') || t.includes('horror') || t.includes('מתח') || t.includes('thriller')) {
    return {
      primaryColor: '#900C3F', // Crimson
      secondaryColor: '#1A1A1D', // Dark Slate
      genre: 'horror'
    };
  } else {
    // Default Drama/Rose theme
    return {
      primaryColor: '#FF1464', // Rose Pink
      secondaryColor: '#FFB300', // Gold Accent
      genre: 'drama'
    };
  }
}

// @route   POST api/tickets
// @desc    Create a new ticket
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = ticketSchema.parse(req.body);
    const resolvedTheme = getMovieTheme(validatedData.movieTitle);
    
    const newTicket = new Ticket({
      user: req.userId!,
      ...validatedData,
      theme: resolvedTheme
    });

    await newTicket.save();

    // Create a new collectible badge in user's CineVault
    const seatsCount = validatedData.seats.length;
    const genre = resolvedTheme.genre || 'drama';
    let badgeType: 'bronze' | 'silver' | 'gold' | 'glass' = 'bronze';
    const hasVip = validatedData.seats.some((s: any) => s.type.toLowerCase().includes('vip') || s.type.includes('ויפ') || s.type.includes('פרמיום'));
    if (hasVip) {
      badgeType = 'glass';
    } else if (seatsCount >= 3) {
      badgeType = 'gold';
    } else if (seatsCount === 2) {
      badgeType = 'silver';
    }
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const shardId = `shard_${genre}_${badgeType}_${randomSuffix}`;

    const newCollectible = new Collectible({
      user: req.userId!,
      movieId: validatedData.movieId,
      movieTitle: validatedData.movieTitle,
      moviePoster: validatedData.moviePoster,
      genre,
      badgeType,
      shardId,
      earnedAt: new Date()
    });
    await newCollectible.save();

    // Loyalty Points calculations
    const snacksCount = validatedData.snacks ? validatedData.snacks.reduce((acc, curr) => acc + curr.quantity, 0) : 0;
    const pointsAwarded = (seatsCount * 50) + (snacksCount * 15) + 50; // Earn extra 50 points for the new collectible shard!

    if (pointsAwarded > 0) {
      const user = await User.findById(req.userId!);
      if (user) {
        user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsAwarded;
        
        user.loyaltyActivity.push({
          action: `רכישת כרטיסים/נשנושים - ${validatedData.movieTitle}`,
          points: `+${pointsAwarded - 50}`,
          date: new Date(),
        });

        user.loyaltyActivity.push({
          action: `גביש זכוכית חדש ב-CineVault (${validatedData.movieTitle}) 🏆`,
          points: `+50`,
          date: new Date(),
        });

        const newTrophies: string[] = [...(user.loyaltyTrophies || [])];
        const previousTicketsCount = await Ticket.countDocuments({ user: req.userId! });
        // Since we just saved newTicket, previousTicketsCount already includes the current ticket!
        const currentTicketsCount = previousTicketsCount;

        // 1. "צופה מתחיל" - first ticket
        if (currentTicketsCount >= 1 && !newTrophies.includes('צופה מתחיל')) {
          newTrophies.push('צופה מתחיל');
          user.loyaltyActivity.push({
            action: 'הישג חדש: צופה מתחיל 🏆',
            points: '+0',
            date: new Date(),
          });
        }

        // 2. "מנשנש מקצועי" - bought snacks in this ticket or previously
        const hasBoughtSnacksNow = snacksCount >= 1;
        const previouslyBoughtSnacks = await Ticket.findOne({ user: req.userId!, 'snacks.0': { $exists: true } });
        if ((hasBoughtSnacksNow || previouslyBoughtSnacks) && !newTrophies.includes('מנשנש מקצועי')) {
          newTrophies.push('מנשנש מקצועי');
          user.loyaltyActivity.push({
            action: 'הישג חדש: מנשנש מקצועי 🏆',
            points: '+0',
            date: new Date(),
          });
        }

        // 3. "חבר זהב" - user has >= 300 points
        if (user.loyaltyPoints >= 300 && !newTrophies.includes('חבר זהב')) {
          newTrophies.push('חבר זהב');
          user.loyaltyActivity.push({
            action: 'הישג חדש: חבר זהב 🏆',
            points: '+0',
            date: new Date(),
          });
        }

        // 4. "מאסטר קולנוע" - >= 3 tickets or has >= 500 points
        if ((currentTicketsCount >= 3 || user.loyaltyPoints >= 500) && !newTrophies.includes('מאסטר קולנוע')) {
          newTrophies.push('מאסטר קולנוע');
          user.loyaltyActivity.push({
            action: 'הישג חדש: מאסטר קולנוע 🏆',
            points: '+0',
            date: new Date(),
          });
        }

        user.loyaltyTrophies = newTrophies;
        await user.save();
      }
    }

    res.status(201).json({
      success: true,
      data: { id: newTicket._id, ...newTicket.toObject() }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/tickets
// @desc    Get all tickets for logged in user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await Ticket.find({ user: req.userId! }).sort({ bookingDate: -1 });
    
    res.json({
      success: true,
      data: tickets.map(t => ({ id: t._id, ...t.toObject() }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/tickets/:id/email
// @desc    Send ticket details to user email
router.post('/:id/email', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id as any, user: req.userId! });
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const user = await User.findById(req.userId!);
    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    const emailHtml = getTicketEmailTemplate({
      movieTitle: ticket.movieTitle,
      date: ticket.date,
      time: ticket.showtime.time,
      hall: ticket.showtime.hall,
      seats: ticket.seats,
      totalPrice: ticket.totalPrice,
      bookingId: ticket._id.toString(),
    });

    await sendEmail(
      user.email,
      `CineBook: הכרטיס שלך לסרט ${ticket.movieTitle}`,
      emailHtml
    );

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email route error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send email' 
    });
  }
});

// @route   GET api/tickets/:id/wallet/pass
// @desc    Generate and serve Apple Wallet / Google Wallet pass file
router.get('/:id/wallet/pass', async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).send('Ticket not found');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="ticket_${ticketId}.pkpass"`);

    console.log(`[Wallet] Serving pkpass file stream for movie: ${ticket.movieTitle}`);
    
    const mockPassBuffer = Buffer.from('PKPASS_MOCK_DATA_' + JSON.stringify({
      serialNumber: ticket._id.toString(),
      logoText: "CineBook",
      movieTitle: ticket.movieTitle,
      showtime: ticket.showtime.time,
      hall: ticket.showtime.hall,
      seats: ticket.seats.map(s => `${s.row}-${s.number}`).join(', '),
      barcode: ticket._id.toString()
    }));
    
    res.send(mockPassBuffer);
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).send('Error generating ticket pass');
  }
});

export default router;
