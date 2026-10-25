import mongoose from 'mongoose';

// One donation to one campaign.
// Note: this project does not process real payments. A donation is a record only.
const donationSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    // null when a guest donates without logging in
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    donorName: { type: String, trim: true, maxlength: 60, default: '' },
    isAnonymous: { type: Boolean, default: false }, // hide the name on the public page
    amount: { type: Number, required: true, min: 10, max: 100000 },
    message: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

donationSchema.index({ campaign: 1, createdAt: -1 });
donationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Donation', donationSchema);
