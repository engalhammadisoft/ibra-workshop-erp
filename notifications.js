/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — مركز التنبيهات الذكية
   ═══════════════════════════════════════════════════════════════ */

const Notifications = {
  filter: 'all', // all, unread, critical

  render() {
    const content = document.getElementById('content');
    const alerts = this.generateAlerts();

    // تصفية
    let filtered = alerts;
    if (this.filter === 'unread') filtered = alerts.filter(a => !a.isRead);
    if (this.filter === 'critical') filtered = alerts.filter(a => a.severity === 'critical');

    // إحصائيات
    const total = alerts.length;
    const unread = alerts.filter(a => !a.isRead).length;
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning = alerts.filter(a => a.severity === 'warning').length;
    const info = alerts.filter(a => a.severity === 'info').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">مركز التنبيهات 🔔</h1>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-ghost" onclick="Notifications.markAllRead()">✅ تحديد الكل كمقروء</button>
          <button class="btn btn-primary" onclick="Notifications.clearRead()">🧹 مسح المقروء</button>
        </div>
      </div>

      <!-- البطاقة الرئيسية -->
      <div class="notif-hero">
        <div class="notif-hero-icon">🔔</div>
        <div class="notif-hero-content">
          <h2>${total} تنبيه نشط</h2>
          <p>${unread} غير مقروء • ${critical} حرج</p>
        </div>
      </div>

      <!-- بطاقات إحصائية -->
      <div class="notif-stats-grid">
        <div class="notif-stat notif-stat-all">
          <div class="ns-icon">📋</div>
          <div class="ns-value">${total}</div>
          <div class="ns-label">الكل</div>
        </div>
        <div class="notif-stat notif-stat-unread">
          <div class="ns-icon">🆕</div>
          <div class="ns-value">${unread}</div>
          <div class="ns-label">غير مقروء</div>
        </div>
        <div class="notif-stat notif-stat-critical">
          <div class="ns-icon">🚨</div>
          <div class="ns-value">${critical}</div>
          <div class="ns-label">حرج</div>
        </div>
        <div class="notif-stat notif-stat-warning">
          <div class="ns-icon">⚠️</div>
          <div class="ns-value">${warning}</div>
          <div class="ns-label">تحذير</div>
        </div>
        <div class="notif-stat notif-stat-info">
          <div class="ns-icon">ℹ️</div>
          <div class="ns-value">${info}</div>
          <div class="ns-label">معلومات</div>
        </div>
      </div>

      <!-- فلاتر -->
      <div class="notif-filters">
        <button class="nf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Notifications.setFilter('all')">📋 الكل</button>
        <button class="nf-btn ${this.filter === 'unread' ? 'active' : ''}" onclick="Notifications.setFilter('unread')">🆕 غير مقروء</button>
        <button class="nf-btn ${this.filter === 'critical' ? 'active' : ''}" onclick="Notifications.setFilter('critical')">🚨 حرج</button>
      </div>

      <!-- قائمة التنبيهات -->
      <div class="notif-list">
        ${filtered.length ? filtered.map(a => this.renderAlert(a)).join('') : `
          <div class="empty-state">
            <div class="icon">✨</div>
            <h3>كل شيء ممتاز!</h3>
            <p>لا توجد تنبيهات في هذه الفئة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  /** إنشاء التنبيهات من بيانات النظام */
  generateAlerts() {
    const alerts = [];
    const materials = DB.get('materials') || [];
    const invoices = DB.get('invoices') || [];
    const projects = DB.get('projects') || [];
    const production = DB.get('production_orders') || [];
    const payrolls = DB.get('payrolls') || [];
    const machines = DB.get('machines') || [];
    const readState = this.getReadState();

    const today = new Date();
    const todayStr = Utils.today();

    // ─── 1. تنبيهات المخزون ───
    materials.forEach(m => {
      if (Number(m.stock) <= 0) {
        alerts.push({
          id: `stock-out-${m.id}`,
          type: 'stock',
          severity: 'critical',
          icon: '🚨',
          title: `نفذت المادة: ${m.name}`,
          description: `الرصيد الحالي: 0 — يجب الشراء فوراً`,
          action: () => UI.navigate('inventory'),
          time: today,
          isRead: readState.includes(`stock-out-${m.id}`)
        });
      } else if (Number(m.stock) <= Number(m.minStock)) {
        alerts.push({
          id: `stock-low-${m.id}`,
          type: 'stock',
          severity: 'warning',
          icon: '⚠️',
          title: `مادة منخفضة: ${m.name}`,
          description: `الرصيد: ${m.stock} — الحد الأدنى: ${m.minStock}`,
          action: () => UI.navigate('inventory'),
          time: today,
          isRead: readState.includes(`stock-low-${m.id}`)
        });
      }
    });

    // ─── 2. تنبيهات الفواتير ───
    invoices.filter(i => i.status === 'unpaid' || i.status === 'partial').forEach(inv => {
      const remaining = (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0);
      if (remaining > 0) {
        const daysSince = Math.floor((today - new Date(inv.createdAt)) / (24*60*60*1000));
        alerts.push({
          id: `invoice-${inv.id}`,
          type: 'invoice',
          severity: daysSince > 30 ? 'critical' : 'warning',
          icon: '💵',
          title: `فاتورة غير محصلة: ${inv.invoiceNumber}`,
          description: `${inv.customerName} — المتبقي: ${Utils.money(remaining)}${daysSince > 30 ? ` (متأخرة ${daysSince} يوم)` : ''}`,
          action: () => UI.navigate('invoices'),
          time: new Date(inv.createdAt),
          isRead: readState.includes(`invoice-${inv.id}`)
        });
      }
    });

    // ─── 3. تنبيهات المشاريع المتأخرة ───
    projects.filter(p => p.status === 'in_progress').forEach(p => {
      const days = Math.floor((today - new Date(p.createdAt)) / (24*60*60*1000));
      if (days > 30) {
        alerts.push({
          id: `project-late-${p.id}`,
          type: 'project',
          severity: 'warning',
          icon: '⏳',
          title: `مشروع متأخر: ${p.projectNumber}`,
          description: `${p.productName} — مضى ${days} يوم على البدء`,
          action: () => UI.navigate('projects'),
          time: new Date(p.createdAt),
          isRead: readState.includes(`project-late-${p.id}`)
        });
      }
    });

    // ─── 4. تنبيهات الرواتب ───
    const currentMonth = new Date().toISOString().slice(0, 7);
    const pendingPayrolls = payrolls.filter(p => p.month === currentMonth && p.status !== 'paid');
    if (pendingPayrolls.length > 0) {
      const totalPending = pendingPayrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
      alerts.push({
        id: `payroll-pending-${currentMonth}`,
        type: 'payroll',
        severity: new Date().getDate() > 25 ? 'critical' : 'warning',
        icon: '💰',
        title: `رواتب شهر ${currentMonth} معلقة`,
        description: `${pendingPayrolls.length} موظف — إجمالي ${Utils.money(totalPending)}`,
        action: () => Payroll.render(),
        time: today,
        isRead: readState.includes(`payroll-pending-${currentMonth}`)
      });
    }

    // ─── 5. تنبيهات المكائن ───
    machines.filter(m => m.status === 'maintenance' || m.status === 'broken').forEach(m => {
      alerts.push({
        id: `machine-status-${m.id}`,
        type: 'machine',
        severity: m.status === 'broken' ? 'critical' : 'warning',
        icon: m.status === 'broken' ? '🛑' : '🔧',
        title: `ماكينة ${m.status === 'broken' ? 'معطلة' : 'تحت الصيانة'}: ${m.name}`,
        description: `${m.code} — بحاجة إلى صيانة`,
        action: () => UI.navigate('machines'),
        time: today,
        isRead: readState.includes(`machine-status-${m.id}`)
      });
    });

    // ─── 6. تنبيهات أوامر التصنيع المعلقة ───
    const oldOrders = production.filter(o => {
      if (o.status !== 'in_progress') return false;
      const days = Math.floor((today - new Date(o.createdAt)) / (24*60*60*1000));
      return days > 14;
    });
    oldOrders.forEach(o => {
      const days = Math.floor((today - new Date(o.createdAt)) / (24*60*60*1000));
      alerts.push({
        id: `order-late-${o.id}`,
        type: 'production',
        severity: 'warning',
        icon: '⏰',
        title: `أمر تصنيع متأخر: ${o.orderNumber}`,
        description: `مضى ${days} يوم دون إنجاز`,
        action: () => UI.navigate('production'),
        time: new Date(o.createdAt),
        isRead: readState.includes(`order-late-${o.id}`)
      });
    });

    // ترتيب حسب الأهمية ثم التاريخ
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.time) - new Date(a.time);
    });

    return alerts;
  },

  renderAlert(a) {
    const severityColors = {
      critical: { bg: 'linear-gradient(90deg, #fef2f2, #fff)', border: '#dc2626', badge: '#dc2626', label: 'حرج' },
      warning: { bg: 'linear-gradient(90deg, #fffbeb, #fff)', border: '#f59e0b', badge: '#f59e0b', label: 'تحذير' },
      info: { bg: 'linear-gradient(90deg, #eff6ff, #fff)', border: '#2563eb', badge: '#2563eb', label: 'معلومات' }
    };
    const c = severityColors[a.severity] || severityColors.info;

    return `
      <div class="notif-item ${a.isRead ? 'notif-read' : 'notif-unread'}" 
        style="background: ${c.bg}; border-right-color: ${c.border};"
        onclick="Notifications.handleAlertClick('${a.id}')">
        <div class="notif-icon" style="background: ${c.border}20; color: ${c.border};">
          ${a.icon}
        </div>
        <div class="notif-content">
          <div class="notif-header">
            <div class="notif-title">${Utils.esc(a.title)}</div>
            <div class="notif-badge" style="background: ${c.badge};">
              ${c.label}
            </div>
          </div>
          <div class="notif-desc">${Utils.esc(a.description)}</div>
          <div class="notif-time">🕐 ${Utils.date(a.time, true)}</div>
        </div>
        ${!a.isRead ? '<div class="notif-dot"></div>' : ''}
      </div>
    `;
  },

  handleAlertClick(id) {
    // تحديد التنبيه كمقروء
    this.markRead(id);
    // إعادة رسم الشاشة
    this.render();
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  getReadState() {
    try {
      return JSON.parse(localStorage.getItem('ibra_read_alerts') || '[]');
    } catch { return []; }
  },

  saveReadState(state) {
    localStorage.setItem('ibra_read_alerts', JSON.stringify(state));
    this.updateBadge();
  },

  markRead(id) {
    const state = this.getReadState();
    if (!state.includes(id)) {
      state.push(id);
      this.saveReadState(state);
    }
  },

  markAllRead() {
    const alerts = this.generateAlerts();
    const state = this.getReadState();
    alerts.forEach(a => {
      if (!state.includes(a.id)) state.push(a.id);
    });
    this.saveReadState(state);
    this.render();
    UI.toast('✅ تم تحديد الكل كمقروء', 'success');
  },

  clearRead() {
    if (!confirm('مسح التنبيهات المقروءة؟ (لن يؤثر على البيانات)')) return;
    const alerts = this.generateAlerts();
    const state = this.getReadState();
    const newState = state.filter(id => {
      return alerts.some(a => a.id === id && !state.includes(a.id));
    });
    // إعادة تعيين: مسح كل شيء
    this.saveReadState([]);
    this.render();
    UI.toast('✅ تم مسح التنبيهات', 'success');
  },

  updateBadge() {
    const alerts = this.generateAlerts();
    const state = this.getReadState();
    const unread = alerts.filter(a => !state.includes(a.id)).length;
    
    // تحديث شارة الجرس في الشريط العلوي
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.innerHTML = `
      .notif-hero {
        background: linear-gradient(135deg, #1e40af, #0f172a);
        border-radius: 20px; padding: 20px; color: #fff;
        display: flex; align-items: center; gap: 16px;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(30,64,175,0.3);
      }
      .notif-hero-icon { font-size: 48px; }
      .notif-hero-content h2 { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
      .notif-hero-content p { font-size: 12px; opacity: 0.9; }

      .notif-stats-grid {
        display: grid; grid-template-columns: repeat(5, 1fr);
        gap: 6px; margin-bottom: 16px;
      }
      .notif-stat {
        background: #fff; border-radius: 12px; padding: 10px 6px;
        text-align: center; border: 1px solid var(--border);
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      }
      .notif-stat-all { border-right: 3px solid #64748b; }
      .notif-stat-unread { border-right: 3px solid #3b82f6; }
      .notif-stat-critical { border-right: 3px solid #dc2626; }
      .notif-stat-warning { border-right: 3px solid #f59e0b; }
      .notif-stat-info { border-right: 3px solid #0891b2; }
      .ns-icon { font-size: 18px; }
      .ns-value { font-size: 18px; font-weight: 800; color: var(--text); }
      .ns-label { font-size: 9px; color: var(--text-muted); margin-top: 2px; }

      .notif-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
      }
      .nf-btn {
        flex: 1; padding: 10px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 12px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .nf-btn.active { background: linear-gradient(135deg, #1e40af, #0f172a); color: #fff; }

      .notif-list { display: grid; gap: 8px; }
      .notif-item {
        background: #fff; border-radius: 12px;
        padding: 14px;
        display: flex; gap: 12px; align-items: flex-start;
        border-right: 4px solid #2563eb;
        cursor: pointer; transition: all 0.2s;
        position: relative;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .notif-item:hover { transform: translateX(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      .notif-read { opacity: 0.6; }
      .notif-icon {
        width: 42px; height: 42px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .notif-content { flex: 1; min-width: 0; }
      .notif-header {
        display: flex; justify-content: space-between;
        align-items: center; gap: 8px; margin-bottom: 4px;
      }
      .notif-title {
        font-size: 13px; font-weight: 800; color: var(--text);
        flex: 1;
      }
      .notif-badge {
        color: #fff; padding: 2px 8px;
        border-radius: 8px; font-size: 10px;
        font-weight: 700; white-space: nowrap;
      }
      .notif-desc {
        font-size: 12px; color: var(--text-muted);
        margin-bottom: 4px;
      }
      .notif-time {
        font-size: 10px; color: var(--text-light);
      }
      .notif-dot {
        position: absolute; top: 16px; left: 16px;
        width: 8px; height: 8px;
        background: #dc2626;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Notifications loaded');