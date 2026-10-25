import { z } from 'zod';
import { CAMPAIGN_CATEGORIES } from '../models/Campaign.js';
import { keepPhotos, objectId } from './common.js';

// Campaign forms include photos, so they arrive as multipart text.
export const campaignSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(100),
  description: z
    .string()
    .trim()
    .min(30, 'Explain what the money is for (at least 30 characters)')
    .max(3000),
  category: z.enum(CAMPAIGN_CATEGORIES),
  goalAmount: z.coerce
    .number()
    .int('Use whole rupees')
    .min(100, 'Goal must be at least 100')
    .max(10000000, 'Goal is too large'),
  // "2026-11-30" becomes the very end of that day (23:59:59 UTC),
  // so a campaign stays open for the whole last day.
  endDate: z.coerce
    .date({ message: 'Pick an end date' })
    .transform((d) => {
      d.setUTCHours(23, 59, 59, 999);
      return d;
    })
    .refine((d) => d > new Date(), 'End date must be today or later'),
  // Optional linked pet. An empty string means "no pet".
  pet: z.union([z.literal(''), objectId]).optional().default(''),
  keepPhotos,
});

// Admin actions on a campaign.
export const campaignStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'closed', 'rejected']),
  reviewNote: z.string().trim().max(500).optional().default(''),
});

// A donation is sent as normal JSON.
export const donationSchema = z.object({
  amount: z
    .number({ message: 'Enter an amount' })
    .int('Use whole rupees')
    .min(10, 'Minimum donation is 10')
    .max(100000, 'Maximum donation is 1,00,000'),
  isAnonymous: z.boolean().default(false),
  donorName: z.string().trim().max(60).optional().default(''),
  message: z.string().trim().max(300).optional().default(''),
});
