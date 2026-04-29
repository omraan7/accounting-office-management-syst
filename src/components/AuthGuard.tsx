'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AuthGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'accountant' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        if (pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
          router.push('/login');
        } else {
          setAuthorized(true);
        }
      } else {
        // Authenticated, check role
        let storedUser = null;
        try {
          const userStr = localStorage.getItem('user');
          storedUser = userStr ? JSON.parse(userStr) : null;
        } catch (e) {}

        if (!storedUser || storedUser.id !== u.uid) {
           // Fetch from DB if local is missing or wrong
           const userDoc = await getDoc(doc(db, 'users', u.uid));
           if (userDoc.exists()) {
             storedUser = { id: userDoc.id, ...userDoc.data() };
             localStorage.setItem('user', JSON.stringify(storedUser));
           } else {
             // User exists in Auth but not in DB? Highly unlikely but handle it
             await auth.signOut();
             router.push('/login');
             return;
           }
        }

        // Check Role
        if (pathname === '/login' || pathname === '/register') {
          router.push(storedUser.role === 'admin' ? '/admin' : '/dashboard');
        } else if (requiredRole && storedUser.role !== requiredRole) {
          router.push(storedUser.role === 'admin' ? '/admin' : '/dashboard');
        } else {
          setAuthorized(true);
        }
      }
    });

    return () => unsub();
  }, [pathname, router, requiredRole]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
