'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create User Profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        fullName,
        role: 'accountant',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      toast.success('تم إنشاء الحساب بنجاح، بانتظار موافقة المدير');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'فشل إنشاء الحساب');
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
          className="w-full max-w-[1100px] bg-white rounded-[60px] shadow-2xl flex flex-row-reverse overflow-hidden border border-gray-100"
        >
          {/* Right Side: Illustration */}
          <div className="hidden lg:flex w-1/2 bg-blue-700 p-20 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
               {[...Array(15)].map((_, i) => (
                  <div key={i} className="absolute border-2 border-white/20 rounded-[40px] rotate-45" style={{
                    width: 200 + i * 50,
                    height: 200 + i * 50,
                    right: -100 + i * 20,
                    top: -100 + i * 20
                  }} />
               ))}
            </div>
            
            <div className="relative z-10">
               <h2 className="text-5xl font-black leading-tight text-right">انضم إلى فريقنا المحاسبي</h2>
               <p className="text-xl mt-6 opacity-80 font-medium leading-relaxed text-right">ابدأ رحلتك المهنية في مكتب محمد هاشم علي للمحاسبة. نوفر لك بيئة عمل رقمية متطورة لإدارة مهامك وشهادات عملائك بكل سلاسة.</p>
            </div>

            <div className="relative z-10 p-8 bg-white/10 rounded-[40px] backdrop-blur-xl border border-white/10">
               <div className="flex items-center gap-4 mb-4">
                  <ShieldCheck size={40} className="text-blue-200" />
                  <p className="text-2xl font-black">نظام إدارة ذكي</p>
               </div>
               <p className="text-sm opacity-70 font-bold leading-relaxed">بمجرد التسجيل، سيتمكن المدير العام من إسناد المهام إليك ومتابعة تقاريرك اليومية وحالة إنجازك للعمليات المحاسبية.</p>
            </div>
          </div>

          {/* Left Side: Form */}
          <div className="w-full lg:w-1/2 p-10 md:p-20">
             <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 mb-4 text-right">إنشاء حساب جديد</h1>
                <p className="text-gray-500 font-bold text-right">سجل بياناتك للانضمام إلى منصة المكتب الرقمية.</p>
             </div>

             <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-3">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2 block text-right">الاسم الكامل (الرباعي)</label>
                   <div className="relative">
                      <input 
                        type="text" required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-14 py-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right"
                        placeholder="محمد احمد محمود..."
                      />
                      <User className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2 block text-right">البريد الإلكتروني</label>
                   <div className="relative">
                      <input 
                        type="email" required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-14 py-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right"
                        placeholder="accountant@mail.com"
                      />
                      <Mail className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2 block text-right">كلمة المرور</label>
                   <div className="relative">
                      <input 
                        type="password" required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-14 py-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                   </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-blue-700 text-white py-5 rounded-3xl font-black text-xl hover:bg-black transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-4 group mt-8"
                >
                   {loading ? 'جاري إنشاء الحساب...' : (
                      <>
                        إنشاء حساب موظف <UserPlus size={24} />
                      </>
                   )}
                </button>
             </form>

             <div className="mt-12 text-center">
                <p className="text-gray-500 font-bold">
                   لديك حساب بالفعل؟ {' '}
                   <Link href="/login" className="text-blue-700 font-black hover:underline">سجل دخولك هنا</Link>
                </p>
             </div>
          </div>
        </motion.div>
      </div>
    </AuthGuard>
  );
}
