import mongoose, { Document, Schema } from 'mongoose';

export interface ISeatAuction extends Document {
  showtimeId: string;
  ownerId: mongoose.Types.ObjectId;
  originalSeat: string;
  targetSeat?: string; // Optional: specify target seat for a direct swap
  status: 'open' | 'pending' | 'completed' | 'cancelled';
  highestBid: number;
  highestBidderId?: mongoose.Types.ObjectId;
  pointsRequired: number; // Base points or instant swap points cost
  expiresAt: Date;
  createdAt: Date;
}

const SeatAuctionSchema: Schema = new Schema({
  showtimeId: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalSeat: { type: String, required: true },
  targetSeat: { type: String },
  status: { 
    type: String, 
    enum: ['open', 'pending', 'completed', 'cancelled'], 
    default: 'open' 
  },
  highestBid: { type: Number, default: 0 },
  highestBidderId: { type: Schema.Types.ObjectId, ref: 'User' },
  pointsRequired: { type: Number, default: 50 }, // standard starting price in CinePass points
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISeatAuction>('SeatAuction', SeatAuctionSchema);
