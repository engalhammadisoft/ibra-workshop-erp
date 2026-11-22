/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — أوامر التصنيع (v3)
   ═══════════════════════════════════════════════════════════════ */

const Production = {
  filter: 'all', // all, in_progress, completed

  render() {
    const content = document.getElementById('content');
    const orders = DB.get('production_orders') || [];
    const projects = DB.get('projects') || [];
    const machines = DB.get('machines') || [];

    // تصفية
    let filtered = orders;
    if (this.filter === 'in_progress') filtered = orders.filter(o => o.status === 'in_progress');
    if (this.filter === 'completed') filtered = orders.filter(o => o.status === 'completed');

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات
    const total = orders.length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const totalHours = orders.reduce((sum, o) => sum + (Number(o.totalHours) || 0), 0);

    let html = `
      <div class="page-header">
        <h1 class="page-title">أوامر التصنيع</h1>
        <button class="btn btn-primary" onclick="Production.openForm()">➕ أمر تصنيع جديد</button>
      </div>

      <!-- البطاقة العلوية -->
      <div class="prod-hero">
        <div class="ph-title">
          <h2>التصنيع 🏭</h2>
          <p>إدارة أوامر الإنتاج والمكائن</p>
        </div>
        <div class="ph-stats">
          <div class="phs-item" onclick="Production.setFilter('all')">
            <div class="phs-icon">📋</div>
            <div class="phs-value">${total}</div>
            <div class="phs-label">الكل</div>
          </div>
          <div class="phs-item" onclick="Production.setFilter('in_progress')">
            <div class="phs-icon">⚙️</div>
            <div class="phs-value">${inProgress}</div>
            <div class="phs-label">قيد التنفيذ</div>
          </div>
          <div class="phs-item" onclick="Production.setFilter('completed')">
            <div class="phs-icon">✅</div>
            <div class="phs-value">${completed}</div>
            <div class="phs-label">مكتملة</div>
          </div>
          <div class="phs-item">
            <div class="phs-icon">⏱️</div>
            <div class="phs-value">${totalHours}</div>
            <div class="phs-label">ساعة</div>
          </div>
        </div>
      </div>

      <!-- فلاتر -->
      <div class="prod-filters">
        <button class="pf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Production.setFilter('all')">الكل</button>
        <button class="pf-btn ${this.filter === 'in_progress' ? 'active' : ''}" onclick="Production.setFilter('in_progress')">⚙️ قيد التنفيذ</button>
        <button class="pf-btn ${this.filter === 'completed' ? 'active' : ''}" onclick="Production.setFilter('completed')">✅ مكتملة</button>
      </div>

      <!-- قائمة أوامر التصنيع -->
      <div class="orders-grid">
        ${filtered.length ? filtered.map(o => this.renderOrder(o, projects, machines)).join('') : `
          <div class="empty-state">
            <div class="icon">🏭</div>
            <p>لا توجد أوامر تصنيع في هذه الفئة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderOrder(o, projects, machines) {
    const proj = projects.find(p => p.id === o.projectId);
    const machine = machines.find(m => m.id === o.machineId);
    const isCompleted = o.status === 'completed';
    const color = isCompleted ? 'success' : 'warning';
    const totalCost = (Number(o.totalHours) || 0) * (machine ? Number(machine.hourlyCost) : 0);

    return `
      <div class="order-card oc-${color}">
        <div class="oc-header">
          <div class="oc-number">${o.orderNumber}</div>
          <div class="oc-status" style="background: var(--${color});">
            ${Utils.statusText(o.status)}
          </div>
        </div>
        
        <div class="oc-body">
          <div class="oc-project">
            <div class="oc-p-title">${proj ? Utils.esc(proj.productName) : 'مشروع محذوف'}</div>
            <div class="oc-p-num">${proj ? proj.projectNumber : ''}</div>
          </div>
          
          <div class="oc-machine-row">
            <div class="oc-machine-icon">⚙️</div>
            <div class="oc-machine-info">
              <div class="oc-machine-name">${machine ? Utils.esc(machine.name) : 'ماكينة محذوفة'}</div>
              <div class="oc-machine-code">${machine ? machine.code : ''}</div>
            </div>
          </div>
          
          <div class="oc-info-grid">
            <div class="oc-info-item">
              <div class="oci-label">⏱️ ساعات</div>
              <div class="oci-value">${o.totalHours} س</div>
            </div>
            <div class="oc-info-item">
              <div class="oci-label">💰 التكلفة</div>
              <div class="oci-value">${Utils.money(totalCost)}</div>
            </div>
            <div class="oc-info-item">
              <div class="oci-label">📅 التاريخ</div>
              <div class="oci-value">${Utils.date(o.createdAt)}</div>
            </div>
          </div>
          
          ${o.notes ? `<div class="oc-notes">${Utils.esc(o.notes)}</div>` : ''}
        </div>
        
        <div class="oc-footer">
          <button class="oc-btn oc-print" onclick="Production.print('${o.id}')">🖨️ طباعة</button>
          ${!isCompleted ? 
            `<button class="oc-btn oc-complete" onclick="Production.complete('${o.id}')">✅ إنهاء</button>` : 
            `<div class="oc-done">✔️ مكتمل</div>`
          }
        </div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  openForm() {
    if (!Auth.require('production.manage', 'إدارة التصنيع')) return;

    const projects = DB.get('projects') || [];
    const machines = DB.get('machines') || [];
    const employees = DB.get('employees') || [];

    const validProjects = projects.filter(p => p.status !== 'delivered' && p.status !== 'cancelled');

    if (!validProjects.length) {
      UI.toast('⚠️ لا توجد مشاريع جاهزة للتصنيع', 'warning');
      return;
    }

    if (!machines.length) {
      UI.toast('⚠️ لا توجد مكائن مسجلة', 'warning');
      return;
    }

    const formHtml = `
      <div class="prod-form">
        <div class="pf-header">
          <div class="pfh-icon">🏭</div>
          <div>
            <h2>أمر تصنيع جديد</h2>
            <p>ربط المشروع بالماكينة</p>
          </div>
        </div>
        
        <div class="pf-body">
          <div class="pff-field">
            <label>المشروع <span style="color:var(--danger);">*</span></label>
            <select id="prodProject">
              ${validProjects.map(p => `<option value="${p.id}">${p.projectNumber} - ${p.productName}</option>`).join('')}
            </select>
          </div>
          
          <div class="pff-field">
            <label>الماكينة <span style="color:var(--danger);">*</span></label>
            <select id="prodMachine">
              ${machines.map(m => `<option value="${m.id}">${m.name} (${Utils.money(m.hourlyCost)}/ساعة)</option>`).join('')}
            </select>
          </div>

          <div class="pff-row">
            <div class="pff-field">
              <label>العامل المسؤول</label>
              <select id="prodWorker">
                <option value="">-- غير محدد --</option>
                ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
              </select>
            </div>
            <div class="pff-field">
              <label>ساعات التشغيل <span style="color:var(--danger);">*</span></label>
              <input type="number" id="prodHours" value="1" min="0.1" step="0.1">
            </div>
          </div>

          <div class="pff-field">
            <label>ملاحظات التشغيل</label>
            <input type="text" id="prodNotes" placeholder="مثال: قص، لحام، ثقب...">
          </div>
        </div>
        
        <div class="pf-actions">
          <button class="pf-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="pf-btn save" onclick="Production.save()">✅ إنشاء الأمر</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save() {
    const projectId = document.getElementById('prodProject').value;
    const machineId = document.getElementById('prodMachine').value;
    const workerId = document.getElementById('prodWorker').value;
    const hours = Number(document.getElementById('prodHours').value) || 0;
    const notes = document.getElementById('prodNotes').value.trim();

    if (hours <= 0) {
      UI.toast('⚠️ يجب إدخال ساعات أكبر من صفر', 'error');
      return;
    }

    const orderNumber = Utils.docNumber('PROD');

    DB.insert('production_orders', {
      orderNumber,
      projectId,
      machineId,
      workerId: workerId || null,
      totalHours: hours,
      notes,
      status: 'in_progress',
      createdAt: new Date().toISOString()
    });

    // تحديث حالة المشروع إلى قيد التنفيذ
    const proj = DB.find('projects', projectId);
    if (proj && proj.status !== 'in_progress') {
      DB.update('projects', projectId, { status: 'in_progress' });
    }

    UI.closeModal();
    this.render();
    UI.toast('✅ تم إنشاء أمر التصنيع', 'success');
  },

  complete(id) {
    if (!Auth.require('production.manage', 'إدارة التصنيع')) return;
    if (!confirm('إنهاء أمر التصنيع؟')) return;
    DB.update('production_orders', id, { status: 'completed', completedAt: new Date().toISOString() });
    this.render();
    UI.toast('✅ تم إنهاء الأمر', 'success');
  },

  print(id) {
    const o = DB.find('production_orders', id);
    if (!o) return;
    const project = DB.find('projects', o.projectId);
    const machine = DB.find('machines', o.machineId);
    const settings = DB.getSettings();

    const totalCost = (Number(o.totalHours) || 0) * (machine ? Number(machine.hourlyCost) : 0);
    const win = window.open('', '_blank', 'width=400,height=600');

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>أمر تصنيع ${o.orderNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .order { background:#fff; max-width:400px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 2px 15px rgba(0,0,0,0.1); }
          .header { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; padding:20px; text-align:center; }
          .header h1 { font-size:18px; margin-bottom:4px; }
          .header p { font-size:12px; opacity:0.9; }
          .body { padding:20px; }
          .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:12px; }
          .row:last-child { border:none; }
          .label { color:#64748b; }
          .value { font-weight:700; color:#1e293b; }
          .big-box { background:#fef3c7; padding:14px; border-radius:8px; margin:14px 0; text-align:center; }
          .big-box .title { font-size:11px; color:#92400e; }
          .big-box .value { font-size:22px; font-weight:900; color:#d97706; }
          .footer { background:#1e293b; color:#94a3b8; padding:12px; text-align:center; font-size:10px; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 18px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#f59e0b; color:#fff; }
          .btn-c { background:#fff; color:#333; border:1px solid #ddd; }
          @media print { body { background:#fff; padding:0; } .print-actions { display:none; } .order { box-shadow:none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="btn btn-p" onclick="window.print()">🖨️ طباعة</button>
          <button class="btn btn-c" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="order">
          <div class="header">
            <h1>أمر تصنيع</h1>
            <p>${o.orderNumber}</p>
          </div>
          <div class="body">
            <div class="row"><span class="label">المشروع:</span><span class="value">${project ? project.productName : '—'}</span></div>
            <div class="row"><span class="label">الماكينة:</span><span class="value">${machine ? machine.name : '—'}</span></div>
            <div class="row"><span class="label">ساعات التشغيل:</span><span class="value">${o.totalHours} ساعة</span></div>
            <div class="row"><span class="label">التاريخ:</span><span class="value">${Utils.date(o.createdAt)}</span></div>
            <div class="row"><span class="label">ملاحظات:</span><span class="value">${Utils.esc(o.notes || '—')}</span></div>
            <div class="big-box">
              <div class="title">تكلفة التشغيل</div>
              <div class="value">${Utils.money(totalCost)}</div>
            </div>
          </div>
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'}<br>
            IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('prod-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'prod-styles-v3';
    style.innerHTML = `
      .prod-hero {
        background: linear-gradient(135deg, #d97706 0%, #92400e 100%);
        border-radius: 24px;
        padding: 22px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(217,119,6,0.3);
        position: relative;
        overflow: hidden;
      }
      .prod-hero::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ph-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .ph-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .ph-title p { font-size: 13px; opacity: 0.9; }
      .ph-stats {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; position: relative; z-index: 1;
      }
      .phs-item {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        padding: 10px 4px; border-radius: 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .phs-item:hover { background: rgba(255,255,255,0.25); }
      .phs-icon { font-size: 18px; }
      .phs-value { font-size: 20px; font-weight: 800; margin-top: 2px; }
      .phs-label { font-size: 10px; opacity: 0.9; }
      
      .prod-filters {
        display: flex; gap: 6px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
      }
      .pf-btn {
        flex: 1; padding: 10px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 12px;
        font-weight: 700; color: var(--text-muted);
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .pf-btn.active {
        background: linear-gradient(135deg, #d97706, #92400e);
        color: #fff;
      }
      
      .orders-grid { display: grid; gap: 12px; }
      .order-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-right: 4px solid #f59e0b;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.2s;
      }
      .oc-success { border-right-color: #10b981; }
      .oc-warning { border-right-color: #f59e0b; }
      .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      
      .oc-header {
        padding: 12px 16px;
        background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }
      .oc-number { font-weight: 800; font-size: 13px; color: var(--primary); }
      .oc-status {
        color: #fff; padding: 3px 10px;
        border-radius: 10px; font-size: 10px;
        font-weight: 700;
      }
      
      .oc-body { padding: 14px 16px; }
      .oc-project { margin-bottom: 12px; }
      .oc-p-title { font-size: 15px; font-weight: 800; color: var(--text); }
      .oc-p-num { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      
      .oc-machine-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px;
        background: #f1f5f9;
        border-radius: 10px;
        margin-bottom: 12px;
      }
      .oc-machine-icon {
        width: 36px; height: 36px;
        background: #fff;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }
      .oc-machine-info { flex: 1; }
      .oc-machine-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .oc-machine-code { font-size: 10px; color: var(--text-muted); }
      
      .oc-info-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .oc-info-item {
        background: #f8fafc;
        padding: 8px;
        border-radius: 8px;
        text-align: center;
      }
      .oci-label { font-size: 9px; color: var(--text-muted); margin-bottom: 2px; }
      .oci-value { font-size: 12px; font-weight: 800; color: var(--text); }
      
      .oc-notes {
        margin-top: 10px; padding: 8px 10px;
        background: #fef3c7;
        border-radius: 8px;
        font-size: 11px; color: #92400e;
      }
      
      .oc-footer {
        padding: 10px 16px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
        display: flex; gap: 8px;
      }
      .oc-btn {
        flex: 1; padding: 8px;
        border: none; border-radius: 8px;
        font-size: 12px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .oc-print { background: #dbeafe; color: #1e40af; }
      .oc-complete { background: #dcfce7; color: #166534; }
      .oc-done {
        flex: 1; padding: 8px;
        background: #dcfce7; color: #166534;
        border-radius: 8px; text-align: center;
        font-size: 12px; font-weight: 700;
      }
      
      /* نموذج أمر التصنيع */
      .prod-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .pf-header {
        padding: 20px;
        background: linear-gradient(135deg, #d97706, #92400e);
        color: #fff;
        display: flex; align-items: center; gap: 14px;
      }
      .pfh-icon {
        width: 50px; height: 50px;
        background: rgba(255,255,255,0.2);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .pf-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .pf-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .pf-body { padding: 20px; display: grid; gap: 14px; }
      .pff-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .pff-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .pff-field input, .pff-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px;
        font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .pff-field input:focus, .pff-field select:focus {
        border-color: #d97706;
        box-shadow: 0 0 0 3px rgba(217,119,6,0.1);
      }
      
      .pf-actions {
        padding: 14px 20px;
        display: flex; gap: 10px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
      }
      .pf-btn {
        padding: 12px;
        border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .pf-btn.cancel {
        flex: 1; background: #fff; color: var(--text);
        border: 1px solid var(--border);
      }
      .pf-btn.save {
        flex: 2; background: linear-gradient(135deg, #d97706, #92400e);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Production v3 loaded');
