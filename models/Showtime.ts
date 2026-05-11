import mongoose, { Document, Schema } from 'mongoose';

export interface IShowtime extends Document {
  movie: mongoose.Types.ObjectId;
  hall: mongoose.Types.ObjectId;
  date: string;
  time: string;
  price: number;
  format: string;
}

const ShowtimeSchema: Schema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  hall: { type: Schema.Types.ObjectId, ref: 'Hall', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  format: { type: String, required: true }
});

export default mongoose.model<IShowtime>('Showtime', ShowtimeSchema);
