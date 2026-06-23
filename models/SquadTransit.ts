import mongoose, { Document, Schema } from 'mongoose';

export interface ISquadTransit extends Document {
  squadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: 'driving' | 'passenger' | 'arrived';
  createdAt: Date;
}

const SquadTransitSchema: Schema = new Schema({
  squadId: { type: Schema.Types.ObjectId, ref: 'SquadSession', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  status: { 
    type: String, 
    enum: ['driving', 'passenger', 'arrived'], 
    default: 'driving' 
  },
  // Location entries expire after 3 hours (10800 seconds) for user privacy
  createdAt: { type: Date, default: Date.now, expires: 10800 }
});

// Compound index to quickly find squad coordinates
SquadTransitSchema.index({ squadId: 1, userId: 1 });

export default mongoose.model<ISquadTransit>('SquadTransit', SquadTransitSchema);
