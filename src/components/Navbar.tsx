'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, LogIn, UserPlus, LogOut, 
  LayoutDashboard, ShieldCheck, Home, 
  Settings, Briefcase
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const stored = localStorage.getItem('user');
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Fallback fetch if localStorage lost
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
    window.dispatchEvent(new Event('storage'));
  };

  const navLinks = [
    { name: 'الرئيسية', href: '/', icon: <Home size={18} /> },
  ];

  if (user) {
    if (user.role === 'admin') {
      navLinks.push({ name: 'لوحة المدير', href: '/admin', icon: <ShieldCheck size={18} /> });
    } else {
      navLinks.push({ name: 'لوحة المهام', href: '/dashboard', icon: <LayoutDashboard size={18} /> });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 rtl" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black italic">H</div>
            <div className="hidden md:block">
              <p className="text-sm font-black text-gray-900 leading-none">محمد هاشم علي</p>
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-tighter">محاسب قانوني معتمد</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                  pathname === link.href ? 'text-blue-700' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.icon} {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-left bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{user.fullName}</p>
                    <p className="text-[10px] font-bold text-gray-400 capitalize">{user.role === 'admin' ? 'مدير القسم' : 'محاسب'}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-black uppercase">
                    {user.fullName.charAt(0)}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="تسجيل الخروج"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  href="/login" 
                  className="px-6 py-3 text-sm font-black text-gray-600 hover:text-gray-900 transition-all"
                >
                  دخول
                </Link>
                <Link 
                  href="/register" 
                  className="px-6 py-3 bg-blue-700 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg shadow-blue-100"
                >
                  انضم إلينا
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-gray-600">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-50 overflow-hidden"
          >
            <div className="p-6 space-y-4 text-right">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-end gap-3 p-4 rounded-2xl hover:bg-gray-50 font-bold"
                >
                   {link.name} {link.icon}
                </Link>
              ))}
              <hr className="border-gray-50" />
              {user ? (
                <button 
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full flex items-center justify-end gap-3 p-4 rounded-2xl text-red-500 font-bold hover:bg-red-50"
                >
                   تسجيل الخروج <LogOut size={18} />
                </button>
              ) : (
                <div className="space-y-2">
                  <Link 
                    href="/login" 
                    onClick={() => setIsOpen(false)}
                    className="block w-full p-4 rounded-2xl bg-gray-50 text-gray-900 font-bold"
                  >
                    دخول
                  </Link>
                  <Link 
                    href="/register" 
                    onClick={() => setIsOpen(false)}
                    className="block w-full p-4 rounded-2xl bg-blue-700 text-white font-bold"
                  >
                    انضم إلينا
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
