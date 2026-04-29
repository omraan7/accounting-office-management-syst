'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, FileText, LayoutDashboard, Save, Edit, RefreshCw, 
  ClipboardList, CheckCircle, Clock, Users, Plus, Calendar, 
  AlertCircle, ChevronRight, Image as ImageIcon, LogOut, Lock, 
  Check, X, Briefcase, Info, ListTodo, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'reports' | 'tasks' | 'template' | 'landing' | 'security' | 'accountants'>('tasks');
  const [data, setData] = useState<any>({ tasks: [], reports: [], users: [], landing: {}, certificateTemplate: '' });
  const [loading, setLoading] = useState(true);
  const [accountants, setAccountants] = useState<any[]>([]);
  const [pendingAccountants, setPendingAccountants] = useState<any[]>([]);
  const router = useRouter();

  // Task Filtering state
  const [taskStatusFilter, setTaskStatusFilter] = useState('');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assigneeId: ''
  });

  const [passForm, setPassForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Real-time Tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData((prev: any) => ({ ...prev, tasks }));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    // Real-time Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccountants(users.filter((u: any) => u.role === 'accountant' && u.status === 'approved'));
      setPendingAccountants(users.filter((u: any) => u.role === 'accountant' && u.status === 'pending'));
    });

    // Real-time Reports
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData((prev: any) => ({ ...prev, reports }));
    });

    // Real-time Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        const config = doc.data();
        setData((prev: any) => ({ ...prev, ...config }));
      }
    });

    return () => {
      unsubTasks();
      unsubUsers();
      unsubReports();
      unsubConfig();
    };
  }, []);

  const handleSave = async (payload: any) => {
    try {
      await setDoc(doc(db, 'config', 'app'), payload, { merge: true });
      toast.success('تم حفظ التعديلات بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = accountants.find(u => u.id === taskForm.assigneeId);
    if (!assignee) return toast.error('يرجى اختيار محاسب');

    try {
      await addDoc(collection(db, 'tasks'), {
        ...taskForm,
        assigneeName: assignee.fullName,
        status: 'not_seen',
        createdAt: serverTimestamp(),
        logs: [
          { status: 'not_seen', timestamp: new Date().toISOString(), note: 'تم إنشاء المهمة وإسنادها' }
        ],
        report: null,
        attachments: []
      });
      toast.success('تم إسناد المهمة بنجاح');
      setTaskForm({ title: '', description: '', dueDate: '', assigneeId: '' });
    } catch (err) {
      toast.error('فشل إنشاء المهمة');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return toast.error('كلمات المرور الجديدة غير متطابقة');
    }
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, passForm.newPassword);
        toast.success('تم تغيير كلمة المرور بنجاح');
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التغيير');
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'approved' | 'deleted') => {
    try {
      if (status === 'deleted') {
        await deleteDoc(doc(db, 'users', userId));
        toast.success('تم حذف الطلب');
      } else {
        await updateDoc(doc(db, 'users', userId), { status });
        toast.success('تم قبول المحاسب بنجاح');
      }
    } catch (e) {
      toast.error('حدث خطأ');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  };

  const filteredTasks = data.tasks?.filter((t: any) => !taskStatusFilter || t.status === taskStatusFilter);

  if (loading && !data.tasks.length) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row rtl" dir="rtl">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 bg-white border-l border-gray-100 p-8 flex flex-col shadow-xl z-50">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center text-white font-black text-xl">م</div>
            <div>
              <h2 className="font-black text-gray-900 leading-none">الإدارة العليا</h2>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">مدير النظام المعتمد</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <NavItem icon={<ListTodo size={20} />} label="إدارة المهام" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
            <NavItem icon={<ClipboardList size={20} />} label="التقارير اليومية" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <NavItem icon={<Users size={20} />} label="طلبات المحاسبين" active={activeTab === 'accountants'} onClick={() => setActiveTab('accountants')} count={pendingAccountants.length} />
            <NavItem icon={<FileText size={20} />} label="قوالب الشهادات" active={activeTab === 'template'} onClick={() => setActiveTab('template')} />
            <NavItem icon={<Monitor size={20} />} label="تعديل الموقع" active={activeTab === 'landing'} onClick={() => setActiveTab('landing')} />
            <NavItem icon={<Lock size={20} />} label="الأمان والإعدادات" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          </nav>

          <button 
            onClick={handleLogout}
            className="mt-12 flex items-center gap-4 px-6 py-4 rounded-3xl font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-h-screen">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-black text-gray-900">
                {activeTab === 'tasks' && 'إدارة المهام والعمليات'}
                {activeTab === 'reports' && 'التقارير اليومية المجمعة'}
                {activeTab === 'accountants' && 'طلبات التوظيف والمحاسبين'}
                {activeTab === 'template' && 'إعدادات الشهادات الرسمية'}
                {activeTab === 'landing' && 'تخصيص الواجهة الرئيسية'}
                {activeTab === 'security' && 'الأمان والحماية'}
              </h1>
              <p className="text-gray-500 mt-2">تحكم كامل في مسار العمل والبيانات الرسمية</p>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'tasks' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="tasks" className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Create Task Sidebar */}
                <div className="xl:col-span-1 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm h-fit sticky top-0">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <Plus className="text-blue-700" /> إسناد مهمة جديدة
                  </h3>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">عنوان المهمة</label>
                      <input dir="rtl" type="text" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="مثال: مراجعة ملف ضرائب..." />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">التفاصيل</label>
                      <textarea dir="rtl" required value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold h-32 resize-none" placeholder="شرح تفصيلي للمطلوب..." />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">المحاسب المسؤول</label>
                        <select required value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none">
                          <option value="">اختر محاسباً...</option>
                          {accountants.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.fullName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">موعد التسليم</label>
                        <input type="date" required value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                      </div>
                    </div>
                    <button className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black mt-4 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100">إرسال المهمة الآن</button>
                  </form>
                </div>

                  <div className="xl:col-span-2 space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-8 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                       <select 
                          value={taskStatusFilter}
                          onChange={e => setTaskStatusFilter(e.target.value)}
                          className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl font-bold text-sm outline-none"
                       >
                          <option value="">جميع الحالات</option>
                          <option value="not_seen">لم يتم المشاهدة</option>
                          <option value="seen">تمت المشاهدة</option>
                          <option value="accepted">تم القبول</option>
                          <option value="completed">مكتمل</option>
                          <option value="not_completed">غير مكتمل</option>
                       </select>
                    </div>

                    {filteredTasks && filteredTasks.length > 0 ? filteredTasks.map((task: any) => (
                    <div key={task.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="text-right">
                          <h4 className="text-xl font-black text-gray-900 group-hover:text-blue-700 transition-colors">{task.title}</h4>
                          <p className="text-gray-500 text-sm mt-1 font-bold flex items-center gap-2">
                             المسؤول: <span className="text-blue-600 underline">{task.assigneeName}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                              task.status === 'completed' ? 'bg-green-50 text-green-600' :
                              task.status === 'accepted' ? 'bg-blue-50 text-blue-600' :
                              task.status === 'seen' ? 'bg-purple-50 text-purple-600' :
                              task.status === 'not_completed' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                           }`}>
                              {task.status === 'not_seen' && 'لم تشاهد بعد'}
                              {task.status === 'seen' && 'تمت المشاهدة'}
                              {task.status === 'accepted' && 'جاري التنفيذ'}
                              {task.status === 'completed' && 'مهمة منجزة'}
                              {task.status === 'not_completed' && 'تعذر التنفيذ'}
                           </span>
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-6 bg-gray-50 p-4 rounded-2xl text-right">{task.description}</p>
                      
                      {/* Tracking Timeline (Simple Preview) */}
                      <div className="mb-6 space-y-2">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">تتبع النشاط</p>
                         <div className="flex gap-2 overflow-x-auto pb-2">
                            {task.logs?.map((log: any, idx: number) => (
                               <div key={idx} className="flex-shrink-0 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                  <p className="text-[10px] font-black text-blue-700">{log.status === 'not_seen' ? 'إنشاء' : log.status}</p>
                                  <p className="text-[9px] font-bold text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</p>
                               </div>
                            ))}
                         </div>
                      </div>

                      {task.report && (
                         <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-6">
                            <h5 className="text-sm font-black text-blue-800 mb-2">تقرير الإنجاز:</h5>
                            <p className="text-sm text-blue-700 font-bold leading-relaxed">{task.report.content}</p>
                            {task.report.reason && (
                               <p className="text-xs text-red-600 font-black mt-2">سبب عدم الإكمال: {task.report.reason}</p>
                            )}
                         </div>
                      )}

                      <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                           <span className="flex items-center gap-1"><Calendar size={14} /> تسليم: {task.dueDate}</span>
                           <span className="flex items-center gap-1"><Clock size={14} /> {new Date(task.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center">
                       <p className="text-gray-400 font-bold">لا يوجد مهام حالية.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {data.reports && data.reports.length > 0 ? data.reports.map((report: any) => (
                  <div key={report.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-8 hover:shadow-md transition-all">
                      <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center font-black text-2xl">{report.certCount}</div>
                      <div className="flex-1 text-right">
                          <h3 className="text-xl font-black text-gray-900">{report.accountantName}</h3>
                          <p className="text-gray-500 font-bold mt-1">{report.notes || 'لا توجد ملاحظات'}</p>
                      </div>
                      <div className="text-left font-mono text-gray-400 text-sm">{report.date}</div>
                  </div>
                )) : <p className="text-center p-20 bg-white rounded-[40px] border border-dashed text-gray-400 font-bold">لا توجد تقارير.</p>}
              </motion.div>
            )}

            {activeTab === 'accountants' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Pending Requests */}
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                       <div className="flex items-center justify-between mb-8">
                          <h3 className="text-2xl font-black text-gray-900">طلبات جديدة</h3>
                          <span className="bg-blue-50 text-blue-700 px-4 py-1 rounded-full text-xs font-black">{pendingAccountants.length} طلب</span>
                       </div>
                       <div className="space-y-4">
                          {pendingAccountants.length > 0 ? pendingAccountants.map(acc => (
                             <div key={acc.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group">
                                <div className="text-right">
                                   <p className="font-black text-gray-900 group-hover:text-blue-700 transition-colors">{acc.fullName}</p>
                                   <p className="text-xs text-gray-400 font-bold mt-1">{acc.email}</p>
                                </div>
                                <div className="flex gap-2">
                                   <button onClick={() => handleUpdateUserStatus(acc.id, 'approved')} className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all"><Check size={20} /></button>
                                   <button onClick={() => handleUpdateUserStatus(acc.id, 'deleted')} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
                                </div>
                             </div>
                          )) : <p className="text-center py-10 text-gray-400 font-bold">لا توجد طلبات جديدة حالياً.</p>}
                       </div>
                    </div>

                    {/* Approved Accountants */}
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                       <h3 className="text-2xl font-black text-gray-900 mb-8">المحاسبون المعتمدون</h3>
                       <div className="space-y-4">
                          {accountants.map(acc => (
                             <div key={acc.id} className="p-6 bg-white rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div className="text-right">
                                   <p className="font-black text-gray-900">{acc.fullName}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      <p className="text-xs text-gray-400 font-bold">نشط في النظام</p>
                                   </div>
                                </div>
                                <button onClick={() => handleUpdateUserStatus(acc.id, 'deleted')} className="text-red-400 hover:text-red-600 font-bold text-xs">حذف الحساب</button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'template' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[40px] border border-gray-100">
                <h3 className="text-2xl font-black mb-8 text-right">صيغة الشهادات الرسمية</h3>
                <textarea 
                  dir="rtl"
                  value={data.certificateTemplate} 
                  onChange={(e) => setData({ ...data, certificateTemplate: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 p-8 rounded-[32px] h-64 font-bold leading-loose outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
                <button onClick={() => handleSave({ certificateTemplate: data.certificateTemplate })} className="mt-8 bg-blue-700 text-white px-10 py-5 rounded-3xl font-black">حفظ التعديلات</button>
              </motion.div>
            )}

            {activeTab === 'landing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[40px] border border-gray-100 space-y-6">
                    <h3 className="text-2xl font-black mb-4 text-right">واجهة الموقع الرئيسي</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">العنوان الرئيسي</label>
                      <input dir="rtl" type="text" value={data.landing?.heroTitle || ''} onChange={e => setData({...data, landing: {...(data.landing || {}), heroTitle: e.target.value}})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">العنوان الفرعي</label>
                      <textarea dir="rtl" value={data.landing?.heroSubtitle || ''} onChange={e => setData({...data, landing: {...(data.landing || {}), heroSubtitle: e.target.value}})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold h-32" />
                    </div>
                    <button onClick={() => handleSave({ landing: data.landing })} className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black">حفظ الموقع</button>
                 </div>
                 <div className="bg-white p-10 rounded-[40px] border border-gray-100 space-y-6">
                    <h3 className="text-2xl font-black mb-4 text-right">نبذة عن المكتب</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">العنوان</label>
                      <input dir="rtl" type="text" value={data.landing?.aboutTitle || ''} onChange={e => setData({...data, landing: {...(data.landing || {}), aboutTitle: e.target.value}})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2 mr-2 text-right">الوصف</label>
                      <textarea dir="rtl" value={data.landing?.aboutDescription || ''} onChange={e => setData({...data, landing: {...(data.landing || {}), aboutDescription: e.target.value}})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold h-48" />
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[40px] border border-gray-100 max-w-2xl mx-auto">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-4 text-right">
                   <Lock className="text-red-500" /> تغيير كلمة المرور للمدير
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-3 mr-2 uppercase tracking-widest text-right">كلمة المرور القديمة</label>
                    <input type="password" required value={passForm.oldPassword} onChange={e => setPassForm({...passForm, oldPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-red-500 font-bold" placeholder="••••••••" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-3 mr-2 uppercase tracking-widest text-right">كلمة المرور الجديدة</label>
                      <input type="password" required value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-3 mr-2 uppercase tracking-widest text-right">تأكيد كلمة المرور</label>
                      <input type="password" required value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="••••••••" />
                    </div>
                  </div>
                  <button className="w-full bg-gray-900 text-white p-6 rounded-3xl font-black hover:bg-black transition-all shadow-xl shadow-gray-100">تحديث كلمة المرور</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AuthGuard>
  );
}

function NavItem({ icon, label, active, onClick, count }: { icon: any, label: string, active: boolean, onClick: any, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-8 py-5 rounded-[24px] font-black translation-all overflow-hidden relative ${active ? 'bg-blue-700 text-white shadow-2xl shadow-blue-100 scale-105 z-10' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      {icon} <span className="flex-1 text-right">{label}</span>
      {count !== undefined && count > 0 && (
         <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${active ? 'bg-white text-blue-700' : 'bg-red-500 text-white animate-pulse'}`}>
            {count}
         </span>
      )}
      {active && <motion.div layoutId="nav-glow" className="absolute left-0 w-1.5 h-8 bg-white/40 rounded-full" />}
    </button>
  );
}
