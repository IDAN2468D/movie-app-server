import mongoose, { Document, Schema } from 'mongoose';

export interface ICineChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  messages: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
  }>;
  sentimentAura: string;
  createdAt: Date;
}

const CineChatSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  sentimentAura: { type: String, default: 'neutral' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICineChatSession>('CineChatSession', CineChatSessionSchema);
