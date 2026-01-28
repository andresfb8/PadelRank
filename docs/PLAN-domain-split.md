# PLAN-domain-split.md

> **Task:** Configure Domain Splitting (Landing vs App)
> **Status:** PROPOSED
> **Date:** 2026-01-28

## 1. Context & Objective
The goal is to separate the commercial landing page (`www.racketgrid.com`) from the SaaS application (`app.racketgrid.com`).
Currently, the project is a single React SPA deployed to Firebase Hosting.

**Target Architecture:**
- **`www.racketgrid.com`**: Marketing Landing Page (SEO optimized, publicly accessible).
- **`app.racketgrid.com`**: The React Application (Authenticated management dashboard).

---

## 2. Strategy Selection (Pending User Decision)

We need to decide *where* the Landing Page lives.

### Option A: Firebase Multi-Site (Monorepo)
Both sites live in this Firebase project.
- **Site 1 (`app`)**: The current React app.
- **Site 2 (`www`)**: A new minimalistic HTML/Astro/Next.js site in a `/landing` folder.
*Pros:* One bill, shared assets, atomic deploys.

### Option B: External Landing Page
Hosting the landing page on a specialized builder (Framer, Webflow, WordPress).
*Pros:* Marketing team independence, visual editors.
*Cons:* Separate hosting costs.

*(This plan assumes Option A for technical completeness, but steps 1-2 apply regardless)*

---

## 3. Implementation Steps

### Phase 1: Firebase Configuration (Infrastructure)
- [ ] **Create Hosting Sites** in Firebase Console:
    - Target `racketgrid-app` (for the dashboard)
    - Target `racketgrid-www` (for the landing)
- [ ] **Configure `.firebaserc`**:
    - Map targets to the specific site IDs.
- [ ] **Update `firebase.json`**:
    - Define dual hosting configurations.
    - `target: "app"` -> builds from `./dist` (current)
    - `target: "www"` -> builds from `./landing/dist` (new)

### Phase 2: Domain & DNS Setup
- [ ] **Firebase Console**: Add custom domains.
    - Connect `app.racketgrid.com` to the App site.
    - Connect `www.racketgrid.com` (and root `racketgrid.com`) to the Landing site.
- [ ] **DNS Provider**:
    - Add `A` records for root.
    - Add `CNAME` records for `www` and `app` as provided by Google.

### Phase 3: Coding (The Split)
- [ ] **App Updates**:
    - Update `functions/index.ts` auth redirects to point to `app.racketgrid.com`.
    - Update CORS policies if necessary.
- [ ] **Landing Page Creation**:
    - Create `/landing` directory.
    - Initialize simple landing project (or move current `index.html` there if we want a temporary placeholder).

### Phase 4: Verification
- [ ] Verify SSL propagation for both subdomains.
- [ ] Test Auth redirection (Login on `www` -> Redirect to `app`?).
- [ ] Test Deep Links.

---

## 4. Immediate Requirements from User
1. Confirm if **Option A** (Code-based Landing) or **Option B** (No-code Landing) is preferred.
2. Provide access to DNS provider (or manual entry).

