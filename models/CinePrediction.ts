import mongoose, { Schema, Document } from 'mongoose';

export interface ICinePrediction extends Document {
  userId: mongoose.Types.ObjectId;
  tmdbId: number;
  movieTitle: string;
  predictedOpeningWeekend: number;
  predictedRatingScore: number;
  pointsStaked: number;
  isResolved: boolean;
  pointsEarned: number;
  oracleResponseText?: string;
  createdAt: Date;
}

const CinePredictionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true },
    movieTitle: { type: String, required: true },
    predictedOpeningWeekend: { type: Number, required: true },
    predictedRatingScore: { type: Number, min: 0, max: 100, required: true },
    pointsStaked: { type: Number, default: 0 },
    isResolved: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    oracleResponseText: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ICinePrediction>('CinePrediction', CinePredictionSchema);
