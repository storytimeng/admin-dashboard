# Storytime Admin Dashboard

Operations console for [Storytime](https://storytime.ng) — manage users, stories, subscriptions, admins, notifications, and platform content.

## Stack

- **Next.js 16** (App Router)
- **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**
- **TipTap** rich text editor (stories, FAQs, support, terms, email HTML)
- **SWR** for data fetching, **Zustand** for auth state, **Sonner** for toasts

## Getting started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

### Environment variables

| Variable                | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | Backend base URL (e.g. `https://storytime-backend-1-0.onrender.com`)             |
| `NEXT_PUBLIC_USE_PROXY` | Set to `true` in local dev to route API calls through `/api/proxy` (avoids CORS) |

### Default admin (after backend seed)

```bash
# In storytime-backend-1.0
npm run seed:super-admin
```

- Email: `info@storytime.ng`
- Password: `Password123`

## Features

| Module                     | Capabilities                                         |
| -------------------------- | ---------------------------------------------------- |
| **Dashboard**              | KPIs, user/story/content stats, subscription revenue |
| **Stories**                | Search, rich-text edit, suspend/unsuspend, delete    |
| **Genres**                 | View platform genres (read-only)                     |
| **Users**                  | Search, suspend/unsuspend, delete                    |
| **Admins**                 | List, invite, edit role, suspend, delete             |
| **Subscriptions**          | Payments, records, overview, audit trail             |
| **Notifications**          | Broadcast or single-user push/email                  |
| **Comments**               | Moderate story/episode/chapter comments              |
| **Episodes & Chapters**    | List and delete                                      |
| **Email Templates**        | Rich HTML edit, preview, delivery logs               |
| **FAQs / Support / Terms** | Full CRUD with rich text                             |

## Role-based access

- **super_admin / admin** — full access
- **marketing** — email templates only
- Other roles (developer, designer, finance) — configured in backend; extend `canAccessModule` in `src/stores/useAdminAuthStore.ts` as needed

## Project structure

```
src/
├── app/
│   ├── login/              # Admin sign-in
│   ├── (dashboard)/        # Protected routes
│   └── api/proxy/          # Dev CORS proxy
├── components/
│   ├── auth/               # Auth guard
│   ├── layout/             # Sidebar, header
│   └── shared/             # Page header, confirm dialog
├── lib/api/                # API client + admin endpoints
├── stores/                 # Zustand auth store
└── types/                  # TypeScript types
```

## Production build

```bash
npm run build
npm start
```

Deploy to Vercel or any Node host. Set `NEXT_PUBLIC_API_URL` to your production backend. Disable the proxy (`NEXT_PUBLIC_USE_PROXY=false` or omit).

## API coverage

All backend admin endpoints are integrated:

| Endpoint group                                         | Status                                         |
| ------------------------------------------------------ | ---------------------------------------------- |
| `POST /admin/login`, `GET /admin/profile`              | Login + session validation                     |
| `GET/POST/PATCH/DELETE /admin`                         | Admin list, invite, edit role, suspend, delete |
| `GET/PATCH/DELETE /admin/users/*`                      | User management                                |
| `GET/PATCH/DELETE /admin/stories/*`                    | Story list, edit (rich text), suspend, delete  |
| `GET/DELETE /admin/episodes`, `/chapters`, `/comments` | Content moderation                             |
| `POST /admin/notifications`, `/bulk`                   | Notifications                                  |
| `GET /admin/reports/overview`                          | Dashboard KPIs                                 |
| `GET /admin/subscriptions/*`                           | Overview, payments, records, **audit logs**    |
| `GET/PUT/POST /admin/email-templates/*`                | List, edit, preview, **delivery logs**         |
| `GET/POST/PUT/DELETE` FAQs, support, terms             | Content CRUD (rich text)                       |
| `GET /stories/genres`                                  | Read-only genres                               |

**Not in backend yet:** genre CRUD, user detail by ID, admin story create, leaderboards, scripts console.
