# Nexus Network – PRD

## Original Problem Statement
Build a Polish landing page to sell Garry's Mod hosting, addons, and maps under
the brand "Nexus Network". Color scheme: purple/red shades. Sections: Hero with
brand name visible at startup, three categories (Hosting / Addony / Mapy),
pricing packages at the bottom with Stripe redirect. Everything in Polish.

## User Choices
- Scope: Landing page + Stripe checkout + Admin panel
- Style: Energetic gaming (neon dark, purple/red, glass cards)
- Sections: Hero, Features, 3 categories, Packages, Reviews, FAQ, Contact, Footer
- Currency: PLN, Stripe test mode
- Hosting packages provided by user (Basic / Normal / Pro / VIP, -50% promo on first three)
- Admin auth: JWT (`admin@nexusnetwork.pl` / `Admin123!`, seeded on startup)

## Architecture
- **Frontend:** React 19 + react-router-dom v7 + Tailwind + shadcn/ui + framer-motion + sonner toasts
- **Backend:** FastAPI + Motor (MongoDB) + emergentintegrations Stripe + PyJWT + bcrypt
- **Routes (frontend):** `/`, `/platnosc/sukces`, `/platnosc/anulowane`, `/admin/login`, `/admin`
- **API (all `/api` prefix):**
  - Public: `GET /packages`, `GET /packages/{id}`, `POST /checkout/create`,
    `GET /checkout/status/{session_id}`, `POST /webhook/stripe`, `POST /contact`
  - Admin (JWT): `POST /admin/login`, `GET /admin/me`,
    `POST/PUT/DELETE /admin/packages`, `GET /admin/transactions`, `GET /admin/contacts`

## Implemented (Dec 2025)
- Hero with prominent "NEXUS NETWORK" gradient title and live metrics
- Features grid (8 cards: Anti-DDoS, DDR5+NVMe, 24/7 PL support, CPU, backups, etc.)
- Three categories sections (hosting/addons/maps) with 3D imagery + alternating layout
- Packages section with tabs (hosting/addons/maps), -50% promo badges, featured highlight,
  Buy dialog → Stripe Checkout redirect (PLN test mode)
- Testimonials, FAQ accordion, Contact form (persists to MongoDB)
- Polish footer with social/legal links
- Stripe Checkout integration (server-side amount, polling with graceful DB fallback)
- Admin panel: secure JWT login + CRUD for packages, transaction history view
- Seeded data: 10 packages (4 hosting, 3 addons, 3 maps) + admin account

## Backlog (P1/P2)
- P1: Email confirmation after payment (Resend/SendGrid)
- P1: Customer dashboard to download server credentials and manage subscriptions
- P2: Stripe Subscriptions (recurring monthly) instead of one-time
- P2: Multi-language (EN) toggle
- P2: Affiliate / referral codes
- P2: Server provisioning automation (Pterodactyl integration) on `paid` webhook

## Next Actions
- Plug a real Stripe live key in `STRIPE_API_KEY` for production
- Connect to real email service to deliver server credentials post-payment
- Add domain + DNS + SSL when going live
