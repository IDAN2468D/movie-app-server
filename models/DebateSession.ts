import mongoose, { Document, Schema } from 'mongoose';

export interface IDebateMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface IDebateSession extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: number; // TMDB movie ID
  movieTitle: string;
  chatHistory: IDebateMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const DebateSessionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Number, required: true },
    movieTitle: { type: String, required: true },
    chatHistory: [
      {
        role: { type: String, enum: ['user', 'model'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Compound index to quickly find user debate sessions for a movie
DebateSessionSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IDebateSession>('DebateSession', DebateSessionSchema);
