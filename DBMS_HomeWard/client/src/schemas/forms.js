import { z } from 'zod';

// These mirror the server rules so users see mistakes before submitting.
// The server still checks everything again, because the browser can be bypassed.

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Add at least one letter')
      .regex(/[0-9]/, 'Add at least one number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().max(20, 'Too long'),
  city: z.string().trim().max(60, 'Too long'),
});

export const applicationSchema = z.object({
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
  homeType: z.enum(['apartment', 'house', 'farm'], { message: 'Choose your home type' }),
  hasOtherPets: z.boolean(),
  message: z.string().trim().min(20, 'Tell us a little more (at least 20 characters)').max(1000),
});

// Pet listing form. Admins list for the shelter, so location and contact are optional for them.
const adminPetSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  species: z.enum(['dog', 'cat', 'rabbit', 'bird', 'other']),
  breed: z.string().trim().max(40),
  age: z.coerce.number({ message: 'Enter an age' }).min(0, 'Cannot be negative').max(30, 'Max 30'),
  gender: z.enum(['male', 'female']),
  size: z.enum(['small', 'medium', 'large']),
  status: z.enum(['available', 'pending', 'adopted']),
  vaccinated: z.boolean(),
  description: z.string().trim().max(1000, 'Keep it under 1000 characters'),
  location: z.string().trim().max(80),
  contactName: z.string().trim().max(60),
  contactPhone: z.string().trim().max(20),
  contactEmail: z.union([z.literal(''), z.email('Enter a valid email')]),
});

const userPetSchema = adminPetSchema.extend({
  breed: z.string().trim().min(1, 'Breed is required (write Mixed if unsure)').max(40),
  description: z.string().trim().min(20, 'Describe the pet in at least 20 characters').max(1000),
  location: z.string().trim().min(2, 'Where is the pet? (city or area)').max(80),
  contactName: z.string().trim().min(2, 'Who should adopters contact?').max(60),
  contactPhone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
});

export const petSchemaFor = (isAdmin) => (isAdmin ? adminPetSchema : userPetSchema);

// Today's date in the user's own timezone, as "YYYY-MM-DD".
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const campaignSchema = z.object({
  title: z.string().trim().min(5, 'At least 5 characters').max(100),
  description: z.string().trim().min(30, 'Explain what the money is for (at least 30 characters)').max(3000),
  category: z.enum(['medical', 'food', 'shelter', 'emergency', 'other']),
  goalAmount: z.coerce.number({ message: 'Enter a goal' }).int('Use whole rupees').min(100, 'At least 100').max(10000000),
  endDate: z.string().min(1, 'Pick an end date').refine((d) => d >= today(), 'End date must be today or later'),
  pet: z.string(),
});

export const donationSchema = z.object({
  amount: z.coerce.number({ message: 'Enter an amount' }).int('Use whole rupees').min(10, 'Minimum is 10').max(100000, 'Maximum is 1,00,000'),
  isAnonymous: z.boolean(),
  donorName: z.string().trim().max(60),
  message: z.string().trim().max(300, 'Keep it under 300 characters'),
});
