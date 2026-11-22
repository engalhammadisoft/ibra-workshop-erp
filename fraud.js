/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — كاشف الاحتيال (Fraud Detector)
   ═══════════════════════════════════════════════════════════════ */

const Fraud = {
  filter: 'all', // all, high, medium, low

  render() {
    const content = document.getElementById('content');
    const alerts = this.detectFraud();

    // تصفية
    let filtered = alerts;
    if (this.filter === 'high') filtered = alerts.filter(a => a.risk === 'high');
    if (this.filter === 'medium') filtered = alerts.filter(a => a.risk === 'medium');
    if (this.filter === 'low') filtered = alerts.filter(a => a.risk === 'low');

    // إحصائيات
    const total = alerts.length;
    const highRisk = alerts.filter(a => a.risk === 'high').length;
    const mediumRisk = alerts.filter(a => a.risk === 'medium').length;
    const lowRisk = alerts.filter(a => a.risk === 'low').length;

    // حساب درجة الأمان
    const riskScore = Math.max(0, 100 - (highRisk * 15) - (mediumRisk * 5) - (lowRisk * 1));

    let html = `
      <div class="page-header">
        <h1 class="page-title">كاشف الاحتيال 🔍</h1>
        <button class="btn btn-primary" onclick="Fraud.refresh()">🔄 فحص جديد</button>
      </div>

      <!-- بطاقة الأمان الرئيسية -->
      <div class="fraud-hero ${riskScore >= 80 ? 'fraud-safe' : riskScore >= 50 ? 'fraud-warning' : 'fraud-danger'}">
        <div class="fraud-hero-content">
          <div class="fraud-hero-label">درجة الأمان</div>
          <div class="fraud-hero-value">${riskScore}/100</div>
          <div class="fraud-hero-status">
            ${riskScore >= 80 ? '🟢 النظام آمن' : riskScore >= 50 ? '🟡 يحتاج انتباه' : '🔴 خطر أمني'}
          </div>
        </div>
        <div class="fraud-hero-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" class="fhc-bg"/>
            <circle cx="50" cy="50" r="42" class="fhc-fill" style="stroke-dasharray: ${riskScore * 2.64} 264;"/>
          </svg>
          <div class="fhc-icon">${riskScore >= 80 ? '🛡️' : riskScore >= 50 ? '⚠️' : '🚨'}</div>
        </div>
      </div>

      <!-- إحصائيات المخاطر -->
      <div class="fraud-stats">
        <div class="fraud-stat fraud-stat-high">
          <div class="fs-icon">🚨</div>
          <div class="fs-value">${highRisk}</div>
          <div class="fs-label">خطر عالي</div>
        </div>
        <div class="fraud-stat fraud-stat-medium">
          <div class="fs-icon">⚠️</div>
          <div class="fs-value">${mediumRisk}</div>
          <div class="fs-label">خطر متوسط</div>
        </div>
        <div class="fraud-stat fraud-stat-low">
          <div class="fs-icon">ℹ️</div>
          <div class="fs-value">${lowRisk}</div>
          <div class="fs-label">خطر منخفض</div>
        </div>
      </div>

      <!-- الفلاتر -->
      <div class="fraud-filters">
        <button class="ff-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Fraud.setFilter('all')">📋 الكل (${total})</button>
        <button class="ff-btn ${this.filter === 'high' ? 'active' : ''}" onclick="Fraud.setFilter('high')">🚨 عالي (${highRisk})</button>
        <button class="ff-btn ${this.filter === 'medium' ? 'active' : ''}" onclick="Fraud.setFilter('medium')">⚠️ متوسط (${mediumRisk})</button>
        <button class="ff-btn ${this.filter === 'low' ? 'active' : ''}" onclick="Fraud.setFilter('low')">ℹ️ منخفض (${lowRisk})</button>
      </div>

      <!-- قائمة المخاطر -->
      <div class="fraud-list">
        ${filtered.length ? filtered.map(a => this.renderFraudAlert(a)).join('') : `
          <div class="fraud-empty">
            <div style="font-size:60px; margin-bottom:12px;">🛡️</div>
            <h3 style="color:#10b981; margin-bottom:6px;">النظام آمن تماماً</h3>
            <p style="color:var(--text-muted); font-size:13px;">لم يتم اكتشاف أي سلوك مريب</p>
          </div>
        `}
      </div>

      <!-- شرح -->
      <div class="fraud-info-box">
        💡 <strong>كيف يعمل كاشف الاحتيال؟</strong><br>
        يقوم النظام بتحليل البيانات المحلية تلقائياً بحثاً عن أي سلوك غير معتاد، مثل (الخصومات الكبيرة، الحركات الليلية، الرواتب المكررة، تعديل الأسعار بعد الاستخدام).
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  /** كشف الاحتيال */
  detectFraud() {
    const alerts = [];
    const invoices = DB.get('invoices') || [];
    const payments = DB.get('payments') || [];
    const payrolls = DB.get('payrolls') || [];
    const projects = DB.get('projects') || [];
    const moves = DB.get('inventory_moves') || [];
    const vouchers = DB.get('vouchers') || [];
    const activityLog = DB.get('activity_log') || [];
    const employees = DB.get('employees') || [];

    // ─── 1. خصومات كبيرة ───
    invoices.forEach(inv => {
      const subtotal = Number(inv.subtotal) || Number(inv.total) || 0;
      const discount = Number(inv.discount) || 0;
      if (subtotal > 0 && discount > 0) {
        const discountPct = (discount / subtotal) * 100;
        if (discountPct > 20) {
          alerts.push({
            id: `discount-${inv.id}`,
            risk: discountPct > 40 ? 'high' : 'medium',
            icon: '💰',
            title: `خصم كبير على فاتورة ${inv.invoiceNumber}`,
            description: `خصم ${discountPct.toFixed(1)}% (${Utils.money(discount)}) — الحد الآمن 20%`,
            date: inv.createdAt,
            action: () => UI.navigate('invoices')
          });
        }
      }
    });

    // ─── 2. تعديل الأسعار في الفواتير ───
    invoices.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const product = DB.find('products', item.productId);
          if (product && Number(item.price) !== Number(product.basePrice)) {
            alerts.push({
              id: `price-change-${inv.id}-${item.productId}`,
              risk: 'medium',
              icon: '🔀',
              title: `تعديل سعر في فاتورة ${inv.invoiceNumber}`,
              description: `${item.name}: السعر الأصلي ${Utils.money(product.basePrice)}، السعر في الفاتورة ${Utils.money(item.price)}`,
              date: inv.createdAt,
              action: () => UI.navigate('invoices')
            });
          }
        });
      }
    });

    // ─── 3. فواتير ملغاة ───
    invoices.filter(i => i.status === 'cancelled').forEach(inv => {
      alerts.push({
        id: `cancelled-${inv.id}`,
        risk: 'medium',
        icon: '❌',
        title: `فاتورة ملغاة: ${inv.invoiceNumber}`,
        description: `العميل: ${inv.customerName} — المبلغ: ${Utils.money(inv.total)}`,
        date: inv.createdAt,
        action: () => UI.navigate('invoices')
      });
    });

    // ─── 4. رواتب مكررة ───
    const payrollCount = {};
    payrolls.forEach(p => {
      const key = `${p.employeeId}-${p.month}`;
      payrollCount[key] = (payrollCount[key] || 0) + 1;
    });
    Object.entries(payrollCount).forEach(([key, count]) => {
      if (count > 1) {
        const [empId, month] = key.split('-');
        const emp = employees.find(e => e.id === empId);
        alerts.push({
          id: `payroll-dup-${key}`,
          risk: 'high',
          icon: '💸',
          title: `راتب مكرر: ${emp ? emp.name : empId}`,
          description: `${count} سجلات راتب لنفس الشهر ${month}`,
          date: new Date().toISOString(),
          action: () => Payroll.render()
        });
      }
    });

    // ─── 5. الحركات الليلية ───
    payments.forEach(p => {
      if (!p.date) return;
      const hour = new Date(p.date).getHours();
      if (hour >= 0 && hour < 5) {
        alerts.push({
          id: `night-payment-${p.id}`,
          risk: 'low',
          icon: '🌙',
          title: `حركة مالية ليلية: ${p.note || 'دفعة'}`,
          description: `تمت في الساعة ${hour}:00 — مبلغ: ${Utils.money(p.amount)}`,
          date: p.date,
          action: () => UI.navigate('accounting')
        });
      }
    });

    // ─── 6. المخزون السالب أو الصرف الزائد ───
    const materials = DB.get('materials') || [];
    materials.forEach(m => {
      if (Number(m.stock) < 0) {
        alerts.push({
          id: `negative-stock-${m.id}`,
          risk: 'high',
          icon: '📦',
          title: `رصيد سالب: ${m.name}`,
          description: `الرصيد الحالي: ${m.stock} — خلل في تسجيل الحركات`,
          date: new Date().toISOString(),
          action: () => UI.navigate('inventory')
        });
      }
    });

    // ─── 7. الفواتير المعلقة طويلة ───
    const today = new Date();
    invoices.filter(i => i.status === 'unpaid' || i.status === 'partial').forEach(inv => {
      const days = Math.floor((today - new Date(inv.createdAt)) / (24*60*60*1000));
      if (days > 90) {
        alerts.push({
          id: `old-invoice-${inv.id}`,
          risk: 'medium',
          icon: '⏰',
          title: `فاتورة معلقة ${days} يوم: ${inv.invoiceNumber}`,
          description: `${inv.customerName} — المتبقي: ${Utils.money((inv.total || 0) - (inv.paidAmount || 0))}`,
          date: inv.createdAt,
          action: () => UI.navigate('invoices')
        });
      }
    });

    // ─── 8. السندات الكبيرة ───
    vouchers.forEach(v => {
      if (Number(v.amount) > 1000000) {
        alerts.push({
          id: `large-voucher-${v.id}`,
          risk: 'medium',
          icon: '📋',
          title: `${v.type === 'receipt' ? 'سند قبض' : 'سند صرف'} كبير: ${v.number}`,
          description: `المبلغ: ${Utils.money(v.amount)} — الجهة: ${v.partyName}`,
          date: v.createdAt,
          action: () => UI.navigate('vouchers')
        });
      }
    });

    // ─── 9. حركات في أوقات غير معتادة ───
    const suspiciousLogins = activityLog.filter(log => {
      if (log.action !== 'login') return false;
      const hour = new Date(log.at).getHours();
      return hour >= 2 && hour < 5;
    });
    suspiciousLogins.slice(0, 5).forEach(log => {
      alerts.push({
        id: `login-night-${log.id}`,
        risk: 'low',
        icon: '🌃',
        title: `تسجيل دخول في وقت متأخر`,
        description: `${log.userName} — الساعة ${new Date(log.at).getHours()}:00`,
        date: log.at,
        action: () => UI.navigate('more')
      });
    });

    // ترتيب حسب الخطر
    const riskOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    return alerts;
  },

  renderFraudAlert(a) {
    const riskConfig = {
      high: { color: '#dc2626', bg: '#fef2f2', label: 'خطر عالي', icon: '🚨' },
      medium: { color: '#f59e0b', bg: '#fffbeb', label: 'خطر متوسط', icon: '⚠️' },
      low: { color: '#0891b2', bg: '#f0f9ff', label: 'خطر منخفض', icon: 'ℹ️' }
    };
    const c = riskConfig[a.risk] || riskConfig.low;

    return `
      <div class="fraud-item" style="background: ${c.bg}; border-right-color: ${c.color};" onclick="(${a.action.toString()})()">
        <div class="fraud-item-icon" style="background: ${c.color}20; color: ${c.color};">
          ${a.icon}
        </div>
        <div class="fraud-item-content">
          <div class="fraud-item-header">
            <div class="fraud-item-title">${Utils.esc(a.title)}</div>
            <div class="fraud-item-badge" style="background: ${c.color};">
              ${c.label}
            </div>
          </div>
          <div class="fraud-item-desc">${Utils.esc(a.description)}</div>
          <div class="fraud-item-time">🕐 ${Utils.date(a.date, true)}</div>
        </div>
        <div class="fraud-item-arrow">›</div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  refresh() {
    UI.toast('🔄 جاري فحص البيانات...', 'info');
    setTimeout(() => {
      this.render();
      UI.toast('✅ اكتمل الفحص', 'success');
    }, 800);
  },

  injectStyles() {
    if (document.getElementById('fraud-styles')) return;
    const style = document.createElement('style');
    style.id = 'fraud-styles';
    style.innerHTML = `
      /* بطاقة الأمان */
      .fraud-hero {
        border-radius: 20px; padding: 22px;
        display: flex; justify-content: space-between;
        align-items: center; gap: 20px;
        margin-bottom: 16px; color: #fff;
        position: relative; overflow: hidden;
        flex-wrap: wrap;
      }
      .fraud-safe { background: linear-gradient(135deg, #10b981, #047857); box-shadow: 0 10px 30px rgba(16,185,129,0.3); }
      .fraud-warning { background: linear-gradient(135deg, #f59e0b, #b45309); box-shadow: 0 10px 30px rgba(245,158,11,0.3); }
      .fraud-danger { background: linear-gradient(135deg, #dc2626, #991b1b); box-shadow: 0 10px 30px rgba(220,38,38,0.3); }
      
      .fraud-hero-content { flex: 1; min-width: 200px; }
      .fraud-hero-label { font-size: 12px; opacity: 0.9; margin-bottom: 4px; }
      .fraud-hero-value { font-size: 42px; font-weight: 900; line-height: 1; }
      .fraud-hero-status { font-size: 14px; font-weight: 700; margin-top: 8px; }
      
      .fraud-hero-circle {
        position: relative; width: 110px; height: 110px;
        flex-shrink: 0;
      }
      .fraud-hero-circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .fhc-bg { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 8; }
      .fhc-fill { fill: none; stroke: #fff; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 1s; }
      .fhc-icon {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 40px;
      }
      
      /* إحصائيات المخاطر */
      .fraud-stats {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 10px; margin-bottom: 16px;
      }
      .fraud-stat {
        background: #fff; border-radius: 14px;
        padding: 14px; text-align: center;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      .fraud-stat-high { border-right: 4px solid #dc2626; }
      .fraud-stat-medium { border-right: 4px solid #f59e0b; }
      .fraud-stat-low { border-right: 4px solid #0891b2; }
      .fs-icon { font-size: 22px; margin-bottom: 4px; }
      .fs-value { font-size: 24px; font-weight: 800; color: var(--text); }
      .fs-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      
      /* الفلاتر */
      .fraud-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border); overflow-x: auto;
      }
      .ff-btn {
        flex: 1; padding: 10px 8px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 11px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .ff-btn.active { background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; }
      
      /* قائمة المخاطر */
      .fraud-list { display: grid; gap: 8px; }
      .fraud-item {
        background: #fff; border-radius: 12px;
        padding: 14px;
        display: flex; gap: 12px; align-items: center;
        border-right: 4px solid #dc2626;
        cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .fraud-item:hover { transform: translateX(-3px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
      .fraud-item-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .fraud-item-content { flex: 1; min-width: 0; }
      .fraud-item-header {
        display: flex; justify-content: space-between;
        align-items: center; gap: 8px; margin-bottom: 4px;
      }
      .fraud-item-title {
        font-size: 13px; font-weight: 800; color: var(--text);
        flex: 1;
      }
      .fraud-item-badge {
        color: #fff; padding: 2px 8px;
        border-radius: 8px; font-size: 10px;
        font-weight: 700; white-space: nowrap;
      }
      .fraud-item-desc {
        font-size: 12px; color: var(--text-muted);
        margin-bottom: 4px;
      }
      .fraud-item-time {
        font-size: 10px; color: var(--text-light);
      }
      .fraud-item-arrow {
        font-size: 20px; color: var(--text-light);
      }
      
      .fraud-empty {
        text-align: center;
        padding: 50px 20px;
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border-radius: 16px;
        border: 1px solid #bbf7d0;
      }
      
      .fraud-info-box {
        background: #eff6ff; border: 1px solid #bfdbfe;
        border-radius: 12px; padding: 14px;
        font-size: 12px; color: #1e40af;
        line-height: 1.7; margin-top: 16px;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Fraud Detector loaded');