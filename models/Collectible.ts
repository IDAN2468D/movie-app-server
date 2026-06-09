import mongoose, { Document, Schema } from 'mongoose';

export interface ICollectible extends Document {
  user: mongoose.Types.ObjectId;
  movieId: number;
  movieTitle: string;
  moviePoster?: string;
  genre: string;
  badgeType: 'bronze' | 'silver' | 'gold' | 'glass';
  shardId: string;
  earnedAt: Date;
}

const CollectibleSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  movieTitle: { type: String, required: true },
  moviePoster: { type: String },
  genre: { type: String, required: true },
  badgeType: { type: String, enum: ['bronze', 'silver', 'gold', 'glass'], default: 'glass' },
  shardId: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICollectible>('Collectible', CollectibleSchema);
