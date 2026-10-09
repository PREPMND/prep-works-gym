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
4. Six collections: users, sessions, bookings, waitlist entries, wallet entries, top-ups.
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

## Deploying

Nothing in the repo holds configuration; both services read it from the environment.

**Database — MongoDB Atlas (M0).** An M0 cluster is a replica set, which is what the
waitlist promotion needs. Under Network Access allow `0.0.0.0/0`, because Render's outbound
addresses are not fixed on the free plan.

**API — Render**, root directory `server`, build `npm install`, start `npm start`, health
check path `/api/health`. Render supplies `PORT` itself. Set:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | the Atlas connection string |
| `JWT_SECRET` | a long random string, not the one from `.env.example` |
| `CLIENT_ORIGIN` | the deployed frontend origin, e.g. `https://your-app.vercel.app` |
| `NODE_ENV` | `production` |

**Frontend — Vercel**, root directory `client`, framework Vite, output `dist`. Set
`VITE_API_URL` to `https://your-api.onrender.com/api`. Vite inlines this at build time, so
changing it needs a redeploy, not just a restart.

`vercel.json` rewrites every path to `index.html`. Without it a client-side route such as
`/my-bookings` returns 404 when it is opened directly or refreshed.

**Seeding the deployed database.** Run it from your machine against Atlas:

```bash
cd server
MONGODB_URI="<atlas-uri>" JWT_SECRET="<any-32-chars>" npm run seed
```

The seed empties the six collections first, so only run it against a database you are happy
to lose.

Two things a reviewer should know, and the live links should mention: the Render free plan
sleeps an idle service, so the first request after a pause can take up to a minute; and
`CLIENT_ORIGIN` accepts a comma-separated list, which is how you let a Vercel preview URL
reach the API alongside production.

## Test accounts

`npm run seed` wipes the four collections and rebuilds them.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gym.test` | `Admin@1234` |
| Member | `maya@gym.test` | `Member@1234` |
| Member | `dev@gym.test` | `Member@1234` |

It also creates `member01@gym.test` … `member22@gym.test` on `Member@1234` to fill sessions.

Maya opens with ₹1,200 in her wallet and Dev with ₹150. One seeded session costs ₹250, so
Maya can book it and Dev gets a 402 — both payment paths are demonstrable without typing
anything in.

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
| GET | `/wallet` | member | Balance and statement |
| POST | `/wallet/top-ups` | member | Starts a top-up, issues a one-time code |
| POST | `/wallet/top-ups/:id/confirm` | member | Confirms the code and credits the wallet |

Errors always look the same:

```json
{"error":{"code":"CONFLICT","message":"That session is full, join the waitlist instead"}}
```

`422` adds `details`, an array of `{field, message}`. `400` malformed request, `401`
unauthenticated, `402` not enough wallet credit, `403` forbidden, `404` missing, `409`
conflict.

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

## Payments, which the brief did not ask for

The brief has no pricing in it, so **every session defaults to `price: 0` and the charge path
is skipped entirely when the price is zero.** The booking flow the brief describes is
unchanged. What follows is an extra, and it is a simulation — no payment provider, no keys,
no real money.

A member holds a wallet balance. Topping up issues a six-digit one-time code, which the API
returns in the response outside production (and logs to the server console) so the flow can
be demonstrated without an SMS gateway. Confirming the code credits the wallet.

Booking a priced session debits the wallet with the same atomic guard used for seats:

```js
findOneAndUpdate({_id:memberId, walletBalance:{$gte:amount}}, {$inc:{walletBalance:-amount}})
```

`null` back means the balance moved under us, and the service answers `402`. Because the
debit shares the booking's transaction, a refused payment rolls the seat back too — no seat
is ever held without being paid for. Cancelling refunds inside the cancel transaction.

Every balance change writes a `WalletEntry` carrying the amount and the balance after it, so
the statement reconstructs the balance from the ledger. The test suite replays all entries
and asserts the running total matches.

Three details worth knowing:

- **The attempt counter is deliberately outside the transaction.** A wrong code throws, and a
  throw aborts a transaction — which would roll back the very counter that limits guessing.
  Rate limiting has to survive the failure it is counting, so only the money movement is
  transactional.
- Codes expire after five minutes, die after three wrong guesses, and cannot be replayed.
- **A waitlisted member who cannot afford the promotion is skipped**, and the seat passes to
  the next person. They lose their place. A kinder system would hold the seat and notify
  them; that needs a notification channel and an expiry job.

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
- **Money is stored in paise**, as integers. Floating point has no business holding currency.
- **The wallet is a simulation**, and the UI says so on the page itself.

## Not done

No automated test suite is committed. The API was verified end to end with throwaway scripts
covering 70 cases — every status code above, the booking race, waitlist promotion, ownership
checks, all four check-in rejections, and the wallet's OTP, refund and ledger rules. Those
belong in `supertest` files in a real project.
