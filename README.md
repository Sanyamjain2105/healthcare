# HealthSync - Preventive Care & Wellness Portal

A HIPAA-compliant, full-stack healthcare application built with Node.js/Express (Backend) and Next.js/React (Frontend).

## 🏥 Executive Summary

HealthSync bridges the gap between patients and healthcare providers by focusing on **preventive care**. Patients can track wellness goals (sleep, steps, water intake) and view upcoming appointments, while providers monitor patient compliance and manage their practice.

## 🎯 Key Features

### For Patients
- 📊 **Visual Health Tracking** - Dynamic progress bars for Steps, Active Time, Sleep, and Water Intake
- 🔔 **Preventive Reminders** - Alerts for upcoming checkups, blood tests, and vaccinations
- 💡 **Health Tip of the Day** - Rotating educational wellness tips
- 📅 **Appointment Management** - Schedule and manage medical appointments
- 🎯 **Goal Tracking** - Set and monitor personal health goals

### For Healthcare Providers
- 👥 **Patient Overview** - List of assigned patients with compliance status
- ✅ **Compliance Monitoring** - Track which patients are meeting health goals
- 📈 **Progress Insights** - View patient wellness trends
- 📋 **Appointment Scheduling** - Manage patient appointments

### Security & Compliance
- 🔐 **JWT Authentication** - Secure access/refresh token system
- 🛡️ **Role-Based Access Control** - Patient vs Provider permissions
- 📝 **Audit Logging** - HIPAA-compliant access tracking
- ✓ **Consent Management** - Data usage consent during registration
- 🚦 **Rate Limiting** - Protection against brute force attacks

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (Next.js + TypeScript)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Patient     │ │ Provider    │ │ Auth                │   │
│  │ Dashboard   │ │ Dashboard   │ │ (Login/Register)    │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
┌────────────────────────────┴────────────────────────────────┐
│                        Backend                               │
│                  (Node.js + Express)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Auth     │ │ Patient  │ │ Provider │ │ Wellness │       │
│  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Middleware Layer                     │       │
│  │  (Auth, Audit, Rate Limit, CORS, Validation)     │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                       Database                               │
│                       (MongoDB)                              │
│  ┌────────┐ ┌─────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Users  │ │ Patients    │ │ Providers │ │ WellnessLog │  │
│  └────────┘ └─────────────┘ └───────────┘ └─────────────┘  │
│  ┌──────────────┐ ┌───────────┐ ┌─────────────────────┐    │
│  │ Appointments │ │ AuditLog  │ │ Consent             │    │
│  └──────────────┘ └───────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Backend Setup

```bash
# Clone and navigate to project
cd healthcare

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
# MONGO_URI=mongodb://localhost:27017/health-portal
# JWT_SECRET=your-secure-secret-here
# JWT_REFRESH_SECRET=your-refresh-secret-here

# Seed provider accounts
npm run seed:providers

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new patient |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh tokens |

### Patient Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/me` | Get patient profile |
| PUT | `/api/patients/me` | Update patient profile |
| GET | `/api/patients/dashboard` | Get dashboard data |
| POST | `/api/patients/goals` | Create a new goal |
| POST | `/api/patients/goals/:id/log` | Log goal progress |

### Wellness Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/wellness/today` | Get today's wellness |
| PUT | `/api/patients/wellness/today` | Update today's wellness |
| POST | `/api/patients/wellness/log` | Log activity (increment) |
| GET | `/api/patients/wellness/history` | Get wellness history |
| GET | `/api/patients/wellness/summary` | Get weekly summary |

### Provider Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers/me` | Get provider profile |
| GET | `/api/providers/patients` | List assigned patients |
| GET | `/api/providers/patients/:id` | View patient details |
| POST | `/api/providers/patients/:id/compliance` | Record compliance |

### Appointment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments/patient` | Patient's appointments |
| POST | `/api/appointments/patient` | Create appointment |
| PUT | `/api/appointments/patient/:id` | Update appointment |
| DELETE | `/api/appointments/patient/:id` | Cancel appointment |
| GET | `/api/appointments/provider` | Provider's schedule |
| POST | `/api/appointments/provider` | Create for patient |

## 🔒 Security Features

### HIPAA Compliance Considerations
- **Data Encryption**: Passwords hashed with bcrypt (10 rounds)
- **Access Logging**: All PHI access is logged in AuditLog collection
- **Session Management**: JWT with short-lived access tokens (15min)
- **Consent Tracking**: Explicit consent recorded during registration
- **Role-Based Access**: Strict endpoint authorization

### Security Headers
- Helmet.js for HTTP security headers
- CORS configured for trusted origins
- Rate limiting on all endpoints
- Request body size limits

## 📁 Project Structure

```
healthcare/
├── src/
│   ├── server.js              # Express app entry
│   ├── config/
│   │   └── seedProviders.js   # Provider seeder
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── patient.controller.js
│   │   ├── provider.controller.js
│   │   ├── wellness.controller.js
│   │   └── appointment.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── audit.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── patientProfile.model.js
│   │   ├── provider.model.js
│   │   ├── wellnessLog.model.js
│   │   ├── appointment.model.js
│   │   ├── auditLog.model.js
│   │   └── consent.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── patient.routes.js
│   │   ├── provider.routes.js
│   │   ├── wellness.routes.js
│   │   └── appointment.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── notification.service.js
│   │   └── scheduler.service.js
│   ├── utils/
│   │   ├── jwt.util.js
│   │   └── password.util.js
│   └── cron/
│       └── scheduler.js
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── patient/dashboard/page.tsx
│   │   │   └── provider/dashboard/page.tsx
│   │   ├── components/ui/
│   │   ├── stores/
│   │   └── lib/
│   ├── package.json
│   └── tailwind.config.js
├── .github/workflows/ci.yml
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🚢 Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables
4. Deploy

### Option 3: Docker

```bash
# Build and run
docker-compose -f docker-compose.yml up --build -d
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd frontend && npm test
```

## 📝 Demo Credentials

After running the seed script:

**Provider Account:**
- Email: `doc1@example.com`
- Password: `changeme123`

**Provider Account 2:**
- Email: `doc2@example.com`
- Password: `changeme123`

## 🗺️ Roadmap

- [ ] Email/SMS notifications (Twilio/SendGrid)
- [ ] Telemedicine video calls
- [ ] PDF report generation
- [ ] Mobile app (React Native)
- [ ] Integration with wearables (Fitbit, Apple Health)
- [ ] AI-powered health insights

## 📄 License

MIT License - See LICENSE file for details.

## 👤 Author

Built with ❤️ for the healthcare community.

---

*This is an MVP for demonstration purposes. For production healthcare applications, ensure full HIPAA compliance review and SOC 2 certification.*
