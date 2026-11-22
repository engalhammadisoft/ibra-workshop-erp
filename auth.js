/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — المصادقة والصلاحيات
   ═══════════════════════════════════════════════════════════════ */

const Auth = {
  SESSION_KEY: 'ibra_session',

  /** تسجيل الدخول */
  login() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    if (!user || !pass) {
      errEl.textContent = '⚠️ أدخل اسم المستخدم وكلمة المرور';
      return false;
    }

    const users = DB.get('users');
    const found = users.find(u => u.username === user && u.password === pass && u.active !== false);

    if (!found) {
      errEl.textContent = '❌ بيانات الدخول غير صحيحة';
      return false;
    }

    // إنشاء جلسة
    const session = {
  userId: found.id,  // ✅ تأكد أنها found.id وليس شيئاً آخر
  username: found.username,
  fullName: found.fullName,
  role: found.role,
  loginAt: new Date().toISOString()
};
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    // تسجيل في سجل النشاط
    try {
      DB.insert('activity_log', {
        userId: found.id,
        userName: found.fullName || found.username,
        action: 'login',
        detail: 'تسجيل دخول',
        at: new Date().toISOString()
      });
    } catch (e) { console.warn(e); }

    // إخفاء شاشة الدخول
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('loginPass').value = '';

    // تشغيل التطبيق
    UI.showApp();
    return true;
  },
/** إظهار / إخفاء كلمة المرور */
togglePassword() {
  const input = document.getElementById('loginPass');
  const icon = document.getElementById('passToggleIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
  }
},
  /** تسجيل الخروج */
logout() {
  const session = this.current();
  if (!session) {
    location.reload();
    return;
  }

  // عرض نافذة تسجيل الخروج الاحترافية
  UI.openModal('🚪 تسجيل الخروج', `
    <div style="text-align:center; padding: 10px 0;">
      <div style="font-size:60px; margin-bottom:12px;">👋</div>
      <h3 style="font-size:18px; font-weight:800; margin-bottom:6px; color:var(--text);">
        هل تريد تسجيل الخروج؟
      </h3>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
        سيتم إنهاء جلستك الحالية
      </p>

      <div style="background:var(--bg); border-radius:12px; padding:14px; margin-bottom:16px; text-align:right;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          <div style="width:44px; height:44px; background:linear-gradient(135deg, #10b981, #047857); color:#fff; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">
            ${(session.fullName || session.username).charAt(0)}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px; font-weight:800;">${Utils.esc(session.fullName || session.username)}</div>
            <div style="font-size:11px; color:var(--text-muted);">@${Utils.esc(session.username)}</div>
          </div>
        </div>
        <div style="border-top:1px dashed var(--border); padding-top:8px; font-size:11px; color:var(--text-muted);">
          <div style="display:flex; justify-content:space-between; padding:3px 0;">
            <span>وقت الدخول:</span>
            <b>${Utils.date(session.loginAt, true)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; padding:3px 0;">
            <span>مدة الجلسة:</span>
            <b>${this.formatSessionDuration(session.loginAt)}</b>
          </div>
        </div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; cursor:pointer; margin-bottom:8px; text-align:right;">
        <input type="checkbox" id="logoutBackup" style="width:18px; height:18px; cursor:pointer;">
        <span style="font-size:12px; font-weight:600; color:#166534;">💾 عمل نسخة احتياطية قبل الخروج</span>
      </label>

      <p style="font-size:11px; color:var(--text-muted);">
        💡 يمكنك تسجيل الدخول مرة أخرى في أي وقت
      </p>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="UI.closeModal()" style="flex:1; padding:12px;">إلغاء</button>
    <button class="btn btn-danger" onclick="Auth.confirmLogout()" style="flex:1; padding:12px;">🚪 تسجيل الخروج</button>
  `);
},

formatSessionDuration(loginAt) {
  if (!loginAt) return '—';
  const ms = new Date() - new Date(loginAt);
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours} ساعة و ${minutes % 60} دقيقة`;
  return `${minutes} دقيقة`;
},

confirmLogout() {
  const session = this.current();
  if (!session) return;

  // عمل نسخة احتياطية إذا طلب المستخدم
  const doBackup = document.getElementById('logoutBackup')?.checked;
  if (doBackup) {
    try {
      const data = DB.exportAll();
      const filename = `IBRA-ERP-Backup-${Utils.today()}.json`;
      Utils.download(filename, JSON.stringify(data, null, 2), 'application/json');
    } catch (e) {
      console.warn('فشل النسخ الاحتياطي:', e);
    }
  }

  // تسجيل الخروج في سجل النشاط
  try {
    DB.insert('activity_log', {
      userId: session.userId,
      userName: session.fullName || session.username,
      action: 'logout',
      detail: 'تسجيل خروج' + (doBackup ? ' + نسخة احتياطية' : ''),
      at: new Date().toISOString()
    });
  } catch (e) {}

  // إغلاق النافذة
  UI.closeModal();

  // إخفاء التطبيق وإظهار شاشة الدخول
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');

  // رسالة وداع
  this.showFarewellToast(session.fullName || session.username);

  // مسح الجلسة
  localStorage.removeItem(this.SESSION_KEY);

  // مسح كلمة المرور من الذاكرة
  setTimeout(() => {
    if (window.LoginPage && typeof LoginPage.init === 'function') {
      LoginPage.init();
    } else {
      location.reload();
    }
  }, 1500);
},

showFarewellToast(name) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:20px;">👋</span>
      <div>
        <div style="font-weight:800; font-size:13px;">إلى اللقاء يا ${Utils.esc(name)}</div>
        <div style="font-size:11px; opacity:0.9;">تم تسجيل الخروج بنجاح</div>
      </div>
    </div>
  `;
  toast.className = 'toast info';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
},

  /** الجلسة الحالية */
  current() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
    } catch { return null; }
  },

  /** هل مسجل الدخول */
  isLoggedIn() {
    return !!this.current();
  },

  /** هل يملك صلاحية */
  /** هل يملك صلاحية */
can(permission) {
  const session = this.current();
  if (!session) return false;
  
  if (session.role === 'admin') return true;

  const roles = DB.get('roles') || [];
  const role = roles.find(r => r.key === session.role);
  if (!role) return false;
  
  if (role.permissions && role.permissions.includes('*')) return true;
  
  return (role.permissions || []).includes(permission);
},
  /** التحقق من صلاحية مع إظهار تنبيه */
  require(permission, label = 'هذا الإجراء') {
    if (!this.can(permission)) {
      if (window.UI && UI.toast) {
        UI.toast(`⛔ لا تملك صلاحية ${label}`, 'error');
      } else {
        alert(`⛔ لا تملك صلاحية ${label}`);
      }
      return false;
    }
    return true;
  },

  /** تغيير كلمة المرور */
  changePassword(userId, oldPass, newPass) {
    const users = DB.get('users');
    const user = users.find(u => u.id === userId);
    if (!user) return { ok: false, msg: 'المستخدم غير موجود' };
    if (user.password !== oldPass) return { ok: false, msg: 'كلمة المرور الحالية خاطئة' };
    if (newPass.length < 4) return { ok: false, msg: 'كلمة المرور قصيرة جدًا' };
    DB.update('users', userId, { password: newPass });
    return { ok: true, msg: 'تم تغيير كلمة المرور بنجاح' };
  },

  /** إضافة مستخدم */
  addUser(data) {
    if (!this.can('users.manage')) return { ok: false, msg: 'لا تملك صلاحية' };
    const users = DB.get('users');
    if (users.find(u => u.username === data.username)) {
      return { ok: false, msg: 'اسم المستخدم موجود مسبقًا' };
    }
    DB.insert('users', {
      username: data.username,
      password: data.password || '123456',
      fullName: data.fullName || data.username,
      role: data.role || 'viewer',
      active: true
    });
    return { ok: true, msg: 'تم إضافة المستخدم' };
  },

 /** إضافة دور جديد (لا تُستخدم في الواجهة مباشرة، لكن يمكن استخدامها برمجياً) */
addRole(key, name, permissions) {
  if (!this.can('users.manage')) return false;
  const roles = DB.get('roles') || [];
  if (roles.find(r => r.key === key)) return false;
  roles.push({ key, name, permissions });
  DB.set('roles', roles);
  return true;
},

/** قائمة الصلاحيات الكاملة */
ALL_PERMISSIONS: [
  { key: 'dashboard.view', label: 'الرئيسية' },
  { key: 'projects.view', label: 'عرض المشاريع' },
  { key: 'projects.manage', label: 'إدارة المشاريع' },
  { key: 'production.view', label: 'عرض التصنيع' },
  { key: 'production.manage', label: 'إدارة التصنيع' },
  { key: 'inventory.view', label: 'عرض المخزون' },
  { key: 'inventory.manage', label: 'إدارة المخزون' },
  { key: 'machines.view', label: 'عرض المكائن' },
  { key: 'machines.manage', label: 'إدارة المكائن' },
  { key: 'costing.view', label: 'عرض التكاليف' },
  { key: 'costing.manage', label: 'إدارة التكاليف' },
  { key: 'sales.view', label: 'عرض المبيعات' },
  { key: 'sales.manage', label: 'إدارة المبيعات' },
  { key: 'accounting.view', label: 'عرض المحاسبة' },
  { key: 'accounting.manage', label: 'إدارة المحاسبة' },
  { key: 'hr.view', label: 'عرض الموظفين' },
  { key: 'hr.manage', label: 'إدارة الموظفين' },
  { key: 'reports.view', label: 'عرض التقارير' },
  { key: 'settings.view', label: 'عرض الإعدادات' },
  { key: 'settings.manage', label: 'إدارة الإعدادات' },
  { key: 'users.manage', label: 'إدارة المستخدمين' },
  { key: 'backup.manage', label: 'النسخ الاحتياطي' }
]
};

console.log('✅ Auth loaded');