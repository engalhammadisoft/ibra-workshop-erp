/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — إدارة الموظفين (v4 - احترافي)
   ═══════════════════════════════════════════════════════════════ */

const Employees = {
  filter: 'all',
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const employees = DB.get('employees') || [];
    const payrolls = DB.get('payrolls') || [];
    const attendance = DB.get('attendance') || [];

    // إحصائيات
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const inactiveEmployees = totalEmployees - activeEmployees;
    const totalMonthlySalaries = employees.filter(e => e.status === 'active').reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

    // الحضور اليوم
    const today = Utils.today();
    const todayAttendance = attendance.filter(a => a.date === today);
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length;

    // تصفية
    let filtered = employees;
    if (this.filter === 'active') filtered = employees.filter(e => e.status === 'active');
    if (this.filter === 'inactive') filtered = employees.filter(e => e.status !== 'active');
    if (this.filter === 'admin') filtered = employees.filter(e => ['admin', 'manager'].includes(e.role));
    if (this.filter === 'worker') filtered = employees.filter(e => ['operator', 'accountant', 'viewer'].includes(e.role));

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(s) ||
        (e.username && e.username.toLowerCase().includes(s)) ||
        (e.phone && e.phone.includes(s))
      );
    }

    let html = `
      <div class="page-header">
        <h1 class="page-title">الموظفون والعمال</h1>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-ghost" onclick="Employees.printAll()">🖨️ طباعة</button>
          <button class="btn btn-primary" onclick="Employees.openForm()">➕ إضافة موظف</button>
        </div>
      </div>

      <!-- البطاقة الرئيسية -->
      <div class="emp-hero">
        <div class="emp-hero-header">
          <div class="emp-hero-title">
            <h2>فريق العمل 👥</h2>
            <p>إدارة الموظفين والرواتب والحضور</p>
          </div>
          <div class="emp-hero-icon">👨‍💼</div>
        </div>
        <div class="emp-hero-stats">
          <div class="eh-stat" onclick="Employees.setFilter('all')">
            <div class="eh-icon">👥</div>
            <div class="eh-value">${totalEmployees}</div>
            <div class="eh-label">إجمالي</div>
          </div>
          <div class="eh-stat" onclick="Employees.setFilter('active')">
            <div class="eh-icon">✅</div>
            <div class="eh-value">${activeEmployees}</div>
            <div class="eh-label">نشط</div>
          </div>
          <div class="eh-stat" onclick="Employees.setFilter('inactive')">
            <div class="eh-icon">🚫</div>
            <div class="eh-value">${inactiveEmployees}</div>
            <div class="eh-label">معطل</div>
          </div>
          <div class="eh-stat eh-stat-money">
            <div class="eh-icon">💰</div>
            <div class="eh-value" style="font-size:14px;">${Utils.money(totalMonthlySalaries)}</div>
            <div class="eh-label">الرواتب/شهر</div>
          </div>
        </div>
      </div>

      <!-- بطاقات الحضور والرواتب -->
      <div class="emp-quick-cards">
        <div class="eqc-card eqc-attendance" onclick="Employees.openAttendance()">
          <div class="eqc-icon">📋</div>
          <div class="eqc-content">
            <div class="eqc-title">حضور اليوم</div>
            <div class="eqc-value">${presentToday} حاضر • ${absentToday} غائب</div>
          </div>
          <div class="eqc-arrow">›</div>
        </div>
        <div class="eqc-card eqc-payroll" onclick="Payroll.render()">
          <div class="eqc-icon">💰</div>
          <div class="eqc-content">
            <div class="eqc-title">إدارة الرواتب</div>
            <div class="eqc-value">توليد ودفع رواتب الشهر</div>
          </div>
          <div class="eqc-arrow">›</div>
        </div>
      </div>

      <!-- فلاتر -->
      <div class="emp-filters">
        <button class="ef-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Employees.setFilter('all')">👥 الكل</button>
        <button class="ef-btn ${this.filter === 'active' ? 'active' : ''}" onclick="Employees.setFilter('active')">✅ نشط</button>
        <button class="ef-btn ${this.filter === 'inactive' ? 'active' : ''}" onclick="Employees.setFilter('inactive')">🚫 معطل</button>
        <button class="ef-btn ${this.filter === 'admin' ? 'active' : ''}" onclick="Employees.setFilter('admin')">👔 إداري</button>
        <button class="ef-btn ${this.filter === 'worker' ? 'active' : ''}" onclick="Employees.setFilter('worker')">🔧 فني</button>
      </div>

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 بحث بالاسم أو اسم المستخدم أو الهاتف..." value="${Utils.esc(this.searchTerm)}" 
          oninput="Employees.searchTerm = this.value; Employees.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <!-- قائمة الموظفين -->
      <div class="emp-grid">
        ${filtered.length ? filtered.map(emp => this.renderCard(emp, attendance, payrolls)).join('') : `
          <div class="empty-state">
            <div class="icon">👷</div>
            <p>لا يوجد موظفون مطابقون.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(emp, attendance, payrolls) {
    const isActive = emp.status === 'active';
    const initial = emp.name.charAt(0);
    const today = Utils.today();
    
    // حضور اليوم
    const todayAtt = attendance.find(a => a.employeeId === emp.id && a.date === today);
    const attendanceStatus = todayAtt ? todayAtt.status : 'not_recorded';
    
    // آخر راتب
    const lastPayroll = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    // نسبة الأداء (بناءً على الحضور)
    const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.status === 'present');
    const totalDays = attendance.filter(a => a.employeeId === emp.id).length;
    const performance = totalDays > 0 ? Math.round((empAttendance.length / totalDays) * 100) : 0;

    const roleNames = {
      admin: '👑 مدير النظام',
      manager: '👔 مدير ورشة',
      operator: '🔧 فني تشغيل',
      accountant: '📊 محاسب',
      viewer: '👁️ مشاهد'
    };

    return `
      <div class="emp-card-v4 ${isActive ? '' : 'emp-inactive'}">
        <div class="ecv4-header">
          <div class="ecv4-avatar" style="background: ${isActive ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, #94a3b8, #64748b)'};">
            ${initial}
            <div class="ecv4-status-dot ${isActive ? 'active' : ''}"></div>
          </div>
          <div class="ecv4-info">
            <div class="ecv4-name">${Utils.esc(emp.name)}</div>
            <div class="ecv4-username">@${Utils.esc(emp.username || '—')}</div>
            <div class="ecv4-badges">
              <span class="ecv4-badge ecv4-role">${roleNames[emp.role] || emp.role}</span>
              <span class="ecv4-badge ${isActive ? 'ecv4-active' : 'ecv4-inactive'}">
                ${isActive ? '✅ نشط' : '🚫 معطل'}
              </span>
            </div>
          </div>
          <div class="ecv4-attendance-indicator ecv4-att-${attendanceStatus}">
            ${attendanceStatus === 'present' ? '✅' : attendanceStatus === 'absent' ? '❌' : '⏳'}
          </div>
        </div>

        <div class="ecv4-body">
          <div class="ecv4-details">
            ${emp.phone ? `<div class="ecv4-detail"><span>📱</span><b>${Utils.esc(emp.phone)}</b></div>` : ''}
            ${emp.salary ? `<div class="ecv4-detail"><span>💰</span><b>${Utils.money(emp.salary)}</b></div>` : ''}
            <div class="ecv4-detail"><span>📅</span><b>${lastPayroll ? `آخر راتب: ${Utils.date(lastPayroll.createdAt)}` : 'لم يُصرف'}</b></div>
          </div>

          <div class="ecv4-performance">
            <div class="ecv4-performance-label">
              <span>نسبة الحضور</span>
              <b style="color:${performance >= 80 ? '#10b981' : performance >= 50 ? '#f59e0b' : '#dc2626'};">${performance}%</b>
            </div>
            <div class="ecv4-performance-bar">
              <div class="ecv4-performance-fill" style="width: ${performance}%; background: ${performance >= 80 ? '#10b981' : performance >= 50 ? '#f59e0b' : '#dc2626'};"></div>
            </div>
          </div>
        </div>

        <div class="ecv4-actions">
          <button class="ecv4-btn ecv4-att-btn" onclick="Employees.toggleAttendance('${emp.id}')">
            ${attendanceStatus === 'present' ? '❌ غياب' : '✅ حضور'}
          </button>
          <button class="ecv4-btn ecv4-print-btn" onclick="Employees.printEmployee('${emp.id}')" title="طباعة بطاقة">🖨️</button>
          <button class="ecv4-btn ecv4-edit-btn" onclick="Employees.openForm('${emp.id}')" title="تعديل">✏️</button>
          <button class="ecv4-btn ecv4-pass-btn" onclick="Employees.openPassword('${emp.id}')" title="كلمة المرور">🔑</button>
          <button class="ecv4-btn ecv4-toggle-btn" onclick="Employees.toggleStatus('${emp.id}')" title="${isActive ? 'تعطيل' : 'تفعيل'}">
            ${isActive ? '🚫' : '✅'}
          </button>
        </div>
      </div>
    `;
  },

  setFilter(f) { this.filter = f; this.render(); },

  toggleAttendance(id) {
    if (!Auth.require('hr.manage', 'إدارة الموظفين')) return;
    
    const emp = DB.find('employees', id);
    if (!emp) return;
    
    const today = Utils.today();
    const attendance = DB.get('attendance') || [];
    const existing = attendance.find(a => a.employeeId === id && a.date === today);
    
    if (existing) {
      const newStatus = existing.status === 'present' ? 'absent' : 'present';
      DB.update('attendance', existing.id, { status: newStatus });
      UI.toast(`✅ ${newStatus === 'present' ? 'تم تسجيل الحضور' : 'تم تسجيل الغياب'}`, 'success');
    } else {
      DB.insert('attendance', {
        employeeId: id,
        employeeName: emp.name,
        date: today,
        status: 'present',
        checkIn: new Date().toISOString()
      });
      UI.toast('✅ تم تسجيل الحضور', 'success');
    }
    
    this.render();
  },

  openAttendance() {
    const employees = DB.get('employees').filter(e => e.status === 'active');
    const attendance = DB.get('attendance') || [];
    const today = Utils.today();
    
    const body = `
      <div style="max-height:60vh; overflow-y:auto;">
        <div style="background:linear-gradient(135deg, #10b981, #047857); padding:14px; border-radius:10px; color:#fff; margin-bottom:14px;">
          <div style="font-weight:800; font-size:15px;">📋 حضور اليوم</div>
          <div style="font-size:12px; opacity:0.9;">${Utils.date(new Date(), true)}</div>
        </div>
        
        <div style="display:grid; gap:8px;">
          ${employees.map(emp => {
            const att = attendance.find(a => a.employeeId === emp.id && a.date === today);
            const status = att ? att.status : 'not_recorded';
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f8fafc; border-radius:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #10b981, #047857); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">
                    ${emp.name.charAt(0)}
                  </div>
                  <div>
                    <div style="font-weight:700; font-size:13px;">${Utils.esc(emp.name)}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${Utils.esc(emp.role || 'موظف')}</div>
                  </div>
                </div>
                <button onclick="Employees.toggleAttendance('${emp.id}'); UI.closeModal(); Employees.openAttendance();" 
                  style="padding:6px 14px; border-radius:8px; border:none; font-weight:700; font-size:11px; cursor:pointer; ${status === 'present' ? 'background:#dcfce7; color:#166534;' : status === 'absent' ? 'background:#fee2e2; color:#991b1b;' : 'background:#fef3c7; color:#92400e;'}">
                  ${status === 'present' ? '✅ حاضر' : status === 'absent' ? '❌ غائب' : '⏳ لم يُسجل'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    UI.openModal('📋 تسجيل الحضور اليومي', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
    `);
  },

  openForm(id = null) {
    if (!Auth.require('hr.manage', 'إدارة الموظفين')) return;
    const emp = id ? DB.find('employees', id) : null;

    const formHtml = `
      <div class="emp-form-v4">
        <div class="efv4-header">
          <div class="efv4-icon">👤</div>
          <div>
            <h2>${emp ? 'تعديل موظف' : 'موظف جديد'}</h2>
            <p>${emp ? 'تحديث بيانات الموظف' : 'إضافة عضو جديد للفريق'}</p>
          </div>
        </div>
        
        <div class="efv4-body">
          <div class="efv4-field">
            <label>الاسم الكامل *</label>
            <input type="text" id="empName" value="${emp ? Utils.esc(emp.name) : ''}" placeholder="أحمد محمد">
          </div>
          
          <div class="efv4-row">
            <div class="efv4-field">
              <label>اسم المستخدم *</label>
              <input type="text" id="empUsername" value="${emp ? Utils.esc(emp.username || '') : ''}" placeholder="username">
            </div>
            <div class="efv4-field">
              <label>كلمة المرور *</label>
              <input type="text" id="empPassword" value="${emp ? Utils.esc(emp.password || '') : ''}" placeholder="123456">
            </div>
          </div>
          
          <div class="efv4-row">
            <div class="efv4-field">
              <label>الهاتف</label>
              <input type="text" id="empPhone" value="${emp ? Utils.esc(emp.phone || '') : ''}" placeholder="7XX XXX XXX">
            </div>
            <div class="efv4-field">
              <label>الراتب</label>
              <input type="number" id="empSalary" value="${emp ? emp.salary : 0}" placeholder="0">
            </div>
          </div>
          
          <div class="efv4-field">
            <label>الدور / الصلاحية</label>
            <select id="empRole">
              <option value="admin" ${emp && emp.role === 'admin' ? 'selected' : ''}>👑 مدير النظام (كل الصلاحيات)</option>
              <option value="manager" ${emp && emp.role === 'manager' ? 'selected' : ''}>👔 مدير ورشة</option>
              <option value="operator" ${emp && emp.role === 'operator' ? 'selected' : ''}>🔧 فني تشغيل</option>
              <option value="accountant" ${emp && emp.role === 'accountant' ? 'selected' : ''}>📊 محاسب</option>
              <option value="viewer" ${emp && emp.role === 'viewer' ? 'selected' : ''}>👁️ مشاهد فقط</option>
            </select>
          </div>
        </div>
        
        <div class="efv4-actions">
          <button class="efv4-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="efv4-btn save" onclick="Employees.save('${id || ''}')">💾 حفظ</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save(id) {
    const name = document.getElementById('empName').value.trim();
    const username = document.getElementById('empUsername').value.trim();
    const password = document.getElementById('empPassword').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const salary = Number(document.getElementById('empSalary').value) || 0;
    const role = document.getElementById('empRole').value;

    if (!name || !username || !password) {
      UI.toast('⚠️ الاسم واسم المستخدم وكلمة المرور مطلوبة', 'error');
      return;
    }

    const existing = DB.get('employees').find(e => e.username === username && e.id !== id);
    if (existing) { UI.toast('⚠️ اسم المستخدم موجود مسبقاً', 'error'); return; }

    const data = { name, username, password, phone, salary, role };

    if (id) {
      DB.update('employees', id, data);
      UI.toast('✅ تم التعديل', 'success');
    } else {
      data.status = 'active';
      data.createdAt = new Date().toISOString();
      DB.insert('employees', data);
      UI.toast('✅ تمت الإضافة', 'success');
    }

    UI.closeModal();
    this.render();
  },

  toggleStatus(id) {
    const emp = DB.find('employees', id);
    if (!emp) return;
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    DB.update('employees', id, { status: newStatus });
    this.render();
    UI.toast(`✅ ${newStatus === 'active' ? 'تم التفعيل' : 'تم التعطيل'}`, 'success');
  },

  openPassword(id) {
    const emp = DB.find('employees', id);
    if (!emp) return;
    const newPass = prompt(`كلمة المرور الجديدة للموظف ${emp.name}:`);
    if (newPass && newPass.length >= 4) {
      DB.update('employees', id, { password: newPass });
      UI.toast('✅ تم تغيير كلمة المرور', 'success');
    }
  },

  printEmployee(id) {
    const emp = DB.find('employees', id);
    if (!emp) return;
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';
    const payrolls = DB.get('payrolls') || [];
    const lastPayroll = payrolls.filter(p => p.employeeId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const win = window.open('', '_blank', 'width=400,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>بطاقة موظف - ${emp.name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .card { background:#fff; max-width:360px; margin:0 auto; border-radius:14px; overflow:hidden; box-shadow:0 2px 15px rgba(0,0,0,0.1); }
          .header { background:linear-gradient(135deg, #10b981, #047857); color:#fff; padding:24px; text-align:center; }
          .logo { width:50px; height:50px; margin:0 auto 8px; }
          .name { font-size:20px; font-weight:800; margin-bottom:4px; }
          .role { font-size:12px; opacity:0.9; }
          .body { padding:20px; }
          .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13px; }
          .row:last-child { border-bottom:none; }
          .label { color:#64748b; }
          .value { font-weight:700; color:#1e293b; }
          .footer { background:#f8fafc; padding:12px; text-align:center; font-size:10px; color:#94a3b8; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 18px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#10b981; color:#fff; }
          .btn-c { background:#fff; color:#333; border:1px solid #ddd; }
          @media print { body { background:#fff; padding:0; } .card { box-shadow:none; } .print-actions { display:none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="btn btn-p" onclick="window.print()">🖨️ طباعة</button>
          <button class="btn btn-c" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="card">
          <div class="header">
            ${logo ? `<img src="${logo}" class="logo">` : ''}
            <div class="name">${Utils.esc(emp.name)}</div>
            <div class="role">${Utils.esc(emp.role || 'موظف')}</div>
          </div>
          <div class="body">
            <div class="row"><span class="label">الرقم الوظيفي:</span><span class="value">${emp.id.substring(0, 8)}</span></div>
            <div class="row"><span class="label">اسم المستخدم:</span><span class="value">@${Utils.esc(emp.username || '—')}</span></div>
            <div class="row"><span class="label">الهاتف:</span><span class="value">${Utils.esc(emp.phone || '—')}</span></div>
            <div class="row"><span class="label">الراتب:</span><span class="value">${Utils.money(emp.salary || 0)}</span></div>
            <div class="row"><span class="label">آخر راتب:</span><span class="value">${lastPayroll ? Utils.date(lastPayroll.createdAt) : 'لم يُصرف'}</span></div>
            <div class="row"><span class="label">تاريخ التعيين:</span><span class="value">${Utils.date(emp.createdAt)}</span></div>
          </div>
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  printAll() {
    const employees = DB.get('employees') || [];
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>قائمة الموظفين</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:750px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { text-align:center; border-bottom:3px solid #10b981; padding-bottom:16px; margin-bottom:24px; }
          .logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
          .company-name { font-size:20px; font-weight:800; color:#10b981; }
          .title { font-size:16px; color:#1e293b; margin-top:4px; }
          .date { font-size:11px; color:#64748b; margin-top:4px; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; margin-top:20px; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#10b981; color:#fff; }
          .btn-c { background:#fff; color:#333; border:1px solid #ddd; }
          @media print { body { background:#fff; padding:0; } .page { box-shadow:none; } .print-actions { display:none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="btn btn-p" onclick="window.print()">🖨️ طباعة</button>
          <button class="btn btn-c" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="page">
          <div class="header">
            ${logo ? `<img src="${logo}" class="logo">` : ''}
            <div class="company-name">${settings.companyName || 'ورشة التصنيع'}</div>
            <div class="title">قائمة الموظفين</div>
            <div class="date">${Utils.date(new Date(), true)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>الدور</th>
                <th>الهاتف</th>
                <th>الراتب</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(e => `
                <tr>
                  <td style="font-weight:700;">${Utils.esc(e.name)}</td>
                  <td>@${Utils.esc(e.username || '—')}</td>
                  <td>${Utils.esc(e.role || '—')}</td>
                  <td>${Utils.esc(e.phone || '—')}</td>
                  <td>${Utils.money(e.salary || 0)}</td>
                  <td>${e.status === 'active' ? '✅ نشط' : '🚫 معطل'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — تقرير صادر عن IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('emp-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'emp-styles-v4';
    style.innerHTML = `
      .emp-hero {
        background: linear-gradient(135deg, #10b981 0%, #047857 100%);
        border-radius: 20px; padding: 20px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(16,185,129,0.3);
        position: relative; overflow: hidden;
      }
      .emp-hero::before {
        content: ''; position: absolute;
        top: -50px; right: -20%; width: 300px; height: 300px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .emp-hero-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: relative; z-index: 1; }
      .emp-hero-title h2 { font-size: 20px; font-weight: 800; margin: 0; }
      .emp-hero-title p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      .emp-hero-icon { font-size: 42px; opacity: 0.4; }
      
      .emp-hero-stats {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; position: relative; z-index: 1;
      }
      .eh-stat {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        padding: 10px 6px; border-radius: 12px;
        text-align: center; cursor: pointer;
        transition: all 0.2s;
      }
      .eh-stat:hover { background: rgba(255,255,255,0.25); }
      .eh-stat-money { background: rgba(255,255,255,0.25); }
      .eh-icon { font-size: 18px; margin-bottom: 2px; }
      .eh-value { font-size: 16px; font-weight: 800; }
      .eh-label { font-size: 9px; opacity: 0.9; margin-top: 2px; }
      
      /* بطاقات الحضور والرواتب */
      .emp-quick-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
      .eqc-card {
        background: #fff; border-radius: 14px; padding: 14px;
        display: flex; align-items: center; gap: 12px;
        border: 1px solid var(--border); cursor: pointer;
        transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .eqc-card:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }
      .eqc-attendance { border-right: 4px solid #10b981; }
      .eqc-payroll { border-right: 4px solid #f59e0b; }
      .eqc-icon { font-size: 28px; }
      .eqc-content { flex: 1; }
      .eqc-title { font-size: 13px; font-weight: 800; color: var(--text); }
      .eqc-value { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .eqc-arrow { font-size: 20px; color: var(--text-light); }
      
      /* الفلاتر */
      .emp-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border); overflow-x: auto;
      }
      .ef-btn {
        flex: 1; padding: 8px 10px; background: transparent; border: none;
        border-radius: 8px; font-size: 11px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .ef-btn.active { background: linear-gradient(135deg, #10b981, #047857); color: #fff; }
      
      /* شبكة الموظفين */
      .emp-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
      @media (min-width: 768px) { .emp-grid { grid-template-columns: 1fr 1fr; } }
      
      .emp-card-v4 {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.2s;
      }
      .emp-card-v4:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      .emp-inactive { opacity: 0.75; }
      
      .ecv4-header {
        padding: 14px; display: flex; gap: 12px; align-items: center;
        border-bottom: 1px solid var(--border);
        background: #f8fafc;
      }
      .ecv4-avatar {
        width: 50px; height: 50px; border-radius: 14px;
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 800;
        position: relative; flex-shrink: 0;
      }
      .ecv4-status-dot {
        position: absolute; bottom: -2px; left: -2px;
        width: 16px; height: 16px; background: #94a3b8;
        border: 3px solid #fff; border-radius: 50%;
      }
      .ecv4-status-dot.active { background: #10b981; }
      .ecv4-info { flex: 1; min-width: 0; }
      .ecv4-name { font-size: 15px; font-weight: 800; color: var(--text); }
      .ecv4-username { font-size: 11px; color: var(--text-muted); }
      .ecv4-badges { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
      .ecv4-badge {
        font-size: 9px; padding: 2px 8px; border-radius: 8px; font-weight: 700;
      }
      .ecv4-role { background: #dbeafe; color: #1e40af; }
      .ecv4-active { background: #dcfce7; color: #166534; }
      .ecv4-inactive { background: #fee2e2; color: #991b1b; }
      
      .ecv4-attendance-indicator {
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .ecv4-att-present { background: #dcfce7; }
      .ecv4-att-absent { background: #fee2e2; }
      .ecv4-att-not_recorded { background: #f1f5f9; }
      
      .ecv4-body { padding: 14px; }
      .ecv4-details { display: grid; gap: 6px; margin-bottom: 12px; }
      .ecv4-detail { display: flex; gap: 8px; font-size: 12px; }
      .ecv4-detail span { font-size: 14px; }
      .ecv4-detail b { color: var(--text); font-weight: 600; }
      
      .ecv4-performance-label {
        display: flex; justify-content: space-between;
        font-size: 11px; margin-bottom: 4px;
      }
      .ecv4-performance-label span { color: var(--text-muted); }
      .ecv4-performance-bar {
        height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;
      }
      .ecv4-performance-fill {
        height: 100%; border-radius: 3px; transition: width 1s;
      }
      
      .ecv4-actions {
        padding: 10px 14px; display: flex; gap: 4px;
        background: #f8fafc; border-top: 1px solid var(--border);
        flex-wrap: wrap;
      }
      .ecv4-btn {
        flex: 1; min-width: 36px;
        padding: 8px 6px; border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .ecv4-att-btn { background: #dcfce7; color: #166534; }
      .ecv4-print-btn { background: #dbeafe; color: #1e40af; }
      .ecv4-edit-btn { background: #fef3c7; color: #92400e; }
      .ecv4-pass-btn { background: #f3e8ff; color: #6b21a8; }
      .ecv4-toggle-btn { background: #fee2e2; color: #991b1b; }
      
      /* نموذج الموظف */
      .emp-form-v4 { background: #fff; border-radius: 20px; overflow: hidden; }
      .efv4-header {
        padding: 20px; background: linear-gradient(135deg, #10b981, #047857);
        color: #fff; display: flex; align-items: center; gap: 14px;
      }
      .efv4-icon {
        width: 50px; height: 50px; background: rgba(255,255,255,0.2);
        border-radius: 14px; display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .efv4-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .efv4-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .efv4-body { padding: 20px; display: grid; gap: 14px; }
      .efv4-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .efv4-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .efv4-field input, .efv4-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border); border-radius: 10px;
        font-size: 14px; font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .efv4-field input:focus, .efv4-field select:focus {
        border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
      }
      
      .efv4-actions {
        padding: 14px 20px; display: flex; gap: 10px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .efv4-btn {
        padding: 12px; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .efv4-btn.cancel { flex: 1; background: #fff; color: var(--text); border: 1px solid var(--border); }
      .efv4-btn.save { flex: 2; background: linear-gradient(135deg, #10b981, #047857); color: #fff; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Employees v4 loaded');