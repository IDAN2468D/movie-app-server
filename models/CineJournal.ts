import mongoose, { Document, Schema } from 'mongoose';

export interface ICineJournal extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: string;
  movieTitle: string;
  userRating: number;
  userNotes: string;
  triviaDetails: string[];
  svgCollectibleUrl?: string;
  obsidianPath?: string;
  createdAt: Date;
}

const CineJournalSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: String, required: true },
  movieTitle: { type: String, required: true },
  userRating: { type: Number, required: true, min: 1, max: 10 },
  userNotes: { type: String, required: true },
  triviaDetails: [{ type: String }],
  svgCollectibleUrl: { type: String },
  obsidianPath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICineJournal>('CineJournal', CineJournalSchema);
