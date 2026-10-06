# Project Audit Report: KISHWAR

**Generated Date:** October 6, 2026  
**Scope:** Current-State Codebase & Architectural Audit  
**System:** FAST-NUCES Multan Mega Event Registration & Management System  

---

## 1. Route Inventory

Below is the complete inventory of all `page.tsx` files grouped by route domain:

| Route / File Path | Role Scope | Description |
| :--- | :--- | :--- |
| `app/(auth)/login/page.tsx` | Public | User authentication login form powered by `signInAction`. |
| `app/(auth)/signup/page.tsx` | Public | Participant registration form powered by `signUpAction`. |
| `app/(auth)/forgot-password/page.tsx` | Public | Request password recovery email powered by `forgotPasswordAction`. |
| `app/(auth)/reset-password/page.tsx` | Public | Submit new password powered by `resetPasswordAction`. |
| `app/(public)/page.tsx` | Public | Landing page featuring mega event overview, category highlights, and quick access links. |
| `app/(public)/events/page.tsx` | Public | Lists all active competition events grouped by discipline category. |
| `app/(public)/events/[id]/page.tsx` | Public | Displays event details, rules, fees, dates, and instructions for Ambassador registration. |
| `app/(public)/ambassadors/page.tsx` | Public | Directory of partner universities and assigned campus ambassadors. |
| `app/(public)/sponsors/page.tsx` | Public | Sponsor directory categorized by sponsorship tiers. |
| `app/(public)/faqs/page.tsx` | Public | Frequently asked questions regarding event registration and participation rules. |
| `app/(public)/contact/page.tsx` | Public | Contact details and support inquiry channel. |
| `app/(public)/ambassador-application/page.tsx` | Public / Participant | Public information landing page explaining ambassador benefits and application requirements. |
| `app/(dashboard)/participant/page.tsx` | Participant | Participant home showing personal registrations, status badges, and Ambassador request form. |
| `app/(dashboard)/participant/payments/page.tsx` | Participant | Invoices overview and payment proof submission form powered by `submitPaymentAction`. |
| `app/(dashboard)/participant/tickets/page.tsx` | Participant | Displays valid QR tickets for confirmed event registrations. |
| `app/(dashboard)/participant/ambassador-application/page.tsx` | Participant | Interactive form for participants to apply for Campus Ambassador status. |
| `app/(dashboard)/ambassador/page.tsx` | Ambassador | Ambassador dashboard home listing both individual registrations and team registrations handled. |
| `app/(dashboard)/ambassador/participants/page.tsx` | Ambassador | Interface for Ambassadors to register existing participant accounts individually or in teams. |
| `app/(dashboard)/ambassador/my-registrations/page.tsx` | Ambassador | Detailed history of registrations processed under the Ambassador's code. |
| `app/(dashboard)/ambassador/payments/page.tsx` | Ambassador | Payment tracking panel for registrations linked to the Ambassador's campus. |
| `app/(dashboard)/ambassador/tickets/page.tsx` | Ambassador | Overview of generated tickets for participants registered through the Ambassador. |
| `app/(dashboard)/fdo/page.tsx` | FDO | Front Desk Officer dashboard home showing event check-in metrics and scope overview. |
| `app/(dashboard)/fdo/checkin/page.tsx` | FDO | Ticket check-in tool to scan/enter ticket codes and process entry via `checkInTicketAction`. |
| `app/(dashboard)/fdo/registrations/page.tsx` | FDO | FDO registration inspection table for verified event check-in status. |
| `app/(dashboard)/fdo/payments/page.tsx` | FDO | FDO view of verified payments and active invoices. |
| `app/(dashboard)/admin/page.tsx` | Super Admin | Admin event management hub listing events with edit/delete actions and status filters. |
| `app/(dashboard)/admin/events/new/page.tsx` | Super Admin | Event creation form powered by `createEventAction`. |
| `app/(dashboard)/admin/events/[id]/edit/page.tsx` | Super Admin | Pre-filled event editing interface powered by `updateEventAction`. |
| `app/(dashboard)/admin/universities/page.tsx` | Super Admin | University management panel to create/delete partner universities. |
| `app/(dashboard)/admin/ambassadors/page.tsx` | Super Admin | Ambassador list and management page linking to Ambassador requests review. |
| `app/(dashboard)/admin/ambassador-requests/page.tsx` | Super Admin | Review portal to approve/reject participant Ambassador requests and assign university codes. |
| `app/(dashboard)/admin/registrations/page.tsx` | Super Admin | Global registrations audit table with search and filter capabilities. |
| `app/(dashboard)/admin/payments/page.tsx` | Super Admin | Payment verification panel to inspect proof receipts and approve or reject submissions. |
| `app/(dashboard)/admin/announcements/page.tsx` | Super Admin | Announcements management panel to publish, toggle, or delete news items. |
| `app/(dashboard)/admin/audit-log/page.tsx` | Super Admin | System-wide audit logging dashboard displaying administrative actions and parameters. |

---

## 2. Server Actions Inventory

### `app/(dashboard)/admin/actions.ts`
- `createEventAction`: Validates event metadata, fees, deadlines, and creates an `Event` record.
- `updateEventAction`: Updates an existing `Event` record in Prisma with validated form input.
- `deleteEventAction`: Deletes an `Event` if no teams or registrations exist, and writes an `AuditLog`.
- `createUniversityAction`: Adds a new `University` record (name and optional city).
- `deleteUniversityAction`: Deletes a `University` if no ambassadors or teams are linked, and writes an `AuditLog`.
- `createAnnouncementAction`: Creates an `Announcement` draft or published post.
- `togglePublishAnnouncementAction`: Toggles `isPublished` status and manages `publishedAt` timestamp.
- `deleteAnnouncementAction`: Deletes an `Announcement` record and writes an `AuditLog`.
- `createAmbassadorAction`: Legacy provisioning action creating Supabase Auth user and DB records.
- `deleteAmbassadorAction`: Deletes an `Ambassador` and associated `User` if no teams exist.
- `approveAmbassadorRequestAction`: Promotes a `Participant` user role to `AMBASSADOR`, creates `Ambassador` row, links `University`, and updates request status to `APPROVED`.
- `rejectAmbassadorRequestAction`: Marks an `AmbassadorRequest` status as `REJECTED`.
- `verifyPaymentAction`: Marks a `Payment` as `VERIFIED`, sets `Invoice` to `PAID`, `Registration` to `CONFIRMED`, and auto-generates a valid `Ticket`.
- `rejectPaymentAction`: Marks a `Payment` as `REJECTED` and resets `Registration` status to `INVOICED`.

### `app/(dashboard)/ambassador/actions.ts`
- `registerParticipantAction`: Verifies ambassador authority, ensures target email belongs to an existing `Participant`, registers them for an individual event, and creates an `Invoice`.
- `registerTeamAction`: Validates event team sizes, ensures all captain and member emails exist as registered `Participant` accounts, checks for schedule conflicts, creates `Team` and `TeamMember` rows, creates `Registration`, and generates an `Invoice`.

### `app/(dashboard)/fdo/actions.ts`
- `checkInTicketAction`: Validates ticket code, ensures event deadline has not passed, verifies ticket is not already `USED` or `INVALID`, and updates ticket status to `USED`.

### `app/(dashboard)/participant/actions.ts`
- `requestAmbassadorAction`: Creates a pending `AmbassadorRequest` for the logged-in participant.
- `submitPaymentAction`: Submits payment details (method, reference number, proof URL) against an unpaid `Invoice`.
- `cancelRegistrationAction`: Deletes a pending `Registration` and linked unpaid `Invoice`.

### `app/(auth)/actions.ts`
- `signUpAction`: Creates a Supabase Auth identity (role `PARTICIPANT`) and creates matching `User` and `Participant` DB rows.
- `signInAction`: Authenticates credentials via Supabase Auth and redirects to the role home (`/admin`, `/fdo`, `/ambassador`, or `/participant`).
- `forgotPasswordAction`: Sends a password reset email via Supabase Auth.
- `resetPasswordAction`: Updates user password for the current session via Supabase Auth.

---

## 3. Database Schema Overview (`prisma/schema.prisma`)

1. **`User`**: Core identity table sharing identical UUID string `id` with Supabase Auth (`auth.users.id`). Roles: `SUPER_ADMIN`, `FDO`, `AMBASSADOR`, `PARTICIPANT`.
2. **`University`**: Represents higher education institutions linked to campus ambassadors and teams.
3. **`Ambassador`**: Campus ambassador profile linked to a `User` and a `University`, holding a unique `ambassadorCode`.
4. **`FDO`**: Front Desk Officer profile linked to `User` with optional JSON scope configuration.
5. **`Participant`**: Participant profile storing `fullName`, unique `email`, `phone`, and `cnic`.
6. **`AmbassadorRequest`**: Tracks participant requests for ambassador status (`PENDING`, `APPROVED`, `REJECTED`) with optional reviewer reference.
7. **`Team`**: Group entity for team competitions, referencing captain `Participant`, `Event`, `University`, and registering `Ambassador`.
8. **`TeamMember`**: Many-to-many junction table linking `Team` to member `Participant` records.
9. **`Event`**: Competition event storing rules, fees, dates, status (`DRAFT`, `OPEN`, `CLOSED`, `COMPLETED`, `CANCELLED`), and registration type (`INDIVIDUAL`, `TEAM`, `BOTH`).
10. **`Registration`**: Event registration entry linking an `Event` to either a `Participant` or `Team`, tracked by registering `Ambassador` (`ambassadorId`).
11. **`Invoice`**: Auto-generated financial invoice for a `Registration` with unique `invoiceNumber` and status (`PENDING`, `PAID`, `CANCELLED`).
12. **`Payment`**: Payment submission record holding method, reference number, proof URL, and verification status (`SUBMITTED`, `VERIFIED`, `REJECTED`).
13. **`Ticket`**: Event access ticket with unique `ticketCode`, `qrData`, and check-in status (`VALID`, `USED`, `INVALID`).
14. **`Announcement`**: System announcement post with title, body, and published flag.
15. **`AuditLog`**: System audit log tracking administrative table modifications.

---

## 4. Key Architectural Safeguards & Security Rules

1. **Ambassador-Only Registration Ownership**:
   - Participants cannot register themselves for events on public event pages or server actions.
   - All registrations are executed by authorized Ambassadors via `app/(dashboard)/ambassador/actions.ts`.
   - Every `Registration` record captures the processing `ambassadorId`.
2. **Existing Account Requirement**:
   - Ambassadors cannot register unknown emails. Every registered participant or team member must already possess an active KISHWAR participant account.
3. **Role Promotion & Ambassador Provisioning**:
   - Super Admins review requests on `/admin/ambassador-requests`. Approving a request updates the existing `User.role` to `AMBASSADOR` and creates an `Ambassador` record linked to the exact same Supabase Auth UUID without creating duplicate accounts.
4. **Automatic Ticket Issuance & FDO Check-In**:
   - Verifying a payment automatically changes registration status to `CONFIRMED` and generates a valid `Ticket`.
   - FDO officers inspect and invalidate tickets at event entry via `checkInTicketAction`, preventing duplicate check-ins or entry with expired tickets.
5. **Full Type Safety & Compilation**:
   - All TypeScript compilation (`npx tsc --noEmit`) and Prisma schema migrations (`npx prisma db push`) pass with 0 errors.
