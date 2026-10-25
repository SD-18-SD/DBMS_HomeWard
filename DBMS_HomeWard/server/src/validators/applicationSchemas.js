import { z } from 'zod';
import { APPLICATION_STATUS } from '../models/Application.js';
import { objectId } from './common.js';

export const applicationSchema = z.object({
  pet: objectId,
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
  homeType: z.enum(['apartment', 'house', 'farm']),
  hasOtherPets: z.boolean().default(false),
  message: z
    .string()
    .trim()
    .min(20, 'Tell us a little more (at least 20 characters)')
    .max(1000),
});

export const statusSchema = z.object({
  status: z.enum(APPLICATION_STATUS),
  adminNote: z.string().trim().max(500).optional().default(''),
});

export const roleSchema = z.object({
  role: z.enum(['user', 'admin']),
});
