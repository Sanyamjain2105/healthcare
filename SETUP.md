# 🚀 HealthSync - Fresh Setup Guide

## Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)
- Git

---

## 1. Clone & Install

```bash
# Clone the repo
git clone https://github.com/Sanyamjain2105/healthcare.git
cd healthcare

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## 2. Setup Environment

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` and set:
```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/health-portal
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

---

## 3. Start MongoDB

Make sure MongoDB is running locally on port 27017.

**Windows:**
```bash
net start MongoDB
```

**macOS/Linux:**
```bash
mongod
```

---

## 4. Start the Application

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 5. Insert Doctor Data

Open MongoDB Shell:
```bash
mongosh
```

Run the following commands:

```javascript
// Switch to database
use health-portal

// Doctor 1
var user1 = db.users.insertOne({
  email: "dr.smith@hospital.com",
  passwordHash: "$2b$10$pQH3RwuXK0d/W3NyoaGBNeyjTBnaTGDdj3j4NqY5OmludSJxAShby",
  role: "provider",
  refreshTokens: [],
  createdAt: new Date()
});

db.providers.insertOne({
  user: user1.insertedId,
  name: "Dr. John Smith",
  specialty: "General Medicine",
  qualifications: ["MD", "Board Certified"],
  patients: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Doctor 2
var user2 = db.users.insertOne({
  email: "dr.patel@hospital.com",
  passwordHash: "$2b$10$pQH3RwuXK0d/W3NyoaGBNeyjTBnaTGDdj3j4NqY5OmludSJxAShby",
  role: "provider",
  refreshTokens: [],
  createdAt: new Date()
});

db.providers.insertOne({
  user: user2.insertedId,
  name: "Dr. Priya Patel",
  specialty: "Cardiology",
  qualifications: ["MD", "Cardiologist", "FACC"],
  patients: [],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## 6. Login Credentials

### Doctors (Providers)
| Email | Password |
|-------|----------|
| dr.smith@hospital.com | Doctor@123 |
| dr.patel@hospital.com | Doctor@123 |

### Patients
Register a new patient account through the app at `/register`

---

## 7. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health Check | http://localhost:4000/health |

---

## Project Structure

```
healthcare/
├── src/                    # Backend source code
│   ├── controllers/        # Route handlers
│   ├── middlewares/        # Auth, rate limit, audit
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── server.js           # Express app entry
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── stores/         # Zustand state
│   │   └── lib/            # Utilities
├── .env                    # Environment variables
├── package.json            # Backend dependencies
└── README.md               # Project overview
```

---

## Features

### Patient Portal
- ✅ Register/Login
- ✅ Dashboard with wellness overview
- ✅ Log daily wellness (steps, sleep, water, active minutes)
- ✅ Create and track health goals
- ✅ Schedule appointments
- ✅ View assigned provider

### Provider Portal
- ✅ Login
- ✅ View assigned patients
- ✅ View patient details (profile, allergies, medications)
- ✅ View patient wellness data
- ✅ Update compliance status
- ✅ Manage appointments (confirm/complete/cancel)

---

## Troubleshooting

### MongoDB Connection Error
If you see `connect ECONNREFUSED ::1:27017`, change your `.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/health-portal
```

### Port Already in Use
```bash
# Kill process on port 4000
npx kill-port 4000

# Kill process on port 3000
npx kill-port 3000
```

### Reset Database
```javascript
// In mongosh
use health-portal
db.dropDatabase()
```
Then re-run the doctor insert commands from Step 5.
