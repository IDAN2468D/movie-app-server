import mongoose, { Document, Schema } from 'mongoose';

export interface IHall extends Document {
  name: string;
  capacity: number;
  format: string; // Standard, IMAX, 4DX, VIP
}

const HallSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  format: { type: String, required: true }
});

export default mongoose.model<IHall>('Hall', HallSchema);
