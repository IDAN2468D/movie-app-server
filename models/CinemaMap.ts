import mongoose, { Document, Schema } from 'mongoose';

export interface ICinemaMap extends Document {
  venueId: mongoose.Types.ObjectId;
  pois: Array<{
    name: string;
    type: 'hall' | 'buffet' | 'restrooms' | 'exit';
    coordinates: {
      x: number;
      y: number;
      z: number;
    };
  }>;
  createdAt: Date;
}

const CinemaMapSchema: Schema = new Schema({
  venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
  pois: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['hall', 'buffet', 'restrooms', 'exit'], required: true },
    coordinates: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      z: { type: Number, required: true }
    }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICinemaMap>('CinemaMap', CinemaMapSchema);
