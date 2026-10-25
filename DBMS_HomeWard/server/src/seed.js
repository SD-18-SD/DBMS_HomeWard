// Fills the database with sample data.
//   npm run seed        adds anything missing (safe to run many times)
//   npm run seed:reset  deletes ALL users, pets, applications, campaigns and donations first
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Pet from './models/Pet.js';
import Application from './models/Application.js';
import Campaign from './models/Campaign.js';
import Donation from './models/Donation.js';

const RESET = process.argv.includes('--reset');

const SHELTER_CONTACT = { name: 'Homeward Shelter', phone: '022 4000 1234', email: 'adopt@homeward.test' };

// 20 sample pets. "owner: 'user'" means a regular user listed it.
const samplePets = [
  { name: 'Biscuit', species: 'dog', breed: 'Indie', age: 2, gender: 'male', size: 'medium', vaccinated: true, location: 'Mumbai',
    description: 'Loves long walks and will sit for a treat. Gets along with kids and other dogs.' },
  { name: 'Mochi', species: 'cat', breed: 'Persian mix', age: 1, gender: 'female', size: 'small', vaccinated: true, location: 'Mumbai',
    description: 'Quiet, curious and a champion napper. Best in a calm home without loud dogs.' },
  { name: 'Rocky', species: 'dog', breed: 'Labrador', age: 9, gender: 'male', size: 'large', vaccinated: true, location: 'Pune',
    description: 'Gentle senior who still enjoys a game of fetch every evening. House trained.' },
  { name: 'Clover', species: 'rabbit', breed: 'Dutch', age: 1, gender: 'female', size: 'small', vaccinated: false, location: 'Bengaluru',
    description: 'Eats her greens, hops around the room and enjoys gentle handling.' },
  { name: 'Kiwi', species: 'bird', breed: 'Budgerigar', age: 3, gender: 'male', size: 'small', vaccinated: false, location: 'Chennai',
    description: 'Chatty little bird who whistles back when you talk to him. Comes with his cage.' },
  { name: 'Shadow', species: 'cat', breed: 'Bombay', age: 4, gender: 'male', size: 'medium', vaccinated: true, status: 'pending', location: 'Mumbai',
    description: 'Shy for the first day, then follows you from room to room.' },
  { name: 'Bella', species: 'dog', breed: 'Beagle', age: 3, gender: 'female', size: 'medium', vaccinated: true, location: 'Thane',
    description: 'Nose to the ground on every walk. Friendly with visitors and loves belly rubs.' },
  { name: 'Tiger', species: 'cat', breed: 'Indian tabby', age: 2, gender: 'male', size: 'medium', vaccinated: true, location: 'Navi Mumbai',
    description: 'Playful and confident. Will chase a string for an hour, then sleep on your laptop.' },
  { name: 'Coco', species: 'dog', breed: 'Shih Tzu', age: 6, gender: 'female', size: 'small', vaccinated: true, location: 'Pune',
    description: 'A calm lap dog who likes short walks and a soft bed. Ideal for an apartment.' },
  { name: 'Pepper', species: 'cat', breed: 'Siamese mix', age: 0, gender: 'female', size: 'small', vaccinated: false, location: 'Mumbai',
    description: 'A four month old kitten full of energy. Litter trained and very vocal.' },
  { name: 'Bruno', species: 'dog', breed: 'German Shepherd', age: 4, gender: 'male', size: 'large', vaccinated: true, location: 'Nashik',
    description: 'Smart and loyal. Knows sit, stay and come. Needs an active family and a yard.' },
  { name: 'Snowball', species: 'rabbit', breed: 'Lionhead', age: 2, gender: 'male', size: 'small', vaccinated: false, location: 'Bengaluru',
    description: 'Fluffy and gentle. Enjoys hay, carrots and sitting next to you on the floor.' },
  { name: 'Mango', species: 'bird', breed: 'Cockatiel', age: 5, gender: 'male', size: 'small', vaccinated: false, location: 'Hyderabad',
    description: 'Sings in the morning and loves having his head scratched.' },
  { name: 'Luna', species: 'cat', breed: 'Maine Coon mix', age: 7, gender: 'female', size: 'large', vaccinated: true, status: 'adopted', location: 'Mumbai',
    description: 'A big, gentle cat who found her family last month.' },
  { name: 'Sheru', species: 'dog', breed: 'Indie', age: 1, gender: 'male', size: 'medium', vaccinated: true, location: 'Mumbai',
    description: 'Rescued from a construction site as a puppy. Now healthy, happy and ready for a home.' },
  { name: 'Daisy', species: 'dog', breed: 'Golden Retriever', age: 10, gender: 'female', size: 'large', vaccinated: true, location: 'Pune',
    description: 'Sweet senior with a little arthritis. Takes slow walks and gives the best hugs.' },
  { name: 'Peanut', species: 'other', breed: 'Guinea pig', age: 1, gender: 'male', size: 'small', vaccinated: false, location: 'Chennai',
    description: 'Squeaks when he hears the fridge open. Comes with a starter kit.' },
  // Listed by the sample regular user
  { name: 'Simba', species: 'cat', breed: 'Orange tabby', age: 3, gender: 'male', size: 'medium', vaccinated: true, location: 'Vellore', owner: 'user',
    description: 'We are moving abroad and cannot take Simba. He is neutered, friendly and loves people.' },
  { name: 'Lucky', species: 'dog', breed: 'Pomeranian', age: 5, gender: 'female', size: 'small', vaccinated: true, location: 'Vellore', owner: 'user',
    description: 'My grandmother can no longer look after Lucky. She is gentle and good with children.' },
  { name: 'Oreo', species: 'rabbit', breed: 'Mixed', age: 1, gender: 'female', size: 'small', vaccinated: false, location: 'Vellore', owner: 'user',
    reviewStatus: 'pending_review',
    description: 'Found in our building garden. Very tame and probably someone lost her. Looking for a home.' },
];

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// Sample campaigns. "pet" is a sample pet name to link to.
const sampleCampaigns = [
  { title: 'Hip surgery for Daisy', category: 'medical', goalAmount: 60000, endDate: days(30), pet: 'Daisy', owner: 'admin',
    description: 'Daisy is a 10 year old Golden Retriever with arthritis in her back legs. The vet recommends a hip operation and two months of physiotherapy so she can walk without pain again.' },
  { title: 'Winter food drive for the shelter', category: 'food', goalAmount: 40000, endDate: days(45), owner: 'admin',
    description: 'We feed more than 60 animals every day. This campaign buys three months of dry food, rice and eggs for every dog and cat in our care during the coming winter.' },
  { title: 'Roof repair for the cat room', category: 'shelter', goalAmount: 25000, endDate: days(20), owner: 'user',
    description: 'The roof above the cat room leaks every monsoon. The money pays for new sheets and labour so the cats have a dry and warm place to sleep.' },
  { title: 'Emergency care for a hit and run puppy', category: 'emergency', goalAmount: 15000, endDate: days(10), owner: 'user', status: 'pending_review',
    description: 'A puppy was hit by a bike near our college gate. She needs X-rays, a cast for her front leg and medicines for the next few weeks.' },
];

const sampleDonations = [
  { campaign: 0, amount: 5000, donor: 'user', message: 'Get well soon, Daisy!' },
  { campaign: 0, amount: 2500, donorName: 'Riya', message: 'Sending love.' },
  { campaign: 0, amount: 10000, isAnonymous: true },
  { campaign: 1, amount: 1000, donor: 'user', isAnonymous: true },
  { campaign: 1, amount: 2000, donorName: 'Kabir', message: 'For the good boys and girls.' },
  { campaign: 1, amount: 500, isAnonymous: true },
  { campaign: 2, amount: 3000, donorName: 'Meera' },
];

// Converts data from the first version of Homeward (single "photo", no reviewStatus).
async function migrateOldPets() {
  const raw = Pet.collection;
  const old = await raw.find({ photo: { $exists: true } }).toArray();
  for (const doc of old) {
    await raw.updateOne(
      { _id: doc._id },
      { $set: { photos: doc.photo ? [doc.photo] : [] }, $unset: { photo: '' } }
    );
  }
  const noReview = await raw.updateMany({ reviewStatus: { $exists: false } }, { $set: { reviewStatus: 'approved' } });
  if (old.length || noReview.modifiedCount) {
    console.log(`Upgraded old pets: ${old.length} photo fields, ${noReview.modifiedCount} review statuses`);
  }
}

async function findOrCreateUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role });
    console.log(`Created ${role}: ${email} / ${password}`);
  }
  return user;
}

async function seed() {
  await connectDB(process.env.MONGO_URI);

  if (RESET) {
    await Promise.all([
      User.deleteMany({}),
      Pet.deleteMany({}),
      Application.deleteMany({}),
      Campaign.deleteMany({}),
      Donation.deleteMany({}),
    ]);
    console.log('Database cleared');
  } else {
    await migrateOldPets();
  }

  const admin = await findOrCreateUser({
    name: 'Shelter Admin',
    email: process.env.ADMIN_EMAIL || 'admin@homeward.test',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  });
  const user = await findOrCreateUser({
    name: 'Richik Mallik',
    email: 'user@homeward.test',
    password: 'User@12345',
    role: 'user',
  });
  if (!user.phone) {
    user.set({ phone: '9541861007', city: 'Vellore' });
    await user.save();
  }
  const owners = { admin, user };

  // Pets: add any sample whose name is not in the database yet.
  let addedPets = 0;
  for (const { owner = 'admin', ...data } of samplePets) {
    if (await Pet.exists({ name: data.name })) continue;
    const byUser = owner === 'user';
    await Pet.create({
      ...data,
      createdBy: owners[owner]._id,
      contact: byUser ? { name: user.name, phone: user.phone, email: user.email } : SHELTER_CONTACT,
      reviewStatus: data.reviewStatus || 'approved',
      reviewedAt: data.reviewStatus ? undefined : new Date(),
    });
    addedPets++;
  }
  console.log(`Pets: added ${addedPets}, total ${await Pet.countDocuments()}`);

  // Campaigns and donations: only if there are no campaigns yet.
  if ((await Campaign.countDocuments()) === 0) {
    const created = [];
    for (const { owner, pet, ...data } of sampleCampaigns) {
      const linked = pet ? await Pet.findOne({ name: pet }) : null;
      created.push(
        await Campaign.create({
          ...data,
          pet: linked?._id ?? null,
          createdBy: owners[owner]._id,
          status: data.status || 'active',
        })
      );
    }

    const countedDonors = new Set();
    for (const d of sampleDonations) {
      const campaign = created[d.campaign];
      const donor = d.donor ? owners[d.donor] : null;
      await Donation.create({
        campaign: campaign._id,
        user: donor?._id ?? null,
        donorName: donor ? donor.name : d.donorName || '',
        isAnonymous: Boolean(d.isAnonymous) || (!donor && !d.donorName),
        amount: d.amount,
        message: d.message || '',
      });
      const key = donor ? `${campaign._id}-${donor._id}` : Math.random();
      const isNewDonor = !countedDonors.has(key);
      countedDonors.add(key);
      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { raisedAmount: d.amount, donorCount: isNewDonor ? 1 : 0 } }
      );
    }
    console.log(`Campaigns: added ${created.length} with ${sampleDonations.length} donations`);
  } else {
    console.log('Campaigns: skipped, some already exist');
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
