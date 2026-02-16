# YallaStarter Pro - Project Documentation

## 1. Project Overview
**YallaStarter Pro** is a crowdfunding platform tailored for the Saudi market (Vision 2030). It allows creators to post projects, users to back them using a coin-based system, and admins to manage the platform.

### Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No framework)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT, Passport.js (Local + Google OAuth)
- **Payments**: Stripe (for purchasing coins)

---

## 2. Project Structure

```
yallastarter-pro/
├── config/                 # Database and Passport configuration
├── controllers/            # Controller logic (currently empty, logic in routes)
├── middleware/             # Express middleware (Auth, etc.)
├── models/                 # Mongoose database models
├── public_html/            # Static frontend files (HTML, CSS, JS, Assets)
├── routes/                 # API route definitions
├── scripts/                # Utility scripts (seeding, maintenance)
├── server.js               # Application entry point
├── .env                    # Environment variables
└── package.json            # Dependencies and scripts
```

---

## 3. Frontend Pages (`public_html/`)

### Core Pages
| Page | Description |
|------|-------------|
| `index.html` | Homepage / Landing page |
| `login.html` | User login |
| `signup.html` | User registration |
| `dashboard.html` | User dashboard (Wallet, My Projects, Backed Projects) |
| `settings.html` | User settings (Profile, Password, Bank Account) |
| `user-profile.html` | Public profile view of a user |

### Project Pages
| Page | Description |
|------|-------------|
| `projects.html` | Browse all projects |
| `project-details.html` | View single project details |
| `create-project.html` | Form to create a new project |
| `project-success.html` | Success page after creating a project |
| `coins.html` | Buy coins / Wallet management |

### Admin Pages
| Page | Description |
|------|-------------|
| `admin-login.html` | Admin login page |
| `admin-dashboard.html` | Admin panel (Stats, Users, Projects, Transactions) |

### Informational & Vision 2030
| Page | Description |
|------|-------------|
| `vision2030.html` | Overview of Vision 2030 alignment |
| `how-it-works.html` | Guide for creators and backers |
| `about.html` | About Us |
| `contact.html` | Contact Support |
| `careers.html` | Job opportunities |
| `payment-methods.html` | Supported payment methods |
| `trust-safety.html` | Trust & Safety guidelines |
| `community-guidelines.html` | Community rules |

*Note: Most pages have an Arabic version ending in `-ar.html` (e.g., `index-ar.html`).*

---

## 4. Backend API Routes

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/signup` | Register a new user | Public |
| POST | `/login` | Login user | Public |
| GET | `/google` | Initiate Google OAuth | Public |
| GET | `/me` | Get current user details | Private |
| PUT | `/update-profile` | Update profile (username, email) | Private |
| POST | `/upload-photo` | Upload profile picture | Private |
| PUT | `/updatepassword` | Change password | Private |

### Projects (`/api/projects`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all projects | Public |
| GET | `/:id` | Get single project | Public |
| POST | `/` | Create a new project | Private |
| GET | `/user/me` | Get current user's projects | Private |

### Coins & Wallet (`/api/coins`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/balance` | Get current coin balance | Private |
| POST | `/buy` | Create Stripe checkout session | Private |
| POST | `/confirm-purchase` | Confirm purchase after redirect | Private |
| POST | `/send` | Back a project (send coins) | Private |
| POST | `/cashout` | Request cashout (creators) | Private |
| GET | `/history` | Get transaction history | Private |
| PUT | `/bank-account` | Update bank account details | Private |

### Admin (`/api/admin`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard` | Get platform statistics | Admin |
| GET | `/users` | List all users | Admin |
| PUT | `/users/:id` | Update user (role, balance) | Admin |
| GET | `/projects` | List all projects | Admin |
| PUT | `/projects/:id` | Update project status | Admin |
| GET | `/transactions` | List all transactions | Admin |
| GET | `/cashouts` | List pending cashouts | Admin |
| PUT | `/cashouts/:id` | Approve/Reject cashout | Admin |

---

## 5. Database Schema (MongoDB Models)

### User Model (`models/User.js`)
- `username` (String)
- `email` (String)
- `password` (String, hashed)
- `role` (String: 'user', 'admin')
- `coinBalance` (Number)
- `totalEarned` (Number)
- `totalSpent` (Number)
- `photoUrl` (String)
- `bankAccount` (Object: accountName, iban, bankName)

### Project Model (`models/Project.js`)
- `title` (String)
- `description` (String)
- `category` (Enum: technology, arts, etc.)
- `location` (String)
- `goalAmount` (Number)
- `currentAmount` (Number)
- `deadline` (Date)
- `creator` (ObjectId -> User)
- `status` (Enum: draft, active, completed)

### Transaction Model (`models/Transaction.js`)
- `type` (Enum: purchase, send, cashout)
- `from` (ObjectId -> User)
- `to` (ObjectId -> User, optional)
- `project` (ObjectId -> Project, optional)
- `amount` (Number)
- `fee` (Number)
- `netAmount` (Number)
- `status` (Enum: pending, completed, failed, cancelled)
- `stripeSessionId` / `stripePaymentId` (Strings)

---

## 6. Admin Features
The Admin Panel is accessible at `/admin-dashboard.html` for users with `role: 'admin'`.
- **Overview**: View total users, projects, revenue, and recent activity.
- **User Management**: View users, edit roles, adjust coin balances.
- **Project Management**: View projects, approve/reject (change status).
- **Financials**: View transaction history and process cashout requests.

---

*Generated by Antigravity on 2026-02-16*
