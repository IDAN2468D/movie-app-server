import mongoose, { Document, Schema } from 'mongoose';

export interface ICineVision extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: string;
  prompt: string;
  videoUrl: string;
  moodTags: string[];
  createdAt: Date;
}

const CineVisionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: String, required: true },
  prompt: { type: String, required: true },
  videoUrl: { type: String, required: true },
  moodTags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICineVision>('CineVision', CineVisionSchema);
