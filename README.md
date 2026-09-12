# NIBOLODA - Subscription-Based Ride-Hailing Platform for Nigeria

> **"Drivers Set the Price. Passengers Choose the Ride."**

NIBOLODA is a production-ready, subscription-based ride-hailing marketplace designed for Nigeria. Unlike traditional ride-hailing apps, **NIBOLODA DOES NOT TAKE A COMMISSION FROM DRIVER TRIPS**. Drivers pay a subscription fee to access the platform and keep 100% of their trip earnings (minus payment provider fees or taxes).

---

## 🚀 Core Differentiators

1. **Drivers Set Their Price**: Drivers configure custom pricing rules (minimum trip fare, preferred base fare, price per kilometer, price per minute, service distance limits).
2. **Passengers Choose Their Driver**: Passengers enter pickup and destination coordinates, view verified online subscribed drivers, compare them (Photo, Name, Rating, Vehicle Make/Model/Color, Plate Number, Distance, ETA, and Calculated Fare), and explicitly select their preferred driver.
3. **0% Platform Trip Commission**: NIBOLODA trip commission is strictly ₦0.00 (0%).
4. **Agreed Fare Locking**: The price confirmed by the passenger at booking is locked into the database record and cannot be changed without explicit passenger approval.
5. **Strict Online Access Control**: Drivers cannot go ONLINE unless their profile and vehicle are verified by an Admin AND they have an active platform subscription.

---

## 🛠️ Technology Stack

- **Frontend**: React, Tailwind CSS, Lucide Icons, Leaflet / Google Maps API.
- **Backend API**: Node.js, Express, Socket.IO (for real-time GPS tracking and live admin map updates).
- **Database & ORM**: PostgreSQL / SQLite with Prisma ORM.
- **Real-Time Communication**: Socket.IO with rooms (`ride:{id}`, `user:{id}`, `role:ADMIN`).
- **Payment Abstraction**: Modular payment service supporting Paystack, Monnify, Flutterwave, and Mock Gateway.
- **Auth & RBAC**: JWT + Role-Based Access Control (`PASSENGER`, `DRIVER`, `ADMIN`, `SUPER_ADMIN`).

---

## 📦 Project Structure

```
NIBOLODA/
├── prisma/
│   └── schema.prisma        # Prisma Database Schema
├── src/
│   ├── server/
│   │   ├── index.js          # Express & Socket.IO server
│   │   ├── config.js         # Environment variables & config
│   │   ├── db.js             # Prisma Client singleton
│   │   ├── middleware/       # Auth JWT & RBAC
│   │   ├── routes/           # REST APIs (/auth, /passengers, /drivers, /rides, /subscriptions, /admin, etc.)
│   │   ├── services/         # Pricing engine, Payment abstraction, Map service, Socket engine
│   │   └── seed.js           # Nigerian seed data (20 passengers, 20 drivers, 15 vehicles, plans, rides)
│   └── client/
│       ├── index.html
│       ├── vite.config.js
│       ├── src/
│       │   ├── index.css     # Styling design system
│       │   ├── context/      # AuthContext & SocketContext
│       │   ├── components/   # Navbar, MapContainer, SOSModal, ReceiptModal
│       │   └── pages/        # Passenger, Driver, and Admin portals
```

---

## ⚙️ Quick Start & Local Development

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Installation & Database Setup
```bash
# Clone or navigate to directory
cd NIBOLODA

# Install dependencies
npm install

# Push database schema to SQLite dev.db (or PostgreSQL)
npx prisma db push

# Seed realistic Nigerian dataset (20 passengers, 20 drivers, vehicles, subscriptions, plans)
npm run db:seed
```

### 3. Build & Run
```bash
# Build frontend bundle
npm run build

# Start Full-Stack Express & Socket.IO Server
npm run server
```

The application will be live at `http://localhost:5000`.

---

## 🔑 Demo Test Login Credentials

Quick Role Switcher is available directly in the web UI navbar, or log in with:

1. **Passenger**: Phone `+2348031110001` | Password: `password123` (*Emeka Okonkwo*)
2. **Driver**: Phone `+2348022220001` | Password: `password123` (*John Adeyemi - Verified & Subscribed*)
3. **Admin**: Email `admin@niboloda.ng` | Password: `password123`
4. **Super Admin**: Email `admin@niboloda.ng` | Password: `password123`

---

## 🌐 Environment Variables Configuration

Create a `.env` file in the root directory:

```env
PORT=5000
DATABASE_URL="file:./dev.db" # Or "postgresql://user:password@localhost:5432/niboloda"
JWT_SECRET="niboloda_super_secret_jwt_key_2026_nigeria_0commission"
DEFAULT_SEARCH_RADIUS_KM=15.0

# Payment Gateways
PAYMENT_PROVIDER="PAYSTACK" # PAYSTACK, MONNIFY, FLUTTERWAVE, MOCK
PAYSTACK_SECRET_KEY="sk_test_niboloda_mock_paystack"
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST_niboloda_mock"
MONNIFY_SECRET_KEY="MK_TEST_niboloda_mock"

# Google Maps API (Optional - Leaflet & OpenStreetMap fallback enabled)
GOOGLE_MAPS_API_KEY=""
```

---

## 🛡️ License

ISC License. Built for NIBOLODA Technologies Nigeria.
