import React, { useState, useEffect } from 'react';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { TVPage } from './pages/TVPage';

const App = () => {
  const [publicRankingId, setPublicRankingId] = useState<string | null>(null);
  const [tvRankingId, setTvRankingId] = useState<string | null>(null);

  useEffect(() => {
    // Check for Public URL (Deep Linking) or TV Mode
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const tvId = params.get('tv');

    if (tvId) {
      setTvRankingId(tvId);
    } else if (id) {
      setPublicRankingId(id);
    }
  }, []);

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
