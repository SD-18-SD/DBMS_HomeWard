# Homeward: Build Memory

**Version 1** (steps 1 to 15): adoption platform with admin-only pet management.
**Version 2** (steps 16 to 27): user-submitted listings with moderation, multiple photos, donation campaigns, 20 sample pets.

This file is the story of how the project was built, step by step. For every folder, file and function it says **what it is** and **what it does in plain words**. Read it top to bottom the first time; later use it as a lookup.

---

## Step 1. Project setup

We made one folder `homeward/` with two separate apps inside:

| Folder | What it is |
| --- | --- |
| `server/` | The backend. A Node.js program that answers requests and talks to MongoDB. |
| `client/` | The frontend. The React website people see in the browser. |

They are separate because they run as two programs on two ports (5000 and 5173). Each has its own `package.json` (the list of libraries it needs and the commands you can run).

**`.gitignore`**: tells Git which files to never upload. We ignore `node_modules` (huge, can be reinstalled), `.env` (contains secrets), `client/dist` (build output) and uploaded photos.

---

## Step 2. Server basics

### `server/package.json`
- `"type": "module"` lets us write `import x from 'y'` instead of `require()`.
- Scripts:
  - `npm run dev` starts the server with **nodemon**, which restarts it every time you save a file.
  - `npm start` starts it normally.
  - `npm run seed` fills the database with sample data.

### `server/.env.example`
A template of settings. You copy it to `.env` and fill in real values. `.env` is secret and never committed.
- `MONGO_URI`: address of your database.
- `JWT_SECRET`: a long random password used to sign login tokens.
- `CLIENT_URL`: where React runs, so the server allows it (CORS).

### `server/src/config/db.js`
- **`connectDB(uri)`**: opens the connection to MongoDB using Mongoose. Called once when the server starts. If `MONGO_URI` is missing it throws a clear error.

### `server/src/server.js` (entry point)
The first file that runs.
1. Loads `.env` with dotenv so `process.env.MONGO_URI` etc. exist.
2. Stops with a message if `JWT_SECRET` is missing.
3. Connects to MongoDB.
4. Starts listening on the port (5000).

### `server/src/app.js`
Builds the Express app. Order matters, every request passes through these in order:
1. **helmet**: adds security headers to every response (for example, stops the site being loaded in a hidden frame).
2. **cors**: allows only `CLIENT_URL` to call the API and send cookies.
3. **express.json**: turns a JSON body into `req.body`. Limited to 100 KB.
4. **cookieParser**: turns the `Cookie` header into `req.cookies`.
5. **rateLimit**: max 300 requests per 15 minutes per IP on `/api`.
6. **express.static('/uploads')**: serves pet photos like normal files.
7. The four route groups (`/api/auth`, `/api/pets`, `/api/applications`, `/api/users`).
8. **notFound** and **errorHandler** at the very end.

---

## Step 3. Database models (Mongoose)

A **model** describes the shape of one kind of document and gives us functions like `find`, `create`, `findById`. See `database.md` for MongoDB itself.

### `models/User.js`
Fields: `name`, `email` (unique, lowercase), `password` (hidden by default with `select: false`), `role` (`user` or `admin`), `phone`, `city`, `favorites` (list of Pet ids).
- **`pre('save')` hook**: runs automatically before saving. If the password was changed, it replaces it with a **bcrypt hash**. So we never store the real password.
- **`comparePassword(plain)`**: checks a typed password against the stored hash. Returns `true` or `false`.
- **`toJSON` transform**: removes `password` and `__v` whenever a user is sent to the browser.

### `models/Pet.js`
Fields: `name`, `species`, `breed`, `age`, `gender`, `size`, `description`, `vaccinated`, `status` (`available`, `pending`, `adopted`), `photo` (path like `/uploads/123-biscuit.jpg`), `createdBy`.
- Exports `SPECIES` and `PET_STATUS` lists so validators reuse the same values.
- **Indexes** on `name` and on `species + status + age` make searches faster.

### `models/Application.js`
Fields: `user`, `pet` (both ids), `phone`, `homeType`, `hasOtherPets`, `message`, `status` (`pending`, `approved`, `rejected`), `adminNote`.
- **Unique index on `user + pet`**: the database itself refuses a second application from the same user for the same pet.

All three use `timestamps: true`, which adds `createdAt` and `updatedAt` automatically.

---

## Step 4. Helpers

### `utils/AppError.js`
- **`AppError`**: a normal JavaScript Error plus a `statusCode`. Anywhere in the code we can write `throw new AppError('Pet not found', 404)` and the error handler sends exactly that.

### `utils/token.js`
- **`createToken(user)`**: makes a JWT containing only the user's `id` and `role`, signed with `JWT_SECRET`, expiring after 7 days.
- **`cookieOptions()`**: cookie settings. `httpOnly` (JavaScript cannot read it, protects against stolen tokens), `secure` in production (HTTPS only), `sameSite: 'lax'` (helps against cross-site attacks).
- **`sendTokenCookie(res, user)`**: creates the token and puts it in a cookie called `token`.

---

## Step 5. Middleware (the checkpoints)

Middleware is a function that runs **before** the controller. It can let the request continue (`next()`) or stop it by throwing an error.

### `middleware/auth.js`
- **`protect`**: "Are you logged in?" Reads the `token` cookie, verifies it with `jwt.verify`, finds the user in the database and saves it on `req.user`. No cookie or bad token means 401.
- **`authorize(...roles)`**: "Are you allowed?" Used after `protect`. `authorize('admin')` lets only admins through, everyone else gets 403.

### `middleware/validate.js`
- **`validate(schema)`**: checks `req.body` with a Zod schema. If something is wrong it replies 400 with a message like `email: Enter a valid email`. If correct, `req.body` becomes the cleaned version (trimmed text, numbers converted, defaults filled in).

### `middleware/upload.js`
- **`upload`**: a Multer instance. It saves files to `server/uploads/`, renames them to `<timestamp>-<safe-name>.<ext>` (so two files never clash), accepts only JPG, PNG, WEBP, and limits size to 2 MB.
- **`removeUpload(path)`**: deletes a photo file from disk. Used when a pet is deleted or its photo is replaced.
- **`UPLOAD_DIR`**: the absolute path of the uploads folder, created automatically if missing.

### `middleware/errorHandler.js`
- **`notFound`**: replies 404 for any URL that matched no route.
- **`errorHandler`**: catches every error and turns it into `{ message }` with a sensible status:
  - `CastError` (bad id) becomes 400 "Invalid id"
  - `ValidationError` (Mongoose rule broken) becomes 400
  - error code `11000` (duplicate) becomes 409 "email already exists" or "already applied"
  - `MulterError` (file too big) becomes 400
  - anything else becomes 500 and is logged

Because we use **Express 5**, errors thrown inside `async` functions reach this handler automatically. No try/catch needed in controllers.

---

## Step 6. Validators (Zod)

Zod schemas describe what a valid request body looks like.

| File | Schemas |
| --- | --- |
| `validators/authSchemas.js` | `registerSchema` (name, email, strong password), `loginSchema`, `profileSchema` |
| `validators/petSchemas.js` | `petSchema`. Uses `z.coerce.number()` for age because form uploads send everything as text. Turns `"true"`/`"false"` into real booleans for `vaccinated`. |
| `validators/applicationSchemas.js` | `applicationSchema` (pet id, phone, homeType, message 20+ chars), `statusSchema` (approve/reject + note), `roleSchema` (user/admin) |

---

## Step 7. Controllers (the real work)

### `controllers/authController.js`
- **`register`**: creates a user (role is never read from the request, so nobody can sign up as admin) and logs them in by setting the cookie.
- **`login`**: finds the user by email, including the hidden password, compares it with bcrypt. Same error for wrong email or wrong password so attackers cannot learn which emails exist.
- **`logout`**: clears the cookie.
- **`getMe`**: returns `req.user` (already loaded by `protect`).
- **`updateMe`**: saves new name, phone and city.

### `controllers/petController.js`
- **`getPets`**: the search. Builds a MongoDB filter from the query string:
  - `name` becomes a case-insensitive regex (special characters are escaped first, so typing `(` cannot break the query)
  - `species`, `status` are only used if they are valid values
  - `minAge`/`maxAge` become `$gte`/`$lte`
  - `page` and `limit` (max 50) for pagination. Runs the search and the count at the same time with `Promise.all`.
- **`getPet`**: one pet by id, 404 if not found.
- **`createPet`**: saves a new pet, stores `/uploads/<filename>` if a photo was uploaded, and records who created it.
- **`updatePet`**: updates fields; if a new photo was uploaded it deletes the old file first.
- **`deletePet`**: deletes the pet, its photo, all its applications, and removes it from everyone's favorites.

### `controllers/applicationController.js`
- **`createApplication`**: checks the pet exists and is `available`, then saves the application for `req.user`.
- **`getMyApplications`**: the user's own applications, with basic pet info filled in using `populate`.
- **`withdrawApplication`**: deletes the user's own application, only while `pending`.
- **`getAllApplications`**: admin list, optional `?status=` filter, with pet and user info.
- **`updateApplicationStatus`**: admin approves or rejects. When approving, it also sets the pet to `adopted` and auto-rejects other pending applications for that pet with a friendly note.

### `controllers/userController.js`
- **`getFavorites`**: the user's saved pets with full details (`populate`).
- **`toggleFavorite`**: adds the pet if not saved, removes it if it was. Returns the new list.
- **`getUsers`**: admin list of all users.
- **`updateUserRole`**: admin makes someone admin or user. You cannot change your own role (so you never lock yourself out).
- **`deleteUser`**: admin deletes a user and their applications. You cannot delete yourself.

---

## Step 8. Routes (the map)

Routes connect a URL and method to middleware and a controller.

| File | Base URL | Notes |
| --- | --- | --- |
| `routes/authRoutes.js` | `/api/auth` | Has an extra **authLimiter**: 20 login/register tries per 15 minutes |
| `routes/petRoutes.js` | `/api/pets` | GET is public; POST/PUT/DELETE need `protect` + `authorize('admin')`. `upload.single('photo')` runs **before** `validate` because Multer is what fills `req.body` for file uploads. |
| `routes/applicationRoutes.js` | `/api/applications` | `router.use(protect)` protects every route in the file at once |
| `routes/userRoutes.js` | `/api/users` | Favorites for users, the rest admin only |

---

## Step 9. Seed script

### `server/src/seed.js`
Run `npm run seed`. It:
1. Creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if it does not exist.
2. Adds 6 sample pets if the pets collection is empty.
3. Disconnects.
Safe to run many times; it never creates duplicates.

---

## Step 10. Client setup

### `client/package.json`
`npm run dev` starts Vite, `npm run build` makes a production build in `dist/`.

### `client/vite.config.js`
- Enables the React plugin and the Tailwind plugin.
- **Proxy**: any request to `/api` or `/uploads` is forwarded to `http://localhost:5000`. The browser only sees `localhost:5173`, so the login cookie is "same site" and just works.

### `client/index.html`
The single HTML page. Loads the two Google Fonts and `src/main.jsx`.

### `client/src/index.css`
- `@import "tailwindcss"` loads Tailwind.
- `@theme { ... }` defines our colors and fonts. Tailwind turns `--color-forest` into classes like `bg-forest` and `text-forest`.
- `@layer base` sets the page background, fonts and a yellow focus ring for keyboard users.
- `@utility` blocks create our own reusable classes: `container-page`, `btn`, `btn-primary`, `btn-accent`, `btn-outline`, `btn-ghost`, `btn-danger`, `label`, `input`, `error-text`, `panel`.

### `client/src/main.jsx`
Starts React. Wraps the app in:
- `BrowserRouter` (URLs and navigation),
- `AuthProvider` (who is logged in),
- `Toaster` (where pop-up messages appear, bottom right).

### `client/src/App.jsx`
The list of all pages and their URLs. Groups:
- Public: `/`, `/pets`, `/pets/:id`, `/login`, `/register`
- Inside `<ProtectedRoute />`: `/dashboard`, `/profile`
- Inside `<ProtectedRoute role="admin" />`: `/admin`, `/admin/pets/new`, `/admin/pets/:id/edit`
- `*` shows NotFound.

---

## Step 11. Client data layer

### `api/client.js`
- **`api(path, options)`**: our fetch helper. It adds `/api` in front, always sends cookies (`credentials: 'include'`), converts bodies to JSON (or sends `FormData` as-is for uploads), and throws an Error with the server's message if the response is not OK.
- **`photoUrl(path)`**: turns `/uploads/x.jpg` into a full URL (only matters if you deploy the API on another domain using `VITE_API_URL`).

### `context/AuthContext.jsx`
- **`AuthProvider`**: holds `user` and `loading` in state. On first load it calls `GET /auth/me` to see if a cookie is already there.
- **`login(values)`**, **`register(values)`**, **`logout()`**: call the API and update `user`.
- **`isAdmin`**: `true` when `user.role === 'admin'`.
- **`useAuth()`**: a hook so any component can write `const { user, logout } = useAuth()`.

### `hooks/useFavorites.js`
- **`useFavorites()`**: returns `favoriteIds` (a Set, quick to check "is this pet saved?") and **`toggleFavorite(petId)`**. If you are not logged in it sends you to `/login`. After toggling it updates the user in AuthContext, so every page shows the same hearts.

### `schemas/forms.js`
Zod schemas for every form (`loginSchema`, `registerSchema` with "passwords match" check, `profileSchema`, `applicationSchema`, `petSchema`). They match the server rules so users see mistakes instantly. React Hook Form uses them through `zodResolver`.

---

## Step 12. Components (reusable pieces)

| File | What it does |
| --- | --- |
| `Layout.jsx` | Navbar on top, page content in the middle (`<Outlet />`), footer at the bottom |
| `Navbar.jsx` | Logo, links (Find a pet, My dashboard, Admin), login/logout. Collapses into a menu button on phones. |
| `Footer.jsx` | Dark bar at the bottom |
| `Logo.jsx` | House-shaped SVG mark plus the name, links home |
| `ProtectedRoute.jsx` | Shows a spinner while checking login, redirects to `/login` if logged out, to `/dashboard` if the role is wrong, otherwise shows the page |
| `Spinner.jsx` | Loading circle with text |
| `PetCard.jsx` | One pet tile: photo, name, status, short info, heart button. Also exports **`ageLabel(age)`** which turns `1` into "1 year" and `0` into "Under 1 year". |
| `PetPhoto.jsx` | Shows the uploaded image, or a colored square with the pet's first letter if there is no photo |
| `FavoriteButton.jsx` | Heart button drawn with inline SVG, filled when saved |
| `StatusTag.jsx` | Small rounded label colored by status (available green, pending yellow, adopted black, rejected clay) |
| `Field.jsx` | Label + input (or select, or textarea) + error message in one, works with React Hook Form's `register` |
| `AuthCard.jsx` | Shared layout for login and register pages |
| `Tabs.jsx` | Row of tab buttons with counts, used in both dashboards |

---

## Step 13. Pages

| File | URL | What it does |
| --- | --- | --- |
| `Home.jsx` | `/` | Headline and two buttons, a photo collage of the newest pets, a 4-step "how adoption works" list, the 4 newest available pets, and a sign-up band |
| `Pets.jsx` | `/pets` | Search page. Name box plus species, age group and availability dropdowns. Filters live in the URL (`useSearchParams`). Pagination with Previous/Next. |
| `PetDetail.jsx` | `/pets/:id` | Large photo, facts grid, description, save button. Below it **ApplySection** decides what to show: your existing application status, "not available", "log in to apply", an admin note, or the **ApplicationForm** |
| `Login.jsx` | `/login` | Email and password form. After login goes back to the page you came from, or to the dashboard (admins go to `/admin`) |
| `Register.jsx` | `/register` | Name, email, password, confirm password |
| `Profile.jsx` | `/profile` | Edit name, phone, city. Save button is disabled until you change something. |
| `Dashboard.jsx` | `/dashboard` | Two tabs: **My applications** (status, admin note, withdraw button for pending ones) and **Saved pets** |
| `admin/AdminDashboard.jsx` | `/admin` | Four summary numbers and three tabs. **ApplicationsList** (filter, approve, reject with a note), **PetsTable** (edit, delete), **UsersTable** (change role, delete) |
| `admin/PetEditor.jsx` | `/admin/pets/new` and `/admin/pets/:id/edit` | One form for both add and edit. Photo picker with instant preview, checks type and size before upload, sends everything as `FormData` |
| `NotFound.jsx` | anything else | Friendly 404 |

---

## Step 14. Security checklist (where each item lives)

| Requirement | Where |
| --- | --- |
| Password hashing | `User.js` pre-save hook with bcrypt |
| Password never returned | `select: false` and `toJSON` in `User.js` |
| Login token | `utils/token.js`, httpOnly cookie |
| Protected routes (server) | `middleware/auth.js` **protect** |
| Role-based authorization | `middleware/auth.js` **authorize** |
| Protected routes (browser) | `components/ProtectedRoute.jsx` |
| Input validation | `middleware/validate.js` + `validators/*` |
| Security headers | `helmet` in `app.js` |
| Brute force protection | rate limits in `app.js` and `authRoutes.js` |
| Safe uploads | type and size limits in `middleware/upload.js` |
| No admin self-signup | `register` ignores any `role` in the body |

---

## Step 15. Testing done during the build

- Client production build (`vite build`) passes.
- API smoke test without a database: `/api/health` returns 200, bad register data returns 400 with a readable message, protected routes return 401 without a cookie, unknown URLs return 404.
- Zod pet schema correctly turns form text (`"3"`, `"true"`) into numbers and booleans.


---

# Version 2

## Step 16. What changed and why

Two new ideas were added:
1. **Anyone can list a pet**, not only admins. Because strangers can now publish content, every user listing goes through **moderation** (an admin checks it) before it appears in search.
2. **Donation campaigns** (shown as "Fundraisers" in the app) let the shelter or users raise money for medical care, food, shelter or emergencies.

Supporting changes: up to 5 photos instead of 1, location and contact details on pets, owners reviewing applications for their own pets, and a bigger seed script.

---

## Step 17. Pet model upgrade (`models/Pet.js`)

| Change | Plain words |
| --- | --- |
| `photo` became **`photos: [String]`** | A list of up to 5 paths. A `validate` rule refuses more than `MAX_PHOTOS`. The first one is the cover. |
| **`location`** | City or area, shown on cards. |
| **`contact`** subdocument | `{ name, phone, email }` stored inside the pet. `_id: false` stops Mongoose from giving it its own id. |
| **`reviewStatus`** | `pending_review`, `approved`, `rejected`, `changes_requested`. Default is `pending_review`, so a listing is hidden unless someone approves it. |
| **`reviewNote`**, **`reviewedAt`** | The admin's message to the owner and when they decided. |
| New exports `REVIEW_STATUS`, `MAX_PHOTOS` | So validators and controllers use the same lists. |
| New indexes | `reviewStatus` added to the search index, plus `createdBy` for "my listings". |

`status` (available, pending, adopted) still exists and means something different: whether the animal can still be adopted.

---

## Step 18. New models

### `models/Campaign.js`
A fundraiser. Fields: `title`, `description`, `category`, `goalAmount`, `raisedAmount`, `donorCount`, `endDate`, `photos`, `pet` (optional link), `createdBy`, `status`, `reviewNote`.
- **`isEnded` virtual**: a calculated field (`endDate < now`). It is never saved; Mongoose works it out each time. `toJSON: { virtuals: true }` makes it appear in API responses.
- Exports `CAMPAIGN_CATEGORIES`, `CAMPAIGN_STATUS`, `MAX_CAMPAIGN_PHOTOS`.

### `models/Donation.js`
One gift to one campaign: `campaign`, `user` (or `null` for a guest), `donorName`, `isAnonymous`, `amount`, `message`. No real money moves; this is a record only.

---

## Step 19. Middleware upgrades

### `middleware/auth.js`
- **`userFromCookie(req)`** (private helper): reads and verifies the cookie, returns the user or `null`. Both `protect` and `optionalAuth` use it, so the logic is written once.
- **`optionalAuth`** (new): never blocks. If a valid cookie is there, `req.user` is filled, otherwise it is `null`. Used on public pages that show extra things to some people (an owner can open their own listing while it is still in review; contact details show only to logged in users).
- **`isOwnerOrAdmin(user, doc)`** (new): `true` if the user is an admin or created the document. Used in controllers for "edit or delete only your own".

### `middleware/validate.js`
`validate()` now also accepts a **function** that picks a schema per request. `validate(petSchemaFor)` uses the stricter user schema for regular users and the relaxed admin schema for admins.

### `middleware/upload.js`
- Limit is now **5 files** per request, and file names include a random number so two photos uploaded in the same millisecond never clash.
- **`filesToPaths(files)`**: turns Multer's saved files into `["/uploads/..."]`.
- **`removeUploads(paths)`**: deletes several files.
- **`mergePhotos({ current, keep, added, max })`**: works out the final photo list when editing. It keeps the old photos the user did not remove, adds the new ones, refuses if the total is over 5, and tells the controller which old files to delete.

### `middleware/errorHandler.js`
- If a request fails **after** Multer saved photos (for example a missing field), those files are deleted so the uploads folder never fills with junk.
- New friendly messages for "too many files".

---

## Step 20. Validators

### `validators/common.js` (new)
Shared building blocks:
- **`objectId`**: a 24-character hex id.
- **`formBoolean`**: turns the text `"true"`/`"false"` (from multipart forms) into real booleans.
- **`keepPhotos`**: reads a JSON text like `'["/uploads/a.jpg"]'` into an array. Missing means "keep all photos".

### `validators/petSchemas.js`
- **`adminPetSchema`**: location and contact optional.
- **`userPetSchema`**: built with `.extend()` from the admin schema, but breed, description (20+ characters), location, contact name and phone are **required**. `requiredText()` gives the same friendly message whether the field is missing or too short.
- **`petSchemaFor(req)`**: picks one of the two based on `req.user.role`.
- **`reviewSchema`**: the admin decision. A `.refine()` rule requires a note of 5+ characters unless the decision is "approved", so owners always learn what to fix.

### `validators/campaignSchemas.js` (new)
- **`campaignSchema`**: title, description (30+), category, goal (whole rupees, 100 or more), end date, optional pet id, `keepPhotos`. The end date is moved to 23:59:59 of that day so the campaign stays open the whole last day, then checked to be in the future.
- **`campaignStatusSchema`**: `active`, `paused`, `closed` or `rejected`, plus an optional note.
- **`donationSchema`**: amount 10 to 1,00,000 whole rupees, `isAnonymous`, optional `donorName` and `message`.

---

## Step 21. Controllers

### `utils/cleanup.js` (new)
- **`deletePetEverywhere(pet)`**: deletes the pet, its photo files, its applications, and removes it from every user's favorites. Used by both the pet controller and "delete user", so cleanup is never forgotten.

### `controllers/petController.js` (rewritten)
- **`toPetData(body)`**: turns flat form fields (`contactName`, `contactPhone`, ...) into the `contact` object the model expects.
- **`buildFilter(query)`** and **`paginate(filter, query)`**: shared by public search and the admin list.
- **`publicPet(pet, user)`**: removes `contact` when nobody is logged in.
- **`getPets`**: public search. **Always** adds `reviewStatus: 'approved'`.
- **`getAllPetsForAdmin`**: every pet, filter by `?reviewStatus=`.
- **`getMyListings`**: pets where `createdBy` is me.
- **`getPet`**: returns 404 for unapproved listings unless you are the owner or an admin (we say "not found" instead of "forbidden" so strangers cannot learn it exists).
- **`createPet`**: admins get `approved` straight away, users get `pending_review`.
- **`updatePet`**: owner or admin. Uses `mergePhotos`. If a regular user saves, the listing goes back to `pending_review` and the old note is cleared. Old photo files are deleted only **after** the save succeeds.
- **`reviewPet`**: admin sets `approved`, `changes_requested` or `rejected` with a note.
- **`deletePet`**: owner or admin, uses `deletePetEverywhere`.

### `controllers/applicationController.js` (updated)
- **`createApplication`**: the pet must be approved and available, and you cannot apply for a pet you listed.
- **`getReceivedApplications`** (new): finds the ids of my pets with `.distinct('_id')`, then all applications whose `pet` is `$in` that list.
- **`updateApplicationStatus`**: now allowed for the **person who listed the pet** as well as admins, checked with `isOwnerOrAdmin`.

### `controllers/campaignController.js` (new)
- **`ALLOWED_MOVES`**: a small map of which status can change to which. For example you can pause an active campaign but not a pending one. This stops impossible changes.
- **`publicDonation(d)`**: what the public sees of a donation. Shows "Anonymous" when asked and never includes the user id.
- **`listCampaigns`**: public list of `active` (default) or `closed`, filter by category and title, ending soonest first.
- **`listAllCampaigns`**: admin list, any status.
- **`getMyCampaigns`**, **`getMyDonations`**: for the dashboard. `getMyDonations` also returns the total given.
- **`getCampaign`**: one campaign plus the 20 latest donations. Pending or rejected campaigns are visible only to the owner and admins.
- **`createCampaign`**: admin campaigns go `active`, user campaigns `pending_review`. Checks that a linked pet exists.
- **`updateCampaign`**: owner or admin, not once closed. If an owner fixes a rejected campaign it goes back to review.
- **`setCampaignStatus`**: admin approve / reject / pause / resume / close / reopen, checked against `ALLOWED_MOVES`.
- **`deleteCampaign`**: admins can remove any campaign; owners only if nothing was raised yet. Donations are **kept** so donors do not lose their history.
- **`donate`**: campaign must be `active` and not ended. Guests are anonymous unless they type a name. A logged in person is counted as a donor only the first time (`Donation.exists`). The totals are updated with **`$inc`**, which adds inside the database in one step so two donations at the same moment cannot overwrite each other.

### `controllers/userController.js` (updated)
- **`getFavorites`** shows only approved pets (`populate` with `match`).
- **`deleteUser`** also deletes the user's pet listings (with full cleanup) and closes their campaigns.

---

## Step 22. Routes

| File | What is new |
| --- | --- |
| `routes/petRoutes.js` | `POST` is open to **any logged in user**. `GET /mine` and `GET /manage` come **before** `GET /:id`, otherwise Express would think "mine" is an id. `upload.array('photos', 5)`. `PATCH /:id/review` for admins. |
| `routes/applicationRoutes.js` | `GET /received`. `PATCH /:id/status` no longer admin-only (the controller checks owner or admin). |
| `routes/campaignRoutes.js` (new) | Public list and detail, `mine`, `donations/mine`, `manage`, create, edit, delete, status, donate. A **donationLimiter** allows 30 donations per 15 minutes per IP. |
| `app.js` | Mounts `/api/campaigns`. |

---

## Step 23. Seed script (`seed.js`)

- **20 sample pets** across all species and several cities. 17 are shelter pets, 3 are listed by a sample user (Simba and Lucky approved, Oreo waiting for review).
- A **sample user** `user@homeward.test` / `User@12345` next to the admin.
- **4 fundraisers** (Daisy's surgery, a food drive, a roof repair, and an emergency one still in review) with **7 donations**, some anonymous and some from guests.
- **`migrateOldPets()`**: upgrades data from version 1 (single `photo` to `photos` array, missing `reviewStatus` set to `approved`).
- `npm run seed` only adds what is missing. **`npm run seed:reset`** (the `--reset` flag) empties all five collections first.

---

## Step 24. Client helpers and components

| File | What it does |
| --- | --- |
| `utils/format.js` | **`formatMoney`** (₹1,25,000 Indian style), **`formatDate`**, **`daysLeft`** (0 means last day, negative means ended), **`percent`**, **`toDateInput`** (for `<input type="date">`). |
| `schemas/forms.js` | **`petSchemaFor(isAdmin)`** mirrors the server's two pet schemas. New **`campaignSchema`** and **`donationSchema`**. `today()` uses the user's own timezone. |
| `components/PhotoPicker.jsx` | Shows saved photos and newly picked ones together, with a remove button on each and a "Cover" tag on the first. Checks type and 2 MB size in the browser. **`appendPhotos(form, existing, files, isEdit)`** adds `keepPhotos` and the new files to a FormData. |
| `components/ProgressBar.jsx` | The fundraiser bar, with proper `role="progressbar"` for screen readers. |
| `components/CampaignCard.jsx` | One fundraiser in a grid. Also exports **`CampaignImage`** (photo, else the linked pet's photo, else a colored block per category) and **`CATEGORY_LABELS`**. |
| `components/ApplicationItem.jsx` | One application with Approve and Reject buttons, shared by the admin page and the owner's dashboard. **`decideApplication()`** asks for an optional note and sends the decision. |
| `components/Notice.jsx` | Yellow (info) or clay (warning) message box, used for review notes. |
| `components/StatusTag.jsx` | Now also knows review and campaign statuses, and shows "In review" and "Changes requested" as readable labels. |
| `components/PetPhoto.jsx` | Takes an `index` so galleries can show any photo. |
| `components/PetCard.jsx` | Shows the location. |
| `components/Navbar.jsx` | New links: Fundraisers, List a pet. Collapses into the menu below 1024px because there are more links. |

---

## Step 25. Client pages

| File | URL | What it does |
| --- | --- | --- |
| `pages/PetEditor.jsx` (moved out of `admin/`) | `/listings/new`, `/listings/:id/edit` | One form for users **and** admins, new **and** edit. Pre-fills the user's own contact details. Shows the admin's note when changes were requested, and warns that editing an approved listing sends it back for review. |
| `pages/PetDetail.jsx` | `/pets/:id` | Photo gallery with thumbnails, location, "listed by", contact box (logged in only), "edit this listing" for the owner, "this is your listing" instead of the apply form. |
| `pages/Campaigns.jsx` | `/campaigns` | "Open now" and "Completed" tabs, title search, category filter, pagination. |
| `pages/CampaignDetail.jsx` | `/campaigns/:id` | Photos, story, linked pet, big progress panel (raised, percent, donors, days left), **DonateForm** (preset amounts, custom amount, optional name for guests, message, "hide my name") and the recent donations list. Notices for in review, rejected and paused. |
| `pages/CampaignEditor.jsx` | `/campaigns/new`, `/campaigns/:id/edit` | Title, category, linked pet dropdown, goal, end date, description, photos. |
| `pages/Dashboard.jsx` | `/dashboard?tab=...` | Five tabs: My applications, Saved pets, **My listings** (with review status, notes and applications received), **My fundraisers**, **Donations** (history table and total). The tab is in the URL. |
| `pages/admin/AdminDashboard.jsx` | `/admin?tab=...` | Loads everything once and passes a **`reload()`** function to each tab. Five tabs. |
| `pages/admin/ReviewQueue.jsx` | | Listings and fundraisers waiting for a decision. |
| `pages/admin/PetsTable.jsx` | | Every pet with review status filter, approve, take down, edit, delete. Also exports **`FilterChips`**. |
| `pages/admin/ApplicationsList.jsx` | | All applications using `ApplicationItem`. |
| `pages/admin/CampaignsTable.jsx` | | Every fundraiser. An **`ACTIONS`** map decides which buttons appear for each status. |
| `pages/admin/UsersTable.jsx` | | Moved out of the old admin file, unchanged in behavior. |
| `pages/admin/moderation.js` | | **`reviewListing()`** and **`setCampaignStatus()`**: ask for a note when needed, call the API, show a toast, reload. Shared so every admin screen behaves the same. |
| `pages/Home.jsx` | `/` | New "Fundraisers ending soon" section and a "Need to rehome a pet?" band. |
| `App.jsx` | | New routes; `/admin/pets/...` replaced by `/listings/...` for everyone. |

---

## Step 26. Security checklist additions

| Requirement | Where |
| --- | --- |
| Users edit only their own listings and fundraisers | `isOwnerOrAdmin` in pet and campaign controllers |
| Unapproved content never public | `reviewStatus: 'approved'` in `getPets`; status checks in `getPet`, `getCampaign`, `listCampaigns` |
| Contact details only for logged in users | `publicPet()` in `petController.js` |
| Anonymous donors stay anonymous | `publicDonation()` never returns names or user ids for anonymous gifts |
| Donation spam | `donationLimiter` in `campaignRoutes.js` |
| No junk files after failed uploads | cleanup in `errorHandler.js` |
| Impossible status changes blocked | `ALLOWED_MOVES` in `campaignController.js` |

---

## Step 27. Testing done for version 2

The API and UI were tested against a real MongoDB-compatible database:
- **39 API checks** covering: public search returns only approved pets, contact hidden from guests, pending listings hidden from strangers, user listing with 2 photos, missing location rejected, other users blocked from deleting, request-changes needs a note, owner edit resubmits and merges photos, removed photo deleted from disk, owner cannot apply to own pet, owner approves an application and the pet becomes adopted, campaign review flow, invalid status changes refused, guest and logged in anonymous donations, repeat donor counted once, minimum amount, donation history, paused campaign refuses donations, owner cannot delete a funded campaign, admin removal keeps history, non-admins blocked.
- **Browser walkthrough**: guest donates, user lists a pet with photos, admin requests edits, user sees the note and resubmits, admin approves, pet appears in public search. Checked at phone width with no sideways scrolling.

## Ideas for next steps
- Real payments with Razorpay or Stripe (record the donation only after the payment succeeds)
- Email the owner when a listing or fundraiser is reviewed
- Campaign updates (a short post from the owner, like "surgery done")
- Store photos in a cloud service (Cloudinary or S3) instead of the local disk
- Password reset by email
