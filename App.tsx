import React, { useState, useEffect } from 'react';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';

const App = () => {
  const [publicRankingId, setPublicRankingId] = useState<string | null>(null);

  useEffect(() => {
    // Check for Public URL (Deep Linking)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setPublicRankingId(id);
    }
  }, []);

  if (publicRankingId) {
    // SECURITY: Strictly render ONLY the PublicLayout.
    // The specific code for Admin Dashboard is not even in the React Tree.
    return <PublicLayout rankingId={publicRankingId} />;
  }

  // Otherwise, load the Admin App (which handles Login internally)
  return <AdminLayout />;
};

export default App;
