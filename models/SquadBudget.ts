import mongoose, { Document, Schema } from 'mongoose';

export interface ISquadBudget extends Document {
  squadId: mongoose.Types.ObjectId;
  movieTitle: string;
  eventDate: Date;
  googleSheetId?: string;
  googleCalendarEventId?: string;
  participants: string[];
  totalBudget: number;
  createdAt: Date;
}

const SquadBudgetSchema: Schema = new Schema({
  squadId: { type: Schema.Types.ObjectId, ref: 'SquadSession', required: true },
  movieTitle: { type: String, required: true },
  eventDate: { type: Date, required: true },
  googleSheetId: { type: String },
  googleCalendarEventId: { type: String },
  participants: [{ type: String }],
  totalBudget: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISquadBudget>('SquadBudget', SquadBudgetSchema);
