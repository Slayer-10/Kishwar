# KISHWAR

A registration and management system for the FAST-NUCES Multan mega event. Participants and teams register for events, receive invoices, submit payment proof and get QR-code tickets. Admins, front desk officers and campus ambassadors each get their own dashboard to run the event.

## Team

- [Muhammad Isa](https://github.com/m250526-del): Backend Developer (registration, invoicing and payment verification, admin dashboard), Homepage Design
- [Mehrunnisa Shabbir](https://github.com/mehrunnisaa579-mehr): Backend Developer, Frontend Design
- [Ali Zafar](https://github.com/Slayer-10): Frontend Developer, UI/UX Design

## Features

**Four user roles, each with its own dashboard**
- **Super Admin:** manages events, universities, ambassadors, registrations, payments, announcements and collective invoices, and can review ambassador and registration requests and see the audit log
- **FDO (Front Desk Officer):** handles assigned events, registrations and payments
- **Ambassador:** manages their teams and participants, identified by a unique ambassador code
- **Participant:** registers for events, views invoices and payments, downloads tickets and can apply to become an ambassador

**Registration and payments**
- Individual, team or both registration types, with fees, deadlines, venues, rules and event status (draft, open, closed, completed, cancelled)
- Automatic invoice on registration, with a payment submission flow (method, reference number, proof upload)
- Admin payment verification, which moves registrations through pending, invoiced, paid, confirmed or rejected
- Tickets with QR codes and valid, used or invalid states

**Platform**
- Authentication with Supabase (sign up, login, forgot and reset password) and session refresh in middleware
- Role checks in each dashboard layout, so users only reach their own area
- Audit log of admin actions
- Notification system with email and WhatsApp providers
- Ambassador passwords encrypted with AES-256-GCM
- Health check endpoint at `/api/health`

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Database:** PostgreSQL through Prisma 5
- **Auth:** Supabase Auth (`@supabase/ssr`)
- **Styling:** Tailwind CSS, Lucide React, class-variance-authority
- **Testing:** `tsx` test scripts covering encryption, ambassador approval and deletion, and end-to-end validation

## Project Structure

```
.
├── app/
│   ├── (auth)/        # Login, signup, forgot and reset password
│   ├── (dashboard)/   # admin, fdo, ambassador and participant dashboards
│   ├── (public)/      # Public landing page
│   └── api/           # Health check
├── components/        # Shared UI (dashboard shell)
├── lib/               # Auth, Prisma, Supabase, notifications, encryption, registration logic
├── prisma/            # Schema and migrations
├── scripts/           # Admin utilities (promote admin, create FDO account, data fixes)
├── tests/             # Test scripts
└── middleware.ts      # Session refresh and route protection
```

## Getting Started

```bash
git clone https://github.com/Slayer-10/Kishwar.git
cd Kishwar
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AMBASSADOR_PASSWORD_ENCRYPTION_KEY=   # 64 hex characters (32 bytes)
```

Generate the encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Creating the first admin

Register an account, then use `scripts/promote-admin.ts` to promote it to Super Admin. Use `scripts/create-fdo-account.ts` to create front desk officer accounts.

### Scripts

```bash
npm run dev      # start the development server
npm run build    # generate the Prisma client and build for production
npm run start    # run the production build
npm run lint     # run ESLint
npm run test     # run the test scripts
```
