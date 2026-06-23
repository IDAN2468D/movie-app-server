import mongoose, { Document, Schema } from 'mongoose';

export interface IMovieHaptics extends Document {
  movieId: string; // references movie ID
  hapticTimeline: Array<{
    timeMs: number;
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning';
  }>;
  createdAt: Date;
}

const MovieHapticsSchema: Schema = new Schema({
  movieId: { type: String, required: true, unique: true },
  hapticTimeline: [{
    timeMs: { type: Number, required: true },
    type: { type: String, enum: ['light', 'medium', 'heavy', 'success', 'warning'], required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMovieHaptics>('MovieHaptics', MovieHapticsSchema);
