# Homeward

A pet adoption management platform. Visitors browse and search pets, users apply to adopt, list their own pets for rehoming and raise money through fundraisers, and admins moderate everything.

Built with **React + Vite**, **Express**, **MongoDB** and **Mongoose**.

## Features

- Register, login, logout and edit profile (JWT in an httpOnly cookie)
- Search pets by name, species, age group and availability, with pagination (approved listings only)
- Pet details with a photo gallery, location, contact details (logged in only), save to favorites
- **User-submitted listings**: any user can list a pet with up to 5 photos, location and contact details; admins approve, reject or request edits; owners edit their listings, track review status and approve adopters themselves
- Adoption applications with status tracking (pending, approved, rejected) and withdraw
- **Fundraisers**: create campaigns for medical care, food, shelter or emergencies with a goal, end date, description and photos; progress bar, raised amount and donor count; anonymous donations; donation history
- User dashboard: applications, saved pets, my listings, my fundraisers, donations
- Admin dashboard: review queue, applications, pets, fundraisers (approve, pause, close, remove) and users
- Security: bcrypt hashing, protected routes, role-based authorization, ownership checks, Zod validation, Helmet, rate limiting

> Donations are a demo: no real payment is processed, the donation is only recorded.

## Requirements

- **Node.js 20 or newer** (check with `node -v`)
- **MongoDB**: either [Community Server](https://www.mongodb.com/try/download/community) installed locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- [MongoDB Compass](https://www.mongodb.com/products/compass) (optional, to view data)

## Getting started

### 1. Install dependencies
```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the server
```bash
cd server
cp .env.example .env      # on Windows: copy .env.example .env
```
Open `server/.env` and set at least:
- `MONGO_URI` (local default works if MongoDB is running on your machine)
- `JWT_SECRET` (any long random string)

Tip: generate a secret with
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Add sample data
```bash
cd server
npm run seed          # adds anything missing, safe to run again
npm run seed:reset    # optional: wipes the database first for a clean start
```
This creates:

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@homeward.test` (or `ADMIN_EMAIL` in `.env`) | `Admin@12345` (or `ADMIN_PASSWORD`) |
| User | `user@homeward.test` | `User@12345` |

plus **20 sample pets** (one still waiting for review), **4 fundraisers** and some donations.

Coming from the first version? `npm run seed` also upgrades your existing pets to the new photo and review fields.

### 4. Run both apps (two terminals)
```bash
# terminal 1
cd server
npm run dev        # API on http://localhost:5000

# terminal 2
cd client
npm run dev        # website on http://localhost:5173
```
Open **http://localhost:5173**.

### 5. Try it
1. Log in as `user@homeward.test`, click **List a pet**, add two photos and submit.
2. Log in as the admin (another browser or private window). The **Review queue** shows the new listing. Click **Request edits** and write a note.
3. Back as the user, open **My dashboard > My listings**, read the note, edit and save. It goes back to review.
4. As the admin, **Approve** it. It now appears in **Find a pet**.
5. Open **Fundraisers**, pick one and donate, ticking "Hide my name". Check **My dashboard > Donations**.
6. As the admin, open the **Fundraisers** tab and try Pause, Resume and Close.

## Scripts

| Folder | Command | What it does |
| --- | --- | --- |
| server | `npm run dev` | Start API with auto restart |
| server | `npm start` | Start API |
| server | `npm run seed` | Add admin, sample user, 20 pets, fundraisers (only what is missing) |
| server | `npm run seed:reset` | Delete all data, then seed |
| client | `npm run dev` | Start website |
| client | `npm run build` | Production build into `client/dist` |
| client | `npm run preview` | Preview the production build |

## Project structure

```
homeward/
├── server/   Express API (models, routes, controllers, middleware)
├── client/   React app (pages, components, context)
├── prd.md            what we build and for whom
├── architecture.md   app flow, folder structure, tech stack, API list
├── memory.md         build history with every file and function explained
└── database.md       MongoDB and the data model in simple words
```

## API quick reference

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Public |
| GET / PUT | `/api/auth/me` | User |
| GET | `/api/pets`, `/api/pets/:id` | Public (approved only) |
| GET | `/api/pets/mine` | User |
| GET | `/api/pets/manage` | Admin |
| POST | `/api/pets` | User (admin listings auto-approved) |
| PUT / DELETE | `/api/pets/:id` | Owner or admin |
| PATCH | `/api/pets/:id/review` | Admin |
| POST | `/api/applications` | User |
| GET | `/api/applications/mine`, `/api/applications/received` | User |
| DELETE | `/api/applications/:id` | Applicant |
| GET | `/api/applications` | Admin |
| PATCH | `/api/applications/:id/status` | Admin or pet owner |
| GET | `/api/campaigns`, `/api/campaigns/:id` | Public |
| GET | `/api/campaigns/mine`, `/api/campaigns/donations/mine` | User |
| GET | `/api/campaigns/manage` | Admin |
| POST | `/api/campaigns` | User (admin campaigns go live at once) |
| PUT | `/api/campaigns/:id` | Owner or admin |
| DELETE | `/api/campaigns/:id` | Admin, or owner if nothing raised |
| PATCH | `/api/campaigns/:id/status` | Admin |
| POST | `/api/campaigns/:id/donations` | Public (guests are anonymous) |
| GET | `/api/users/favorites` | User |
| POST | `/api/users/favorites/:petId` | User |
| GET | `/api/users` | Admin |
| PATCH | `/api/users/:id/role` | Admin |
| DELETE | `/api/users/:id` | Admin |

Full details in [architecture.md](architecture.md).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Start the MongoDB service, or use an Atlas URI. |
| `JWT_SECRET is missing` | You did not create `server/.env`. See step 2. |
| Logged in but every request says "Please log in first" | Use the website at port 5173 so requests go through the Vite proxy. Do not call port 5000 from a different origin without setting `CLIENT_URL`. |
| Images do not show | Make sure the server is running; photos are served from `server/uploads`. |
| "Too many attempts" | The login rate limit was hit. Wait 15 minutes or restart the server in development. |
| My listing is not in search | User listings appear only after an admin approves them. Check **My dashboard > My listings**. |
| Old pets disappeared after updating | Run `npm run seed` once; it marks old pets as approved and converts their photo field. |

## Deploying (short notes)

- Set `NODE_ENV=production` so cookies are sent only over HTTPS.
- If the API and website are on different domains, set `VITE_API_URL` in the client to the API address, set `CLIENT_URL` on the server to the website address, and change `sameSite` in `server/src/utils/token.js` to `'none'`.
- Local disk uploads are wiped on many free hosts. Use a cloud storage service for photos in production.

## License

MIT. Free to use for learning.
