# YADA – Motor Courier Request Web Application

YADA is a web application that streamlines on-demand motor courier delivery for Favorie a food business. It replaces manual delivery coordination (phone calls and text messages) with a single platform where the business can request, track, and manage deliveries, and couriers can accept and fulfill them.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Actors](#actors)
- [Non-Functional Requirements](#non-functional-requirements)
- [Getting Started](#getting-started)
- [Project Status](#project-status)
- [References](#references)

## Overview

**Favorie** a businesses that relies on motor delivery often coordinate couriers manually, which is slow and hard to track. YADA solves this by letting **Favorie** request a courier, matching the request to a nearby available **Courier**, and tracking the delivery in real time from request through completion.

## Key Features

### User Registration & Authentication
- Register via phone number, email, or third-party OAuth
- Phone verification via OTP (SMS)
- Courier onboarding with personal details and profile photo
- Secure session-token based authentication
- Credential reset via OTP or email link
- Profile management (name, photo)

### Ride (Delivery) Request & Matching
- Geospatial search for available couriers within a configurable radius
- ETA displayed before the business confirms a request
- Offer dispatched to the highest-ranked courier (proximity/ETA, heading, rating) with a configurable acceptance timeout
- Offer cascades to the next-ranked courier on decline/timeout
- Business notified if no courier accepts within a configurable window, with retry/cancel options
- Advance trip scheduling *(planned – Phase 2)*

### Trip Lifecycle
- Trip modeled as a state machine: `requested → accepted → courier arriving → arrived → in progress → completed / cancelled`
- Assigned courier's name, photo, and rating shown to the business on acceptance
- Live courier location and ETA shown on a map, updated in near real time
- Cancellation supported for either party, subject to configurable cancellation rules
- Trip telemetry (route polyline, distance, duration, timestamps) recorded for audit

### Ratings & Feedback
- Post-trip 1–5 star ratings with optional comments, for both parties
- Rolling average ratings shown on user profiles
- Demand heat maps / zone indicators for couriers *(planned – Phase 2)*

### Customer Support *(planned)*
- In-app feedback form for support and bug reports
- Brief in-app UI guide

## Tech Stack

- Frontend: SvelteKit, Tailwind CSS, Google Maps API
- Backend: Node.js, TypeScript
- Real Time Communication: Socket.IO
- Location service: google maps
- Database: PostgreSQL Neon, PostGIS, Drizzle ORM
- Authentication: Better Auth, OAuth
- Deployment: Cloudflare, Railway/Render
____________________________

## System Architecture

YADA has two active actors — **Business** and **Courier** — both accessing the system directly and simultaneously through a browser-based client.

**Supported environments:**
- Any device with a modern web browser (HTML5 + JavaScript support)
- Mobile devices with WebView capability
- Devices with location services enabled (smartphones preferred for couriers)

## Actors

**Business**
- Internet-literate
- Comfortable navigating a smartphone app

**Courier**
- Internet-literate
- Basic knowledge of maps and route navigation

## Non-Functional Requirements

**Performance**
- Business–courier matching (request to first offer) completes within 5 seconds
- Courier location updates propagate to the business map within 3 seconds end-to-end
- 95% of API requests respond within 300 ms; 99% within 1 second under normal load

**Security**
- All data in transit encrypted with TLS 1.2+
- Passwords hashed with a modern adaptive algorithm (bcrypt/Argon2)
- Role-based access control (business, courier) with least privilege
- Rate limiting on authentication and OTP endpoints

**Scalability**
- Geospatial and trip data partitioned so new cities don't degrade existing performance
- Supports at least 3 concurrent active trips and 3 location updates/sec at launch, with a documented path to 10× that load

**Usability**
- First-time business can register and request a delivery in under 3 minutes, unassisted
- Accessibility support (screen readers, touch-target sizing, contrast)
- Courier UI remains legible/operable in bright sunlight and while vehicle-mounted
- Localization of language/currency *(planned – Phase 2)*

**Privacy & Compliance**
- Location data collected only while required for service delivery, disclosed in the privacy policy
- Personal phone numbers masked in courier–business communications
- Account deletion requests honored within statutory timelines

**Compatibility**
- Runs on any supported web browser (smartphone preferred)
- Graceful degradation on low-bandwidth (3G) and intermittent connections

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

# Run database migrations (PostgreSQL)
npm run db:migrate

# Start the development server
npm run dev
```

## Project Status

This project is under active development, guided by the Software Requirements Specification (SRS v1.0). Some features noted as *(Phase 2)* or *(Future)* are planned but not yet in scope for the initial release.

## References

- Software Requirements Specification (SRS), v1.0
