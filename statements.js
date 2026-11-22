/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — كشوف الحسابات (شامل)
   ═══════════════════════════════════════════════════════════════ */

const Statements = {
  currentTab: 'customers', // customers, suppliers, employees
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const isCustomers = this.currentTab === 'customers';
    const isSuppliers = this.currentTab === 'suppliers';
    const isEmployees = this.currentTab === 'employees';

    let items = [];
    if (isCustomers) items = DB.get('customers') || [];
    if (isSuppliers) items = DB.get('suppliers') || [];
    if (isEmployees) items = DB.get('employees') || [];

    // البحث
    let filtered = items;
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = items.filter(i =>
        (i.name && i.name.toLowerCase().includes(s)) ||
        (i.phone && i.phone.includes(s))
      );
    }

    let html = `
      <div class="page-header">
        <h1 class="page-title">كشوف الحسابات</h1>
      </div>

      <!-- التبويبات -->
      <div class="stmt-tabs">
        <button class="stmt-tab ${isCustomers ? 'active' : ''}" onclick="Statements.switchTab('customers')">
          👥 العملاء
        </button>
        <button class="stmt-tab ${isSuppliers ? 'active' : ''}" onclick="Statements.switchTab('suppliers')">
          🚚 الموردون
        </button>
        <button class="stmt-tab ${isEmployees ? 'active' : ''}" onclick="Statements.switchTab('employees')">
          👷 الموظفون
        </button>
      </div>

      <!-- إحصائيات سريعة -->
      <div class="stmt-stats">
        <div class="stmt-stat">
          <div class="stmt-stat-icon">📊</div>
          <div class="stmt-stat-info">
            <div class="stmt-stat-label">إجمالي ${isCustomers ? 'العملاء' : isSuppliers ? 'الموردين' : 'الموظفين'}</div>
            <div class="stmt-stat-value">${items.length}</div>
          </div>
        </div>
        <div class="stmt-stat">
          <div class="stmt-stat-icon">💰</div>
          <div class="stmt-stat-info">
            <div class="stmt-stat-label">إجمالي المديونية</div>
            <div class="stmt-stat-value">${Utils.money(this.calculateTotalDebt(items))}</div>
          </div>
        </div>
        <div class="stmt-stat">
          <div class="stmt-stat-icon">🖨️</div>
          <div class="stmt-stat-info">
            <div class="stmt-stat-label">طباعة شاملة</div>
            <button class="btn btn-primary" style="padding:4px 10px; font-size:11px; margin-top:4px;" onclick="Statements.printAll()">
              طباعة الكل
            </button>
          </div>
        </div>
      </div>

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 بحث بالاسم أو الهاتف..." value="${Utils.esc(this.searchTerm)}" 
          oninput="Statements.searchTerm = this.value; Statements.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <!-- قائمة الكشوف -->
      <div class="stmt-list">
        ${filtered.length ? filtered.map(item => this.renderItem(item, isCustomers, isSuppliers)).join('') : `
          <div class="empty-state"><div class="icon">📊</div><p>لا توجد سجلات مطابقة.</p></div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderItem(item, isCustomer, isSupplier) {
    const initial = item.name ? item.name.charAt(0) : '?';
    const data = this.getStatementData(item, isCustomer, isSupplier);

    return `
      <div class="stmt-item-card">
        <div class="stmt-item-header">
          <div class="stmt-avatar stmt-avatar-${isCustomer ? 'customer' : isSupplier ? 'supplier' : 'employee'}">
            ${initial}
          </div>
          <div class="stmt-item-info">
            <div class="stmt-item-name">${Utils.esc(item.name)}</div>
            <div class="stmt-item-phone">📞 ${Utils.esc(item.phone || '—')}</div>
            <div class="stmt-item-role">${isCustomer ? '👥 عميل' : isSupplier ? '🚚 مورد' : '👷 موظف'}</div>
          </div>
          <div class="stmt-item-total ${data.balance > 0 ? 'debt' : data.balance < 0 ? 'credit' : 'zero'}">
            ${data.balance > 0 ? '⚠️ مديونية' : data.balance < 0 ? '✅ رصيد له' : '✔️ لا مستحقات'}
            <div class="stmt-item-value">${Utils.money(Math.abs(data.balance))}</div>
          </div>
        </div>
        <div class="stmt-item-actions">
          <button class="stmt-btn stmt-btn-view" onclick="Statements.openStatement('${item.id}', '${isCustomer ? 'customer' : isSupplier ? 'supplier' : 'employee'}')">
            👁️ عرض كشف الحساب
          </button>
          <button class="stmt-btn stmt-btn-print" onclick="Statements.printStatement('${item.id}', '${isCustomer ? 'customer' : isSupplier ? 'supplier' : 'employee'}')">
            🖨️ طباعة
          </button>
        </div>
      </div>
    `;
  },

  getStatementData(item, isCustomer, isSupplier) {
    const invoices = DB.get('invoices') || [];
    const vouchers = DB.get('vouchers') || [];
    const payments = DB.get('payments') || [];
    const payrolls = DB.get('payrolls') || [];

    if (isCustomer) {
      const cInv = invoices.filter(i => i.customerId === item.id);
      const cVouchers = vouchers.filter(v => v.party === item.id && v.type === 'receipt');
      const totalInvoiced = cInv.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const totalPaid = cInv.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
      return { totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid, count: cInv.length };
    }
    if (isSupplier) {
      const sVouchers = vouchers.filter(v => v.party === item.id);
      const totalOut = sVouchers.filter(v => v.type === 'payment').reduce((s, v) => s + (Number(v.amount) || 0), 0);
      const totalIn = sVouchers.filter(v => v.type === 'receipt').reduce((s, v) => s + (Number(v.amount) || 0), 0);
      return { totalInvoiced: totalOut, totalPaid: totalIn, balance: totalIn - totalOut, count: sVouchers.length };
    }
    // موظف
    const ePayrolls = payrolls.filter(p => p.employeeId === item.id);
    const totalSalary = ePayrolls.reduce((s, p) => s + (Number(p.netSalary) || 0), 0);
    const totalPaid = ePayrolls.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.netSalary) || 0), 0);
    const eVouchers = vouchers.filter(v => v.party === item.id);
    const extraIn = eVouchers.filter(v => v.type === 'receipt').reduce((s, v) => s + (Number(v.amount) || 0), 0);
    const extraOut = eVouchers.filter(v => v.type === 'payment').reduce((s, v) => s + (Number(v.amount) || 0), 0);
    return { totalInvoiced: totalSalary + extraOut, totalPaid: totalPaid + extraIn, balance: totalSalary + extraOut - totalPaid - extraIn, count: ePayrolls.length + eVouchers.length };
  },

  calculateTotalDebt(items) {
    let total = 0;
    items.forEach(item => {
      const data = this.getStatementData(item, this.currentTab === 'customers', this.currentTab === 'suppliers');
      if (data.balance > 0) total += data.balance;
    });
    return total;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.searchTerm = '';
    this.render();
  },

  openStatement(id, type) {
    const item = DB.find(type === 'customer' ? 'customers' : type === 'supplier' ? 'suppliers' : 'employees', id);
    if (!item) return;

    const transactions = this.getTransactions(id, type);
    const data = this.getStatementData(item, type === 'customer', type === 'supplier');

    const bodyHtml = `
      <div style="display:grid; gap:14px; max-height:65vh; overflow-y:auto;">
        
        <!-- رأس الكشف -->
        <div class="stmt-modal-header stmt-modal-${type}">
          <div class="smh-avatar">${item.name.charAt(0)}</div>
          <div class="smh-info">
            <div class="smh-name">${Utils.esc(item.name)}</div>
            <div class="smh-role">${type === 'customer' ? '👥 عميل' : type === 'supplier' ? '🚚 مورد' : '👷 موظف'}</div>
            <div class="smh-phone">📞 ${Utils.esc(item.phone || '—')}</div>
          </div>
        </div>

        <!-- الملخص -->
        <div class="stmt-modal-summary">
          <div class="sms-item">
            <div class="sms-label">إجمالي ${type === 'employee' ? 'المستحقات' : 'المدين'}</div>
            <div class="sms-value">${Utils.money(data.totalInvoiced)}</div>
          </div>
          <div class="sms-item sms-paid">
            <div class="sms-label">إجمالي المدفوع</div>
            <div class="sms-value">${Utils.money(data.totalPaid)}</div>
          </div>
          <div class="sms-item sms-balance ${data.balance > 0 ? 'debt' : 'credit'}">
            <div class="sms-label">الرصيد المتبقي</div>
            <div class="sms-value">${Utils.money(Math.abs(data.balance))}</div>
          </div>
        </div>

        <!-- الحركات -->
        <div>
          <div style="font-weight:800; font-size:13px; margin-bottom:8px;">📋 الحركات (${transactions.length})</div>
          <div class="stmt-transactions">
            ${transactions.length ? transactions.map(t => `
              <div class="stmt-trans-item">
                <div class="st-icon st-${t.type}">${t.type === 'in' ? '⬇️' : '⬆️'}</div>
                <div class="st-info">
                  <div class="st-title">${Utils.esc(t.description)}</div>
                  <div class="st-date">${Utils.date(t.date, true)}</div>
                </div>
                <div class="st-amount st-${t.type}">${t.type === 'in' ? '+' : '-'}${Utils.money(t.amount)}</div>
              </div>
            `).join('') : '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">لا توجد حركات</div>'}
          </div>
        </div>
      </div>
    `;

    UI.openModal('📊 كشف حساب: ' + item.name, bodyHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="Statements.printStatement('${id}', '${type}')">🖨️ طباعة</button>
    `);
  },

  getTransactions(id, type) {
    const result = [];
    const invoices = DB.get('invoices') || [];
    const vouchers = DB.get('vouchers') || [];
    const payments = DB.get('payments') || [];
    const payrolls = DB.get('payrolls') || [];

    if (type === 'customer') {
      invoices.filter(i => i.customerId === id).forEach(inv => {
        result.push({ type: 'out', amount: Number(inv.total) || 0, description: `فاتورة ${inv.invoiceNumber}`, date: inv.createdAt });
        if (Number(inv.paidAmount) > 0) {
          result.push({ type: 'in', amount: Number(inv.paidAmount), description: `دفعة على ${inv.invoiceNumber}`, date: inv.createdAt });
        }
      });
      vouchers.filter(v => v.party === id).forEach(v => {
        result.push({ 
          type: v.type === 'receipt' ? 'in' : 'out',
          amount: Number(v.amount) || 0,
          description: `${v.type === 'receipt' ? 'سند قبض' : 'سند صرف'} ${v.number}`,
          date: v.createdAt
        });
      });
    } else if (type === 'supplier') {
      vouchers.filter(v => v.party === id).forEach(v => {
        result.push({ 
          type: v.type === 'receipt' ? 'out' : 'in',
          amount: Number(v.amount) || 0,
          description: `${v.type === 'receipt' ? 'قبض من مورد' : 'دفع لمورد'} ${v.number}`,
          date: v.createdAt
        });
      });
    } else if (type === 'employee') {
      payrolls.filter(p => p.employeeId === id).forEach(p => {
        result.push({ 
          type: 'out', 
          amount: Number(p.netSalary) || 0, 
          description: `راتب شهر ${p.month}`, 
          date: p.createdAt 
        });
        if (p.status === 'paid') {
          result.push({ type: 'in', amount: Number(p.netSalary), description: `صرف راتب ${p.month}`, date: p.paidAt || p.createdAt });
        }
      });
      vouchers.filter(v => v.party === id).forEach(v => {
        result.push({ 
          type: v.type === 'receipt' ? 'in' : 'out',
          amount: Number(v.amount) || 0,
          description: `${v.type === 'receipt' ? 'سند قبض' : 'سند صرف'} ${v.number}`,
          date: v.createdAt
        });
      });
    }

    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  printStatement(id, type) {
    const item = DB.find(type === 'customer' ? 'customers' : type === 'supplier' ? 'suppliers' : 'employees', id);
    if (!item) return;

    const transactions = this.getTransactions(id, type);
    const data = this.getStatementData(item, type === 'customer', type === 'supplier');
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${item.name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:800px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e40af; padding-bottom:16px; margin-bottom:24px; }
          .company-info h1 { font-size:22px; color:#1e40af; margin-bottom:4px; font-weight:800; }
          .company-info p { font-size:11px; color:#64748b; }
          .company-logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
          .report-title { text-align:left; }
          .report-title h2 { font-size:22px; color:#1e293b; margin-bottom:4px; }
          .report-title p { font-size:12px; color:#64748b; }
          
          .customer-info { background:#f8fafc; padding:16px; border-radius:10px; margin-bottom:20px; border-right:4px solid #1e40af; }
          .customer-info h3 { font-size:16px; color:#1e293b; margin-bottom:4px; }
          .customer-info p { font-size:12px; color:#64748b; }
          
          .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
          .kpi-box { padding:14px; border-radius:10px; text-align:center; }
          .kpi-box.blue { background:#dbeafe; }
          .kpi-box.green { background:#dcfce7; }
          .kpi-box.red { background:#fee2e2; }
          .kpi-label { font-size:10px; font-weight:600; margin-bottom:4px; opacity:0.8; }
          .kpi-value { font-size:16px; font-weight:800; }
          
          table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .in { color:#10b981; font-weight:700; }
          .out { color:#dc2626; font-weight:700; }
          
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#1e40af; color:#fff; }
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
            <div class="company-info">
              ${logo ? `<img src="${logo}" class="company-logo">` : ''}
              <h1>${settings.companyName || 'ورشة التصنيع'}</h1>
              <p>📞 ${settings.companyPhone || ''}<br>${settings.companyAddress || ''}</p>
            </div>
            <div class="report-title">
              <h2>كشف حساب</h2>
              <p>${Utils.date(new Date(), true)}</p>
            </div>
          </div>

          <div class="customer-info">
            <h3>${Utils.esc(item.name)}</h3>
            <p>${type === 'customer' ? '👥 عميل' : type === 'supplier' ? '🚚 مورد' : '👷 موظف'} • 📞 ${Utils.esc(item.phone || '—')}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box blue">
              <div class="kpi-label">إجمالي ${type === 'employee' ? 'المستحقات' : 'المدين'}</div>
              <div class="kpi-value">${Utils.money(data.totalInvoiced)}</div>
            </div>
            <div class="kpi-box green">
              <div class="kpi-label">المدفوع</div>
              <div class="kpi-value">${Utils.money(data.totalPaid)}</div>
            </div>
            <div class="kpi-box red">
              <div class="kpi-label">المتبقي</div>
              <div class="kpi-value">${Utils.money(Math.abs(data.balance))}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th style="text-align:center;">مدين</th>
                <th style="text-align:center;">دائن</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${Utils.date(t.date)}</td>
                  <td>${Utils.esc(t.description)}</td>
                  <td style="text-align:center;" class="out">${t.type === 'out' ? Utils.money(t.amount) : '—'}</td>
                  <td style="text-align:center;" class="in">${t.type === 'in' ? Utils.money(t.amount) : '—'}</td>
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

  printAll() {
    const type = this.currentTab === 'customers' ? 'customer' : this.currentTab === 'suppliers' ? 'supplier' : 'employee';
    const items = type === 'customer' ? (DB.get('customers') || []) : type === 'supplier' ? (DB.get('suppliers') || []) : (DB.get('employees') || []);
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشوف الحسابات - ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الموظفين'}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:800px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { text-align:center; border-bottom:3px solid #1e40af; padding-bottom:16px; margin-bottom:24px; }
          .company-name { font-size:22px; font-weight:800; color:#1e40af; }
          .report-title { font-size:16px; color:#1e293b; margin-top:4px; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; margin-top:20px; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#1e40af; color:#fff; }
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
            ${logo ? `<img src="${logo}" style="width:50px; margin-bottom:8px;">` : ''}
            <div class="company-name">${settings.companyName || 'ورشة التصنيع'}</div>
            <div class="report-title">كشوف حسابات ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الموظفين'}</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">${Utils.date(new Date(), true)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>${type === 'employee' ? 'المستحقات' : 'المدين'}</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const data = this.getStatementData(item, type === 'customer', type === 'supplier');
                return `
                  <tr>
                    <td style="font-weight:700;">${Utils.esc(item.name)}</td>
                    <td dir="ltr">${Utils.esc(item.phone || '—')}</td>
                    <td>${Utils.money(data.totalInvoiced)}</td>
                    <td style="color:#10b981;">${Utils.money(data.totalPaid)}</td>
                    <td style="font-weight:700; color:${data.balance > 0 ? '#dc2626' : '#10b981'};">${Utils.money(Math.abs(data.balance))}</td>
                  </tr>
                `;
              }).join('')}
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
    if (document.getElementById('stmt-styles')) return;
    const style = document.createElement('style');
    style.id = 'stmt-styles';
    style.innerHTML = `
      .stmt-tabs {
        display: flex; gap: 6px; margin-bottom: 16px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
      }
      .stmt-tab {
        flex: 1; padding: 12px; background: transparent; border: none;
        border-radius: 8px; font-size: 13px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .stmt-tab.active { background: linear-gradient(135deg, #1e40af, #0f172a); color: #fff; }

      .stmt-stats {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 10px; margin-bottom: 16px;
      }
      .stmt-stat {
        background: #fff; border-radius: 14px; padding: 14px;
        display: flex; align-items: center; gap: 10px;
        border: 1px solid var(--border);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .stmt-stat-icon { font-size: 22px; }
      .stmt-stat-info { flex: 1; }
      .stmt-stat-label { font-size: 10px; color: var(--text-muted); }
      .stmt-stat-value { font-size: 14px; font-weight: 800; color: var(--text); margin-top: 2px; }

      .stmt-list { display: grid; gap: 10px; }
      .stmt-item-card {
        background: #fff; border-radius: 14px;
        padding: 14px; border: 1px solid var(--border);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .stmt-item-header {
        display: flex; gap: 12px; align-items: center;
        margin-bottom: 12px;
      }
      .stmt-avatar {
        width: 48px; height: 48px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 800; color: #fff;
        flex-shrink: 0;
      }
      .stmt-avatar-customer { background: linear-gradient(135deg, #3b82f6, #1e40af); }
      .stmt-avatar-supplier { background: linear-gradient(135deg, #0891b2, #155e75); }
      .stmt-avatar-employee { background: linear-gradient(135deg, #10b981, #047857); }
      .stmt-item-info { flex: 1; min-width: 0; }
      .stmt-item-name { font-size: 14px; font-weight: 800; color: var(--text); }
      .stmt-item-phone { font-size: 11px; color: var(--text-muted); }
      .stmt-item-role { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
      .stmt-item-total {
        text-align: left; font-size: 11px; font-weight: 700;
      }
      .stmt-item-total.debt { color: #dc2626; }
      .stmt-item-total.credit { color: #10b981; }
      .stmt-item-total.zero { color: var(--text-muted); }
      .stmt-item-value { font-size: 14px; font-weight: 800; margin-top: 2px; }
      
      .stmt-item-actions {
        display: grid; grid-template-columns: 1fr auto;
        gap: 6px;
      }
      .stmt-btn {
        padding: 10px; border: none; border-radius: 8px;
        font-size: 12px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .stmt-btn-view { background: #dbeafe; color: #1e40af; }
      .stmt-btn-print { background: linear-gradient(135deg, #1e40af, #0f172a); color: #fff; }

      /* Modal */
      .stmt-modal-header {
        padding: 16px; border-radius: 12px; color: #fff;
        display: flex; align-items: center; gap: 12px;
      }
      .stmt-modal-customer { background: linear-gradient(135deg, #3b82f6, #1e40af); }
      .stmt-modal-supplier { background: linear-gradient(135deg, #0891b2, #155e75); }
      .stmt-modal-employee { background: linear-gradient(135deg, #10b981, #047857); }
      .smh-avatar {
        width: 50px; height: 50px; border-radius: 12px;
        background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; font-weight: 800;
      }
      .smh-info { flex: 1; }
      .smh-name { font-size: 16px; font-weight: 800; }
      .smh-role { font-size: 11px; opacity: 0.9; }
      .smh-phone { font-size: 11px; opacity: 0.85; margin-top: 2px; }

      .stmt-modal-summary {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .sms-item {
        background: #f8fafc; padding: 12px; border-radius: 10px;
        text-align: center;
      }
      .sms-paid { background: #dcfce7; }
      .sms-balance.debt { background: #fee2e2; }
      .sms-balance.credit { background: #dcfce7; }
      .sms-label { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
      .sms-value { font-size: 13px; font-weight: 800; }

      .stmt-transactions {
        display: grid; gap: 6px;
        max-height: 300px; overflow-y: auto;
      }
      .stmt-trans-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px; background: #f8fafc; border-radius: 8px;
      }
      .st-icon {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0;
      }
      .st-in { background: #dcfce7; color: #166534; }
      .st-out { background: #fee2e2; color: #991b1b; }
      .st-info { flex: 1; min-width: 0; }
      .st-title {
        font-size: 12px; font-weight: 700;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .st-date { font-size: 10px; color: var(--text-muted); }
      .st-amount { font-size: 12px; font-weight: 800; white-space: nowrap; }
      .st-in { color: #10b981; }
      .st-out { color: #dc2626; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Statements loaded');