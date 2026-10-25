# Homeward: Database Guide (MongoDB)

This guide explains the database from zero. No prior database knowledge needed.

---

## 1. What is MongoDB?

MongoDB is a **NoSQL document database**. Instead of tables with rows and columns (like Excel or MySQL), it stores **documents** that look like JavaScript objects.

A pet stored in MongoDB looks like this:

```json
{
  "_id": "6710a1f2c3b4e5d6f7a8b9c0",
  "name": "Biscuit",
  "species": "dog",
  "breed": "Indie",
  "age": 2,
  "gender": "male",
  "size": "medium",
  "vaccinated": true,
  "status": "available",
  "location": "Mumbai",
  "contact": { "name": "Homeward Shelter", "phone": "022 4000 1234", "email": "adopt@homeward.test" },
  "photos": ["/uploads/1729150000000-482913-biscuit.jpg", "/uploads/1729150000001-118274-biscuit-2.jpg"],
  "reviewStatus": "approved",
  "reviewNote": "",
  "createdBy": "6710a1aa11b2c3d4e5f60718",
  "createdAt": "2026-10-17T10:00:00.000Z",
  "updatedAt": "2026-10-17T10:00:00.000Z"
}
```

If you know JavaScript objects, you already understand most of MongoDB.

### Words you need to know

| MongoDB word | Similar to (SQL / Excel) | In Homeward |
| --- | --- | --- |
| **Database** | A whole database / a workbook | `homeward` |
| **Collection** | A table / a sheet | `users`, `pets`, `applications`, `campaigns`, `donations` |
| **Document** | A row | One user, one pet, one donation |
| **Field** | A column | `name`, `age`, `status` |
| **`_id`** | Primary key | Every document gets a unique id automatically |
| **ObjectId** | An id number | The type of `_id`, a 24-character code like `6710a1f2c3b4e5d6f7a8b9c0` |
| **Reference** | Foreign key | `application.pet` stores the `_id` of a pet |
| **Index** | Index | Makes searches faster |
| **Subdocument** | (no direct match) | A small object inside a document, like `pet.contact` |

### Why "NoSQL"?
"NoSQL" means "not only SQL". MongoDB does not use SQL queries or fixed tables. Benefits for a beginner project:
- **Flexible**: documents can have arrays (like `favorites`) without extra tables.
- **Feels like JavaScript**: data goes from MongoDB to Express to React in almost the same shape (JSON).
- **Easy to start**: no need to design tables up front, the collection appears when you first save a document.

The trade-off: MongoDB does not force structure by itself. That is why we use **Mongoose**.

---

## 2. What is Mongoose?

Mongoose is a library that sits between Express and MongoDB. It gives us:

1. **Schemas**: rules for each collection (which fields, which types, what is required).
2. **Models**: objects with ready-made functions like `Pet.find()`, `Pet.create()`.
3. **Validation**: refuses bad data before it reaches the database.
4. **Middleware (hooks)**: code that runs automatically, like hashing a password before saving.
5. **Populate**: replaces an id with the full document it points to.
6. **Virtuals**: fields calculated on the fly and never stored, like `campaign.isEnded`.

```js
// A schema is the rulebook
const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age:  { type: Number, min: 0, max: 30 },
});

// A model is the tool you use. It works with the "pets" collection.
const Pet = mongoose.model('Pet', petSchema);
```

Mongoose turns the model name `Pet` into the collection name `pets` (lowercase and plural) automatically.

---

## 3. Our five collections

```
┌──────────────────────┐        ┌────────────────────────┐
│ users                │        │ pets                   │
│ _id                  │◀───┐   │ _id                    │
│ name                 │    │   │ name, species, breed   │
│ email (unique)       │    │   │ age, gender, size      │
│ password (hashed)    │    │   │ vaccinated, status     │
│ role                 │    │   │ description, location  │
│ phone, city          │    │   │ contact {name,phone,..}│
│ favorites [Pet ids] ─┼───────▶│ photos [paths]         │
└──────────────────────┘    │   │ reviewStatus,reviewNote│
     ▲      ▲      ▲        └───│ createdBy (User id)    │
     │      │      │            └────────────────────────┘
     │      │      │                 ▲            ▲
     │      │   ┌──┴───────────────┐ │            │
     │      │   │ applications     │─┘            │
     │      │   │ user, pet        │              │
     │      │   │ phone, homeType  │              │
     │      │   │ message, status  │              │
     │      │   └──────────────────┘              │
     │      │                                     │ (optional)
     │   ┌──┴───────────────────┐                 │
     │   │ campaigns            │─────────────────┘
     │   │ title, category      │
     │   │ goalAmount           │◀──────┐
     │   │ raisedAmount         │       │
     │   │ donorCount, endDate  │       │
     │   │ photos, status       │       │
     │   │ createdBy (User id)  │       │
     │   └──────────────────────┘       │
     │                          ┌───────┴──────────┐
     └──────────────────────────│ donations        │
          (null for guests)     │ campaign, user   │
                                │ amount, message  │
                                │ isAnonymous      │
                                │ donorName        │
                                └──────────────────┘
```

### 3.1 `users`

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `name` | String | required, max 60 | Full name |
| `email` | String | required, **unique**, lowercase | Login email |
| `password` | String | required, min 8, **hidden** | bcrypt hash, never the real password |
| `role` | String | `user` or `admin`, default `user` | What they are allowed to do |
| `phone` | String | optional | Pre-fills the adoption form |
| `city` | String | optional | |
| `favorites` | Array of ObjectId | refers to `pets` | Saved pets |
| `createdAt`, `updatedAt` | Date | automatic | |

Example (what you see in Compass):
```json
{
  "_id": "6710a1aa11b2c3d4e5f60718",
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "$2b$10$Qe7r0b0a5e8eY0x7l2...",
  "role": "user",
  "phone": "9876543210",
  "city": "Vellore",
  "favorites": ["6710a1f2c3b4e5d6f7a8b9c0"],
  "createdAt": "2026-10-17T09:30:00.000Z"
}
```
Notice the password starts with `$2b$10$`. That is a bcrypt hash: `2b` is the algorithm version and `10` is the cost (how slow it is to compute). It cannot be turned back into the original password.

### 3.2 `pets`

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `name` | String | required, max 40 | |
| `species` | String | `dog`, `cat`, `rabbit`, `bird`, `other` | |
| `breed` | String | default `Mixed` | |
| `age` | Number | 0 to 30 | In years |
| `gender` | String | `male` or `female` | |
| `size` | String | `small`, `medium`, `large` | |
| `description` | String | max 1000 | |
| `vaccinated` | Boolean | default `false` | |
| `location` | String | max 80 | City or area. Required for user listings |
| `contact` | Subdocument | `{ name, phone, email }` | Who adopters should call. Hidden from guests |
| `status` | String | `available`, `pending`, `adopted` | **Adoption** status |
| `photos` | Array of String | at most 5 | Paths to files. The first is the cover |
| `reviewStatus` | String | `pending_review`, `approved`, `rejected`, `changes_requested` | **Moderation** status. Only `approved` is public |
| `reviewNote` | String | | Admin's message to the owner |
| `reviewedAt` | Date | | When an admin last decided |
| `createdBy` | ObjectId | refers to `users` | Who listed it (admin or user) |

**Why two status fields?** They answer different questions. `status` is about the animal ("is it still looking for a home?"). `reviewStatus` is about the listing ("has the team checked it?"). A pet can be `approved` and `adopted` at the same time.

**Why is `contact` a subdocument and not its own collection?** Contact details belong to exactly one listing and are always read together with it. That is the classic case for embedding (see section 4).

**Why store the photo path and not the image?** Images are big. Storing them in the database makes it slow and heavy. We save the files on disk (`server/uploads/`) and keep only the short paths in an array.

### 3.3 `applications`

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `user` | ObjectId | required, refers to `users` | Who applied |
| `pet` | ObjectId | required, refers to `pets` | Which pet |
| `phone` | String | required | |
| `homeType` | String | `apartment`, `house`, `farm` | |
| `hasOtherPets` | Boolean | default `false` | |
| `message` | String | required, max 1000 | Why they want the pet |
| `status` | String | `pending`, `approved`, `rejected` | |
| `adminNote` | String | optional | Message from the shelter or the person who listed the pet |

### 3.4 `campaigns`

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `title` | String | required, max 100 | |
| `description` | String | required, max 3000 | What the money is for |
| `category` | String | `medical`, `food`, `shelter`, `emergency`, `other` | |
| `goalAmount` | Number | 100 to 1,00,00,000 | Target in whole rupees |
| `raisedAmount` | Number | default 0 | Running total, updated with `$inc` |
| `donorCount` | Number | default 0 | Unique logged in donors plus each guest donation |
| `endDate` | Date | required | Stored as 23:59:59 UTC of the chosen day |
| `photos` | Array of String | at most 5 | |
| `pet` | ObjectId | optional, refers to `pets` | The pet this is for |
| `createdBy` | ObjectId | required, refers to `users` | |
| `status` | String | `pending_review`, `active`, `paused`, `closed`, `rejected` | Only `active` takes donations |
| `reviewNote` | String | | Admin's message, for example why it was rejected |
| `isEnded` | **virtual** | not stored | `true` when `endDate` has passed |

Example:
```json
{
  "_id": "6714c0de2a1b3c4d5e6f7081",
  "title": "Hip surgery for Daisy",
  "category": "medical",
  "goalAmount": 60000,
  "raisedAmount": 17500,
  "donorCount": 3,
  "endDate": "2026-11-19T23:59:59.999Z",
  "photos": [],
  "pet": "6714c0aa11b2c3d4e5f60999",
  "createdBy": "6714c0aa11b2c3d4e5f60718",
  "status": "active",
  "isEnded": false
}
```

**Why store `raisedAmount` instead of adding up donations every time?** The fundraiser list shows a progress bar for many campaigns at once. Adding up every donation for every card would be slow. Keeping a running total is a common pattern called **denormalization**: we store a copy of a calculated value and keep it correct ourselves.

### 3.5 `donations`

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `campaign` | ObjectId | required, refers to `campaigns` | |
| `user` | ObjectId | refers to `users`, `null` for guests | Powers "my donation history" |
| `donorName` | String | max 60 | Name at the time of donating |
| `isAnonymous` | Boolean | | If `true`, the public page shows "Anonymous" |
| `amount` | Number | 10 to 1,00,000 | Whole rupees |
| `message` | String | max 300 | Optional note shown on the page |
| `createdAt` | Date | automatic | |

**Anonymous is a display setting, not a delete.** The `user` id is still saved so the donor sees the donation in their own history. Only the public list hides the name, and it never sends user ids at all.

> This project does not take real payments. A real app would create the donation only after a payment provider confirms the money arrived.

---

## 4. Relationships: embed or reference?

In MongoDB you can link data in two ways:

1. **Embed**: put the data inside the document. Example: a user's address as an object inside the user.
2. **Reference**: store only the `_id` of another document. Example: `application.pet = "6710..."`.

We **embed** `pet.contact` because it belongs to one listing and is always read with it.

We use **references** for everything else because:
- A pet can be applied for by many users, and a user can apply for many pets.
- If a pet's name changes, every application still shows the new name (we look it up, we do not copy it).

`favorites` is an **array of references** inside the user. This is a common MongoDB pattern for "a short list of things a user picked".

### Populate: following a reference
When we load applications, we want the pet name, not just its id:

```js
Application.find({ user: userId }).populate('pet', 'name species photo status');
```

Before populate:
```json
{ "pet": "6710a1f2c3b4e5d6f7a8b9c0", "status": "pending" }
```
After populate:
```json
{ "pet": { "_id": "6710...", "name": "Biscuit", "species": "dog", "photo": "...", "status": "available" }, "status": "pending" }
```
The second argument picks only the fields we need, which keeps the response small.

---

## 5. Indexes (making things fast and safe)

An index is like the index at the back of a book. Without it, MongoDB reads every document to find a match. With it, it jumps straight there.

| Collection | Index | Why |
| --- | --- | --- |
| `users` | `email` unique | Fast login lookup, and no two accounts with the same email |
| `pets` | `name` text | Supports name search |
| `pets` | `species + status + age` | Fast filtering on the search page |
| `pets` | `reviewStatus + species + status + age` | Fast public search, which always filters `reviewStatus: "approved"` first |
| `pets` | `createdBy` | Fast "my listings" |
| `applications` | `user + pet` unique | One application per user per pet, enforced by the database |
| `campaigns` | `status + endDate` | Fast "active fundraisers, ending soonest first" |
| `campaigns` | `createdBy` | Fast "my fundraisers" |
| `donations` | `campaign + createdAt` | Fast "latest donations for this fundraiser" |
| `donations` | `user + createdAt` | Fast "my donation history" |

When a unique index is broken, MongoDB returns error code **11000**. Our `errorHandler.js` turns that into a friendly message.

---

## 6. How our search query works

When a user picks "cat", "young", "available" and types "mo", the client calls:
```
GET /api/pets?name=mo&species=cat&minAge=0&maxAge=1&status=available&page=1&limit=12
```
`getPets` builds this MongoDB filter:
```js
{
  reviewStatus: 'approved',                 // always added: only checked listings are public
  name:    { $regex: 'mo', $options: 'i' }, // name contains "mo", any case
  species: 'cat',
  status:  'available',
  age:     { $gte: 0, $lte: 1 }            // 0 <= age <= 1
}
```
Then:
```js
Pet.find(filter).sort({ createdAt: -1 }).skip(0).limit(12)  // newest first, page 1
Pet.countDocuments(filter)                                   // total for "N pets match"
```

### Common query operators
| Operator | Meaning | Example |
| --- | --- | --- |
| `$gte` / `$lte` | greater / less than or equal | `{ age: { $gte: 2 } }` |
| `$ne` | not equal | `{ _id: { $ne: id } }` |
| `$regex` | text pattern | `{ name: { $regex: 'bis', $options: 'i' } }` |
| `$pull` | remove from an array | `{ $pull: { favorites: petId } }` |
| `$in` | value is in a list | `{ pet: { $in: myPetIds } }` (applications for my pets) |
| `$inc` | add to a number | `{ $inc: { raisedAmount: 500, donorCount: 1 } }` |
| `$set` / `$unset` | set / remove a field | used by the seed script to upgrade old data |

### Why `$inc` for donations?
Imagine two people donate ₹500 at the same moment to a campaign that has ₹1,000.
- **Wrong way**: both read 1,000, both add 500 in JavaScript, both save 1,500. One donation is lost.
- **Right way**: `$inc` tells MongoDB "add 500 to whatever is there". MongoDB applies both, giving 2,000.

`$inc` is **atomic**: it happens as one indivisible step inside the database.

---

## 7. CRUD cheat sheet (Mongoose)

| Action | Code in this project |
| --- | --- |
| **C**reate | `Pet.create({...})`, `Donation.create({...})` |
| Exists? | `Donation.exists({ campaign, user })` (is this a repeat donor?) |
| Distinct | `Pet.find({ createdBy }).distinct('_id')` (ids of my pets) |
| **R**ead many | `Pet.find(filter)` |
| **R**ead one | `Pet.findById(id)`, `User.findOne({ email })` |
| **U**pdate | `pet.set(data); await pet.save()` or `Pet.findByIdAndUpdate(id, data)` |
| **U**pdate many | `Application.updateMany(filter, change)` |
| **D**elete | `Pet.findByIdAndDelete(id)`, `Application.deleteMany({ pet: id })` |
| Count | `Pet.countDocuments(filter)` |

---

## 8. Keeping data consistent

MongoDB will not automatically delete related documents. We do it ourselves:

| When | We also |
| --- | --- |
| A pet is deleted | delete its photo files, delete its applications, `$pull` it from every user's favorites |
| A pet or campaign is edited and photos are removed | delete those files from disk after the save succeeds |
| A user is deleted | delete their applications and pet listings, set their campaigns to `closed` |
| An application is approved | set the pet to `adopted`, reject other pending applications for that pet |
| A user edits an approved listing | set `reviewStatus` back to `pending_review` |
| A donation is made | create the donation, then `$inc` the campaign's `raisedAmount` and `donorCount` |
| A campaign is removed | keep its donations (the `campaign` field then points at nothing, and history shows "Removed fundraiser") |

---

## 9. Installing and connecting

### Option A: Local (MongoDB Community Server)
1. Download from mongodb.com: **Products > Community Server**. Install with default options (on Windows, tick "Install as a Service").
2. It runs at `mongodb://127.0.0.1:27017`.
3. In `server/.env`:
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/homeward
   ```
   The `homeward` database is created automatically the first time data is saved.

> Use `127.0.0.1` instead of `localhost`. On some computers Node tries IPv6 for `localhost` and the connection fails.

### Option B: Cloud (MongoDB Atlas, free tier)
1. Create an account at mongodb.com/atlas and a free **M0** cluster.
2. **Database Access**: add a user with a password.
3. **Network Access**: add your IP address (or `0.0.0.0/0` for testing only).
4. **Connect > Drivers**: copy the connection string.
5. In `server/.env`, paste it and add the database name before the `?`:
   ```
   MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/homeward?retryWrites=true&w=majority
   ```
   If your password has special characters like `@` or `#`, URL-encode them (`@` becomes `%40`).

---

## 10. Using MongoDB Compass

Compass is a free desktop app to look at your data.

1. Open Compass and paste the same `MONGO_URI` (without `/homeward` is fine), click **Connect**.
2. Open the `homeward` database. You will see `users`, `pets`, `applications`, `campaigns`, `donations`.
3. Click a collection to see documents. You can:
   - **Filter**: type `{ "species": "dog" }` and click Find.
   - Listings waiting for review: `{ "reviewStatus": "pending_review" }` in `pets`.
   - Anonymous donations: `{ "isAnonymous": true }` in `donations`.
   - **Edit**: click the pencil on a document, change a value, Update.
   - **Delete**: click the bin icon.
   - **Indexes tab**: see the indexes listed in section 5.

### Make yourself an admin in Compass
If you registered normally and want admin access:
1. Open `users`, filter `{ "email": "you@example.com" }`.
2. Edit the document, change `"role": "user"` to `"role": "admin"`, Update.
3. Log out and log in again in the app (the role is read on login).

Or just run `npm run seed` in the `server` folder, which creates the admin from `.env`.

---

## 10b. Sample data and upgrading

`npm run seed` (in `server/`) adds:
- an admin (`admin@homeward.test` / `Admin@12345`, or the values in `.env`)
- a regular user (`user@homeward.test` / `User@12345`)
- **20 pets**: 17 from the shelter, 3 listed by the sample user (one still `pending_review`, so the admin review queue is not empty)
- **4 fundraisers** (3 active, 1 waiting for review) and 7 donations, some anonymous

It only adds what is missing, so running it twice is safe.

`npm run seed:reset` **deletes everything** in the five collections first, then seeds. Use it when you want a clean start.

**Upgrading from the first version:** older pets had a single `photo` field and no `reviewStatus`. A normal `npm run seed` converts them: `photo` becomes `photos: [photo]`, and every pet without a `reviewStatus` is marked `approved` so it stays visible.

---

## 11. Common errors

| Error | Meaning | Fix |
| --- | --- | --- |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running | Start the MongoDB service, or check Atlas |
| `bad auth : authentication failed` | Wrong Atlas user or password | Check Database Access and URL-encode the password |
| `querySrv ENOTFOUND` | Wrong Atlas host | Copy the string again from Atlas |
| Connection timeout with Atlas | Your IP is not allowed | Add it in Network Access |
| `E11000 duplicate key` | Unique index broken | Email already used, or already applied for that pet |
| `Cast to ObjectId failed` | A bad id in the URL | Check the link, ids are 24 hex characters |
