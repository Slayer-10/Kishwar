# Project Audit Report: KISHWAR

**Generated Date:** September 26, 2026  
**Scope:** Current-State Codebase Inspection  

---

## 1. Route Inventory

Every `page.tsx` file under `app/(dashboard)/`, `app/(public)/`, and `app/(auth)/`:

| Exact File Path | One-Line Description |
| :--- | :--- |
| `app/(auth)/login/page.tsx` | Renders the user login form for email/password authentication via `signInAction`. |
| `app/(auth)/signup/page.tsx` | Renders the participant registration form to create a new user account via `signUpAction`. |
| `app/(auth)/forgot-password/page.tsx` | Renders the password recovery form to request a reset link via `forgotPasswordAction`. |
| `app/(auth)/reset-password/page.tsx` | Renders the password reset form to submit a new password via `resetPasswordAction`. |
| `app/(public)/page.tsx` | Public home landing page featuring event hero, statistics overview, and registration CTAs. |
| `app/(public)/ambassadors/page.tsx` | Displays partner universities and assigned campus ambassadors fetched from Prisma. |
| `app/(public)/events/page.tsx` | Lists all published competition events grouped by discipline category. |
| `app/(public)/events/[id]/page.tsx` | Displays detailed rules/schedule for a specific event with individual/team registration forms. |
| `app/(public)/sponsors/page.tsx` | Displays event sponsors grouped by tier (Title, Gold, Silver, Bronze) with placeholder names. |
| `app/(dashboard)/admin/page.tsx` | Admin event management table listing all events with links to edit and delete actions. |
| `app/(dashboard)/admin/ambassadors/page.tsx` | Admin interface to provision ambassador accounts (Supabase Auth + DB) and list/delete existing ambassadors. |
| `app/(dashboard)/admin/announcements/page.tsx` | Admin interface to compose announcements, toggle published status, or delete them. |
| `app/(dashboard)/admin/events/new/page.tsx` | Admin form page to create a new event using `createEventAction`. |
| `app/(dashboard)/admin/events/[id]/edit/page.tsx` | Admin form page pre-filled with existing event data to edit via `updateEventAction`. |
| `app/(dashboard)/admin/payments/page.tsx` | Admin payment verification panel to review submitted payment receipts and verify or reject them. |
| `app/(dashboard)/admin/registrations/page.tsx` | Admin table listing all event registrations with participant/team details and invoice statuses. |
| `app/(dashboard)/admin/universities/page.tsx` | Admin page to view partner universities, linked ambassador/team counts, and add/delete universities. |
| `app/(dashboard)/ambassador/page.tsx` | Ambassador dashboard home page rendering placeholder text for Phase 3 features. |
| `app/(dashboard)/fdo/page.tsx` | Front Desk Officer (FDO) dashboard home page rendering placeholder text for assigned-scope tools. |
| `app/(dashboard)/participant/page.tsx` | Participant dashboard listing registered events, status badges, and registration cancellation buttons. |
| `app/(dashboard)/participant/payments/page.tsx` | Participant payments page listing invoices and forms to submit payment method, reference ID, and proof URL. |

---

## 2. Server Actions Inventory

List of exported functions across all server action files:

### `app/(dashboard)/admin/actions.ts`
- **`createEventAction`**: Validates event form input and creates a new `Event` in Prisma; revalidates and redirects to `/admin`.
- **`updateEventAction`**: Validates and updates an existing `Event` record in Prisma; revalidates and redirects to `/admin`.
- **`deleteEventAction`**: Deletes an `Event` record if no teams or registrations are linked to it.
- **`createUniversityAction`**: Creates a new `University` record (name and optional city) in Prisma.
- **`deleteUniversityAction`**: Deletes a `University` record if no ambassadors or teams are associated with it.
- **`createAnnouncementAction`**: Creates a new `Announcement` record (defaults to unpublished/draft).
- **`togglePublishAnnouncementAction`**: Toggles an announcement's `isPublished` state and sets/clears `publishedAt`.
- **`deleteAnnouncementAction`**: Deletes an `Announcement` record from Prisma by ID.
- **`createAmbassadorAction`**: Provisions a Supabase Auth user with role `AMBASSADOR` and creates linked `User` and `Ambassador` DB records.
- **`deleteAmbassadorAction`**: Deletes an ambassador's Supabase Auth user account and DB records (`Ambassador` + `User`) if no teams are linked.
- **`verifyPaymentAction`**: Marks a `Payment` as `VERIFIED`, updates its `Invoice` status to `PAID`, and sets `Registration` status to `CONFIRMED`.
- **`rejectPaymentAction`**: Marks a `Payment` as `REJECTED` and resets `Registration` status to `INVOICED`.

### `app/(dashboard)/participant/actions.ts`
- **`registerForEventAction`**: Registers the logged-in participant for an individual event and generates an unpaid `Invoice`.
- **`cancelRegistrationAction`**: Deletes a pending `Registration` and its unpaid `Invoice` if no payment submission exists.
- **`submitPaymentAction`**: Creates a `Payment` record with method, reference number, and proof URL against an unpaid `Invoice`.
- **`registerTeamAction`**: Creates a `Team`, links member participants by email, creates a team `Registration`, and generates an `Invoice`.

### `app/(auth)/actions.ts`
- **`signUpAction`**: Creates a Supabase Auth user with role `PARTICIPANT` and initializes corresponding `User` and `Participant` DB rows.
- **`signInAction`**: Authenticates user credentials via Supabase Auth and redirects to their role-specific dashboard home.
- **`forgotPasswordAction`**: Triggers a password reset email for the provided email address via Supabase Auth.
- **`resetPasswordAction`**: Updates the password for the current authenticated user session via Supabase Auth.

### `app/(dashboard)/ambassador/actions.ts`
- *File does not exist.*

### `app/(dashboard)/fdo/actions.ts`
- *File does not exist.*

---

## 3. Prisma Schema Summary

Models in `prisma/schema.prisma` with field definitions and current usage flags:

### 1. `User`
- **Fields**: `id` (String), `email` (String), `passwordHash` (String?), `role` (Role enum), `isActive` (Boolean), `createdAt` (DateTime), `updatedAt` (DateTime).
- **Status**: Actively used (Auth, Admin actions, Middleware).

### 2. `University`
- **Fields**: `id` (String), `name` (String), `city` (String?), `createdAt` (DateTime).
- **Status**: Actively used (Admin universities, Ambassador creation, Public ambassadors page).

### 3. `Ambassador`
- **Fields**: `id` (String), `userId` (String), `universityId` (String), `ambassadorCode` (String), `assignedAt` (DateTime).
- **Status**: Actively used (Admin ambassador management, Public ambassadors directory).

### 4. `FDO`
- **Fields**: `id` (String), `userId` (String), `assignedScope` (Json?), `createdAt` (DateTime).
- **Status**: **`[FLAG: SCHEMA-ONLY - ZERO READ/WRITE OPERATIONS]`** (Included in `lib/auth.ts` relation selector, but zero server actions or pages create, update, or read FDO records).

### 5. `Participant`
- **Fields**: `id` (String), `userId` (String), `fullName` (String), `email` (String), `phone` (String?), `cnic` (String?), `createdAt` (DateTime).
- **Status**: Actively used (Signup, Participant dashboard, Event & Team registration).

### 6. `Team`
- **Fields**: `id` (String), `name` (String), `captainId` (String), `universityId` (String?), `ambassadorId` (String?), `eventId` (String), `createdAt` (DateTime).
- **Status**: Actively used (Team event registration, Admin registrations view).

### 7. `TeamMember`
- **Fields**: `id` (String), `teamId` (String), `participantId` (String).
- **Status**: Actively used (Created during team event registration in `registerTeamAction`).

### 8. `Event`
- **Fields**: `id` (String), `name` (String), `description` (String?), `category` (String?), `registrationFee` (Decimal), `prizeMoney` (Decimal?), `registrationType` (RegistrationType enum), `minTeamSize` (Int?), `maxTeamSize` (Int?), `deadline` (DateTime), `eventDate` (DateTime), `venue` (String?), `rules` (String?), `status` (EventStatus enum), `createdAt` (DateTime).
- **Status**: Actively used (Admin CRUD actions, Public event pages, Participant registrations).

### 9. `Registration`
- **Fields**: `id` (String), `participantId` (String?), `teamId` (String?), `eventId` (String), `status` (RegistrationStatus enum), `createdAt` (DateTime), `updatedAt` (DateTime).
- **Status**: Actively used (Participant registration & cancellation, Admin verification & listing).

### 10. `Invoice`
- **Fields**: `id` (String), `registrationId` (String), `invoiceNumber` (String), `amount` (Decimal), `status` (InvoiceStatus enum), `createdAt` (DateTime).
- **Status**: Actively used (Auto-generated upon registration, updated to PAID on payment verification).

### 11. `Payment`
- **Fields**: `id` (String), `invoiceId` (String), `amount` (Decimal), `method` (String), `referenceNumber` (String?), `proofUrl` (String?), `verificationStatus` (PaymentVerificationStatus enum), `verifiedBy` (String?), `createdAt` (DateTime).
- **Status**: Actively used (Participant payment submission, Admin verification/rejection).

### 12. `Ticket`
- **Fields**: `id` (String), `registrationId` (String), `ticketCode` (String), `qrData` (String), `status` (TicketStatus enum), `createdAt` (DateTime).
- **Status**: **`[FLAG: SCHEMA-ONLY - ZERO READ/WRITE OPERATIONS]`** (No server actions, QR generation, or pages interact with the Ticket model).

### 13. `Announcement`
- **Fields**: `id` (String), `title` (String), `body` (String), `isPublished` (Boolean), `createdAt` (DateTime), `publishedAt` (DateTime?).
- **Status**: Actively used (Admin announcements CRUD and publish/unpublish toggling).

### 14. `AuditLog`
- **Fields**: `id` (String), `userId` (String), `action` (String), `targetTable` (String), `targetId` (String), `timestamp` (DateTime), `details` (Json?).
- **Status**: **`[FLAG: SCHEMA-ONLY - ZERO READ/WRITE OPERATIONS]`** (Zero audit logging calls or view pages exist in the application logic).

---

## 4. Dashboard Shells Status

| Dashboard Path | Status | Details / Text Findings |
| :--- | :--- | :--- |
| `app/(dashboard)/ambassador/` | **Placeholder / Shell** | `page.tsx` renders static text: `"Foundation shell — university-scoped team tools arrive in Phase 3."`. Contains no database queries or interactive tools. |
| `app/(dashboard)/fdo/` | **Placeholder / Shell** | `page.tsx` renders static text: `"Foundation shell — assigned-scope tools arrive in a later phase."`. Contains no database queries or interactive tools. |
| `app/(dashboard)/participant/` | **Real Working Dashboard** | Fully functional. Features `page.tsx` (view registrations, status, cancel pending registrations) and `payments/page.tsx` (view invoices, submit payment receipts with method/reference/proof URL, track verification status). Connected to Prisma DB via `app/(dashboard)/participant/actions.ts`. |

---

## 5. Known TODOs / Placeholders

1. **Code Comments (`TODO`, `FIXME`, `not implemented`)**:
   - Zero `TODO`, `FIXME`, or `"not implemented"` comments were found across application source files.
   - Informational comments found:
     - `prisma/schema.prisma` (lines 58-60): Notes that `User.id` maps directly to Supabase Auth UUID.
     - `lib/supabase/server.ts` (lines 19-20, 27): Notes regarding cookie handling in Server Components.

2. **Placeholder Content & Unbuilt Nav Shells**:
   - `app/(dashboard)/ambassador/page.tsx:5`: `"Foundation shell — university-scoped team tools arrive in Phase 3."`
   - `app/(dashboard)/fdo/page.tsx:5`: `"Foundation shell — assigned-scope tools arrive in a later phase."`
   - `app/(public)/sponsors/page.tsx:9-17`: Mock/placeholder array of sponsor names (`"Sponsor Name"`) across all tiers.
   - `app/(dashboard)/participant/layout.tsx:8`: Nav link pointing to `/participant/tickets` (route `page.tsx` does not exist).
   - `app/(dashboard)/fdo/layout.tsx:6-8`: Nav links pointing to `/fdo/registrations` and `/fdo/payments` (route `page.tsx` files do not exist).

---

## 6. Ticket/QR Code Feature

- **Status**: **Unbuilt / Schema-Only**
- **Findings**:
  - `prisma/schema.prisma` contains definitions for the `Ticket` model and `TicketStatus` enum (`VALID`, `USED`, `INVALID`).
  - `app/(dashboard)/participant/layout.tsx` contains a sidebar menu link for `My Tickets` (`/participant/tickets`), but no page exists at that path.
  - There are **ZERO** server actions, API routes, or utility helper functions in the codebase that create, query, update, or validate `Ticket` records.
  - **No QR code generation logic** or libraries exist anywhere in the codebase.
  - **No check-in or scanning flow** exists for FDOs or Admins.
- **Conclusion**: Confirmed — zero reads or writes to the `Ticket` model in application code.
