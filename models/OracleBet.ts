import mongoose, { Schema, Document } from 'mongoose';

export interface IOracleBet extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: number;
  predictionId: string;
  question: string;
  userChoice: string;
  betAmount: number;
  odds: number;
  isResolved: boolean;
  isWon?: boolean;
  status: 'pending' | 'won' | 'lost';
  createdAt: Date;
  updatedAt: Date;
}

const OracleBetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Number, required: true },
    predictionId: { type: String, required: true },
    question: { type: String, required: true },
    userChoice: { type: String, required: true },
    betAmount: { type: Number, required: true },
    odds: { type: Number, required: true },
    isResolved: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending' }
  },
  { timestamps: true }
);

// Compound index so a user cannot make multiple bets on the same predictionId
OracleBetSchema.index({ userId: 1, predictionId: 1 }, { unique: true });

export default mongoose.model<IOracleBet>('OracleBet', OracleBetSchema);
