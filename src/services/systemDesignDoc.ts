export const SYSTEM_DESIGN_WRITEUP = `# System Design: High-Demand Ticket Booking & Seat Management System

## 1. Executive Architecture Overview
High-demand ticketing environments (e.g., concert tours, IMAX premiers) suffer from two chronic failure modes: **checkout contention (stampedes on high-value seats)** and **inventory waste from late cancellations**. 

The OmniTicket platform implements a resilient full-stack architecture built on three core pillars:
1. **Atomic Concurrency Control & In-Memory Distributed Seat Locks**: Preventing double-booking at millisecond resolution.
2. **Deterministic Time-To-Live (TTL) Engine**: Auto-releasing abandoned carts with zero seat hoarding.
3. **Event-Driven Waitlist Cascade**: Converting cancellations into instantaneous 10-minute priority offers for queue members.

\`\`\`
[ Customer Client ] ----> ( WebSocket / REST API )
                                 |
           +---------------------+---------------------+
           |                     |                     |
     [ Auth & RBAC ]    [ Concurrency Mutex ]    [ TTL Scheduler ]
           |                     |                     |
           v                     v                     v
   +---------------+     +---------------+     +---------------+
   | User Profile  |     | Seat Lock Pool|     | Auto-Release  |
   | Customer/Org  |     | Version / TTL |     | Waitlist Q    |
   +---------------+     +---------------+     +---------------+
                                 |
                      [ Persistent Database ]
              (Events, Venues, Bookings, Waitlists, QR)
\`\`\`

---

## 2. Concurrency Protection & Seat Hold Mechanics

### The Challenge
When 10,000 users click "Select Seat VIP-A1" simultaneously, standard Read-Modify-Write flows suffer from race conditions where two transactions commit the same seat to different customers.

### The Solution: Optimistic Versioning & Distributed Lock Pool
- **Lock Acquisition Phase**: When a user selects a set of seats \`{S1, S2}\`, the system requests exclusive mutex leases on key format \`lock:event:{eventId}:seat:{seatId}\` with an atomic lease duration.
- **Atomic State Verification**: The transaction validates that every requested seat has status \`available\` (or an expired hold timestamp \`heldUntil < Date.now()\`).
- **Conflict Rejection (HTTP 409)**: If even one seat in the payload fails lock acquisition or is already held, the entire transaction is rolled back, the locks are released, and the client receives a structured conflict payload specifying exactly which seats were contested.

---

## 3. Seat Hold TTL & Auto-Release Lifecycle

To prevent seat hoarding through abandoned checkouts:
1. **Configurable TTL Duration**: A default hold duration of **10 minutes (600 seconds)** is granted per session.
2. **Hold Record Generation**: A temporary hold record is minted with \`holdId\`, \`userId\`, \`seatIds\`, and \`expiresAt = now + TTL\`.
3. **Seat State Transition**: The seat status switches to \`held\` with \`heldUntil\` set to the millisecond expiration.
4. **Active Sweeper Worker**: A deterministic background timer runs every 2 seconds. Any hold where \`Date.now() > expiresAt\` transitions the seats back to \`available\` in an atomic batch and dispatches an email notification to the customer.

\`\`\`
[ User Selects Seats ] ──> [ Mutex Lock Acquired ] ──> [ State: HELD (TTL=10m) ]
                                                              │
                     ┌────────────────────────────────────────┴────────────────────┐
                     │ Checkout Completed                                          │ TTL Expires / Abandoned
                     ▼                                                             ▼
         [ State: BOOKED + QR Code ]                               [ State: AVAILABLE (Auto-Released) ]
\`\`\`

---

## 4. Waitlist Auto-Assignment & Time-Limited Offer Cascade

When all seats in a tier sell out, customers enter a category-specific **FIFO Waitlist Queue**.

### The Cancellation Trigger & Instant Reallocation
1. **Cancellation Event**: When an existing booking is cancelled, the system marks the seat as \`available\` and emits a \`BOOKING_CANCELLED\` internal event.
2. **Queue Evaluation**: The engine looks up the highest-priority waiting customer (\`status == 'waiting'\` ordered by \`joinedAt ASC\`).
3. **Exclusive Priority Offer**:
   - The candidate's status transitions from \`waiting\` to \`offered\`.
   - The freed seat is locked under a \`10-Minute Priority Window\` specifically for this user.
   - An urgent email notification is dispatched containing an expedited one-click checkout link and countdown clock.
4. **Cascading Failover**: If the waitlisted customer fails to claim within 10 minutes, their status transitions to \`expired\`, and the system automatically cascades the offer to candidate **#2** in the queue.

\`\`\`
[ Booking Cancelled ] ──> [ Query Priority 1 in Waitlist ]
                                     │
                             [ Status: OFFERED ]
                         [ 10-Minute Claim Timer ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ User Claims & Pays                    │ Timer Lapses (Unclaimed)
                 ▼                                       ▼
    [ Status: CLAIMED + QR Ticket ]           [ Status: EXPIRED ] ──> [ Cascade to Next in Line ]
\`\`\`

---

## 5. QR Code Generation & Gate Security Verification
Every confirmed booking mints a cryptographically verifiable QR payload:
\`\`\`json
{
  "ref": "OMNI-8291-TX",
  "eventId": "evt_dune_2",
  "seats": ["A1", "A2"],
  "email": "customer@example.com",
  "timestamp": "2026-08-28T19:30:00.000Z",
  "securityHash": "8f39b1a7d0"
}
\`\`\`
The Gate Scanner component validates ticket reference, event matching, checks for duplicate entries (\`status == 'used'\`), and flags refunded/cancelled tickets.

---

## 6. Database Schema Specification

### \`venues\`
- \`id\` (PK, UUID)
- \`name\` (VARCHAR 255)
- \`type\` (cinema | concert_hall | theater)
- \`rows\` (INT), \`cols\` (INT), \`total_capacity\` (INT)
- \`categories\` (JSONB: [{ id, name, color, basePrice, description }])
- \`seat_layout\` (JSONB: [{ id, row, col, categoryId, isAisle, isAccessible }])

### \`events\`
- \`id\` (PK, UUID)
- \`title\` (VARCHAR 255), \`type\` (VARCHAR 50), \`genre\` (VARCHAR 100)
- \`venue_id\` (FK -> venues.id)
- \`date_time\` (TIMESTAMPTZ)
- \`category_pricing\` (JSONB: { [catId]: price })
- \`seats\` (JSONB: { [seatId]: { status, price, heldBy, heldUntil, bookingId } })
- \`is_sold_out\` (BOOLEAN)
- \`organiser_id\` (FK -> users.id)

### \`seat_holds\`
- \`hold_id\` (PK, VARCHAR 64)
- \`event_id\` (FK -> events.id)
- \`seat_ids\` (TEXT[])
- \`user_id\` (FK -> users.id)
- \`created_at\` (TIMESTAMPTZ)
- \`expires_at\` (TIMESTAMPTZ, INDEXED for fast sweeper lookup)

### \`bookings\`
- \`id\` (PK, UUID)
- \`booking_reference\` (VARCHAR 32, UNIQUE, INDEXED)
- \`event_id\` (FK -> events.id)
- \`user_id\` (FK -> users.id)
- \`seats\` (JSONB)
- \`total_amount\` (NUMERIC 10,2)
- \`status\` (confirmed | cancelled | used)
- \`qr_code_data_url\` (TEXT)
- \`created_at\` (TIMESTAMPTZ)
- \`checked_in_at\` (TIMESTAMPTZ, NULLABLE)

### \`waitlists\`
- \`id\` (PK, UUID)
- \`event_id\` (FK -> events.id)
- \`category_id\` (VARCHAR 64)
- \`user_id\` (FK -> users.id)
- \`joined_at\` (TIMESTAMPTZ)
- \`status\` (waiting | offered | expired | claimed | cancelled)
- \`offer_expires_at\` (TIMESTAMPTZ, NULLABLE)
- \`offered_seat_ids\` (TEXT[], NULLABLE)
- \`offer_token\` (VARCHAR 64, NULLABLE)

---

## 7. REST API Documentation

- \`GET /api/events\` - List active events with category availability
- \`GET /api/events/:id\` - Get event details with real-time seat map
- \`POST /api/events/:id/hold\` - Atomic seat hold acquisition (\`{ seatIds, ttlSeconds }\`)
- \`DELETE /api/holds/:holdId\` - Explicit hold release / cart abandonment
- \`POST /api/events/:id/book\` - Confirm booking & generate QR code ticket
- \`POST /api/bookings/:id/cancel\` - Cancel booking & trigger waitlist reallocation
- \`POST /api/events/:id/waitlist\` - Join category-specific priority waitlist
- \`POST /api/waitlist/claim\` - Claim time-limited waitlist offer
- \`POST /api/gate/validate\` - Scan and validate ticket pass at venue entrance
`;
