/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — إدارة مكائن CNC (النسخة المطورة)
   ═══════════════════════════════════════════════════════════════ */

const Machines = {
  filter: 'all', // all, active, maintenance

  render() {
    const content = document.getElementById('content');
    const machines = DB.get('machines') || [];
    const types = DB.get('machine_types') || [];
    const orders = DB.get('production_orders') || [];

    // تصفية
    let filtered = machines;
    if (this.filter === 'active') filtered = machines.filter(m => m.status === 'active');
    if (this.filter === 'maintenance') filtered = machines.filter(m => m.status === 'maintenance' || m.status === 'broken');

    // إحصائيات
    const total = machines.length;
    const active = machines.filter(m => m.status === 'active').length;
    const maintenance = machines.filter(m => m.status === 'maintenance' || m.status === 'broken').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">مكائن CNC</h1>
        <button class="btn btn-primary" onclick="Machines.openForm()">➕ إضافة ماكينة</button>
      </div>

      <!-- البطاقة العلوية -->
      <div class="mc-hero">
        <div class="mch-title">
          <h2>الماكينات ⚙️</h2>
          <p>إدارة أسطول مكائن الورشة</p>
        </div>
        <div class="mch-stats">
          <div class="mcs-stat" onclick="Machines.setFilter('all')">
            <div class="mcs-icon">⚙️</div>
            <div class="mcs-value">${total}</div>
            <div class="mcs-label">إجمالي</div>
          </div>
          <div class="mcs-stat" onclick="Machines.setFilter('active')">
            <div class="mcs-icon">✅</div>
            <div class="mcs-value">${active}</div>
            <div class="mcs-label">جاهزة</div>
          </div>
          <div class="mcs-stat" onclick="Machines.setFilter('maintenance')">
            <div class="mcs-icon">🔧</div>
            <div class="mcs-value">${maintenance}</div>
            <div class="mcs-label">صيانة</div>
          </div>
        </div>
      </div>

      <!-- فلاتر -->
      <div class="mc-filters">
        <button class="mf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Machines.setFilter('all')">الكل</button>
        <button class="mf-btn ${this.filter === 'active' ? 'active' : ''}" onclick="Machines.setFilter('active')">✅ جاهزة</button>
        <button class="mf-btn ${this.filter === 'maintenance' ? 'active' : ''}" onclick="Machines.setFilter('maintenance')">🔧 صيانة</button>
      </div>

      <!-- قائمة المكائن -->
      <div class="machines-grid">
        ${filtered.length ? filtered.map(m => this.renderCard(m, types, orders)).join('') : `
          <div class="empty-state">
            <div class="icon">⚙️</div>
            <p>لا توجد ماكينات مسجلة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(m, types, orders) {
    const type = types.find(t => t.id === m.typeId);
    const isActive = m.status === 'active';
    const color = isActive ? 'success' : (m.status === 'maintenance' ? 'warning' : 'danger');
    
    // حساب إجمالي ساعات التشغيل لهذه الماكينة
    const machineOrders = orders.filter(o => o.machineId === m.id);
    const totalHours = machineOrders.reduce((sum, o) => sum + (o.totalHours || 0), 0);
    const totalRevenue = totalHours * (m.hourlyCost || 0);

    return `
      <div class="machine-card mc-${color}">
        <div class="mc-header-card">
          <div class="mc-icon-card">${type ? type.icon : '⚙️'}</div>
          <div class="mc-title-card">
            <div class="mc-code">${Utils.esc(m.code)}</div>
            <div class="mc-name">${Utils.esc(m.name)}</div>
            <div class="mc-type">${type ? type.name : ''}</div>
          </div>
          <div class="mc-status-card" style="background: var(--${color});">
            ${Utils.statusText(m.status)}
          </div>
        </div>
        
        <div class="mc-body-card">
          <div class="mc-info-row">
            <div class="mc-info-item">
              <span class="mci-label">💰 تكلفة الساعة</span>
              <b class="mci-value">${Utils.money(m.hourlyCost)}</b>
            </div>
            <div class="mc-info-item">
              <span class="mci-label">⏱️ إجمالي الساعات</span>
              <b class="mci-value">${totalHours} ساعة</b>
            </div>
            <div class="mc-info-item">
              <span class="mci-label">🛠️ عدد الأوامر</span>
              <b class="mci-value">${machineOrders.length}</b>
            </div>
            <div class="mc-info-item">
              <span class="mci-label">💵 إجمالي التشغيل</span>
              <b class="mci-value" style="color:var(--primary);">${Utils.money(totalRevenue)}</b>
            </div>
          </div>
          ${m.workArea ? `<div class="mc-workarea">📐 مساحة العمل: ${Utils.esc(m.workArea)}</div>` : ''}
        </div>
        
        <div class="mc-footer-card">
          <button class="mc-action mc-toggle" onclick="Machines.toggleStatus('${m.id}')">
            ${isActive ? '🔧 تحويل للصيانة' : '✅ تفعيل'}
          </button>
          <button class="mc-action mc-edit" onclick="Machines.openForm('${m.id}')">✏️ تعديل</button>
        </div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  openForm(id = null) {
    if (!Auth.require('machines.manage', 'إدارة المكائن')) return;

    const types = DB.get('machine_types') || [];
    const machine = id ? DB.find('machines', id) : null;

    const formHtml = `
      <div class="mc-form-wrapper">
        <div class="mc-form-header">
          <div class="mcf-icon">⚙️</div>
          <div class="mcf-title">
            <h2>${machine ? 'تعديل ماكينة' : 'ماكينة جديدة'}</h2>
            <p>${machine ? 'تحديث بيانات الماكينة' : 'إضافة ماكينة جديدة للنظام'}</p>
          </div>
        </div>

        <div class="mc-form-body">
          <div class="mc-field">
            <label>كود الماكينة <span style="color:var(--danger);">*</span></label>
            <input type="text" id="mCode" value="${machine ? Utils.esc(machine.code) : ''}" placeholder="مثال: CNC-01">
          </div>
          <div class="mc-field">
            <label>اسم الماكينة <span style="color:var(--danger);">*</span></label>
            <input type="text" id="mName" value="${machine ? Utils.esc(machine.name) : ''}" placeholder="ليزر حديد رقم 2">
          </div>
          
          <div class="mc-form-row">
            <div class="mc-field">
              <label>النوع</label>
              <select id="mType">
                ${types.map(t => `<option value="${t.id}" ${machine && machine.typeId === t.id ? 'selected' : ''}>${t.icon} ${t.name}</option>`).join('')}
              </select>
            </div>
            <div class="mc-field">
              <label>الحالة</label>
              <select id="mStatus">
                <option value="active" ${machine && machine.status === 'active' ? 'selected' : ''}>✅ جاهزة للعمل</option>
                <option value="maintenance" ${machine && machine.status === 'maintenance' ? 'selected' : ''}>🔧 تحت الصيانة</option>
                <option value="broken" ${machine && machine.status === 'broken' ? 'selected' : ''}>⛔ معطلة</option>
              </select>
            </div>
          </div>

          <div class="mc-form-row">
            <div class="mc-field">
              <label>تكلفة الساعة</label>
              <input type="number" id="mCost" value="${machine ? machine.hourlyCost : 0}" placeholder="0">
            </div>
            <div class="mc-field">
              <label>مساحة العمل</label>
              <input type="text" id="mWorkArea" value="${machine ? Utils.esc(machine.workArea || '') : ''}" placeholder="3000×1500 مم">
            </div>
          </div>
        </div>

        <div class="mc-form-actions">
          <button class="mc-form-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="mc-form-btn save" onclick="Machines.save('${id || ''}')">💾 حفظ</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save(id) {
    const code = document.getElementById('mCode').value.trim();
    const name = document.getElementById('mName').value.trim();
    const typeId = document.getElementById('mType').value;
    const status = document.getElementById('mStatus').value;
    const hourlyCost = Number(document.getElementById('mCost').value) || 0;
    const workArea = document.getElementById('mWorkArea').value.trim();

    if (!code || !name) {
      UI.toast('⚠️ الكود والاسم مطلوبان', 'error');
      return;
    }

    const data = { code, name, typeId, status, hourlyCost, workArea };

    if (id) {
      DB.update('machines', id, data);
      UI.toast('✅ تم التعديل', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      DB.insert('machines', data);
      UI.toast('✅ تمت الإضافة', 'success');
    }

    UI.closeModal();
    this.render();
  },

  toggleStatus(id) {
    const m = DB.find('machines', id);
    if (!m) return;
    const newStatus = m.status === 'active' ? 'maintenance' : 'active';
    DB.update('machines', id, { status: newStatus });
    this.render();
    UI.toast(`✅ ${newStatus === 'active' ? 'تم التفعيل' : 'تحويل للصيانة'}`, 'success');
  },

  injectStyles() {
    if (document.getElementById('machine-styles')) return;
    const style = document.createElement('style');
    style.id = 'machine-styles';
    style.innerHTML = `
      .mc-hero {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        border-radius: 24px;
        padding: 22px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
        position: relative;
        overflow: hidden;
      }
      .mc-hero::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%);
        border-radius: 50%;
      }
      .mch-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .mch-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .mch-title p { font-size: 13px; opacity: 0.8; }
      .mch-stats {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px; position: relative; z-index: 1;
      }
      .mcs-stat {
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        padding: 12px 8px; border-radius: 12px;
        text-align: center; cursor: pointer;
        transition: all 0.2s;
      }
      .mcs-stat:hover { background: rgba(255,255,255,0.2); }
      .mcs-icon { font-size: 20px; margin-bottom: 4px; }
      .mcs-value { font-size: 22px; font-weight: 800; }
      .mcs-label { font-size: 11px; opacity: 0.9; margin-top: 2px; }
      
      .mc-filters {
        display: flex; gap: 6px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
      }
      .mf-btn {
        flex: 1; padding: 10px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 12px;
        font-weight: 700; color: var(--text-muted);
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .mf-btn.active {
        background: linear-gradient(135deg, #0f172a, #1e293b);
        color: #fff;
      }
      
      .machines-grid { display: grid; gap: 12px; }
      .machine-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-right: 4px solid var(--primary);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.2s;
      }
      .machine-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
      .mc-success { border-right-color: #10b981; }
      .mc-warning { border-right-color: #f59e0b; }
      .mc-danger { border-right-color: #dc2626; }
      
      .mc-header-card {
        padding: 14px 16px;
        background: #f8fafc;
        display: flex; align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--border);
      }
      .mc-icon-card {
        width: 48px; height: 48px;
        background: linear-gradient(135deg, #0f172a, #334155);
        color: #fff; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
      }
      .mc-title-card { flex: 1; min-width: 0; }
      .mc-code {
        font-size: 10px; font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 1px;
      }
      .mc-name {
        font-size: 15px; font-weight: 800;
        color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mc-type { font-size: 11px; color: var(--text-muted); }
      .mc-status-card {
        color: #fff; padding: 3px 10px;
        border-radius: 10px; font-size: 10px;
        font-weight: 700;
      }
      
      .mc-body-card { padding: 14px 16px; }
      .mc-info-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .mc-info-item { display: flex; flex-direction: column; gap: 2px; }
      .mci-label { font-size: 10px; color: var(--text-muted); }
      .mci-value { font-size: 13px; font-weight: 800; color: var(--text); }
      .mc-workarea {
        margin-top: 10px;
        font-size: 11px;
        background: #f1f5f9;
        padding: 6px 10px;
        border-radius: 8px;
        color: var(--text-muted);
      }
      
      .mc-footer-card {
        padding: 10px 16px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
        display: flex; gap: 8px;
      }
      .mc-action {
        flex: 1; padding: 8px;
        border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .mc-toggle { background: #fef3c7; color: #92400e; }
      .mc-edit { background: #dbeafe; color: #1e40af; }
      
      /* نموذج الماكينة */
      .mc-form-wrapper {
        background: #fff;
        border-radius: 20px;
        overflow: hidden;
      }
      .mc-form-header {
        padding: 20px;
        background: linear-gradient(135deg, #0f172a, #1e293b);
        color: #fff;
        display: flex; align-items: center; gap: 14px;
      }
      .mcf-icon {
        width: 50px; height: 50px;
        background: rgba(255,255,255,0.15);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .mcf-title h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .mcf-title p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
      
      .mc-form-body { padding: 20px; display: grid; gap: 14px; }
      .mc-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .mc-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .mc-field input, .mc-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px;
        font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .mc-field input:focus, .mc-field select:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      
      .mc-form-actions {
        padding: 14px 20px;
        display: flex; gap: 10px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
      }
      .mc-form-btn {
        padding: 12px;
        border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .mc-form-btn.cancel {
        flex: 1; background: #fff; color: var(--text);
        border: 1px solid var(--border);
      }
      .mc-form-btn.save {
        flex: 2; background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Machines v2 loaded');
