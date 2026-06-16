import mongoose, { Schema, Document } from 'mongoose';

export interface IVistaSuggestion {
  type: 'spotify' | 'location' | 'fashion';
  title: string;
  description: string;
  link: string;
}

export interface IVistaCache extends Document {
  movieId: number;
  sceneId: string; // scene identifier (e.g. "scene_1", "climax")
  colors: string[]; // hex codes: e.g. ["#09090B", "#FF1464", "#E5FF00"]
  vibe: string;
  suggestions: IVistaSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

const VistaSuggestionSchema = new Schema({
  type: { type: String, enum: ['spotify', 'location', 'fashion'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true }
});

const VistaCacheSchema = new Schema(
  {
    movieId: { type: Number, required: true },
    sceneId: { type: String, required: true },
    colors: [{ type: String, required: true }],
    vibe: { type: String, required: true },
    suggestions: [VistaSuggestionSchema]
  },
  { timestamps: true }
);

// Unique compound index for caching
VistaCacheSchema.index({ movieId: 1, sceneId: 1 }, { unique: true });

export default mongoose.model<IVistaCache>('VistaCache', VistaCacheSchema);
