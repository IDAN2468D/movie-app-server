import mongoose, { Document, Schema } from 'mongoose';

export interface IAuraProfile extends Document {
  userId: mongoose.Types.ObjectId;
  genreVector: number[]; // 5-dimensional taste vector representing genres [action, comedy, drama, horror, scifi]
  auraColor: string;
  isSearching: boolean;
  matchedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const AuraProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  genreVector: { type: [Number], default: [0.5, 0.5, 0.5, 0.5, 0.5] },
  auraColor: { type: String, default: '#8A2BE2' },
  isSearching: { type: Boolean, default: false },
  matchedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAuraProfile>('AuraProfile', AuraProfileSchema);
