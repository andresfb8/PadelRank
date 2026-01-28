# PLAN-admin-profile-upgrade.md

> **Task:** Upgrade Admin Profile for Subscription Management
> **Status:** PLANNING
> **Assignee:** Frontend & Backend Specialist

## 1. Context & Goal
The user wants a **dedicated new module called "Mi Cuenta"** to manage profile and subscription settings.
- **Independence:** This module must NOT be part of the main Dashboard to avoid clutter. It is a separate screen.
- **Access:** Accessible by clicking the **entire top-right user area** (Name + Tag + Avatar).
- **Functionality:**
    - **User Profile:** Edit name, club name, phone.
    - **Security:** Password change.
    - **Subscription:** Display current plan, usage limits, renewal date (Stripe prep).
    - **Billing:** Payment methods and invoice history (Stripe prep).

**Design Philosophy:** "Premium Settings Hub" - separate from operational data. Clean grid layout.

**Design Philosophy:** "Premium SaaS Dashboard" - Use cards, visual progress bars, and clean typography. Avoid cluttered tables.

## 2. Technical Architecture

### 2.1 Database Schema (Preparation for Stripe)
We need to ensure the `User` object in Firestore has the necessary fields (even if manually populated for now).

```typescript
interface UserSubscription {
  planId: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  paymentMethod?: {
    brand: string; // 'visa', 'mastercard'
    last4: string;
  };
}
// Extend existing User type
```

### 2.2 New Components
- `AdminProfileView.tsx`: The main container (replaces simple modal).
- `ProfileCard.tsx`: User details form.
- `SubscriptionCard.tsx`: Plan status, usage bars (Players used / Limit).
- `PaymentMethodCard.tsx`: Display card visually.
- `BillingHistory.tsx`: Simple list of recent invoices.

## 3. Implementation Steps

### Phase 1: Structure & Routing ✅
- [x] Create `components/profile/` directory.
- [x] **Navigation Update:** Modify `AdminLayout.tsx` header so the entire user area (Name + Role Tag + Avatar) is clickable and triggers `setView('profile')`.
- [x] Refactor `AdminLayout` to render the new full-screen `AdminProfileView` when `view === 'profile'`.
- [x] Create `AdminProfileView` as a standalone full-page component (not a centered modal).

### Phase 2: Profile & Security Section ✅
- [x] Move existing profile edit logic to `ProfileCard`.
- [x] Add "Club Name" editing if not present.
- [x] Add "Change Password" button (trigger Firebase reset email flow).

### Phase 3: Subscription UI (The "Meat") ✅
- [x] Implement `SubscriptionCard`.
- [x] Visual: Add `PlanBadge` (already exists, reuse/enhance).
- [x] Visual: Add Progress Bars for:
    - Active Tournaments (e.g., 2/5).
    - Registered Players (e.g., 50/100).
- [x] Add "Manage Subscription" button (Primary Action) -> Opens placeholder/Stripe portal link in future.

### Phase 4: Billing & Payments (UI Only) ✅
- [x] Implement `PaymentMethodCard` with dummy data logic (if stripeId exists show card, else "Add Payment Method").
- [x] Implement `BillingHistory` with dummy data or empty state "No invoices yet".

### Phase 5: Mobile Responsiveness
- [ ] Ensure Grid collapses to logical single column on mobile.
- [ ] specific adjustments for bottom navigation padding.

## 4. Verification
- [ ] User can edit their name/club.
- [ ] Plan limits are accurately calculated from Firestore data.
- [ ] UI looks consistent with "Premium" directive (shadows, spacing, rounded corners).
- [ ] Mobile view is usable.
