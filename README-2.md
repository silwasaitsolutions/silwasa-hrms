# HRMS — Employee Management System (V1)

A production-ready Employee Management System built as a two-part monorepo:

- **backend/** — Node.js + Express REST API (JavaScript, layered architecture, MySQL)
- **frontend/** — React + Vite + Tailwind CSS SPA

## Features (V1)

- Authentication (JWT access + refresh tokens, bcrypt password hashing)
- Role-based access control (Admin, Employee — architecture supports adding more roles later)
- Employee management (CRUD, search, pagination, CSV export)
- Departments & Designations
- Attendance (mark/view, daily summary)
- Leave management (request, approve/reject, cancel — auto-updates attendance on approval)
- Holidays calendar
- Basic payroll (per-employee or bulk generation, status tracking)
- Payslips (per pay-period breakdown)
- Reports (dashboard summary + CSV export for attendance, leave, payroll)

## V1.1 additions: leave balance & employee documents

**Leave balance**
- Every active employee is credited `LEAVE_MONTHLY_CREDIT` (default 1.5) days at 00:05 on the 1st of each month (`APP_TIMEZONE`). Unused balance carries forward.
- If the server was down on the 1st, the missed months are credited on the next start (credits are idempotent, never doubled).
- One shared balance for Casual, Earned and Sick Leave. Unpaid Leave never touches it (`leave_types.uses_balance`).
- Days are deducted when a request is submitted (so the same balance can't be requested twice); rejection or cancellation credits them back; approval changes nothing further.
- If the balance is short, the request is blocked and the employee is asked to choose Unpaid Leave.
- Employees see their balance on the Dashboard and Leave page; admins see every employee's balance under Leave → Employee Balances.
- Every change is recorded in `leave_balance_ledger`.

**Documents**
- Admin: upload files when adding an employee, or any time via the folder icon on the Employees page (categories: onboarding, experience letter, relieving letter, health insurance portability, PF & UAN, salary slip, other).
- Employee: Dashboard → My Documents to download their own documents. Employees marked resigned/terminated can still log in to download them.
- Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, up to `MAX_UPLOAD_MB` (10) each. Files are stored under `UPLOAD_DIR` with random names and are only served through authenticated endpoints.

**Upgrading an existing V1 install** (keeps your data):
```bash
cd backend
npm install
# add the new settings from .env.example (LEAVE_MONTHLY_CREDIT, APP_TIMEZONE, UPLOAD_DIR, MAX_UPLOAD_MB)
npm run db:migrate
npm run dev
```
Back up `UPLOAD_DIR` along with the database: document files live on disk, not in MySQL.

## Architecture

Backend follows a clean layered architecture:

```
Route → Middleware (auth/validation) → Controller → Service → Database
```

No business logic lives in controllers — controllers only orchestrate; all logic is in `services/`.

Frontend is organized by feature (`pages/employees`, `pages/leave`, etc.) with shared `api/`, `components/`, `store/`, and `hooks/` layers, using TanStack Query for server state and Zustand for auth state.

## Prerequisites

- Node.js 18+
- MySQL 8+ (or MariaDB 10.5+)

## Setup

### 1. Database

Create a `.env` file in `backend/` from the example and fill in your MySQL credentials:

```bash
cd backend
cp .env.example .env
# edit .env with your DB_USER / DB_PASSWORD / DB_NAME etc.
```

Then initialize the database (creates schema, seed data, and a default admin user):

```bash
npm install
npm run db:init
```

This prints the default admin credentials:
```
email: admin@hrms.com
password: Admin@123
```

### 2. Backend

```bash
cd backend
npm install       # if not already done
npm run dev        # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # points VITE_API_BASE_URL at the backend
npm install
npm run dev             # starts on http://localhost:5173
```

Open http://localhost:5173 and log in with the default admin credentials above.

## Project Structure

```
hrms/
├── backend/
│   ├── src/
│   │   ├── config/        # DB pool, DB init script
│   │   ├── middleware/     # auth, validation, error handling, rate limiting
│   │   ├── routes/         # Express routers (one per resource)
│   │   ├── controllers/    # thin request/response orchestration
│   │   ├── services/       # all business logic + DB queries
│   │   ├── validators/     # Zod schemas
│   │   ├── utils/          # jwt, password hashing, CSV, error class
│   │   ├── app.js
│   │   └── server.js
│   └── sql/
│       ├── schema.sql
│       └── seed.sql
└── frontend/
    └── src/
        ├── api/            # one thin wrapper module per backend resource
        ├── components/     # layout/ and ui/ reusable components
        ├── pages/           # one folder per feature area
        ├── routes/          # ProtectedRoute
        ├── store/           # Zustand auth store
        └── hooks/
```

## Extending Beyond V1

The system was deliberately built so these are additive changes, not rewrites:

- **New roles** (HR Manager, Manager): add a row to the `roles` table and extend `authorize()` calls — no schema migration needed since roles aren't hardcoded as an enum.
- **New HR modules**: follow the existing route → controller → service pattern; each module is self-contained.
- **Advanced payroll** (tax slabs, bonuses, deductions catalog): extend the `payroll_runs` table and `payroll.service.js` — the generation flow already isolates this logic.
- **File uploads** (profile photos, documents): `employees.profile_photo_url` is already a column; wire up an upload endpoint and storage provider of choice.
- **Notifications/emails**: hook into the existing service layer (e.g. leave approval, payroll generation) without touching controllers.

## Security Notes

- Passwords are hashed with bcrypt (10 rounds).
- JWT access tokens are short-lived (15m default); refresh tokens (7d default) are stored hashed in the DB and can be revoked (used on logout and password change).
- All inputs are validated with Zod at the middleware layer before reaching controllers.
- Helmet, CORS (restricted to `CLIENT_URL`), and rate limiting (stricter on `/auth`) are enabled by default.
- Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production — the `.env.example` placeholders are not secure.
