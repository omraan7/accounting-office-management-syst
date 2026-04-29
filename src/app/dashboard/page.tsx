'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FilePlus, Send, User, CreditCard, MapPin, Briefcase, Calendar, 
  Printer, FileText, LayoutDashboard, DollarSign, PenTool, 
  ClipboardList, ListTodo, Lock, LogOut, CheckCircle2, 
  Timer, AlertTriangle, Upload, Image as ImageIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, doc, addDoc, updateDoc, 
  onSnapshot, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function AccountantDashboard() {
  const [activeTab, setActiveTab] = useState<'certificates' | 'tasks' | 'security'>('tasks');
  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    address: '',
    profession: '',
    salaryAmount: '',
    salaryLetters: '',
    addressedTo: 'بنك التعمير والاسكان فرع سوق العبور',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [reportForm, setReportForm] = useState({ certCount: '', notes: '' });
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [taskReport, setTaskReport] = useState({ content: '', reason: '', proofImages: [] as string[] });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({ tasks: [], certificateTemplate: '' });
  const [generatedCert, setGeneratedCert] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch profile from Firestore
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            const userData = { id: doc.id, ...doc.data() };
            
            // Check for approval status
            if (userData.role === 'accountant' && userData.status === 'pending') {
              toast.error('حسابك في انتظار موافقة الإدارة. يرجى مراجعة المدير.');
              auth.signOut();
              localStorage.removeItem('user');
              router.push('/login');
              return;
            }

            setCurrentUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // User deleted or not found
            auth.signOut();
            localStorage.removeItem('user');
            router.push('/login');
          }
        });

        // Real-time Tasks for this accountant
        const qTasks = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
          const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setData((prev: any) => ({ ...prev, tasks }));
        });

        // Real-time Config
        const unsubConfig = onSnapshot(doc(db, 'config', 'app'), (doc) => {
          if (doc.exists()) {
            setData((prev: any) => ({ ...prev, ...doc.data() }));
          }
        });

        return () => {
          unsubUser();
          unsubTasks();
          unsubConfig();
        };
      } else {
        router.push('/login');
      }
    });

    return () => unsubAuth();
  }, [router]);

  const handleIssueCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.certificateTemplate) return toast.error('لم يتم إعداد قالب الشهادات بعد');
    
    let finalContent = data.certificateTemplate
      .replace(/{fullName}/g, form.fullName)
      .replace(/{nationalId}/g, form.nationalId)
      .replace(/{address}/g, form.address)
      .replace(/{profession}/g, form.profession)
      .replace(/{salaryAmount}/g, form.salaryAmount)
      .replace(/{salaryLetters}/g, form.salaryLetters);

    setGeneratedCert({ ...form, content: finalContent, id: Date.now().toString() });
  };

  const handleSendDailyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        accountantName: currentUser?.fullName,
        certCount: reportForm.certCount,
        notes: reportForm.notes,
        date: new Date().toLocaleDateString('ar-EG'),
        createdAt: serverTimestamp()
      });
      toast.success('تم إرسال التقرير اليومي بنجاح');
      setShowReportModal(false);
      setReportForm({ certCount: '', notes: '' });
    } catch (err) {
      toast.error('فشل إرسال التقرير');
    }
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, status: string, note?: string, report?: any) => {
    setLoading(true);
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const updateData: any = { status };
      
      if (note) {
        // In a real app we'd use arrayUnion, but let's keep it simple for now or fetch existing first
        // Since we want real-time, we'll fetch existing logs or just update with new log
        // For simplicity, I'll use the existing logs array from state and push
        const currentTask = data.tasks.find((t: any) => t.id === taskId);
        const newLogs = [...(currentTask?.logs || []), { status, timestamp: new Date().toISOString(), note: note || '' }];
        updateData.logs = newLogs;
      }

      if (report) {
        updateData.report = {
          content: report.content,
          reason: report.reason || '',
          proofImages: report.proofImages || [],
          submittedAt: new Date().toISOString()
        };
      }

      await updateDoc(taskRef, updateData);
      if (status !== 'seen') toast.success('تم تحديث حالة المهمة بنجاح');
      setSelectedTask(null);
      setTaskReport({ content: '', reason: '', proofImages: [] });
    } catch (err) {
      toast.error('فشل تحديث الحالة');
    }
    setLoading(false);
  };

  const handleOpenTask = (task: any) => {
    setSelectedTask(task);
    if (task.status === 'not_seen') {
      updateTaskStatus(task.id, 'seen', 'المحاسب شاهد المهمة');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('كلمات المرور غير متطابقة');
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, passForm.newPassword);
        toast.success('تم تغيير كلمة المرور');
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التغيير');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  };

  const myTasks = data?.tasks || [];

  if (!currentUser || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AuthGuard requiredRole="accountant">
      <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row rtl" dir="rtl">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 bg-white border-l border-gray-100 p-8 flex flex-col shadow-xl z-50 no-print">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center text-white font-black text-xl">م</div>
            <div>
              <h2 className="font-black text-gray-900 leading-none">{currentUser.fullName}</h2>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">محاسب معتمد</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <NavItem icon={<ListTodo size={20} />} label="المهام المسندة" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
            <NavItem icon={<FilePlus size={20} />} label="إصدار شهادات" active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} />
            <NavItem icon={<Lock size={20} />} label="الأمان والخصوصية" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          </nav>

          <button 
            onClick={handleLogout}
            className="mt-12 flex items-center gap-4 px-6 py-4 rounded-3xl font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-h-screen">
          <AnimatePresence mode="wait">
            {activeTab === 'tasks' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-4xl font-black text-gray-900">المهام المطلوبة</h1>
                  <button onClick={() => setShowReportModal(true)} className="bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                    <ClipboardList size={18} /> إرسال تقرير إحصائي
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {myTasks.length > 0 ? myTasks.map((task: any) => (
                    <div key={task.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-black text-gray-900">{task.title}</h3>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          task.status === 'completed' ? 'bg-green-50 text-green-600' :
                          task.status === 'accepted' ? 'bg-blue-50 text-blue-600' :
                          task.status === 'seen' ? 'bg-purple-50 text-purple-600' :
                          task.status === 'not_completed' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {task.status === 'not_seen' ? 'جديدة' : 
                           task.status === 'seen' ? 'تمت المشاهدة' :
                           task.status === 'accepted' ? 'قيد التنفيذ' :
                           task.status === 'completed' ? 'مكتملة' : 'تعذر التنفيذ'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-6 bg-gray-50 p-6 rounded-3xl text-right">{task.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                           <span className="flex items-center gap-1"><Calendar size={14} /> آخر موعد: {task.dueDate}</span>
                        </div>
                        <div className="flex gap-2">
                           {task.status === 'not_seen' && (
                             <button onClick={() => handleOpenTask(task)} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold text-sm">فتح وتفاصيل</button>
                           )}
                           {task.status === 'seen' && (
                             <button onClick={() => updateTaskStatus(task.id, 'accepted', 'المحاسب قبل المهمة وبدأ التنفيذ')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm">قبول وبدء العمل</button>
                           )}
                           {task.status === 'accepted' && (
                             <button onClick={() => setSelectedTask(task)} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-sm">تقديم التقرير النهائي</button>
                           )}
                           {(task.status === 'completed' || task.status === 'not_completed') && (
                              <button onClick={() => setSelectedTask(task)} className="text-blue-600 font-bold text-sm underline">عرض ما تم تقديمه</button>
                           )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400">لا توجد مهام مسندة إليك حالياً.</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'certificates' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 {!generatedCert ? (
                   <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                      <h2 className="text-3xl font-black mb-8">إصدار شهادة دخل جديدة</h2>
                      <form onSubmit={handleIssueCert} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">جهة التوجيه</label>
                          <input type="text" value={form.addressedTo} onChange={e => setForm({...form, addressedTo: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">اسم العميل</label>
                          <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">الرقم القومي</label>
                          <input type="text" maxLength={14} required value={form.nationalId} onChange={e => setForm({...form, nationalId: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50 font-mono" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">الوظيفة</label>
                          <input type="text" required value={form.profession} onChange={e => setForm({...form, profession: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">الدخل الشهري (رقماً)</label>
                          <input type="number" required value={form.salaryAmount} onChange={e => setForm({...form, salaryAmount: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 mb-2 block mr-2">الدخل الشهري (حروف)</label>
                          <input type="text" required value={form.salaryLetters} onChange={e => setForm({...form, salaryLetters: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-gray-50" />
                        </div>
                        <button className="md:col-span-2 bg-blue-700 text-white p-6 rounded-3xl font-black text-xl shadow-xl shadow-blue-100">توليد الشهادة</button>
                      </form>
                   </div>
                 ) : (
                    <CertView cert={generatedCert} accountantName={currentUser.fullName} onBack={() => setGeneratedCert(null)} />
                 )}
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[40px] border border-gray-100 max-w-2xl mx-auto shadow-sm">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
                   <Lock className="text-blue-500" /> تأمين الحساب وتغيير السر
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-3 mr-2">كلمة المرور الحالية</label>
                    <input type="password" required value={passForm.oldPassword} onChange={e => setPassForm({...passForm, oldPassword: e.target.value})} className="w-full bg-gray-50 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-bold border border-gray-50" placeholder="••••••••" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-3 mr-2">كلمة السر الجديدة</label>
                      <input type="password" required value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} className="w-full bg-gray-50 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-bold border border-gray-50" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-3 mr-2">تأكيد كلمة السر</label>
                      <input type="password" required value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} className="w-full bg-gray-50 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-bold border border-gray-50" placeholder="••••••••" />
                    </div>
                  </div>
                  <button className="w-full bg-blue-700 text-white p-6 rounded-3xl font-black shadow-lg shadow-blue-100">تحديث البيانات</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Task Submission Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] shadow-2xl relative z-10 w-full max-w-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
              <div className="p-8 bg-blue-700 text-white">
                <h3 className="text-2xl font-black">
                   {selectedTask.status === 'completed' || selectedTask.status === 'not_completed' ? 'تفاصيل المهمة والتقرير' : 'تقديم تقرير المهمة'}
                </h3>
                <p className="opacity-80">
                   {selectedTask.status === 'completed' || selectedTask.status === 'not_completed' ? 'مراجعة ما تم تقديمه للإدارة' : 'أرفق ما يثبت إتمام العمل أو أذكر سبب التعذر.'}
                </p>
              </div>
              
              <div className="p-8 space-y-6">
                {(selectedTask.status === 'completed' || selectedTask.status === 'not_completed') ? (
                   <div className="space-y-6">
                      <div className="bg-gray-50 p-6 rounded-3xl">
                         <p className="text-xs font-black text-gray-400 mb-2">الوصف الأصلي للمهمة:</p>
                         <p className="font-bold text-gray-900">{selectedTask.description}</p>
                      </div>
                      {selectedTask.report && (
                         <div className="space-y-4">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                               <p className="text-xs font-black text-blue-800 mb-2">تقرير الإنجاز:</p>
                               <p className="font-bold text-blue-900 leading-relaxed">{selectedTask.report.content}</p>
                            </div>
                            {selectedTask.status === 'not_completed' && (
                               <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                                  <p className="text-xs font-black text-red-800 mb-2">سبب عدم الإكمال:</p>
                                  <p className="font-bold text-red-900 leading-relaxed">{selectedTask.report.reason}</p>
                               </div>
                            )}
                         </div>
                      )}
                      <button onClick={() => setSelectedTask(null)} className="w-full bg-gray-900 text-white p-5 rounded-3xl font-black">إغلاق</button>
                   </div>
                ) : (
                   <div className="space-y-6">
                      <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block">وصف ما تم إنجازه</label>
                        <textarea value={taskReport.content} onChange={e => setTaskReport({...taskReport, content: e.target.value})} className="w-full bg-gray-50 p-6 rounded-3xl h-32 outline-none focus:ring-2 focus:ring-blue-500 font-bold resize-none" placeholder="اكتب تقريرك هنا..." />
                      </div>
                      
                      <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                         <label className="text-xs font-black text-red-800 mb-2 block">سبب عدم الإكمال (اختياري)</label>
                         <textarea value={taskReport.reason} onChange={e => setTaskReport({...taskReport, reason: e.target.value})} className="w-full bg-white/50 p-4 rounded-2xl h-24 outline-none focus:ring-2 focus:ring-red-500 font-bold resize-none" placeholder="أذكر السبب في حال لم تكتمل المهمة..." />
                      </div>

                      <div className="flex gap-4">
                         <button onClick={() => updateTaskStatus(selectedTask.id, 'completed', 'تم إكمال المهمة ورفع التقرير', taskReport)} className="flex-1 bg-green-600 text-white p-5 rounded-3xl font-black shadow-lg shadow-green-100">إرسال كمكتملة ✅</button>
                         <button onClick={() => updateTaskStatus(selectedTask.id, 'not_completed', 'تعذر إكمال المهمة وتم ذكر السبب', taskReport)} className="flex-1 bg-red-600 text-white p-5 rounded-3xl font-black">إرسال كغير مكتملة ❌</button>
                      </div>
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] shadow-2xl relative z-10 w-full max-w-md p-8">
               <h3 className="text-2xl font-black mb-6">إحصائيات اليوم للمدير</h3>
               <form onSubmit={handleSendDailyReport} className="space-y-4">
                  <input type="number" required placeholder="عدد الشهادات المصدرة اليوم" value={reportForm.certCount} onChange={e => setReportForm({...reportForm, certCount: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold border border-gray-100" />
                  <textarea placeholder="أي ملاحظات إضافية للمدير..." value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold border border-gray-100 h-32 resize-none" />
                  <button className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black shadow-lg shadow-blue-100">إرسال التقرير</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: any }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-8 py-5 rounded-[24px] font-black transition-all overflow-hidden relative ${active ? 'bg-blue-700 text-white shadow-2xl shadow-blue-100 scale-105 z-10' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function CertView({ cert, accountantName, onBack }: { cert: any, accountantName: string, onBack: any }) {
  return (
    <div className="space-y-8 animate-fade-in print-ready">
       <div className="flex gap-4 no-print mb-10">
          <button onClick={onBack} className="bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 flex items-center gap-2">رجوع للتعديل</button>
          <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-gray-200 flex items-center gap-2">طباعة الوثيقة الرسمية</button>
       </div>
       <div id="certificate-print-area" className="bg-white p-[1.5cm] relative overflow-hidden font-serif min-h-[297mm] text-right text-gray-900 leading-relaxed shadow-xl border border-gray-100 max-w-[210mm] mx-auto">
          {/* MHA Header */}
          <div className="flex justify-between items-start mb-16">
              <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                      <div className="text-red-600 font-black text-6xl leading-none italic select-none">mha</div>
                      <div className="bg-blue-900 text-white text-[8px] font-bold px-2 py-0.5 mt-1 w-full text-center">ESTABLISHING COMPANIES</div>
                      <div className="bg-blue-900 text-white text-[8px] font-bold px-2 py-0.5 mt-0.5 w-full text-center">& FEASIBILITY STUDIES</div>
                  </div>
                  <div className="border-r-2 border-gray-200 pr-4">
                      <h2 className="text-3xl font-black text-gray-900 mb-1">محمد هاشم علي</h2>
                      <p className="text-xs font-bold text-gray-500">محاسب قانوني وخبير ضرائب تأسيس شركات ودراسة جدوى</p>
                  </div>
              </div>
              <div className="text-left font-bold pt-4"><p className="text-lg">موجهه إلى {cert.addressedTo}</p></div>
          </div>
          <div className="text-left mb-16 font-bold text-xl"><p>القاهرة في {new Date(cert.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })} م</p></div>
          <div className="text-center mb-16"><h2 className="text-4xl font-black inline-block border-b-4 border-double border-gray-900 pb-2">شـــــــــهادة بالدخـــــــــل</h2></div>
          <div className="text-[22px] leading-[2.2] text-justify mb-24 font-medium px-4">{cert.content}</div>
          <div className="text-center font-black text-2xl mb-20"><p>وهذه شهادة منا بذلك ؛؛؛؛؛</p></div>
          <div className="flex justify-between items-end mt-auto px-10">
              <div className="text-center relative">
                  <p className="font-black text-xl mb-10">مراقب الحسابات :-</p>
                  <p className="text-2xl font-black pt-4 border-t-2 border-gray-100">أ / محمد هاشم علي</p>
              </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 px-[1.5cm]">
              <div className="border-t-2 border-gray-900 pt-6 flex justify-between text-[11px] font-bold text-gray-600">
                  <div className="text-right max-w-[300px]">
                      <p>أبراج المركز العالي للتطوير العقاري قطعه 14 شقة 11</p>
                      <p>مركز المدينة إداري العبور - الحي الأول - مدينة العبور - القليوبية</p>
                  </div>
                  <div className="text-left font-mono">
                      <p>Tel.: +20244915165 | Mob.: 01060763332</p>
                      <p>E-mail: hashim.moh82@gmail.com</p>
                  </div>
              </div>
          </div>
       </div>

       <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          aside, nav, .no-print { display: none !important; }
          body { background-color: white !important; padding: 0 !important; }
          .min-h-screen { min-height: auto !important; padding-bottom: 0 !important; }
          main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          #certificate-print-area { box-shadow: none !important; border: none !important; padding: 1.5cm !important; margin: 0 auto !important; width: 210mm !important; height: 297mm !important; }
        }
      `}</style>
    </div>
  );
}
