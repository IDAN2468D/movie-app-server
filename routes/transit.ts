import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SquadTransit } from '../models/SquadTransit';

const router = Router();

const CreateTransitSchema = z.object({
  squadId: z.string(),
  driverName: z.string().min(2),
  seatsAvailable: z.number().min(1).max(8),
  pickupLocation: z.string(),
  departureTime: z.string(),
  costPerPerson: z.number().min(0),
});

router.get('/squad/:squadId', async (req: Request, res: Response) => {
  try {
    const squadId = req.params.squadId as string;
    const transit = await SquadTransit.findOne({ squadId });
    if (!transit) {
      return res.status(404).json({ message: 'No transit session found' });
    }
    return res.json(transit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/create', async (req: Request, res: Response) => {
  try {
    const parsed = CreateTransitSchema.parse(req.body);
    const newTransit = new SquadTransit({
      squadId: parsed.squadId,
      driverName: parsed.driverName,
      seatsAvailable: parsed.seatsAvailable,
      passengers: [],
      pickupLocation: parsed.pickupLocation,
      departureTime: parsed.departureTime,
      costPerPerson: parsed.costPerPerson,
      status: 'scheduled',
    });
    await newTransit.save();
    return res.status(201).json(newTransit);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/join', async (req: Request, res: Response) => {
  try {
    const { transitId, passengerName } = req.body;
    const transit = await SquadTransit.findById(transitId);
    if (!transit) {
      return res.status(404).json({ message: 'Transit not found' });
    }
    const currentPassengers = transit.passengers || [];
    const maxSeats = transit.seatsAvailable || 4;
    if (currentPassengers.length >= maxSeats) {
      return res.status(400).json({ message: 'Ride is full' });
    }
    transit.passengers = [...currentPassengers, passengerName];
    await transit.save();
    return res.json(transit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
