# Mini Inventory System

A full-stack inventory management system supporting multiple warehouses and transactional stock operations (add, remove, transfer). Built with **NestJS + Prisma + PostgreSQL** on the backend and **React + Vite + TypeScript** on the frontend.

Transfers (and all stock mutations) run inside database transactions, so a warehouse's stock can never be left in a partially-updated state.

> **All three optional bonus enhancements are implemented:** logging of stock changes, authentication, and tests. See [Bonus Features](#bonus-features) below.

---

## Bonus Features

All optional enhancements from the assignment have been completed:

- ✅ **Logging of stock changes** — every add/remove/transfer is recorded two ways: persisted to the `StockMovement` audit table (inside the same transaction as the stock change), and printed to the server terminal via NestJS's built-in `Logger`. Rejected operations (e.g. insufficient stock, not found) are logged at `warn` level.
- ✅ **Authentication** — full JWT-based auth using Passport and bcrypt-hashed passwords. A global guard protects every route by default; only `register` and `login` are public (via a custom `@Public()` decorator). The frontend has a complete login flow with protected routes and token handling.
- ✅ **Tests** — Jest unit tests with **full branch coverage** across all services, including transactional guard conditions and assertions that no partial writes occur on failure.

---

## Table of Contents

1. [Bonus Features](#bonus-features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Creating the First User](#creating-the-first-user)
7. [Login Credentials](#login-credentials)
8. [Database Schema (ERD)](#database-schema-erd)
9. [API Reference](#api-reference)
10. [Running the Tests](#running-the-tests)
11. [Design Decisions & Assumptions](#design-decisions--assumptions)

---

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | NestJS (TypeScript), Prisma ORM              |
| Database  | PostgreSQL 16 (via Docker)                   |
| Auth      | JWT (Passport), bcrypt password hashing      |
| Frontend  | React + Vite + TypeScript, Axios             |
| Testing   | Jest (unit tests, full branch coverage)      |

---

## Project Structure

```
mini-inventory/
├── backend/          # NestJS API
│   ├── prisma/       # schema.prisma + migrations
│   └── src/
│       ├── auth/         # JWT auth (register, login, guard, strategy)
│       ├── products/     # product create + list
│       ├── warehouses/   # warehouse create + list
│       ├── stock/        # transactional add / remove / transfer
│       ├── inventory/    # per-product inventory reads
│       └── prisma/       # Prisma service + module
└── frontend/         # React + Vite client
    └── src/
        ├── api/          # axios client + typed API calls
        ├── pages/        # Login, Dashboard
        └── components/   # ProtectedRoute, CreateForms, StockActions
```

---

## Prerequisites

- **Node.js** v20 or later
- **Docker** + Docker Compose (for PostgreSQL)
- **npm**

---

## Getting Started

The backend and frontend are started separately. Run the backend first.

### 1. Start the database

From the `backend/` directory, start PostgreSQL via Docker:

```bash
cd backend
docker compose up -d
```

This launches PostgreSQL 16 on port `5432` with database/user/password all set to `inventory`.

### 2. Configure environment variables

The repository includes a template at **`backend/.env.example`**. From the `backend/` directory, copy it to a real `.env` file (the `.env` itself is gitignored and must live in `backend/`):

**macOS / Linux**
```bash
cp .env.example .env
```

**Windows (PowerShell)**
```powershell
Copy-Item .env.example .env
```

The default values work out of the box with the Docker setup above. The file defines three variables:

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string (matches the Docker DB).|
| `JWT_SECRET`     | Secret used to sign and verify JWTs.                 |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `1d`, `1h`, `15m`).             |

### 3. Install dependencies and run migrations

```bash
npm install
npx prisma migrate dev
```

`prisma migrate dev` applies all migrations, creating the five tables, and generates the Prisma client.

### 4. Start the backend

```bash
npm run start:dev
```

The API is now running at **http://localhost:3000**.

### 5. Start the frontend

In a **second terminal**, from the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

The app is now running at **http://localhost:5173**. Open it in your browser.

> **Note:** The backend enables CORS for `http://localhost:5173`. If you run the frontend on a different port, update `app.enableCors({ origin: ... })` in `backend/src/main.ts`.

---

## Creating the First User

All routes except `register` and `login` require authentication. Because there is no public sign-up page, create the first user by calling the register endpoint directly.

Run **one** of the following, depending on your OS:

### macOS / Linux (curl)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@invia.com","password":"secret123"}'
```

### Windows (PowerShell)

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/auth/register `
  -ContentType "application/json" `
  -Body (@{ email = "admin@invia.com"; password = "secret123" } | ConvertTo-Json)
```

A successful response returns an access token:

```json
{ "access_token": "eyJhbGciOi..." }
```

---

## Login Credentials

After registering the user above, log in through the web app at **http://localhost:5173** with:

| Field    | Value             |
| -------- | ----------------- |
| Email    | `admin@invia.com` |
| Password | `secret123`       |

The token is stored in the browser and automatically attached to every API request.

---

## Database Schema (ERD)

```
┌──────────────┐         ┌──────────────────┐         ┌───────────────┐
│   Product    │         │    Inventory     │         │   Warehouse   │
├──────────────┤         ├──────────────────┤         ├───────────────┤
│ id (PK)      │────────<│ id (PK)          │>────────│ id (PK)       │
│ name         │         │ productId  (FK)  │         │ name          │
│ sku (unique) │         │ warehouseId (FK) │         │ location?     │
│ createdAt    │         │ quantity         │         │ createdAt     │
│ updatedAt    │         │ createdAt        │         │ updatedAt     │
└──────────────┘         │ updatedAt        │         └───────────────┘
                         │ UNIQUE(productId,│
                         │   warehouseId)   │
                         └──────────────────┘

┌──────────────────────────┐                        ┌───────────────┐
│      StockMovement       │                        │     User      │
├──────────────────────────┤                        ├───────────────┤
│ id (PK)                  │                        │ id (PK)       │
│ type (ADD/REMOVE/TRANSFER)│                       │ email (unique)│
│ productId (FK)           │                        │ password (hash)│
│ quantity                 │                        │ createdAt     │
│ fromWarehouseId? (FK)    │                        └───────────────┘
│ toWarehouseId?   (FK)    │
│ createdAt                │
└──────────────────────────┘
```

### Table descriptions

- **Product** — a stockable item. `sku` is unique to prevent duplicates.
- **Warehouse** — a physical location that holds stock. `location` is optional.
- **Inventory** — the quantity of a given product in a given warehouse. The composite `UNIQUE(productId, warehouseId)` constraint guarantees exactly **one** stock row per product–warehouse pair, so totals never split across duplicate rows.
- **StockMovement** — an append-only audit log of every stock change. The nullable `fromWarehouseId` / `toWarehouseId` encode the operation:
  - `ADD` → only `toWarehouseId` set
  - `REMOVE` → only `fromWarehouseId` set
  - `TRANSFER` → both set
- **User** — an authenticated account. Passwords are stored as bcrypt hashes, never plain text.

---

## API Reference

Base URL: `http://localhost:3000`

All endpoints **except** `/auth/register` and `/auth/login` require a header:

```
Authorization: Bearer <access_token>
```

### Auth

| Method | Endpoint         | Body                          | Description                                   | Returns                       |
| ------ | ---------------- | ----------------------------- | --------------------------------------------- | ----------------------------- |
| POST   | `/auth/register` | `{ email, password }`         | Create a new user (password ≥ 6 chars).       | `{ access_token }`            |
| POST   | `/auth/login`    | `{ email, password }`         | Authenticate and receive a JWT.               | `{ access_token }`            |

- `409 Conflict` if the email is already registered.
- `401 Unauthorized` on invalid credentials.

### Products

| Method | Endpoint    | Body              | Description                          | Returns                          |
| ------ | ----------- | ----------------- | ------------------------------------ | -------------------------------- |
| POST   | `/products` | `{ name, sku }`   | Create a product.                    | The created product.             |
| GET    | `/products` | —                 | List all products (newest first).    | `Product[]`                      |

- `409 Conflict` if the `sku` already exists.

### Warehouses

| Method | Endpoint      | Body                    | Description                          | Returns               |
| ------ | ------------- | ----------------------- | ------------------------------------ | --------------------- |
| POST   | `/warehouses` | `{ name, location? }`   | Create a warehouse.                  | The created warehouse.|
| GET    | `/warehouses` | —                       | List all warehouses (newest first).  | `Warehouse[]`         |

### Inventory

| Method | Endpoint                        | Description                                                  | Returns                                                              |
| ------ | ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/inventory`                    | Full inventory list with product & warehouse details.       | Array of inventory rows.                                            |
| GET    | `/inventory/product/:productId` | A product's stock across every warehouse it has stock in.   | `{ product, inventory: [{ warehouseId, warehouseName, quantity }] }`|

- `404 Not Found` if the product does not exist.

### Stock Operations

All stock operations run inside a **single database transaction** and write a `StockMovement` audit row. `quantity` must be a positive integer.

| Method | Endpoint          | Body                                                    | Description                                            |
| ------ | ----------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| POST   | `/stock/add`      | `{ productId, warehouseId, quantity }`                  | Add stock to a warehouse (creates the row if needed).  |
| POST   | `/stock/remove`   | `{ productId, warehouseId, quantity }`                  | Remove stock from a warehouse.                         |
| POST   | `/stock/transfer` | `{ productId, fromWarehouseId, toWarehouseId, quantity }`| Move stock between two warehouses atomically.          |

Common error responses:

- `404 Not Found` — product or warehouse does not exist, or no inventory row to remove/transfer from.
- `400 Bad Request` — insufficient stock, non-positive quantity, or transferring to the same warehouse.

On any failure, the entire transaction is rolled back, leaving all warehouse quantities unchanged.

---

## Running the Tests

From the `backend/` directory:

```bash
# Run all unit tests
npm test

# Run with a coverage report
npm run test:cov
```

The suite covers all service logic with full branch coverage, including: the SKU-conflict path, the not-found and insufficient-stock guards, the same-warehouse-transfer guard, and assertions that **no partial writes occur** when an operation throws.

---

## Design Decisions & Assumptions

- **UUID primary keys** — used instead of auto-increment integers; they don't leak record counts and avoid collisions.
- **One stock row per product–warehouse pair** — enforced by a composite unique constraint on `Inventory`, so quantities never split across duplicate rows.
- **Atomic stock operations** — every add/remove/transfer runs inside a Prisma `$transaction`; the audit-log row is written inside the same transaction, so the log can never disagree with the actual stock state.
- **Single audit table for all movements** — `StockMovement` uses nullable `from`/`to` warehouse columns to represent add, remove, and transfer in one table.
- **Authentication scope** — all routes are protected by a global JWT guard except `register` and `login`. There is no public sign-up page by design; the first user is created via the register endpoint (see above). The frontend stores the token and redirects to login on any `401`.
- **Warehouse names are not unique** — two warehouses may share a name (unlike product SKUs, which are unique), since warehouse names are not a natural business key.
- **Omitted update / delete endpoints** — only the create and read operations required by the assignment are implemented. Deletion in particular is intentionally omitted: products and warehouses are referenced by inventory and movement history, and safe deletion would require soft-delete or cascade policies beyond the assignment's scope.
- **Testing approach** — unit tests (with a mocked Prisma client) cover all service-layer logic and guard conditions. Transactional atomicity itself is enforced by PostgreSQL and was additionally verified manually.
- **Frontend styling** — intentionally minimal, per the assignment's guidance to prioritize functional clarity over visual polish.
