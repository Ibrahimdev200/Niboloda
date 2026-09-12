-- ==============================================================================
-- NIBOLODA RIDE-HAILING PLATFORM - SUPABASE POSTGRESQL FULL DATABASE SCHEMA
-- Copy and paste this script into your Supabase Dashboard > SQL Editor > Click RUN
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "phone" TEXT UNIQUE NOT NULL,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PASSENGER', -- PASSENGER, DRIVER, ADMIN, SUPER_ADMIN
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMPTZ,
    "dateOfBirth" TIMESTAMPTZ,
    "gender" TEXT,
    "state" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADMIN PROFILES TABLE
CREATE TABLE IF NOT EXISTS "AdminProfile" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]', -- JSON Array of permissions
    "createdById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PASSENGERS TABLE
CREATE TABLE IF NOT EXISTS "Passenger" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "dateOfBirth" TIMESTAMPTZ,
    "gender" TEXT,
    "address" TEXT,
    "state" TEXT,
    "city" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SAVED LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS "SavedLocation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "passengerId" UUID NOT NULL REFERENCES "Passenger"("id") ON DELETE CASCADE,
    "label" TEXT NOT NULL, -- HOME, WORK, GYM, OTHER
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS "EmergencyContact" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "passengerId" UUID NOT NULL REFERENCES "Passenger"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Relative',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS "Driver" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "dateOfBirth" TIMESTAMPTZ,
    "gender" TEXT,
    "address" TEXT,
    "state" TEXT,
    "city" TEXT,
    "licenseNumber" TEXT UNIQUE,
    "licenseExpiry" TIMESTAMPTZ,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION', -- PENDING_VERIFICATION, APPROVED, REJECTED, SUSPENDED
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS "Vehicle" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "driverId" UUID UNIQUE NOT NULL REFERENCES "Driver"("id") ON DELETE CASCADE,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT UNIQUE NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'Sedan',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DRIVER PRICING TABLE
CREATE TABLE IF NOT EXISTS "DriverPricing" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "driverId" UUID UNIQUE NOT NULL REFERENCES "Driver"("id") ON DELETE CASCADE,
    "minFare" DOUBLE PRECISION NOT NULL DEFAULT 2000.0,
    "preferredFare" DOUBLE PRECISION NOT NULL DEFAULT 2500.0,
    "pricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 250.0,
    "pricePerMin" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "minDistance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxDistance" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DRIVER LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS "DriverLocation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "driverId" UUID UNIQUE NOT NULL REFERENCES "Driver"("id") ON DELETE CASCADE,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "code" TEXT UNIQUE NOT NULL, -- DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
    "price" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "driverId" UUID NOT NULL REFERENCES "Driver"("id") ON DELETE CASCADE,
    "planId" UUID NOT NULL REFERENCES "SubscriptionPlan"("id"),
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- ACTIVE, EXPIRED, CANCELLED, PENDING
    "startDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expiryDate" TIMESTAMPTZ NOT NULL,
    "paymentRef" TEXT,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. RIDES TABLE
CREATE TABLE IF NOT EXISTS "Ride" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "passengerId" UUID NOT NULL REFERENCES "Passenger"("id") ON DELETE CASCADE,
    "driverId" UUID REFERENCES "Driver"("id") ON DELETE SET NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, ACCEPTED, DRIVER_ARRIVING, DRIVER_ARRIVED, TRIP_STARTED, TRIP_COMPLETED, CANCELLED
    "pickupName" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "destName" TEXT NOT NULL,
    "destLat" DOUBLE PRECISION NOT NULL,
    "destLng" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "initialOfferedFare" DOUBLE PRECISION NOT NULL,
    "agreedFare" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- 0% Commission
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "driverEarnings" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CARD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "acceptedAt" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "cancelledAt" TIMESTAMPTZ
);

-- 13. RIDE STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS "RideStatusHistory" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "rideId" UUID NOT NULL REFERENCES "Ride"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "rideId" UUID REFERENCES "Ride"("id") ON DELETE SET NULL,
    "subscriptionId" UUID REFERENCES "Subscription"("id") ON DELETE SET NULL,
    "driverId" UUID REFERENCES "Driver"("id") ON DELETE SET NULL,
    "passengerId" UUID REFERENCES "Passenger"("id") ON DELETE SET NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "gatewayFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "driverEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "type" TEXT NOT NULL, -- RIDE_PAYMENT, SUBSCRIPTION_PAYMENT, REFUND
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "providerRef" TEXT UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. RATINGS TABLE
CREATE TABLE IF NOT EXISTS "Rating" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "rideId" UUID NOT NULL REFERENCES "Ride"("id") ON DELETE CASCADE,
    "passengerId" UUID NOT NULL REFERENCES "Passenger"("id") ON DELETE CASCADE,
    "driverId" UUID NOT NULL REFERENCES "Driver"("id") ON DELETE CASCADE,
    "raterRole" TEXT NOT NULL, -- PASSENGER, DRIVER
    "score" DOUBLE PRECISION NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "rideId" UUID REFERENCES "Ride"("id") ON DELETE SET NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. EMERGENCY EVENTS TABLE
CREATE TABLE IF NOT EXISTS "EmergencyEvent" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "rideId" UUID REFERENCES "Ride"("id") ON DELETE SET NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "emergencyType" TEXT NOT NULL DEFAULT 'SOS_TRIGGERED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. SERVICE AREAS TABLE
CREATE TABLE IF NOT EXISTS "ServiceArea" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEED BASE SUBSCRIPTION PLANS (0% COMMISSION)
INSERT INTO "SubscriptionPlan" ("name", "code", "price", "durationDays", "description", "isActive")
VALUES
    ('Daily Pass', 'DAILY', 1500.0, 1, 'Unlimited trip access for 24 hours. 0% trip commission.', true),
    ('Weekly Driver Pass', 'WEEKLY', 8500.0, 7, '7 days unlimited passenger matching. Keep 100% fare.', true),
    ('Monthly Pro Pass', 'MONTHLY', 28000.0, 30, 'Best value 30 days unlimited access for full-time drivers.', true),
    ('Quarterly Executive', 'QUARTERLY', 75000.0, 90, '90 days premium access with priority driver support.', true),
    ('Yearly Champion', 'YEARLY', 250000.0, 365, 'Full year unlimited marketplace access.', true)
ON CONFLICT ("code") DO NOTHING;

-- SEED BASE SERVICE AREAS
INSERT INTO "ServiceArea" ("name", "city", "centerLat", "centerLng", "radiusKm", "isActive")
VALUES
    ('Lagos Metropolis', 'Lagos', 6.5244, 3.3792, 35.0, true),
    ('Abuja Federal Capital Territory', 'Abuja', 9.0765, 7.3986, 40.0, true),
    ('Port Harcourt Urban', 'Port Harcourt', 4.8156, 7.0498, 25.0, true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- DONE! All NIBOLODA Tables & Seed Catalogs have been created successfully.
-- ==============================================================================
