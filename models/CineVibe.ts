import { Schema, model } from 'mongoose';

const CineVibeSchema = new Schema({
  movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  timestampMinutes: { type: Number, required: true },
  emotionCounts: {
    shock: { type: Number, default: 0 },
    tears: { type: Number, default: 0 },
    laughter: { type: Number, default: 0 },
    hype: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export const CineVibe = model('CineVibe', CineVibeSchema);
