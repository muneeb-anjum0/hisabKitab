import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebaseAuth';
import { firebaseConfigured } from '../lib/firebaseApp';

import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured || !auth) return undefined;

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      emailLogin: async (...args) => (await import('../services/authService')).emailLogin(...args),
      emailSignup: async (...args) =>
        (await import('../services/authService')).emailSignup(...args),
      googleLogin: async () => (await import('../services/authService')).googleLogin(),
      resetPassword: async (email) =>
        (await import('../services/authService')).resetPassword(email),
      changeDisplayName: async (name) =>
        (await import('../services/authService')).changeDisplayName(user, name),
      logout: async () => (await import('../services/authService')).logout(),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
