import mongoose, { Document, Schema } from 'mongoose';

export interface ILensResearch extends Document {
  userId: mongoose.Types.ObjectId;
  sourceImageUrl: string;
  analysis: {
    movieTitle: string;
    directorInfo?: string;
    cinematographyStyle?: string;
    deepTrivia: string[];
  };
  timestamp: Date;
}

const LensResearchSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceImageUrl: { type: String, required: true },
  analysis: {
    movieTitle: { type: String, required: true },
    directorInfo: { type: String },
    cinematographyStyle: { type: String },
    deepTrivia: [{ type: String }]
  },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<ILensResearch>('LensResearch', LensResearchSchema);
