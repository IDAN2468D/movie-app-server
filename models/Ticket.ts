import mongoose, { Document, Schema } from 'mongoose';

export interface ISnackCustomization {
  butterLevel?: number;
  flavors?: string[];
  toppings?: string[];
}

export interface ISnackItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  customization?: ISnackCustomization;
}

export interface ITicket extends Document {
  user: mongoose.Types.ObjectId;
  movieId: number;
  movieTitle: string;
  moviePoster?: string;
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
  snacks?: ISnackItem[];
  totalPrice: number;
  bookingDate: Date;
  deliveryMode?: 'immediate' | 'pre-sync';
  targetDeliveryTime?: Date;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    genre: string;
  };
}

const TicketSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  movieTitle: { type: String, required: true },
  moviePoster: { type: String },
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
  snacks: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String },
    customization: {
      butterLevel: { type: Number },
      flavors: [{ type: String }],
      toppings: [{ type: String }]
    }
  }],
  totalPrice: { type: Number, required: true },
  bookingDate: { type: Date, default: Date.now },
  deliveryMode: { type: String, enum: ['immediate', 'pre-sync'], default: 'immediate' },
  targetDeliveryTime: { type: Date },
  theme: {
    primaryColor: { type: String },
    secondaryColor: { type: String },
    genre: { type: String },
  }
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);
