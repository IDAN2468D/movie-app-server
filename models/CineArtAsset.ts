import mongoose, { Document, Schema } from 'mongoose';

export interface ICineArtAsset extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: string;
  imageUrl?: string;
  svgFrameData: string;
  styleMetadata?: any;
  createdAt: Date;
}

const CineArtAssetSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: String, required: true },
  imageUrl: { type: String },
  svgFrameData: { type: String, required: true },
  styleMetadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICineArtAsset>('CineArtAsset', CineArtAssetSchema);
