# TicketHub Design

TicketHub is a website that sells tickets for concerts and events. It has 2 million registered users. On a normal day 50,000 people visit and each views about 10 pages, and about 5,000 tickets are sold. When a very popular concert goes on sale, about 200,000 people try to buy its 20,000 seats within the first 10 minutes.

This document follows the six-part design framework: requirements, estimates, API, data model, architecture and trade-offs. It also explains in detail how two people are prevented from buying the same seat.

## 1. Requirements

### Functional requirements

- Users can log in.
- Users can browse events and see an event's details.
- Users can view the seat map for an event, with each seat's availability.
- Users can hold chosen seats for a few minutes while they pay.
- Users can pay for held seats and receive tickets.
- Users can view their own tickets.

### Non-functional requirements

- **Speed:** event pages load in under 300 ms on a normal day, and the seat map loads in under 1 second even during a big sale.
- **Correctness:** a seat is never sold to two people, and a payment never succeeds without a ticket being issued.
- **Fairness:** first come, first served, with a limit on seats per person (for example 4) so that one person or a bot cannot take everything.
- **Availability:** the site stays up during a big sale, which is when it matters most.
- **Durability:** a paid ticket is never lost.
- **Security:** HTTPS everywhere, token-based login, and card details handled only by the payment provider.

## 2. Estimates

Assumptions: one day is about 100,000 seconds (rounded from 86,400), and peak traffic is 5 times the average. For the big sale I assume each person makes about 5 requests while buying (open the event, load the seat map, pick seats, hold them, pay).

```
NORMAL DAY
Page views:     50,000 visitors x 10 pages = 500,000 per day
                500,000 / 100,000          = 5 per second (peak about 25)
Ticket sales:   5,000 per day / 100,000    = 0.05 per second
                (about one sale every 20 seconds; peak about 0.25)
Reads vs writes: about 5 views/s to 0.05 sales/s = roughly 100 to 1 (read-heavy)

BIG SALE (first 10 minutes = 600 seconds)
People:         200,000 / 600              = about 333 new users per second
Requests:       200,000 x 5 / 600          = about 1,700 requests per second
Seats sold:     20,000 / 600               = about 33 sales per second
Competition:    200,000 people for 20,000 seats = 10 people per seat,
                so about 180,000 people will be told the seats are gone

COMPARISON
Requests:       about 1,700 per second vs 5 per second = about 330 times normal
Sales:          about 33 per second vs 0.05 per second = about 670 times normal

STORAGE
Tickets:        5,000 per day x 365 = about 1.8 million per year
                at about 500 bytes each = about 1 GB per year (small)
```

**Comparison.** On a normal day TicketHub is quiet and read-heavy: about 5 page views per second and one sale every 20 seconds, which a small system could handle. The big sale is hundreds of times busier, and the first few seconds are busier still than the 10-minute average. The real difficulty is not storage but **writes under contention**: about 33 sales per second, with about 10 people competing for every seat. The design therefore has to protect the database during the rush and guarantee that every seat is sold only once.

## 3. API

Paths use nouns, and the HTTP method says the action. Every endpoint needs the header `Authorization: Bearer <token>` from login.

| Method | Path | Description | Success status |
|---|---|---|---|
| GET | `/events` | List upcoming events | 200 OK |
| GET | `/events/{id}` | Get one event's details | 200 OK |
| GET | `/events/{id}/seats` | List the event's seats and whether each is available | 200 OK |
| POST | `/events/{id}/holds` | Hold chosen seats for 5 minutes | 201 Created |
| POST | `/orders` | Pay for a hold and receive tickets | 201 Created |
| GET | `/me/tickets` | List my tickets | 200 OK |
| DELETE | `/holds/{id}` | Release a hold early | 204 No Content |

### Example: hold seats

`POST /events/7/holds`

Request body:

```json
{ "seat_ids": [101, 102] }
```

Response, `201 Created`:

```json
{ "hold_id": 55, "seat_ids": [101, 102], "expires_at": "2026-12-01T18:05:00Z" }
```

Response, `409 Conflict` (someone else got seat 102 first):

```json
{ "error": { "status": 409, "message": "Seat 102 is no longer available" } }
```

### Example: pay for a hold

`POST /orders`

Request body:

```json
{ "hold_id": 55, "payment_token": "tok_abc123" }
```

Response, `201 Created`:

```json
{ "order_id": 900, "status": "paid", "tickets": [{ "seat": "A1" }, { "seat": "A2" }] }
```

The request carries an `Idempotency-Key` header, so if a user double-clicks Pay or their phone retries the request, they are not charged twice.

### Error status codes

- **401 Unauthorized:** the user is not logged in or their token is invalid.
- **409 Conflict:** a seat was already held or sold by someone else.
- **410 Gone:** the hold expired before the user paid.
- **429 Too Many Requests:** the user is sending too many requests, which protects fairness and blocks bots.

## 4. Data model

### Tables

| Table | Columns | Keys |
|---|---|---|
| `users` | id, name, email | id is the primary key; email is unique |
| `events` | id, name, venue, starts_at | id is the primary key |
| `seats` | id, event_id, label, price_cents, status, held_by, hold_expires_at | id is the primary key; event_id is a foreign key to events; held_by is a foreign key to users; (event_id, label) is unique |
| `orders` | id, user_id, total_cents, status, created_at | id is the primary key; user_id is a foreign key to users |
| `tickets` | id, order_id, seat_id | id is the primary key; order_id is a foreign key to orders; seat_id is a foreign key to seats and is unique |

### Relationships

- **One-to-many:** one user has many orders, and one event has many seats.
- **One-to-many:** one order has one or more tickets.
- **One-to-one at most:** each seat can have at most one ticket, which the unique constraint on `tickets.seat_id` enforces.

### CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  venue     TEXT NOT NULL,
  starts_at TEXT NOT NULL
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status      TEXT NOT NULL CHECK (status IN ('paid', 'cancelled')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE seats (
  id              INTEGER PRIMARY KEY,
  event_id        INTEGER NOT NULL,
  label           TEXT NOT NULL,
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'held', 'sold')),
  held_by         INTEGER,
  hold_expires_at TEXT,
  UNIQUE (event_id, label),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (held_by)  REFERENCES users(id)
);

CREATE TABLE tickets (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  seat_id  INTEGER NOT NULL UNIQUE,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (seat_id)  REFERENCES seats(id)
);

CREATE INDEX idx_seats_event_status ON seats(event_id, status);
```

The index on `seats(event_id, status)` supports the most common question, "which seats are still available for this event?", so the database does not have to scan every seat of every event.

## 5. Preventing double-booking

Two people must never end up with the same seat, even when thousands try at the same moment. The design uses four layers, and the database is always the final judge.

### Layer 1: an atomic conditional update to hold a seat

A seat is claimed with a single statement that succeeds only if the seat is still free (or its old hold has expired):

```sql
UPDATE seats
SET status = 'held', held_by = :user_id,
    hold_expires_at = datetime('now', '+5 minutes')
WHERE id = :seat_id
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < datetime('now')));
```

If this changes 1 row, the user got the seat. If it changes 0 rows, someone else got there first, and the API replies `409 Conflict`. Because the check and the change happen together in one atomic statement, two people trying at the same instant are handled one after the other: the first wins, and the second sees 0 rows changed.

Example: Amina and Brian both try seat A1. Amina's update runs first and changes 1 row, so A1 is held for her. Brian's update then finds the seat held and changes 0 rows, so he receives a 409 and picks another seat.

### Layer 2: holds expire

A hold lasts 5 minutes. If the user does not pay in time, the condition above lets another buyer take the seat, so seats do not stay locked by people who gave up.

### Layer 3: payment runs inside one transaction

When the user pays, the server re-checks that the hold is still valid and then creates the order and the tickets together. If any step fails, everything is rolled back (atomicity), so there is never a payment without a ticket, or a ticket without a payment:

```sql
BEGIN;

UPDATE seats SET status = 'sold'
WHERE id = :seat_id AND status = 'held' AND held_by = :user_id
  AND hold_expires_at >= datetime('now');
-- if this changes 0 rows (hold expired or not theirs): ROLLBACK

INSERT INTO orders (user_id, total_cents, status)
VALUES (:user_id, :total, 'paid');

INSERT INTO tickets (order_id, seat_id)
VALUES (:order_id, :seat_id);

COMMIT;
```

### Layer 4: a unique constraint as the safety net

`tickets.seat_id` is `UNIQUE`. Even if a bug in the application code tried to sell a seat twice, the database would refuse the second ticket with a `UNIQUE constraint failed` error. A rule enforced by the database cannot be skipped by mistake.

### What does not decide who gets the seat

The CDN and the cache may show a seat map that is a second or two old, so a seat might look free just after it was sold. That is harmless, because showing the map is not buying: the hold in layer 1 is checked against the real database every time.

## 6. Architecture

```
  ┌───────────────┐   DNS lookup    ┌─────────┐
  │ Client        │ ──────────────> │   DNS   │
  │ (browser)     │                 └─────────┘
  └───┬───────┬───┘
      │       │  static files, event pages, images
      │       v
      │   ┌─────────┐
      │   │   CDN   │
      │   └─────────┘
      │ API calls (HTTPS)
      v
  ┌───────────────┐
  │ Waiting room  │  lets in a limited number of people at a time
  └───────┬───────┘
          v
  ┌───────────────┐
  │ Load balancer │
  └───────┬───────┘
    ┌─────┴──────┬────────────┐
    v            v            v
┌───────┐    ┌───────┐    ┌───────┐   ┌───────────────┐
│ App 1 │    │ App 2 │    │ App 3 │──>│ Cache (Redis) │
└───┬───┘    └───┬───┘    └───┬───┘   └───────────────┘
    │ holds &    │ browse     │ jobs
    │ payments   │ reads
    v            v            v
┌─────────┐  ┌──────────┐  ┌───────┐   ┌────────┐
│ Primary │─>│ Read     │  │ Queue │──>│ Worker │
│   DB    │  │ replica  │  └───────┘   └────────┘
└─────────┘  └──────────┘
```

- The app servers also call an external **payment provider** to take payment.
- The worker sends confirmation emails and prepares tickets after a payment succeeds.

### What each component does

| Component | What it does |
|---|---|
| **DNS** | Turns the TicketHub name into the address of our servers, so users can find the site. |
| **CDN** | Serves images, CSS, JavaScript and event pages from servers near the user, which keeps pages fast and stops our servers carrying that traffic. |
| **Waiting room** | Holds back the 200,000 people who arrive at once and lets a limited number in at a time in the order they arrived, which protects the system and keeps the sale fair. |
| **Load balancer** | Spreads requests across the app servers and skips any that fail, so no single server is overloaded or a single point of failure. |
| **App servers** | Run the API logic (browse, hold, pay). They are stateless, so any server can handle any request and more can be added for a big sale. |
| **Cache (Redis)** | Keeps event details and a short-lived copy of the seat map in memory, so the database is not asked the same questions thousands of times. |
| **Primary database** | The single source of truth where holds and sales are decided correctly using atomic updates, transactions and constraints. |
| **Read replica** | A copy of the primary used for browsing reads, so those reads do not compete with the writes that sell seats. It can also take over if the primary fails. |
| **Queue** | Stores slow jobs (emails, ticket preparation) so the user does not have to wait for them. |
| **Worker** | Takes jobs from the queue and does them in the background. |

### How the design survives the big sale

- The **waiting room** turns about 333 arrivals per second into a controlled flow, so the system never sees all 200,000 people at once.
- The **CDN and cache** absorb the browsing traffic, which leaves the database free for holds and sales.
- The seat map can be cached for a second or two, because every hold is re-checked against the database.
- Each hold is one small indexed `UPDATE`, which a database can run quickly, and the sale only needs about 33 successful sales per second.
- **App servers** can be scaled out before the sale, and a **per-user rate limit** (429) blocks bots and enforces fairness.
- Slow work such as emails goes through the **queue**, so users never wait for it.
- Single points of failure are avoided: several app servers behind the load balancer, a read replica that can be promoted if the primary fails, a cache that the app can bypass (slower but working) if it fails, and a queue that keeps jobs until a worker finishes them.

## 7. Trade-offs

1. **Fairness vs complexity (the waiting room).** *Gain:* the system is protected and people are served in the order they arrived. *Cost:* it is another component to build and run, and some people wait a long time before they can even see the seats.
2. **Seat-map speed vs freshness (the cache).** *Gain:* a cached seat map is very fast and takes load off the database. *Cost:* it may show a seat as free just after it was taken, so some users get a "409 seat unavailable" and have to choose again.
3. **Hold length.** *Gain of a short hold (5 minutes):* abandoned seats return to the pool quickly. *Cost:* some users are rushed and their hold may expire before they finish paying.
4. **Correctness vs raw speed (one primary database for holds).** *Gain:* routing all holds and sales through one authoritative database guarantees no double-booking. *Cost:* the primary can become a bottleneck, so the design keeps its work small (single indexed updates), moves reads to replicas and the cache, and could split events across databases (sharding) if one popular event ever outgrew it.

### Alternatives considered

- **Locking rows while a user decides:** rejected, because locks held for minutes would block other buyers. A short-lived hold with an expiry gives the same protection without holding a database lock.
- **Relying on the cache to track availability:** rejected, because a cache can be stale and could lead to double-selling. The database stays the source of truth.
- **Letting everyone in at once, with no waiting room:** rejected, because 200,000 simultaneous people would overload the system, and the sale would not be first come, first served.
