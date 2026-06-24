import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizPlayer {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  score: number;
  ready: boolean;
}

export interface IQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
}

export interface ICineQuizLobby extends Document {
  lobbyToken: string;
  players: IQuizPlayer[];
  questions: IQuizQuestion[];
  currentQuestionIndex: number;
  status: 'waiting' | 'active' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

const CineQuizLobbySchema: Schema = new Schema(
  {
    lobbyToken: { type: String, required: true, unique: true },
    players: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        avatar: { type: String },
        score: { type: Number, default: 0 },
        ready: { type: Boolean, default: false },
      },
    ],
    questions: [
      {
        questionText: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswerIndex: { type: Number, required: true },
        points: { type: Number, default: 100 },
      },
    ],
    currentQuestionIndex: { type: Number, default: 0 },
    status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // Expire after 24 hours
  },
  { timestamps: true }
);

export default mongoose.model<ICineQuizLobby>('CineQuizLobby', CineQuizLobbySchema);
