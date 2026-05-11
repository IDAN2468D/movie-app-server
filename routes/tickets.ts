import express, { Response } from 'express';
import { z } from 'zod';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/mailer';
import { getTicketEmailTemplate } from '../utils/emailTemplate';

const router = express.Router();

const ticketSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
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
  totalPrice: z.number(),
});

// @route   POST api/tickets
// @desc    Create a new ticket
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = ticketSchema.parse(req.body);
    
    const newTicket = new Ticket({
      user: req.userId!,
      ...validatedData
    });

    await newTicket.save();

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

export default router;
