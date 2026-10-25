import mongoose from 'mongoose';

export const CAMPAIGN_CATEGORIES = ['medical', 'food', 'shelter', 'emergency', 'other'];
export const CAMPAIGN_STATUS = ['pending_review', 'active', 'paused', 'closed', 'rejected'];
export const MAX_CAMPAIGN_PHOTOS = 5;

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: CAMPAIGN_CATEGORIES, required: true },

    // Money is stored in whole rupees.
    goalAmount: { type: Number, required: true, min: 100, max: 10000000 },
    raisedAmount: { type: Number, default: 0, min: 0 },
    donorCount: { type: Number, default: 0, min: 0 },
    endDate: { type: Date, required: true },

    photos: {
      type: [String],
      default: [],
      validate: [(list) => list.length <= MAX_CAMPAIGN_PHOTOS, `At most ${MAX_CAMPAIGN_PHOTOS} photos`],
    },

    // Optional: the pet this money is for.
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    status: { type: String, enum: CAMPAIGN_STATUS, default: 'pending_review' },
    reviewNote: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    // Include virtual fields (like isEnded) when the campaign is sent as JSON.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A "virtual" is a field that is calculated, not stored in the database.
campaignSchema.virtual('isEnded').get(function () {
  return this.endDate < new Date();
});

campaignSchema.index({ status: 1, endDate: 1 });
campaignSchema.index({ createdBy: 1 });

export default mongoose.model('Campaign', campaignSchema);
