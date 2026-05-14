import React, { useState, useEffect } from 'react';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { TVPage } from './pages/TVPage';
import { AdminMigrationPage } from './pages/AdminMigrationPage';

import { PaymentSuccess, PaymentCancel } from './pages/PaymentStatus';

import { RegistrationFinalizer } from './components/RegistrationFinalizer';

const App = () => {
  const [publicRankingId, setPublicRankingId] = useState<string | null>(null);
  const [tvRankingId, setTvRankingId] = useState<string | null>(null);

  const [isMigration, setIsMigration] = useState(false);

  useEffect(() => {
    // Check for Public URL (Deep Linking) or TV Mode
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    const id = params.get('id');
    const tvId = params.get('tv');
    const migration = params.get('migration');

    // Extract ID from pathname: /ranking/r-123 -> r-123
    const pathMatch = path.match(/^\/ranking\/(.+)$/);
    const pathId = pathMatch ? pathMatch[1] : null;

    if (migration === 'true') {
      setIsMigration(true);
    } else if (tvId) {
      setTvRankingId(tvId);
    } else if (id) {
      setPublicRankingId(id);
    } else if (pathId) {
      setPublicRankingId(pathId);
    }
  }, []);

  // Simple Routing
  const path = window.location.pathname.split('?')[0]; // Remove query params for cleaner path
  if (path === '/onboarding/complete') return <RegistrationFinalizer />;
  if (path === '/payment/success') return <PaymentSuccess />;
  if (path === '/payment/cancel') return <PaymentCancel />;

  if (isMigration) {
    // Lazy load or import directly if needed. Using direct import for simplicity.
    // You will need to import AdminMigrationPage at the top
    return <AdminMigrationPage />;
  }

  if (tvRankingId) {
    return <TVPage rankingId={tvRankingId} />;
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
