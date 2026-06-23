import mongoose, { Document, Schema } from 'mongoose';

export interface ICineSoundProfile extends Document {
  userId: mongoose.Types.ObjectId;
  showtimeId: string;
  seatCode: string;
  soundMode: 'Dolby Atmos' | 'Spatial Stereo' | 'DTS:X';
  gyroState: boolean;
  equalizer: {
    bass: number;
    mid: number;
    treble: number;
  };
  roomSimLevel: number;
  createdAt: Date;
}

const CineSoundProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  showtimeId: { type: String, required: true },
  seatCode: { type: String, required: true },
  soundMode: { 
    type: String, 
    enum: ['Dolby Atmos', 'Spatial Stereo', 'DTS:X'], 
    default: 'Dolby Atmos' 
  },
  gyroState: { type: Boolean, default: true },
  equalizer: {
    bass: { type: Number, default: 50 },
    mid: { type: Number, default: 50 },
    treble: { type: Number, default: 50 }
  },
  roomSimLevel: { type: Number, default: 70 },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness per user per seat in a showtime
CineSoundProfileSchema.index({ userId: 1, showtimeId: 1, seatCode: 1 }, { unique: true });

export default mongoose.model<ICineSoundProfile>('CineSoundProfile', CineSoundProfileSchema);
