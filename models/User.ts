import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expiryDate: string;
  holderName: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  watchlist: number[];
  paymentMethods: IPaymentMethod[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    profileImage: { type: String },
    watchlist: { type: [Number], default: [] },
    paymentMethods: [
      {
        id: { type: String, required: true },
        last4: { type: String, required: true },
        brand: { type: String, required: true },
        expiryDate: { type: String, required: true },
        holderName: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
