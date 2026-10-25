# Homeward: Architecture

## 1. The big picture

Homeward has three parts that talk to each other:

```
 Browser (React app)          Server (Express API)            Database
 ┌───────────────────┐  fetch  ┌──────────────────────┐ Mongoose ┌─────────────┐
 │ Pages, forms,     │ ──────▶ │ Routes ▶ Middleware  │ ───────▶ │ MongoDB     │
 │ AuthContext       │ ◀────── │ ▶ Controllers        │ ◀─────── │ users, pets,│
 │ (localhost:5173)  │  JSON   │ (localhost:5000)     │          │ applications│
 └───────────────────┘         └──────────────────────┘          │ campaigns,  │
                                        │                         │ donations   │
                                        ▼                         └─────────────┘
                               server/uploads/ (pet and campaign photos on disk)
```

- **Client**: what the user sees. Built with React and Vite. It never talks to the database directly.
- **Server**: the only part allowed to read and write the database. It checks who you are and what you are allowed to do.
- **Database**: MongoDB stores users, pets, applications, campaigns and donations as documents.

During development Vite forwards every `/api` and `/uploads` request to Express (see `client/vite.config.js`). The browser thinks everything comes from one address, so the login cookie works without extra setup.

## 2. Tech stack

| Layer | Tool | Why we use it |
| --- | --- | --- |
| Frontend build | React 19 + Vite | Fast dev server, simple config |
| Routing | React Router DOM | Different URLs for different pages |
| Styling | Tailwind CSS v4 | Utility classes, design tokens in one CSS file |
| HTTP | Fetch API (wrapped in `api/client.js`) | Built into the browser, nothing to install |
| Forms | React Hook Form + Zod | Less code for forms, same validation rules as the server |
| Notifications | React Hot Toast | Small pop-up messages for success and errors |
| Server | Node.js + Express 5 | Express 5 catches errors from async functions automatically |
| Database access | Mongoose | Schemas, validation and easy queries for MongoDB |
| Passwords | bcrypt | Slow, salted hashing |
| Login tokens | jsonwebtoken (JWT) | Stateless login stored in a cookie |
| Cookies | cookie-parser | Reads the cookie into `req.cookies` |
| Uploads | Multer | Saves files sent in `multipart/form-data` (up to 5 per request) |
| Validation | Zod | Checks request bodies before they reach controllers |
| Security | Helmet, express-rate-limit, CORS | Safe headers, request limits, allowed origin |
| Database | MongoDB Community Server or Atlas | Document database |
| DB viewer | MongoDB Compass | See and edit documents visually |

## 3. Request flow (how one request travels)

Example: a regular user lists a pet with two photos.

```
1. PetEditor.jsx builds a FormData (text fields + photos) and calls api('/pets', { method: 'POST' })
2. Browser sends POST /api/pets with the "token" cookie
3. Vite proxy forwards it to Express on port 5000
4. app.js: helmet ▶ cors ▶ express.json ▶ cookieParser ▶ rate limit
5. petRoutes.js: POST '/'
      protect               reads cookie, verifies JWT, loads req.user
      upload.array('photos') Multer saves up to 5 images, fills req.files and req.body
      validate(petSchemaFor) Zod picks the user schema (location + contact required) and checks req.body
      createPet             saves the Pet with reviewStatus "pending_review"
6. MongoDB stores the document in the "pets" collection
7. Express replies 201 { pet }
8. React shows "Sent for review" and opens /dashboard?tab=listings
9. Later an admin calls PATCH /api/pets/:id/review { reviewStatus: "approved" }
   and the pet starts appearing in GET /api/pets (public search)
```

If anything throws on the way (bad token, wrong role, invalid field), Express jumps straight to `errorHandler.js`, which deletes any photos Multer already saved and replies with `{ message }` and the right status code. The client's `api()` helper turns that into an Error, and the page shows it in a toast.

## 4. Authentication flow

```
Register / Login
  React form ─▶ POST /api/auth/login ─▶ check password with bcrypt
                                     ─▶ create JWT { id, role }
                                     ◀─ Set-Cookie: token=<jwt>; HttpOnly
On page refresh
  AuthContext ─▶ GET /api/auth/me (cookie sent automatically)
              ◀─ { user } or 401
Logout
  POST /api/auth/logout ─▶ server clears the cookie
```

**Three kinds of server checks:**
- `protect`: must be logged in.
- `authorize('admin')`: must be an admin.
- `isOwnerOrAdmin(user, doc)`: used inside controllers for "edit or delete only your own listing or fundraiser".
- `optionalAuth`: the route is public, but if a cookie is present we know who is asking (used to show unapproved items to their owner).

**Two layers of protection:**
1. **Server** (the real security): the checks above. Even if someone edits the React code, the API still refuses.
2. **Client** (for a nice experience): `ProtectedRoute` redirects to `/login` or `/dashboard` so users never land on a page they cannot use.

## 5. App flow (screens)

```
Visitor
  Home ─▶ Find a pet (approved only) ─▶ Pet detail ─▶ "Log in to apply / see contact"
       ─▶ Fundraisers ─▶ Fundraiser detail ─▶ Donate (anonymous guest)

User
  Pet detail ─▶ Apply form ─▶ Dashboard
  List a pet ─▶ "Sent for review" ─▶ Dashboard > My listings (status + admin note)
                                       └▶ Edit ─▶ back to "In review"
                                       └▶ Applications for your pets ─▶ Approve / Reject
  Start a fundraiser ─▶ "Sent for review" ─▶ Dashboard > My fundraisers
  Fundraiser detail ─▶ Donate (name or hidden) ─▶ Dashboard > Donations
  Profile: edit name, phone, city

Admin
  Admin dashboard
    ├─ Review queue: user listings (approve / request edits / reject)
    │                user fundraisers (approve / reject)
    ├─ Applications: approve / reject (+ note)
    ├─ Pets: filter by review status, approve, take down, edit, delete
    ├─ Fundraisers: approve, pause, resume, close, reopen, edit, remove
    └─ Users: change role / delete
```

### Status lifecycles

```
Pet listing (reviewStatus)
  user creates ─▶ pending_review ─▶ approved (public)
                        │      ╲
                        ▼       ▶ changes_requested ─(owner edits)─▶ pending_review
                    rejected ─(owner edits)─▶ pending_review
  owner edits an approved listing ─▶ pending_review (hidden until approved again)
  admin creates ─▶ approved

Fundraiser (status)
  user creates ─▶ pending_review ─▶ active ⇄ paused
                        │             │        │
                        ▼             ▼        ▼
                    rejected ──▶   closed ◀────┘   (closed ─▶ active = reopen)
  admin creates ─▶ active
  donations allowed only when status = active AND end date not passed
```

## 6. API endpoints

| Method | URL | Who | What it does |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Anyone | Create account, log in |
| POST | `/api/auth/login` | Anyone | Log in |
| POST | `/api/auth/logout` | Anyone | Log out |
| GET | `/api/auth/me` | User | Current user |
| PUT | `/api/auth/me` | User | Update profile |
| GET | `/api/pets` | Anyone | Search approved pets (`name`, `species`, `minAge`, `maxAge`, `status`, `page`, `limit`) |
| GET | `/api/pets/mine` | User | My listings, any review status |
| GET | `/api/pets/manage` | Admin | All pets (`?reviewStatus=`) |
| GET | `/api/pets/:id` | Anyone / owner | One pet. Unapproved only for owner and admin. Contact hidden from guests |
| POST | `/api/pets` | User | List a pet (multipart, up to 5 `photos`). Admin listings are approved at once |
| PUT | `/api/pets/:id` | Owner or admin | Edit (multipart, `keepPhotos` JSON + new `photos`). Owner edits go back to review |
| DELETE | `/api/pets/:id` | Owner or admin | Delete pet and clean up |
| PATCH | `/api/pets/:id/review` | Admin | `{ reviewStatus: approved / changes_requested / rejected, reviewNote }` |
| POST | `/api/applications` | User | Apply for a pet |
| GET | `/api/applications/mine` | User | Applications I sent |
| GET | `/api/applications/received` | User | Applications for pets I listed |
| DELETE | `/api/applications/:id` | Applicant | Withdraw a pending application |
| GET | `/api/applications` | Admin | All applications (`?status=`) |
| PATCH | `/api/applications/:id/status` | Admin or pet owner | Approve or reject |
| GET | `/api/campaigns` | Anyone | Active (default) or `?status=closed`, `category`, `q`, `page` |
| GET | `/api/campaigns/mine` | User | My fundraisers |
| GET | `/api/campaigns/donations/mine` | User | My donation history and total |
| GET | `/api/campaigns/manage` | Admin | All fundraisers (`?status=`) |
| GET | `/api/campaigns/:id` | Anyone / owner | Fundraiser and 20 latest donations (anonymous names hidden) |
| POST | `/api/campaigns` | User | Create (multipart, up to 5 `photos`). Admin campaigns go live at once |
| PUT | `/api/campaigns/:id` | Owner or admin | Edit. Not allowed once closed |
| DELETE | `/api/campaigns/:id` | Admin, or owner if nothing raised | Remove (donation records are kept) |
| PATCH | `/api/campaigns/:id/status` | Admin | `{ status: active / paused / closed / rejected, reviewNote }` |
| POST | `/api/campaigns/:id/donations` | Anyone | Donate `{ amount, isAnonymous, donorName, message }` |
| GET | `/api/users/favorites` | User | My saved pets (approved only) |
| POST | `/api/users/favorites/:petId` | User | Save or unsave a pet |
| GET | `/api/users` | Admin | All users |
| PATCH | `/api/users/:id/role` | Admin | Change role |
| DELETE | `/api/users/:id` | Admin | Delete user, their applications and listings; close their fundraisers |

## 7. Folder and file structure

```
homeward/
├── README.md               How to install and run
├── prd.md                  What we build and for whom
├── architecture.md         This file
├── memory.md               Build history, every file explained
├── database.md             MongoDB explained
├── .gitignore
│
├── server/                 Express API
│   ├── package.json
│   ├── .env.example        Copy to .env and fill in
│   ├── uploads/            Pet and fundraiser photos are saved here
│   └── src/
│       ├── server.js       Entry point: load .env, connect DB, start listening
│       ├── app.js          Builds the Express app: middleware + routes
│       ├── seed.js         Admin, sample user, 20 pets, 4 fundraisers, donations
│       ├── config/
│       │   └── db.js       Connects to MongoDB
│       ├── models/         Mongoose schemas (shape of the data)
│       │   ├── User.js
│       │   ├── Pet.js           photos[], location, contact, reviewStatus
│       │   ├── Application.js
│       │   ├── Campaign.js      goal, raised, donorCount, endDate, status
│       │   └── Donation.js      amount, isAnonymous, user (or null for guests)
│       ├── validators/     Zod schemas for request bodies
│       │   ├── common.js        objectId, formBoolean, keepPhotos
│       │   ├── authSchemas.js
│       │   ├── petSchemas.js    admin vs user schema, review schema
│       │   ├── applicationSchemas.js
│       │   └── campaignSchemas.js campaign, status, donation
│       ├── middleware/     Functions that run before controllers
│       │   ├── auth.js         protect, optionalAuth, authorize, isOwnerOrAdmin
│       │   ├── validate.js     runs a Zod schema (or picks one per request)
│       │   ├── upload.js       Multer setup, mergePhotos, delete files
│       │   └── errorHandler.js 404 + error to JSON + upload cleanup
│       ├── controllers/    The actual work for each endpoint
│       │   ├── authController.js
│       │   ├── petController.js
│       │   ├── applicationController.js
│       │   ├── campaignController.js
│       │   └── userController.js
│       ├── routes/         URL ▶ middleware ▶ controller
│       │   ├── authRoutes.js
│       │   ├── petRoutes.js
│       │   ├── applicationRoutes.js
│       │   ├── campaignRoutes.js
│       │   └── userRoutes.js
│       └── utils/
│           ├── token.js     create JWT, cookie options
│           ├── AppError.js  Error with a status code
│           └── cleanup.js   delete a pet and everything linked to it
│
└── client/                 React app
    ├── package.json
    ├── vite.config.js      React + Tailwind plugins, API proxy
    ├── index.html          Loads fonts and the app
    ├── public/favicon.svg
    └── src/
        ├── main.jsx        Mounts React, Router, AuthProvider, Toaster
        ├── App.jsx         All routes
        ├── index.css       Tailwind + design tokens + reusable classes
        ├── api/client.js   fetch wrapper + photoUrl()
        ├── context/AuthContext.jsx  logged in user, login/register/logout
        ├── hooks/useFavorites.js    favorite ids + toggle
        ├── schemas/forms.js         Zod schemas for every form
        ├── utils/format.js          money (₹), dates, days left, percent
        ├── components/     Reusable pieces
        │   ├── Layout.jsx, Navbar.jsx, Footer.jsx, Logo.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── PetCard.jsx, PetPhoto.jsx, FavoriteButton.jsx, StatusTag.jsx
        │   ├── PhotoPicker.jsx          pick, preview and remove up to 5 photos
        │   ├── CampaignCard.jsx, ProgressBar.jsx
        │   ├── ApplicationItem.jsx      one application with approve / reject
        │   ├── Field.jsx, AuthCard.jsx, Tabs.jsx, Spinner.jsx, Notice.jsx
        └── pages/          One file per screen
            ├── Home.jsx, Pets.jsx, PetDetail.jsx
            ├── PetEditor.jsx            list a pet / edit listing (users and admins)
            ├── Campaigns.jsx, CampaignDetail.jsx, CampaignEditor.jsx
            ├── Login.jsx, Register.jsx, Profile.jsx
            ├── Dashboard.jsx, NotFound.jsx
            └── admin/
                ├── AdminDashboard.jsx   loads data, shows tabs
                ├── ReviewQueue.jsx
                ├── ApplicationsList.jsx
                ├── PetsTable.jsx
                ├── CampaignsTable.jsx
                ├── UsersTable.jsx
                └── moderation.js        shared approve / reject / pause actions
```

## 8. Why this structure

- **Routes, middleware, controllers are separate.** A route file reads like a sentence: "POST /pets, must be logged in, must be admin, read the photo, validate, then create". The logic lives in the controller.
- **Validation happens twice.** In the browser for quick feedback, on the server for real safety.
- **One fetch wrapper.** Every request goes through `api()`, so cookies and errors are handled the same way everywhere.
- **One place for the user.** `AuthContext` means no page has to fetch the user by itself.
- **Two statuses on a pet.** `status` answers "can it be adopted?", `reviewStatus` answers "has an admin checked it?". Keeping them separate means approving a listing never changes its adoption state, and the other way round.
- **One editor per thing.** `PetEditor` and `CampaignEditor` handle both "new" and "edit" for both users and admins, so the rules live in one place.

## 9. Design system (frontend)

- **Colors** (in `index.css`): cream background, paper surfaces, near-black ink text, forest green for main actions, clay for accents and danger, sun yellow for pending and focus rings. All text colors pass WCAG AA contrast on their backgrounds.
- **Fonts**: Bricolage Grotesque for headings, Figtree for body text (Google Fonts).
- **Shapes**: 2px borders, rounded corners (8px inputs, 16px panels, 24px images). No shadows, no gradients.
- **Spacing**: Tailwind's 4px scale only.
- **Buttons**: hover changes the background color (no fading).
- **Icons**: a few hand-written inline SVGs (heart, menu, plus, close). No icon library.
- **Money**: Indian rupees, formatted with `Intl.NumberFormat('en-IN')` (₹1,25,000).
