import mongoose, { Schema, Document } from 'mongoose';

export interface IWaypoint {
  name: string;
  type: 'entrance' | 'snacks' | 'hall' | 'restroom';
  x: number; // meters from entrance
  y: number; // meters from entrance
  z: number; // floor level
  bearingAngle: number; // heading angle in degrees (0-360)
  description: string;
}

export interface ICinemaLayout extends Document {
  branchId: string;
  branchName: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  waypoints: IWaypoint[];
}

const WaypointSchema = new Schema<IWaypoint>({
  name: { type: String, required: true },
  type: { type: String, enum: ['entrance', 'snacks', 'hall', 'restroom'], required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  z: { type: Number, required: true },
  bearingAngle: { type: Number, required: true },
  description: { type: String, required: true },
});

const CinemaLayoutSchema = new Schema<ICinemaLayout>({
  branchId: { type: String, required: true, unique: true },
  branchName: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  geofenceRadius: { type: Number, default: 100 },
  waypoints: [WaypointSchema],
});

export default mongoose.model<ICinemaLayout>('CinemaLayout', CinemaLayoutSchema);
