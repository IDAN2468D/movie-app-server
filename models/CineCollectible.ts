import mongoose, { Schema, Document } from 'mongoose';

export interface ICineCollectible extends Document {
  userId: mongoose.Types.ObjectId;
  collectibleId: string;
  title: string;
  description?: string;
  rarity: 'common' | 'rare' | 'legendary';
  modelUrl: string;
  colorGlow: string;
  unlockedAt: Date;
}

const CineCollectibleSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collectibleId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    rarity: { type: String, enum: ['common', 'rare', 'legendary'], default: 'common' },
    modelUrl: { type: String, required: true },
    colorGlow: { type: String, default: '#FF1464' },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CineCollectibleSchema.index({ userId: 1, collectibleId: 1 }, { unique: true });

export default mongoose.model<ICineCollectible>('CineCollectible', CineCollectibleSchema);
