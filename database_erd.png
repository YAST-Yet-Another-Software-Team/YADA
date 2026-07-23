# Database Entity Relationship Diagram (ERD)

This document provides a visual representation of the YADA database schema as defined in [`src/lib/server/schema.ts`](file:///c:/Users/Kwakye/Documents/YADA/src/lib/server/schema.ts).

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        text full_name
        text email UK
        text phone_number UK
        user_role role
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    COURIER_PROFILES {
        uuid id PK
        uuid user_id FK
        text vehicle_type
        numeric rating
        boolean active
        numeric current_latitude
        numeric current_longitude
        timestamp updated_at
    }

    DELIVERY_REQUESTS {
        uuid id PK
        uuid business_id FK
        uuid assigned_courier_id FK
        trip_status status
        text pickup_address
        text dropoff_address
        text notes
        numeric estimated_distance_km
        numeric estimated_duration_minutes
        timestamp requested_at
        timestamp accepted_at
        timestamp completed_at
    }

    TRIP_EVENTS {
        uuid id PK
        uuid trip_id FK
        uuid actor_id FK
        text event_type
        text payload
        timestamp created_at
    }

    %% Relationships
    USERS ||--o| COURIER_PROFILES : "has profile"
    USERS ||--o{ DELIVERY_REQUESTS : "requests as business"
    USERS ||--o{ DELIVERY_REQUESTS : "assigned as courier"
    DELIVERY_REQUESTS ||--o{ TRIP_EVENTS : "logs"
    USERS ||--o{ TRIP_EVENTS : "triggers"
```

## Enum Definitions

### 1. `user_role`
Determines the role and access privileges of a user:
*   `business`: The coordinator posting requests (e.g., Favorie).
*   `courier`: The dispatch driver fulfilling the requests.
*   `admin`: Administration staff.

### 2. `trip_status`
Manages the finite state machine for delivery lifecycles:
*   `requested`: Request posted by the business; looking for couriers.
*   `accepted`: Accepted by a courier; courier is preparing.
*   `courier_arriving`: Courier is en route to pick up the delivery.
*   `arrived`: Courier has arrived at the pickup location.
*   `in_progress`: Courier has picked up the delivery and is heading to the drop-off.
*   `completed`: Delivery successfully dropped off.
*   `cancelled`: Cancelled by either party.
