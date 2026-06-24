import mongoose, { Schema, Document } from 'mongoose';

export interface ISquadMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  colorCode: string;
}

export interface ISquadLockedSeat {
  seatNumber: string;
  lockedBy: mongoose.Types.ObjectId;
  lockedAt: Date;
}

export interface ISquadBooking extends Document {
  squadToken: string;
  showtimeId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  members: ISquadMember[];
  lockedSeats: ISquadLockedSeat[];
  createdAt: Date;
  updatedAt: Date;
}

const SquadBookingSchema: Schema = new Schema(
  {
    squadToken: { type: String, required: true, unique: true },
    showtimeId: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        colorCode: { type: String, required: true },
      },
    ],
    lockedSeats: [
      {
        seatNumber: { type: String, required: true },
        lockedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        lockedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now, expires: 1800 }, // Auto-expire squad session in 30 minutes
  },
  { timestamps: true }
);

export default mongoose.model<ISquadBooking>('SquadBooking', SquadBookingSchema);
