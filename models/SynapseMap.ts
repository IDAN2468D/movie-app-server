import mongoose, { Schema, Document } from 'mongoose';

export interface IEmotionNode {
  timestamp: string; // e.g. "01:15:30"
  sentimentScore: number; // range -1.0 (sadness) to 1.0 (joy)
  vibe: string; // descriptive string, e.g. "suspense", "exhilaration", "melancholy"
  note?: string;
}

export interface ISynapseMap extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: number; // TMDB Movie ID
  emotionNodes: IEmotionNode[];
  createdAt: Date;
  updatedAt: Date;
}

const EmotionNodeSchema = new Schema({
  timestamp: { type: String, required: true },
  sentimentScore: { type: Number, required: true, min: -1, max: 1 },
  vibe: { type: String, required: true },
  note: { type: String }
});

const SynapseMapSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Number, required: true },
    emotionNodes: [EmotionNodeSchema]
  },
  { timestamps: true }
);

// Compound index to ensure one synapse map per user per movie
SynapseMapSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<ISynapseMap>('SynapseMap', SynapseMapSchema);
