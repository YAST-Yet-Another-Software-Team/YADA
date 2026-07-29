# YADA – Motor Courier Request Web Application

YADA is a web application that streamlines on-demand motor courier delivery for Favorie, a food business. It replaces manual delivery coordination (phone calls and text messages) with a single platform where the business can request, track, and manage deliveries, and couriers can accept and fulfill them.

## Table of Contents


## Overview

**Favorie** a businesses that relies on motor delivery often coordinate couriers manually, which is slow, time consuming and hard to track. YADA solves this by letting **Favorie** request a courier, matching the request to a nearby available **Courier**, and tracking the delivery in real time from request through completion.

## Key Features

### User Registration & Authentication

### Ride (Delivery) Request & Matching

### Trip Lifecycle

### Ratings & Feedback

### Customer Support *(planned)*

## Tech Stack


____________________________
____________________________

## System Architecture

YADA has two active actors — **Business** and **Courier** — both accessing the system directly and simultaneously through a browser-based client.

**Supported environments:**

## Actors

**Business**

**Courier**

## Non-Functional Requirements

**Performance**

**Security**

**Scalability**

**Usability**

**Privacy & Compliance**

**Compatibility**

## Getting Started

> This section will be filled in with actual setup instructions as the codebase is developed.

```bash
# Clone the repository
git clone <repo-url>
cd yada

# Install dependencies (frontend and backend)
npm install

# Configure environment variables
cp .env.example .env

# For Google Maps, set VITE_GOOGLE_MAPS_API_KEY to a browser-restricted key.

# Better Auth requires these in your .env:
# BETTER_AUTH_SECRET
# BETTER_AUTH_URL
# DATABASE_URL

# To test auth locally:
# 1. Run npm run dev
# 2. Open /auth for business login or /courier/auth for courier signup/login
# 3. Sign in or sign up with a real email + password
# 4. Confirm you get redirected to /dashboard or /courier/home
# 5. Refresh the page and verify the session persists
# 6. Open /api/auth/get-session in the browser to confirm the session payload is returned
# 7. Use the sign-out action and verify the session clears

# Run database migrations (PostgreSQL)
npm run db:migrate

# Start the development server
npm run dev
```

## Project Status

This project is under active development, guided by the Software Requirements Specification (SRS v1.0). Some features noted as *(Phase 2)* or *(Future)* are planned but not yet in scope for the initial release.

## References

