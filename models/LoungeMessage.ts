import mongoose, { Document, Schema } from 'mongoose';

export interface ILoungeMessage extends Document {
  user: string;
  text: string;
  isSystem: boolean;
  room: string;
  createdAt: Date;
}

const LoungeMessageSchema: Schema = new Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
  room: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Ephemeral: automatically deleted after 24 hours (86400 seconds)
});

export default mongoose.model<ILoungeMessage>('LoungeMessage', LoungeMessageSchema);
