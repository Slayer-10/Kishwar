# PROJECT AUDIT

## 1. Full Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  SUPER_ADMIN
  FDO
  AMBASSADOR
  PARTICIPANT
}

enum RegistrationType {
  INDIVIDUAL
  TEAM
  BOTH
}

enum EventStatus {
  DRAFT
  OPEN
  CLOSED
  COMPLETED
  CANCELLED
}

enum RegistrationStatus {
  PENDING
  INVOICED
  PAID
  CONFIRMED
  REJECTED
}

enum InvoiceStatus {
  PENDING
  PAID
  CANCELLED
}

enum PaymentVerificationStatus {
  SUBMITTED
  VERIFIED
  REJECTED
}

enum TicketStatus {
  VALID
  USED
  INVALID
}

// NOTE: User.id is NOT auto-generated. It must always be set explicitly to the
// Supabase Auth user's UUID (auth.users.id), so the Prisma User row and the
// Supabase Auth identity always share the same id. See app/(auth)/actions.ts.
model User {
  id               String     @id
  email            String     @unique
  passwordHash     String?
  role             Role       @default(PARTICIPANT)
  isActive         Boolean    @default(true)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  ambassador       Ambassador?
  fdo              FDO?
  participant      Participant?
  verifiedPayments Payment[]  @relation("PaymentVerifiedBy")
  auditLogs        AuditLog[]

  @@index([role])
}

model University {
  id          String       @id @default(uuid())
  name        String       @unique
  city        String?
  createdAt   DateTime     @default(now())

  ambassadors Ambassador[]
  teams       Team[]
}

model Ambassador {
  id             String     @id @default(uuid())
  userId         String     @unique
  user           User       @relation(fields: [userId], references: [id])
  universityId   String
  university     University @relation(fields: [universityId], references: [id])
  ambassadorCode String     @unique
  assignedAt     DateTime   @default(now())

  teams          Team[]

  @@index([universityId])
}

model FDO {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  assignedScope Json?
  createdAt     DateTime @default(now())
}

model Participant {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  fullName  String
  phone     String?
  cnic      String?
  createdAt DateTime @default(now())

  captainOfTeams  Team[]         @relation("TeamCaptain")
  teamMemberships TeamMember[]
  registrations   Registration[]
}

model Team {
  id           String      @id @default(uuid())
  name         String
  captainId    String
  captain      Participant @relation("TeamCaptain", fields: [captainId], references: [id])
  universityId String?
  university   University? @relation(fields: [universityId], references: [id])
  ambassadorId String?
  ambassador   Ambassador? @relation(fields: [ambassadorId], references: [id])
  eventId      String
  event        Event       @relation(fields: [eventId], references: [id])
  createdAt    DateTime    @default(now())

  members       TeamMember[]
  registrations Registration[]

  @@index([eventId])
  @@index([universityId])
  @@index([ambassadorId])
}

model TeamMember {
  id            String      @id @default(uuid())
  teamId        String
  team          Team        @relation(fields: [teamId], references: [id])
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id])

  @@unique([teamId, participantId])
  @@index([participantId])
}

model Event {
  id               String           @id @default(uuid())
  name             String           @unique
  description      String?
  category         String?
  registrationFee  Decimal          @db.Decimal(10, 2)
  prizeMoney       Decimal?         @db.Decimal(10, 2)
  registrationType RegistrationType
  minTeamSize      Int?
  maxTeamSize      Int?
  deadline         DateTime
  eventDate        DateTime
  venue            String?
  rules            String?
  status           EventStatus      @default(DRAFT)
  createdAt        DateTime         @default(now())

  teams         Team[]
  registrations Registration[]

  @@index([status])
}

model Registration {
  id            String             @id @default(uuid())
  participantId String?
  participant   Participant?       @relation(fields: [participantId], references: [id])
  teamId        String?
  team          Team?              @relation(fields: [teamId], references: [id])
  eventId       String
  event         Event              @relation(fields: [eventId], references: [id])
  status        RegistrationStatus @default(PENDING)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  invoice Invoice?
  ticket  Ticket?

  @@index([eventId])
  @@index([status])
  @@index([participantId])
  @@index([teamId])
}

model Invoice {
  id             String        @id @default(uuid())
  registrationId String        @unique
  registration   Registration  @relation(fields: [registrationId], references: [id])
  invoiceNumber  String        @unique
  amount         Decimal       @db.Decimal(10, 2)
  status         InvoiceStatus @default(PENDING)
  createdAt      DateTime      @default(now())

  payments Payment[]
}

model Payment {
  id                 String                    @id @default(uuid())
  invoiceId          String
  invoice            Invoice                   @relation(fields: [invoiceId], references: [id])
  amount             Decimal                   @db.Decimal(10, 2)
  method             String
  referenceNumber    String?
  proofUrl           String?
  verificationStatus PaymentVerificationStatus @default(SUBMITTED)
  verifiedBy         String?
  verifier           User?                     @relation("PaymentVerifiedBy", fields: [verifiedBy], references: [id])
  createdAt          DateTime                  @default(now())

  @@index([invoiceId])
  @@index([verificationStatus])
}

model Ticket {
  id             String       @id @default(uuid())
  registrationId String       @unique
  registration   Registration @relation(fields: [registrationId], references: [id])
  ticketCode     String       @unique
  qrData         String
  status         TicketStatus @default(VALID)
  createdAt      DateTime     @default(now())
}

model Announcement {
  id          String    @id @default(uuid())
  title       String
  body        String
  isPublished Boolean   @default(false)
  createdAt   DateTime  @default(now())
  publishedAt DateTime?

  @@index([isPublished])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String
  targetTable String
  targetId    String
  timestamp   DateTime @default(now())
  details     Json?

  @@index([userId])
  @@index([targetTable, targetId])
}
```

## 2. Package.json

```json
{
  "name": "kishwar",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "@supabase/ssr": "^0.4.0",
    "@supabase/supabase-js": "^2.45.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.408.0",
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.5",
    "postcss": "^8",
    "prisma": "^5.18.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

## 3. App Folder Structure

```text
Folder PATH listing for volume New Volume
Volume serial number is 1AF1-24D3
A:\KISHWAR\APP
|   favicon.ico
|   globals.css
|   layout.tsx
|   
+---(auth)
|   |   actions.ts
|   |   
|   +---forgot-password
|   |       page.tsx
|   |       
|   +---login
|   |       page.tsx
|   |       
|   +---reset-password
|   |       page.tsx
|   |       
|   \---signup
|           page.tsx
|           
+---(dashboard)
|   +---admin
|   |       layout.tsx
|   |       page.tsx
|   |       
|   +---ambassador
|   |       layout.tsx
|   |       page.tsx
|   |       
|   +---fdo
|   |       layout.tsx
|   |       page.tsx
|   |       
|   \---participant
|           layout.tsx
|           page.tsx
|           
\---(public)
        page.tsx
```

## 4. Components Folder Structure

```text
Folder PATH listing for volume New Volume
Volume serial number is 1AF1-24D3
A:\KISHWAR\COMPONENTS
\---dashboard
        dashboard-shell.tsx
```

## 5. Lib Folder Structure

```text
Folder PATH listing for volume New Volume
Volume serial number is 1AF1-24D3
A:\KISHWAR\LIB
|   auth.ts
|   prisma.ts
|   utils.ts
|   
\---supabase
        client.ts
        middleware.ts
        server.ts
```

## 6. Lib Contents — Supabase Client

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## 7. Lib Contents — Supabase Server

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render; safe to ignore because
            // middleware.ts refreshes the session on every request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}
```

## 8. Lib Contents — Prisma Client

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## 9. Middleware

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/admin', '/fdo', '/ambassador', '/participant'];

// This middleware only checks that a session exists and refreshes it.
// It does NOT check role — Prisma cannot run in the Edge runtime that
// middleware executes in. Role checks happen in each dashboard's layout.tsx
// (server component, Node runtime) via getCurrentUser().
export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!isProtected) return response;

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/fdo/:path*', '/ambassador/:path*', '/participant/:path*'],
};
```

## 10. Auth Actions

```typescript
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  FDO: '/fdo',
  AMBASSADOR: '/ambassador',
  PARTICIPANT: '/participant',
};

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullName = String(formData.get('fullName'));

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    return { error: error?.message ?? 'Sign up failed' };
  }

  await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      role: 'PARTICIPANT',
    },
  });

  await prisma.participant.create({
    data: {
      userId: data.user.id,
      fullName,
    },
  });

  redirect('/login');
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const dbUser = await prisma.user.findUnique({ where: { email } });
  redirect(ROLE_HOME[dbUser?.role ?? 'PARTICIPANT']);
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get('email'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get('password'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect('/login');
}
```

## 11. Root Layout

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KISHWAR',
  description: 'FAST-NUCES Multan Mega Event Registration & Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## 12. Dashboard Layouts

### app\(dashboard)\admin\layout.tsx

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'Events', href: '/admin' },
  { label: 'Universities', href: '/admin/universities' },
  { label: 'Ambassadors', href: '/admin/ambassadors' },
  { label: 'Registrations', href: '/admin/registrations' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Announcements', href: '/admin/announcements' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'SUPER_ADMIN') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
```

### app\(dashboard)\fdo\layout.tsx

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'Assigned Events', href: '/fdo' },
  { label: 'Registrations', href: '/fdo/registrations' },
  { label: 'Payments', href: '/fdo/payments' },
];

export default async function FdoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'FDO') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
```

### app\(dashboard)\ambassador\layout.tsx

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'My Teams', href: '/ambassador' },
  { label: 'Participants', href: '/ambassador/participants' },
];

export default async function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'AMBASSADOR') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
```

### app\(dashboard)\participant\layout.tsx

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const NAV_ITEMS = [
  { label: 'My Registrations', href: '/participant' },
  { label: 'Invoices & Payments', href: '/participant/payments' },
  { label: 'My Tickets', href: '/participant/tickets' },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'PARTICIPANT') redirect('/login');

  return (
    <DashboardShell navItems={NAV_ITEMS} userName={user.email} userRole={user.role}>
      {children}
    </DashboardShell>
  );
}
```

## 13. Environment Variable Names Only (NOT values)

```text
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
