import { z } from 'zod';
import { SPECIES, PET_STATUS, REVIEW_STATUS } from '../models/Pet.js';
import { formBoolean, keepPhotos } from './common.js';

// Admin version: location and contact are optional (the shelter is the contact).
// z.coerce turns the text "3" into the number 3.
export const adminPetSchema = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(40),
  species: z.enum(SPECIES, { error: 'Choose a species' }),
  breed: z.string().trim().max(40).optional().default('Mixed'),
  age: z.coerce.number({ error: 'Enter an age' }).min(0, 'Age cannot be negative').max(30),
  gender: z.enum(['male', 'female'], { error: 'Choose a gender' }),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  description: z.string().trim().max(1000).optional().default(''),
  vaccinated: formBoolean.default(false),
  status: z.enum(PET_STATUS).default('available'),
  location: z.string().trim().max(80).optional().default(''),
  contactName: z.string().trim().max(60).optional().default(''),
  contactPhone: z.string().trim().max(20).optional().default(''),
  contactEmail: z.union([z.literal(''), z.email('Enter a valid email')]).optional().default(''),
  keepPhotos,
});

// Regular user version: stricter, because nobody else knows how to reach them.
// requiredText(2, 60, 'Location is required') gives the same friendly message
// whether the field is missing completely or too short.
const requiredText = (min, max, message) => z.string({ error: message }).trim().min(min, message).max(max);

export const userPetSchema = adminPetSchema.extend({
  breed: requiredText(1, 40, 'Breed is required (write Mixed if unsure)'),
  description: requiredText(20, 1000, 'Describe the pet in at least 20 characters'),
  location: requiredText(2, 80, 'Location is required'),
  contactName: requiredText(2, 60, 'Contact name is required'),
  contactPhone: requiredText(7, 20, 'Enter a valid phone number'),
});

// Picks the schema based on who is sending the form.
export const petSchemaFor = (req) => (req.user?.role === 'admin' ? adminPetSchema : userPetSchema);

// Admin moderation decision.
export const reviewSchema = z
  .object({
    reviewStatus: z.enum(REVIEW_STATUS.filter((s) => s !== 'pending_review')),
    reviewNote: z.string().trim().max(500).optional().default(''),
  })
  .refine((v) => v.reviewStatus === 'approved' || v.reviewNote.length >= 5, {
    path: ['reviewNote'],
    message: 'Tell the owner what to fix (at least 5 characters)',
  });
