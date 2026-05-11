import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  user: mongoose.Types.ObjectId;
  movieId: number;
  movieTitle: string;
  date: string;
  showtime: {
    time: string;
    format: string;
    price: number;
    hall: string;
  };
  seats: {
    row: string;
    number: number;
    type: string;
  }[];
  totalPrice: number;
  bookingDate: Date;
}

const TicketSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  movieTitle: { type: String, required: true },
  date: { type: String, required: true },
  showtime: {
    time: { type: String, required: true },
    format: { type: String, required: true },
    price: { type: Number, required: true },
    hall: { type: String, required: true },
  },
  seats: [{
    row: { type: String, required: true },
    number: { type: Number, required: true },
    type: { type: String, required: true },
  }],
  totalPrice: { type: Number, required: true },
  bookingDate: { type: Date, default: Date.now }
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);
