import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

const defaultData = {
  landing: {
    heroTitle: 'مكتب المحاسب القانوني المعتمد',
    heroSubtitle: 'دقة متناهية.. سرعة في التنفيذ.. احترافية عالمية في معالجة بياناتك المالية.',
    aboutTitle: 'عن مكتبنا المحاسبي',
    aboutDescription: 'نحن نؤمن بأن المحاسبة ليست مجرد أرقام، بل هي لغة الأعمال. نقدم حلولاً ذكية للأفراد والشركات لضمان الاستقرار المالي والنمو المستدام.',
  },
  services: [
    { id: '1', title: 'شهادات الدخل', description: 'إصدار شهادات دخل رسمية معتمدة لتقديمها للجهات المعنية.' },
    { id: '2', title: 'التخطيط المالي', description: 'مساعدة الشركات في بناء استراتيجيات مالية متوسطة وبعيدة المدى.' },
    { id: '3', title: 'التدقيق والضريبة', description: 'مراجعة الحسابات وتقديم الإقرارات الضريبية وفقاً للقوانين السارية.' }
  ],
  reports: [],
  tasks: [],
  users: [
    { id: '1', email: 'admin@example.com', password: 'admin', role: 'admin', fullName: 'المدير العام' }
  ],
  certificateTemplate: `نشهد نحن مكتب المحاسب القانوني الأستاذ / محمد هاشم علي - والمقيد بسجل المحاسبين والمراجعين تحت رقم 24903 ، بأن السيد / {fullName} ، ويحمل بطاقة رقم قومي / {nationalId} ، بالعنوان / {address} ، المهنة / {profession} ، بأن صافي الدخل الشهري يبلغ {salaryAmount} جنيها ({salaryLetters} مصرياً لاغير ) شهرياً ، وذلك في ضوء المستندات والإيضاحات التي قدمها لنا المذكور بعالية .`
};

function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    let data = JSON.parse(fileContent);
    // Migration: If old structure exists, map it to new structure
    if (data.landingPage && !data.landing) {
      data.landing = {
        heroTitle: data.landingPage.heroTitle,
        heroSubtitle: data.landingPage.heroSubtitle,
        aboutTitle: data.landingPage.aboutTitle,
        aboutDescription: data.landingPage.aboutDescription
      };
      data.services = data.landingPage.services || defaultData.services;
      delete data.landingPage;
    }
    // Ensure essential arrays exist
    if (!data.users) data.users = defaultData.users;
    
    // Ensure status field exists for all users
    data.users = data.users.map((u: any) => ({
      ...u,
      status: u.status || (u.role === 'admin' ? 'approved' : 'approved') // Default existing to approved
    }));

    if (!data.tasks) data.tasks = defaultData.tasks;
    if (!data.reports) data.reports = defaultData.reports;
    if (!data.services) data.services = defaultData.services;
    
    return data;
  } catch (e) {
    return defaultData;
  }
}

export async function GET() {
  try {
    const data = getData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentData = getData();
    
    // Handle specific actions
    if (body.action === 'register') {
      const exists = currentData.users.find((u: any) => u.email === body.email);
      if (exists) return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
      
      const newUser = { 
        id: Date.now().toString(), 
        email: body.email, 
        password: body.password, 
        fullName: body.fullName, 
        role: 'accountant',
        status: 'pending' // New users start as pending
      };
      
      currentData.users.push(newUser);
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true, user: newUser });
    }

    if (body.action === 'updateUserStatus') {
      const userIndex = currentData.users.findIndex((u: any) => u.id === body.userId);
      if (userIndex === -1) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
      
      if (body.status === 'deleted') {
        currentData.users.splice(userIndex, 1);
      } else {
        currentData.users[userIndex].status = body.status;
      }
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true });
    }

    if (body.action === 'changePassword') {
      const userIndex = currentData.users.findIndex((u: any) => u.id === body.userId);
      if (userIndex === -1) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
      
      if (currentData.users[userIndex].password !== body.oldPassword) {
        return NextResponse.json({ error: 'كلمة المرور القديمة غير صحيحة' }, { status: 400 });
      }
      
      currentData.users[userIndex].password = body.newPassword;
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true });
    }

    if (body.action === 'createTask') {
      if (!currentData.tasks) currentData.tasks = [];
      const newTask = {
        id: Date.now().toString(),
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        status: 'not_seen', // not_seen, seen, accepted, completed, not_completed
        attachments: body.attachments || [],
        report: null,
        logs: [
          { status: 'not_seen', timestamp: new Date().toISOString(), note: 'تم إنشاء المهمة وإسنادها' }
        ],
        createdAt: new Date().toISOString()
      };
      currentData.tasks.unshift(newTask);
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true, task: newTask });
    }

    if (body.action === 'updateTaskStatus') {
      const taskIndex = currentData.tasks.findIndex((t: any) => t.id === body.taskId);
      if (taskIndex === -1) return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
      
      const task = currentData.tasks[taskIndex];
      
      // Don't downgrade status if it's already advanced (logic guard)
      const statusOrder: Record<string, number> = {
        'not_seen': 0,
        'seen': 1,
        'accepted': 2,
        'completed': 3,
        'not_completed': 3
      };

      // Auto-marking as seen shouldn't overwrite accepted/completed
      if (body.status === 'seen' && statusOrder[task.status] >= 1) {
        return NextResponse.json({ success: true, message: 'Status already advanced' });
      }

      task.status = body.status;
      
      if (!task.logs) task.logs = [];
      task.logs.push({
        status: body.status,
        timestamp: new Date().toISOString(),
        note: body.note || ''
      });

      if (body.report) {
        task.report = {
          content: body.report.content,
          reason: body.report.reason || '',
          proofImages: body.report.proofImages || [],
          submittedAt: new Date().toISOString()
        };
      }
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true });
    }

    if (body.action === 'sendReport') {
      if (!currentData.reports) currentData.reports = [];
      const newReport = {
        id: Date.now().toString(),
        accountantName: body.accountantName,
        certCount: body.certCount,
        notes: body.notes,
        date: new Date().toLocaleDateString('ar-EG')
      };
      currentData.reports.unshift(newReport); // Newest first
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      return NextResponse.json({ success: true });
    }

    // Default update logic
    const newData = { ...currentData, ...body };
    fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
