# Ironworks Gym — Session Booking

A gym runs one-hour sessions holding twenty people each. Bookings used to be taken by phone
and written in a notebook, which caused overbooking and arguments at the door. This replaces
the notebook: members book and cancel online, staff add sessions and mark who turned up.

- `server/` — Express API over MongoDB
- `client/` — React single-page app

## Design note

1. Node, Express and MongoDB with Mongoose; React, Vite and React Router on the front end.
2. Layers run routes → validation → controller → service → repository, wired in one container.
3. Services hold the rules, repositories hold the queries, controllers only shape the response.
4. Four collections: users, sessions, bookings, waitlist entries, related by ObjectId.
5. A session carries `capacity` and `seatsTaken`, so a seat is claimed by one atomic update.
6. Booking filters on `seatsTaken < capacity` inside `findOneAndUpdate`, so the last seat has one winner.
7. A partial unique index on `(session, member)` over confirmed bookings is the backstop.
8. Cancelling runs in a transaction that hands the freed seat to the head of the waitlist.
9. Waitlist order is `joinedAt`, so position is a count rather than a number to renumber.
10. Mongo gives referenced collections rather than SQL tables; chosen for the atomic counter.

## Running it

MongoDB must be a replica set, because promoting from the waitlist uses a transaction. A free
Atlas M0 cluster already is one. The API warns at boot and still works if it is not, but the
promotion stops being atomic.

```bash
cd server
cp .env.example .env     # set MONGODB_URI and a long JWT_SECRET
npm install
npm run seed
npm run dev              # http://localhost:4000
```

```bash
cd client
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev               # http://localhost:5173
```

A local replica set in Docker, if you would rather not use Atlas:

```bash
docker run -d --name gym-mongo -p 27019:27019 mongo:7 --replSet rs0 --bind_ip_all --port 27019
docker exec gym-mongo mongosh --port 27019 --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27019"}]})'
```

Then `MONGODB_URI=mongodb://localhost:27019/gym-slot-booking?replicaSet=rs0`.

## Test accounts

`npm run seed` wipes the four collections and rebuilds them.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gym.test` | `Admin@1234` |
| Member | `maya@gym.test` | `Member@1234` |
| Member | `dev@gym.test` | `Member@1234` |

It also creates `member01@gym.test` … `member22@gym.test` on `Member@1234` to fill sessions.

The seed leaves six sessions across four days: one running in the current hour with a
redeemable code, one full with two people waiting, one part-filled, and two empty. The code
for the live session is printed when the seed finishes — redeem it on the front desk page to
see check-in work straight away.

Passwords live in `.env` (`SEED_ADMIN_PASSWORD`, `SEED_MEMBER_PASSWORD`) and are only this
weak because the brief asks for working test credentials.

## API

All routes sit under `/api`. Everything except register, login and health needs
`Authorization: Bearer <token>`.

| Method | Route | Who | Does |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Creates a member account, returns a token |
| POST | `/auth/login` | public | Returns a token |
| GET | `/auth/me` | any | The signed-in account |
| GET | `/sessions` | any | Sessions with seats remaining; `?date=`, `?onlyAvailable=`, `?includePast=` |
| GET | `/sessions/:id` | any | One session |
| POST | `/sessions` | admin | Creates a session |
| GET | `/sessions/:id/bookings` | admin | The register plus the waitlist |
| GET | `/bookings/me` | any | Your own bookings and waitlist places |
| POST | `/bookings` | member | Books a seat |
| DELETE | `/bookings/:id` | owner or admin | Cancels, promoting the waitlist head |
| POST | `/waitlist` | member | Joins a full session's waitlist |
| DELETE | `/waitlist/:sessionId` | member | Leaves it |
| POST | `/check-ins` | admin | Redeems a code and names the member |

Errors always look the same:

```json
{"error":{"code":"CONFLICT","message":"That session is full, join the waitlist instead"}}
```

`422` adds `details`, an array of `{field, message}`. `400` malformed request, `401`
unauthenticated, `403` forbidden, `404` missing, `409` conflict.

## How the awkward parts work

**Two people take the last seat.** `reserveSeat` is a single `findOneAndUpdate` whose filter
asserts both that the session has not started and that `seatsTaken` is still below `capacity`,
and whose update increments `seatsTaken`. MongoDB applies a single-document update atomically,
so of two concurrent callers only one filter can match; the loser gets `null` back and the
service answers `409`. The partial unique index on `(session, member)` catches the other race,
a member firing two bookings at once. Verified by racing ten members for three seats: three
`201`s, seven `409`s, `seatsTaken` exactly three.

**Cancelling feeds the waitlist.** Cancel, promote and the seat count move inside one
transaction. The freed seat is handed straight to the head of the waitlist rather than
released and re-taken, so `seatsTaken` never dips and nobody can slip into the gap. A member
already holding a confirmed booking is skipped instead of double-booked. Nothing is promoted
once the session has started, since cancellation is refused from that point.

**Check-in codes.** Six characters drawn with `crypto.randomInt` from a 32-character alphabet
with the ambiguous letters removed, so one code reveals nothing about the next. A code
resolves only while its own session is in progress, only once, and only for a confirmed
booking — the lookup filters on status, so cancelling makes a code stop existing.

## Assumptions

- **All times are UTC.** A session is identified by a date and an integer start hour, and the
  app renders both in UTC so the stored hour and the displayed hour never disagree. A real gym
  would pin this to its own timezone.
- **Capacity is a field, defaulting to 20.** The brief fixes twenty, but keeping it per-session
  means the rule is enforced by data rather than a constant, and makes the race testable.
- **Admins are seeded, never registered.** Registration always writes `role: member`.
- **Admins do not book.** `POST /bookings` is member-only; the front desk reads and marks
  attendance instead. The timetable shows an admin seat counts without buttons.
- **Cancelling is blocked once the session starts**, for admins too, which is what keeps
  anyone from being promoted into a session already underway.
- **A member on a waitlist who books directly** (a seat opened up and they got there first)
  has their waitlist entry removed in the same transaction.
- **Seats update by polling**, every ten seconds, pausing while the tab is hidden. Sockets
  would be the next step, not the first.
- **Tokens live in `localStorage`.** Simple and adequate here; httpOnly cookies would be the
  production answer.

## Not done

No automated test suite is committed. The API was verified end to end with a throwaway script
covering 44 cases — every status code above, the booking race, waitlist promotion, ownership
checks and all four check-in rejections. Those belong in `supertest` files in a real project.
