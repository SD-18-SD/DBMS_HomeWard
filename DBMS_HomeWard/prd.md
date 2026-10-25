# Homeward: Product Requirement Document

## 1. What we are building

Homeward is a web platform for a pet shelter. The shelter lists the animals it has, people search for a pet that suits them, and they apply to adopt it online. Shelter staff review every application from an admin dashboard and approve or reject it. Adopters can see the status of their applications at any time.

Regular users can also **list their own pets** for rehoming (an admin reviews every listing before it goes public) and **raise money** for pets that need medical care, food, shelter or emergency help through donation campaigns.

The goal is to replace paper forms, phone calls and spreadsheets with one simple website.

### Problems it solves

| Problem today | How Homeward fixes it |
| --- | --- |
| People have to visit or call to see which animals are available | Every pet is listed online with a photo and details |
| Paper application forms get lost | Applications are stored in a database and linked to the pet and the user |
| Adopters do not know if anyone read their application | Each application shows a status: pending, approved or rejected |
| Staff cannot see all applications in one place | The admin dashboard lists and filters them |
| Two people get approved for the same pet | Approving one application marks the pet adopted and rejects the rest automatically |
| People rehoming a pet post on scattered social media groups | Anyone can list a pet; admins review it so search stays trustworthy |
| Vet bills and food costs are raised through informal requests | Donation campaigns with a goal, end date, progress bar and donor list |

## 2. Target users

### Adopter (role: `user`)
- Anyone looking to adopt: students, families, first time pet owners, people re-homing an older pet.
- Uses a phone or laptop, not very technical.
- Wants to: browse pets, filter by species and age, save favorites, apply, and follow the status.
- May also: list a pet they need to rehome, choose an adopter for it, start a fundraiser, donate, and see their donation history.

### Rehomer (a `user` who lists a pet)
- Someone moving away, a family that cannot keep a pet, a person who found a stray.
- Wants to: post photos and details quickly, fix anything the admin asks for, see who applied and pick the adopter.

### Donor (any visitor or `user`)
- Wants to: see exactly what the money is for, how much is left to raise, give a small amount, optionally without showing their name.

### Shelter admin (role: `admin`)
- Staff or volunteers at the shelter.
- Wants to: add new pets with photos, update details, mark pets as adopted, review applications, manage user accounts.
- Also moderates: approves, rejects or requests edits on user listings; approves, pauses, closes or removes fundraisers.

### Visitor (not logged in)
- Can browse and search pets, view details and fundraisers, and donate anonymously.
- Must create an account to see contact details, save favorites, apply, list a pet or start a fundraiser.

## 3. Features

### 3.1 Authentication
| Feature | Details |
| --- | --- |
| Register | Name, email, password. Password needs 8+ characters with a letter and a number. Email must be unique. New accounts always get the `user` role. |
| Login | Email and password. On success, the server sets an httpOnly cookie with a JWT. |
| Logout | Clears the cookie. |
| Profile | View email, role and join date. Edit name, phone and city. |

### 3.2 Pet management
| Feature | Details |
| --- | --- |
| Add pet | Name, species, breed, age, gender, size, vaccinated, availability, description, location, contact details and up to 5 photos |
| Edit pet | Owner or admin. Change any field, remove existing photos, add new ones (removed files are deleted from disk) |
| Delete pet | Owner or admin. Removes the pet, its photo files, its applications and any favorites pointing at it |
| View pets | Anyone can view approved pets. Unapproved listings are visible only to their owner and admins |

### 3.3 Search
- Search by **name** (partial match, not case sensitive).
- Filter by **species**: dog, cat, rabbit, bird, other.
- Filter by **age group**: young (0 to 1), adult (2 to 7), senior (8+).
- Filter by **availability**: available (default), pending, adopted, or all.
- **Only approved listings** appear in search results.
- Results are paginated, 12 per page.
- Filters are kept in the URL so a search can be shared.

### 3.4 Adoption
- A logged in user fills in phone, home type, whether they have other pets, and a message (20+ characters).
- Only pets with status `available` accept applications.
- A user can apply for the same pet only once, and cannot apply for a pet they listed.
- Statuses: `pending` (new), `approved`, `rejected`.
- The user can withdraw an application while it is still pending.
- Admin can add a note that the user sees.
- Applications for a **user-listed pet** can be approved or rejected by the person who listed it (or an admin).

### 3.5 User dashboard
- List of the user's applications with pet photo, date, status and admin note.
- List of saved (favorite) pets with a button to remove each one.
- **My listings**: each listed pet with its review status and admin note, edit and delete buttons, and the applications received for it.
- **My fundraisers**: each campaign with status, progress and edit button.
- **Donations**: full donation history with the total given.
- Tabs are kept in the URL (`/dashboard?tab=listings`) so other pages can link to them.

### 3.6 Admin dashboard
- Summary numbers: pets live, items waiting for review, applications to answer, active fundraisers.
- **Review queue tab**: user listings and fundraisers waiting for a decision, with photos and details.
- **Applications tab**: filter by status, read the message, approve or reject with an optional note.
- **Pets tab**: every pet (shelter and user listings), filter by review status, approve, take down, edit, delete.
- **Fundraisers tab**: filter by status, approve, reject, pause, resume, close, reopen, edit, remove.
- **Users tab**: list all users, change role between user and admin, delete a user. An admin cannot change or delete their own account here.

### 3.7 Image uploads
- Up to **5 photos** per pet and per fundraiser, JPG, PNG or WEBP, up to 2 MB each. The first photo is the cover.
- Checked on both the browser and the server.
- Saved in `server/uploads/` and served at `/uploads/<filename>`.
- When a request fails after upload (for example a validation error), the uploaded files are deleted.
- Pets without a photo show a colored tile with the first letter of their name; fundraisers show a colored block per category.

### 3.8 Security
- Passwords hashed with bcrypt (10 salt rounds). Plain passwords are never stored or returned.
- JWT kept in an httpOnly cookie so JavaScript cannot read it.
- Protected routes on the server (`protect` middleware) and in React (`ProtectedRoute`).
- Role based authorization (`authorize('admin')`).
- Every request body is validated with Zod.
- Helmet sets safe HTTP headers.
- Rate limits: 300 requests per 15 minutes on the API, 20 per 15 minutes on login and register.
- Same error message for "wrong email" and "wrong password".
- Ownership checks: users can edit or delete only their own listings and fundraisers.
- Contact details of a listing are hidden from visitors who are not logged in.
- Donations are limited to 30 per 15 minutes per IP.

### 3.9 User-submitted pet listings
| Feature | Details |
| --- | --- |
| List a pet | "List a pet" page for any logged in user. Location, contact name and phone are required; description must be 20+ characters |
| Moderation status | `pending_review` (new or edited), `approved` (public), `changes_requested` (admin left a note), `rejected` |
| Admin decision | Approve, request edits (note required) or reject (note required) |
| Owner edits | Owner can edit any time. Editing sends the listing back to `pending_review` and hides it from search until approved again |
| Track status | My listings tab shows the status and the admin note |
| Public search | Only `approved` listings |
| Admin listings | Pets added by an admin are approved immediately |

### 3.10 Donation campaigns
| Feature | Details |
| --- | --- |
| Create / edit | Title, category (medical, food, shelter, emergency, other), goal in rupees, end date, description, up to 5 photos, optional linked pet |
| Approval | User campaigns start as `pending_review`; admin campaigns go live (`active`) at once. A rejected campaign goes back to review when the owner edits it |
| Progress | Raised amount, goal, percent funded, donor count, days left, progress bar |
| Donate | Preset amounts or a custom amount (10 to 1,00,000). Optional message |
| Anonymous | Logged in donors can hide their name. Guests can donate without an account; they are anonymous unless they type a name |
| Donor count | Each logged in person counts once per campaign, however many times they give |
| History | Donations tab in the user dashboard with the total given |
| Admin tools | Approve, reject, pause (stops donations), resume, close, reopen, remove. Removing keeps donation records so donors still see them in their history |
| Ending | A campaign stops taking donations after its end date (the whole end day is included) |

**Important:** this is a demo. No real payment is taken. A donation is only a record in the database. A real deployment would need a payment gateway (for example Razorpay or Stripe) and would record the donation only after the payment succeeds.

## 4. Out of scope (for now)
- Email notifications
- Real payment processing (donations are recorded only), refunds and receipts
- Multiple shelters
- Chat between adopter and shelter
- Password reset by email

## 5. Success criteria
- A new visitor can find a pet and submit an application in under 5 minutes.
- An admin can add a pet with a photo in under 2 minutes.
- A user can list a pet with photos in under 5 minutes, and an admin can review it in under 1 minute.
- Unapproved listings and fundraisers never appear in public lists.
- No route that changes data works without the correct role.
- The app runs locally with `npm run dev` in both folders after following the README.
