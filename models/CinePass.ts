import { Schema, model } from 'mongoose';

const CinePassSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  nfcToken: { type: String, required: true, unique: true },
  gateStatus: { type: String, enum: ['valid', 'used', 'expired'], default: 'valid' },
  createdAt: { type: Date, default: Date.now },
});

export const CinePass = model('CinePass', CinePassSchema);
