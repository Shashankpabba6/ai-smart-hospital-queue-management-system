# AI Smart Hospital Queue Management System

A full-stack hospital queue management system designed to improve patient flow
and help doctors manage their queues efficiently.

## Overview

The system manages the complete patient-to-doctor workflow, from patient
registration and appointment booking to token generation and queue management.

Patients can receive tokens based on their priority, while doctors can view
and manage their queues through a dedicated dashboard. Administrators can
manage users and the overall system.

## Key Features

- Patient registration and appointment booking
- Token generation and queue management
- Patient prioritization based on severity
- Doctor queue management
- Separate patient, doctor, and admin dashboards
- Real-time queue status updates
- Secure authentication and role-based access

## Tech Stack

- Next.js
- TypeScript
- React
- Supabase
- Tailwind CSS

## How It Works

1. Patient registers and books an appointment.
2. The system generates a token and assigns a priority.
3. Patients are organized in the doctor's queue based on priority.
4. Doctors can view and manage their current queue.
5. Administrators can manage users and system operations.

## Project Structure

The project is organized into separate components for authentication,
patient management, doctor workflows, queue management, and administration.

## Database setup (Supabase)

1. Create a Supabase project and copy `.env.example` to `.env.local` with your project URL
   (`https://<ref>.supabase.co`, no `/rest/v1`), publishable key and secret key.
2. In the Supabase **SQL Editor**, run `supabase/schema.sql`, then `supabase/002_supabase_auth.sql`,
   then `supabase/003_block_admin_signup.sql`.
3. Login uses **Supabase Auth**: passwords are stored only as bcrypt hashes. For local testing you can turn off
   *Authentication → Sign In / Providers → Email → Confirm email*; otherwise new users confirm via email first.
4. Sign-up only creates patients and doctors. To make an admin, register normally, then run in the SQL Editor:
   `update public.users set role = 'admin' where email = 'you@example.com';`

## Getting Started

```bash
npm install
npm run dev
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [localhost] with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
