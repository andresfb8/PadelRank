import React, { useState, useEffect } from 'react';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { TVPage } from './pages/TVPage';
import { ScreenPage } from './pages/ScreenPage';
import { CastReceiverPage } from './pages/CastReceiverPage';
import { AdminMigrationPage } from './pages/AdminMigrationPage';

import { PaymentSuccess, PaymentCancel } from './pages/PaymentStatus';

import { RegistrationFinalizer } from './components/RegistrationFinalizer';
import { PublicRegistrationPage } from './pages/PublicRegistrationPage';

// A TV's QR opens /?vincular=CODE. Remember the code before anything renders, so the admin
// layout finds it on its first render and opens Screens after logging in.
const capturePairCode = () => {
  const pairCode = new URLSearchParams(window.location.search).get('vincular');
  if (!pairCode) return;
  try { sessionStorage.setItem('rg-pair-code', pairCode); } catch { /* typed by hand instead */ }
  window.history.replaceState(null, '', window.location.pathname);
};
capturePairCode();

const App = () => {
  const [publicRankingId, setPublicRankingId] = useState<string | null>(null);
  const [tvRankingId, setTvRankingId] = useState<string | null>(null);
  const [registrationRankingId, setRegistrationRankingId] = useState<string | null>(null);
  const [isMigration, setIsMigration] = useState(false);

  useEffect(() => {
    // Check for Public URL (Deep Linking), Registration, or TV Mode
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    const id = params.get('id');
    const tvId = params.get('tv');
    const registerId = params.get('register') || params.get('inscripcion');
    const migration = params.get('migration');

    // Extract ID from pathname: /ranking/r-123 -> r-123
    const pathMatch = path.match(/^\/ranking\/(.+)$/);
    const pathId = pathMatch ? pathMatch[1] : null;

    // Extract Registration ID from pathname: /register/r-123 or /inscripcion/r-123
    const registerPathMatch = path.match(/^\/(?:register|inscripcion)\/(.+)$/);
    const registerPathId = registerPathMatch ? registerPathMatch[1] : null;

    if (migration === 'true') {
      setIsMigration(true);
    } else if (tvId) {
      setTvRankingId(tvId);
    } else if (registerId || registerPathId) {
      setRegistrationRankingId(registerId || registerPathId);
    } else if (id) {
      setPublicRankingId(id);
    } else if (pathId) {
      setPublicRankingId(pathId);
    }
  }, []);

  // Simple Routing
  const path = window.location.pathname.split('?')[0]; // Remove query params for cleaner path
  if (path === '/tv') return <ScreenPage />;
  if (new URLSearchParams(window.location.search).get('cast') === '1') return <CastReceiverPage />;
  if (path === '/onboarding/complete') return <RegistrationFinalizer />;
  if (path === '/payment/success') return <PaymentSuccess />;
  if (path === '/payment/cancel') return <PaymentCancel />;

  if (isMigration) {
    return <AdminMigrationPage />;
  }

  if (tvRankingId) {
    return <TVPage rankingId={tvRankingId} />;
  }

  if (registrationRankingId) {
    return <PublicRegistrationPage rankingId={registrationRankingId} />;
  }

  if (publicRankingId) {
    // SECURITY: Strictly render ONLY the PublicLayout.
    // The specific code for Admin Dashboard is not even in the React Tree.
    return <PublicLayout rankingId={publicRankingId} />;
  }

  // Otherwise, load the Admin App (which handles Login internally)
  return <AdminLayout />;
};

export default App;
