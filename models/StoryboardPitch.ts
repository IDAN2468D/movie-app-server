import mongoose, { Document, Schema } from 'mongoose';

export interface IStoryboardCard {
  sceneNumber: number;
  visualPrompt: string;
  visualPromptEnglish?: string;
  dialogue: string;
  imageUrl?: string;
}

export interface IStoryboardPitch extends Document {
  user: mongoose.Types.ObjectId;
  movieId: number;
  movieTitle: string;
  prompt: string;
  castList: string[];
  storyboardCards: IStoryboardCard[];
  createdAt: Date;
}

const StoryboardCardSchema = new Schema<IStoryboardCard>({
  sceneNumber: { type: Number, required: true },
  visualPrompt: { type: String, required: true },
  visualPromptEnglish: { type: String },
  dialogue: { type: String, required: true },
  imageUrl: { type: String },
});

const StoryboardPitchSchema = new Schema<IStoryboardPitch>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  movieTitle: { type: String, required: true },
  prompt: { type: String, required: true },
  castList: [{ type: String }],
  storyboardCards: [StoryboardCardSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IStoryboardPitch>('StoryboardPitch', StoryboardPitchSchema);
