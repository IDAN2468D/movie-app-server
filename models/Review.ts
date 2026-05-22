import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  movieId: number; // TMDB movie ID
  userId: mongoose.Types.ObjectId;
  userName: string;
  userProfileImage?: string;
  rating: number; // 1 to 5 stars
  content: string;
  isSpoiler: boolean;
  likes: mongoose.Types.ObjectId[]; // Users who found it helpful
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    movieId: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userProfileImage: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, required: true },
    isSpoiler: { type: Boolean, default: false },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
);

// Create composite index for querying reviews of a movie quickly
ReviewSchema.index({ movieId: 1, createdAt: -1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
