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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

## Testing locally with the mock API server

This repository includes a lightweight in-process mock API server used by the test suite so you can run
integration tests entirely offline without a real Supabase backend or running the full Next server.

How it works
- The mock server lives at `tests/mockServer.ts` and implements the subset of endpoints the tests exercise
	(upload, grant-access, get-file, get-analytics and file deletion).
- Test helpers in `tests/helpers.ts` use an in-memory mocked Supabase client (`tests/mocks/supabase.ts`) to
	create users and sessions. The helpers start the mock server on port 3000 so tests that call
	`http://localhost:3000/api/*` hit the local handlers.

Run tests

Use the project's test runner (Vitest) via the npm script. From the repository root:

```powershell
$env:NODE_ENV = 'test'; npm test
```

If you want verbose debugging for test server/auth flows, enable DEBUG:

```powershell
$env:DEBUG = 'az-genes:*'; $env:NODE_ENV = 'test'; npm test
```

Notes
- The mock server is intentionally simple and intended only for tests. It does not persist data between
	runs and is not secure—do not use it for production traffic.
- If you prefer to skip auth during tests, you can relax middleware checks in test mode; see `src/functions/edge/middleware/auth.ts`.
