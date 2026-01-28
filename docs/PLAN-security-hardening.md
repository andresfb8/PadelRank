# PLAN-security-hardening.md

> **Task:** Security Configuration Hardening
> **Status:** PROPOSED
> **Date:** 2026-01-28

## 1. Objective
Enhance the security posture of the application by implementing missing HTTP headers and adhering to security best practices identified in the recent audit.

## 2. Implementation Strategy

### A. HTTP Security Headers (firebase.json)
*   **Target:** `firebase.json`
*   **Action:** Add a `headers` configuration for both hosting targets (`app` and `www`).
*   **Headers to Add:**
    1.  **X-Content-Type-Options: nosniff** (Prevents MIME sniffing)
    2.  **X-Frame-Options: DENY** (Prevents clickjacking)
    3.  **X-XSS-Protection: 1; mode=block** (Legacy XSS protection)
    4.  **Referrer-Policy: strict-origin-when-cross-origin** (Privacy)
    5.  **Strict-Transport-Security (HSTS):** max-age=31536000; includeSubDomains (Enforces HTTPS)
    6.  **Content-Security-Policy (CSP):** Start with a report-only or permissive policy given the third-party integrations (Firebase, Fonts, etc.) to avoid breaking the app, then tighten.

### B. Dependency Audit
*   **Target:** `package.json` / `package-lock.json`
*   **Action:** Run `npm audit fix` to resolve automatically fixable vulnerabilities in dependencies.

## 3. Verification Plan
*   [ ] **Deploy:** `npx firebase deploy`
*   [ ] **Validation:** Use browser DevTools (Network tab) or the `security_scan.py` script to confirm headers are present on the deployed URLs.
*   [ ] **Regression Test:** Verify the app and landing page still load and function correctly (no console errors blocked by CSP).

---

## 4. Next Steps
Run `/create` to apply these changes.
