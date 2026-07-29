import mongoose, { Document, Schema } from 'mongoose';

export interface ISquadTransit extends Document {
  squadId: mongoose.Types.ObjectId | string;
  userId?: mongoose.Types.ObjectId | string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  driverName?: string;
  seatsAvailable?: number;
  passengers?: string[];
  pickupLocation?: string;
  departureTime?: string;
  costPerPerson?: number;
  status: 'driving' | 'passenger' | 'arrived' | 'scheduled';
  createdAt: Date;
}

const SquadTransitSchema: Schema = new Schema({
  squadId: { type: Schema.Types.Mixed, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  driverName: { type: String },
  seatsAvailable: { type: Number, default: 4 },
  passengers: [{ type: String }],
  pickupLocation: { type: String },
  departureTime: { type: String },
  costPerPerson: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['driving', 'passenger', 'arrived', 'scheduled'],
    default: 'scheduled',
  },
  createdAt: { type: Date, default: Date.now, expires: 10800 },
});

SquadTransitSchema.index({ squadId: 1 });

export const SquadTransit = mongoose.model<ISquadTransit>('SquadTransit', SquadTransitSchema);
export default SquadTransit;
