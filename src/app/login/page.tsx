'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, ShieldCheck, ArrowRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthGuard from '@/components/AuthGuard';

import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Firebase Auth Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch User Profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.status === 'pending' && userData.role !== 'admin') {
          toast.error('حسابك قيد المراجعة من قبل الإدارة. يرجى المحاولة لاحقاً.');
          await auth.signOut();
          return;
        }

        // Save session
        localStorage.setItem('user', JSON.stringify({ id: user.uid, ...userData }));
        window.dispatchEvent(new Event('storage'));
        toast.success(`مرحباً بك، ${userData.fullName}`);
        
        if (userData.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        toast.error('لم يتم العثور على ملف المستخدم');
        await auth.signOut();
      }
    } catch (err: any) {
      toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center p-6 rtl" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[1100px] bg-white rounded-[60px] shadow-2xl flex overflow-hidden border border-gray-100"
        >
          {/* Left Side: Illustration */}
          <div className="hidden lg:flex w-1/2 bg-blue-700 p-20 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
               {[...Array(20)].map((_, i) => (
                  <div key={i} className="absolute border border-white rounded-full" style={{
                    width: Math.random() * 300,
                    height: Math.random() * 300,
                    left: Math.random() * 100 + '%',
                    top: Math.random() * 100 + '%'
                  }} />
               ))}
            </div>
            
            <div className="relative z-10">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-3xl mb-8">م</div>
               <h2 className="text-5xl font-black leading-tight">بوابة الموظفين والعمليات الرقمية</h2>
               <p className="text-xl mt-6 opacity-80 font-medium leading-relaxed">أهلاً بك في نظام الإدارة المهني لمكتب المحاسب القانوني محمد هاشم علي. يرجى الدخول لمتابعة مهامك وتقاريرك اليومية.</p>
            </div>

            <div className="relative z-10 flex items-center gap-4 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10">
               <ShieldCheck size={32} />
               <div>
                  <p className="font-black">نظام محمي بالكامل</p>
                  <p className="text-xs opacity-70">يخضع هذا النظام لسياسات الخصوصية والأمان العالمية</p>
               </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="w-full lg:w-1/2 p-10 md:p-20">
             <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 mb-4">تسجيل الدخول</h1>
                <p className="text-gray-500 font-bold">يرجى إدخال بياناتك للوصول إلى لوحة التحكم.</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-3">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">البريد الإلكتروني</label>
                   <div className="relative">
                      <input 
                        type="email" required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-14 py-6 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="example@mail.com"
                      />
                      <Mail className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">كلمة المرور</label>
                   <div className="relative">
                      <input 
                        type="password" required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-14 py-6 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                   </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-blue-700 text-white py-6 rounded-3xl font-black text-xl hover:bg-black transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-4 group"
                >
                   {loading ? 'جاري التحقق...' : (
                      <>
                        دخول للنظام <ArrowRight className="group-hover:translate-x-[-5px] transition-transform" />
                      </>
                   )}
                </button>
             </form>

             <div className="mt-12 flex items-center gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-700 shadow-sm"><User /></div>
                <p className="text-sm font-bold text-gray-500">لست موظفاً بالمكتب؟ تواصل مع الإدارة لطلب حساب جديد.</p>
             </div>
          </div>
        </motion.div>
      </div>
    </AuthGuard>
  );
}
