import { lazy, Suspense } from 'react';
import BookOpeningLoader from './components/common/BookOpeningLoader';
import { useAuth } from './contexts/auth';
import Auth, { FirebaseSetup } from './pages/Auth';

const LedgerBootstrap = lazy(() => import('./components/app/LedgerBootstrap'));

export default function App() {
  const { user, loading, configured } = useAuth();

  if (!configured) return <FirebaseSetup />;
  if (loading) return <BookOpeningLoader />;
  if (!user) return <Auth />;

  return (
    <Suspense fallback={<BookOpeningLoader />}>
      <LedgerBootstrap />
    </Suspense>
  );
}
