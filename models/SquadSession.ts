import mongoose, { Document, Schema } from 'mongoose';

export interface ISquadSnack {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ISquadMember {
  userId: string;
  name: string;
  email: string;
  socketId?: string;
  joinedAt: Date;
  snacks?: ISquadSnack[];
}

export interface ISquadSeat {
  row: string;
  number: number;
  userId: string;
  lockedAt: Date;
}

export interface ISquadSession extends Document {
  squadCode: string;
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  date: string;
  showtimeId: string;
  showtimeTime: string;
  showtimeHall: string;
  hostId: string;
  members: ISquadMember[];
  lockedSeats: ISquadSeat[];
  createdAt: Date;
}

const SquadSessionSchema: Schema = new Schema({
  squadCode: { type: String, required: true, unique: true },
  movieId: { type: Number, required: true },
  movieTitle: { type: String, required: true },
  moviePoster: { type: String, required: true },
  date: { type: String, required: true },
  showtimeId: { type: String, required: true },
  showtimeTime: { type: String, required: true },
  showtimeHall: { type: String, required: true },
  hostId: { type: String, required: true },
  members: [{
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    socketId: { type: String },
    joinedAt: { type: Date, default: Date.now },
    snacks: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String }
    }]
  }],
  lockedSeats: [{
    row: { type: String, required: true },
    number: { type: Number, required: true },
    userId: { type: String, required: true },
    lockedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now, expires: 7200 } // Session expires automatically after 2 hours
});

export default mongoose.model<ISquadSession>('SquadSession', SquadSessionSchema);
