import mongoose, { Document, Schema } from 'mongoose';

export interface IMovie extends Document {
  tmdbId: number;
  title: string;
  posterPath: string;
  overview: string;
  releaseDate: string;
}

const MovieSchema: Schema = new Schema({
  tmdbId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  posterPath: { type: String },
  overview: { type: String },
  releaseDate: { type: String }
});

export default mongoose.model<IMovie>('Movie', MovieSchema);
