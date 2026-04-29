'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, ArrowRight, ShieldCheck, FileText, 
  Users, Building2, BarChart3, Mail, MapPin, 
  Phone, LayoutDashboard, LogIn, Info
} from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Real-time site content
    const unsubConfig = onSnapshot(doc(db, 'config', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data());
      }
    });

    // Simple user sync (AuthGuard usually handles this, but for landing CTA we check here)
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubConfig();
      unsubAuth();
    };
  }, []);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      {/* Hero Section */}
      <section id="hero" className="py-20 lg:py-40 px-6 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest">
               <ShieldCheck size={14} /> مكتب محاسبة قانوني معتمد
            </div>
            <h1 className="text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
               {data.landing?.heroTitle || 'مكتب المحاسب القانوني'}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-xl font-medium">
               {data.landing?.heroSubtitle || 'دقة متناهية.. سرعة في التنفيذ.. احترافية عالمية.'}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
               <Link id="btn-hero-cta" href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} className="bg-blue-700 text-white px-10 py-5 rounded-3xl font-black text-lg flex items-center gap-3 hover:bg-black transition-all shadow-2xl shadow-blue-100 group">
                  ابدأ الآن <ArrowRight className="group-hover:translate-x-[-8px] transition-transform" />
               </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
             <div className="aspect-square bg-gray-50 rounded-[80px] overflow-hidden border border-gray-100 relative group rotate-2">
                <img 
                  src="https://images.unsplash.com/photo-1554224155-169641357599?auto=format&fit=crop&q=80&w=1000" 
                  alt="Accounting Management" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent"></div>
             </div>
             
             <div className="absolute -bottom-10 -right-10 bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 hidden md:block">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-green-100">✓</div>
                   <div>
                      <p className="font-black text-gray-900">نظام ذكي</p>
                      <p className="text-xs text-gray-500 font-bold">إدارة تقارير فورية</p>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-20 space-y-4">
              <h2 className="text-5xl font-black text-gray-900">خدماتنا المهنية</h2>
              <p className="text-gray-500 font-bold text-lg">نقدم حزمة متكاملة من الحلول المحاسبية والضريبية المعتمدة</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {data.services?.map((service: any) => (
                <div id={`service-${service.id}`} key={service.id} className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group">
                   <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-[24px] flex items-center justify-center mb-8 group-hover:bg-blue-700 group-hover:text-white transition-all">
                      {service.id === '1' && <Building2 size={32} />}
                      {service.id === '2' && <BarChart3 size={32} />}
                      {service.id === '3' && <ShieldCheck size={32} />}
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 mb-4">{service.title}</h3>
                   <p className="text-gray-500 leading-relaxed font-bold">{service.description}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="bg-gray-900 rounded-[60px] aspect-video overflow-hidden relative shadow-2xl">
               <img src="https://images.unsplash.com/photo-1454165833772-d996d4ad559a?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover opacity-60 grayscale" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-white/20 backdrop-blur-md p-10 rounded-[40px] text-white text-center border border-white/20">
                    <Info size={48} className="mx-auto mb-4" />
                    <p className="font-black text-2xl">عن المكتب</p>
                 </div>
               </div>
            </div>
            <div className="space-y-8">
               <h2 className="text-5xl font-black text-gray-900 leading-tight">
                  {data.landing?.aboutTitle || 'عن المكتب'}
               </h2>
               <p className="text-xl text-gray-500 leading-loose font-bold">
                  {data.landing?.aboutDescription || 'نقدم مجموعة واسعة من الخدمات المحاسبية.'}
               </p>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 pb-10">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16 border-b border-white/5 pb-20">
            <div className="space-y-8">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl">م</div>
                 <span className="font-black text-2xl tracking-tight">محمد هاشم علي</span>
               </div>
               <p className="text-gray-400 font-bold leading-relaxed text-lg">خبرة تمتد لسنوات في المحاسبة القانونية والضرائب وتأسيس الشركات والمراجعة المالية.</p>
            </div>
            <div className="space-y-8">
               <h4 className="text-xl font-black border-r-4 border-blue-700 pr-4">روابط سريعة</h4>
               <ul className="space-y-4 text-gray-400 font-bold text-lg">
                  <li className="hover:text-blue-500 transition-colors"><Link href="/login">بوابة دخول الموظفين</Link></li>
                  <li className="hover:text-blue-500 transition-colors"><Link href="/register">الانضمام لطلبات التوظيف</Link></li>
               </ul>
            </div>
            <div className="space-y-8">
               <h4 className="text-xl font-black border-r-4 border-blue-700 pr-4">بيانات التواصل</h4>
               <ul className="space-y-6 text-gray-400 font-bold text-lg">
                  <li className="flex items-center gap-4"><Phone className="text-blue-500" size={24} /> +20244915165</li>
                  <li className="flex items-center gap-4"><Mail className="text-blue-500" size={24} /> hashim.moh82@gmail.com</li>
                  <li className="flex items-center gap-4"><MapPin className="text-blue-500" size={24} /> مدينة العبور - أبراج المركز العالي</li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 pt-10 flex flex-col md:flex-row justify-between items-center text-gray-500 font-bold text-sm">
            <p>© {new Date().getFullYear()} جميع الحقوق محفوظة لمكتب محمد هاشم علي للمحاسبة والقانون</p>
         </div>
      </footer>
    </div>
  );
}
