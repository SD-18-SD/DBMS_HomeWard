import mongoose from 'mongoose';

export const APPLICATION_STATUS = ['pending', 'approved', 'rejected'];

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    phone: { type: String, required: true, trim: true },
    homeType: { type: String, enum: ['apartment', 'house', 'farm'], required: true },
    hasOtherPets: { type: Boolean, default: false },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUS, default: 'pending' },
    adminNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// One user can apply for the same pet only once.
applicationSchema.index({ user: 1, pet: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
