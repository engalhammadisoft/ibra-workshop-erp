/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — العملاء والموردون (v4 مع طباعة كشف الحساب)
   ═══════════════════════════════════════════════════════════════ */

const Customers = {
  currentTab: 'customers',
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const isCustomers = this.currentTab === 'customers';
    const list = isCustomers ? (DB.get('customers') || []) : (DB.get('suppliers') || []);

    // تصفية
    let filtered = list;
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = list.filter(item =>
        item.name.toLowerCase().includes(s) ||
        (item.phone && item.phone.includes(s))
      );
    }

    // إحصائيات
    let totalDebts = 0;
    let debtorsCount = 0;
    
    if (isCustomers) {
      const invoices = DB.get('invoices') || [];
      filtered.forEach(c => {
        const invs = invoices.filter(i => i.customerId === c.id && (i.status === 'unpaid' || i.status === 'partial'));
        const debt = invs.reduce((sum, i) => sum + ((i.total || 0) - (i.paidAmount || 0)), 0);
        if (debt > 0) { totalDebts += debt; debtorsCount++; }
      });
    }

    let html = `
      <div class="page-header">
        <h1 class="page-title">${isCustomers ? 'العملاء' : 'الموردون'}</h1>
        <button class="btn btn-primary" onclick="Customers.openForm()">➕ ${isCustomers ? 'عميل جديد' : 'مورد جديد'}</button>
      </div>

      <!-- التبويبات -->
      <div class="cust-tabs">
        <button class="ct-btn ${isCustomers ? 'active' : ''}" onclick="Customers.switchTab('customers')">
          👥 العملاء
        </button>
        <button class="ct-btn ${!isCustomers ? 'active' : ''}" onclick="Customers.switchTab('suppliers')">
          🚚 الموردون
        </button>
      </div>

      <!-- إحصائيات -->
      ${isCustomers ? `
        <div class="cust-hero">
          <div class="ch-title">
            <h2>العملاء 👥</h2>
            <p>إدارة كشف حساب العملاء</p>
          </div>
          <div class="ch-stats">
            <div class="chs-item">
              <div class="chs-label">إجمالي العملاء</div>
              <div class="chs-value">${list.length}</div>
            </div>
            <div class="chs-item">
              <div class="chs-label">عليهم مديونية</div>
              <div class="chs-value" style="color:#fbbf24;">${debtorsCount}</div>
            </div>
            <div class="chs-item" style="grid-column:span 2;">
              <div class="chs-label">إجمالي المديونية</div>
              <div class="chs-value" style="color:#f87171;">${Utils.money(totalDebts)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 بحث بالاسم أو الهاتف..." value="${Utils.esc(this.searchTerm)}" 
          oninput="Customers.searchTerm = this.value; Customers.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <!-- قائمة العملاء -->
      <div class="cust-list">
        ${filtered.length ? filtered.map(item => this.renderCard(item, isCustomers)).join('') : `
          <div class="empty-state">
            <div class="icon">${isCustomers ? '👥' : '🚚'}</div>
            <p>لا توجد سجلات مطابقة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(item, isCustomers) {
    let balance = 0;
    if (isCustomers) {
      const invoices = DB.get('invoices') || [];
      const invs = invoices.filter(i => i.customerId === item.id);
      balance = invs.reduce((sum, i) => sum + ((i.total || 0) - (i.paidAmount || 0)), 0);
    }

    const initial = item.name.charAt(0);
    const hasDebt = balance > 0;

    return `
      <div class="cust-card ${hasDebt ? 'cust-debt' : ''}">
        <div class="cc-header">
          <div class="cc-avatar ${isCustomers ? 'cc-avatar-cust' : 'cc-avatar-supp'}">
            ${initial}
          </div>
          <div class="cc-info">
            <div class="cc-name">${Utils.esc(item.name)}</div>
            <div class="cc-phone">📞 ${Utils.esc(item.phone || '—')}</div>
            ${item.address ? `<div class="cc-address">📍 ${Utils.esc(item.address)}</div>` : ''}
          </div>
        </div>

        ${isCustomers && balance !== 0 ? `
          <div class="cc-balance ${hasDebt ? 'debt' : 'credit'}">
            <span>${hasDebt ? '⚠️ عليه مديونية' : '✅ رصيد له'}</span>
            <b>${Utils.money(balance)}</b>
          </div>
        ` : isCustomers ? `
          <div class="cc-balance zero"><span>✅ لا يوجد مديونية</span></div>
        ` : ''}

        <div class="cc-actions">
          ${isCustomers ? `
            <button class="cc-btn cc-stmt" onclick="Customers.openStatement('${item.id}')">
              📊 كشف حساب
            </button>
          ` : ''}
          <button class="cc-btn cc-edit" onclick="Customers.openForm('${item.id}')">✏️</button>
          <button class="cc-btn cc-delete" onclick="Customers.remove('${item.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.searchTerm = '';
    this.render();
  },

  openForm(id = null) {
    const isCustomers = this.currentTab === 'customers';
    if (!Auth.require(isCustomers ? 'sales.manage' : 'inventory.manage', 'إدارة السجلات')) return;

    const item = id ? DB.find(isCustomers ? 'customers' : 'suppliers', id) : null;

    const formHtml = `
      <div class="cust-form">
        <div class="cf-header ${isCustomers ? 'cf-blue' : 'cf-teal'}">
          <div class="cfh-icon">${isCustomers ? '👤' : '🚚'}</div>
          <div>
            <h2>${item ? 'تعديل' : 'إضافة'} ${isCustomers ? 'عميل' : 'مورد'}</h2>
            <p>${item ? 'تحديث البيانات' : 'سجل جديد في النظام'}</p>
          </div>
        </div>
        
        <div class="cf-body">
          <div class="cff-field">
            <label>الاسم <span style="color:var(--danger);">*</span></label>
            <input type="text" id="custName" value="${item ? Utils.esc(item.name) : ''}" placeholder="مثال: أحمد محمد">
          </div>
          <div class="cff-field">
            <label>الهاتف</label>
            <input type="text" id="custPhone" value="${item ? Utils.esc(item.phone || '') : ''}" placeholder="7XXXXXXXX">
          </div>
          <div class="cff-field">
            <label>العنوان</label>
            <input type="text" id="custAddress" value="${item ? Utils.esc(item.address || '') : ''}" placeholder="المدينة - الحي">
          </div>
          <div class="cff-field">
            <label>ملاحظات</label>
            <textarea id="custNotes" rows="2" placeholder="ملاحظات إضافية...">${item ? Utils.esc(item.notes || '') : ''}</textarea>
          </div>
        </div>
        
        <div class="cf-actions">
          <button class="cf-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="cf-btn save" onclick="Customers.save('${id || ''}')">💾 حفظ</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save(id) {
    const isCustomers = this.currentTab === 'customers';
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const notes = document.getElementById('custNotes').value.trim();

    if (!name) { UI.toast('⚠️ الاسم مطلوب', 'error'); return; }

    const data = { name, phone, address, notes };
    const table = isCustomers ? 'customers' : 'suppliers';

    if (id) {
      DB.update(table, id, data);
      UI.toast('✅ تم التعديل', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      DB.insert(table, data);
      UI.toast('✅ تمت الإضافة', 'success');
    }

    UI.closeModal();
    this.render();
  },

  remove(id) {
    const isCustomers = this.currentTab === 'customers';
    const label = isCustomers ? 'العميل' : 'المورد';
    if (!confirm(`حذف ${label}؟`)) return;
    DB.remove(isCustomers ? 'customers' : 'suppliers', id);
    this.render();
    UI.toast(`✅ تم حذف ${label}`, 'success');
  },

  openStatement(id) {
    const customer = DB.find('customers', id);
    if (!customer) return;

    const invoices = (DB.get('invoices') || []).filter(i => i.customerId === id);
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const balance = totalInvoiced - totalPaid;

    const bodyHtml = `
      <div style="display:grid; gap:14px; max-height:65vh; overflow-y:auto;">
        
        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding:16px; border-radius:12px; color:#fff;">
          <div style="font-size:18px; font-weight:800; margin-bottom:4px;">${Utils.esc(customer.name)}</div>
          <div style="font-size:12px; opacity:0.9;">📞 ${Utils.esc(customer.phone || '—')}</div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
          <div style="background:#f1f5f9; padding:12px; border-radius:10px; text-align:center;">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">إجمالي الفواتير</div>
            <div style="font-size:13px; font-weight:800;">${Utils.money(totalInvoiced)}</div>
          </div>
          <div style="background:#dcfce7; padding:12px; border-radius:10px; text-align:center;">
            <div style="font-size:10px; color:#166534; margin-bottom:4px;">المدفوع</div>
            <div style="font-size:13px; font-weight:800; color:#166534;">${Utils.money(totalPaid)}</div>
          </div>
          <div style="background:${balance > 0 ? '#fee2e2' : '#f1f5f9'}; padding:12px; border-radius:10px; text-align:center;">
            <div style="font-size:10px; color:${balance > 0 ? '#991b1b' : 'var(--text-muted)'}; margin-bottom:4px;">المتبقي</div>
            <div style="font-size:13px; font-weight:800; color:${balance > 0 ? '#991b1b' : 'var(--text)'};">${Utils.money(balance)}</div>
          </div>
        </div>

        <div style="background:#fff; border:1px solid var(--border); border-radius:10px; overflow:hidden;">
          <div style="padding:12px 14px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700; font-size:13px;">
            📋 سجل الفواتير (${invoices.length})
          </div>
          ${invoices.length ? invoices.map(inv => `
            <div style="padding:10px 14px; border-bottom:1px solid var(--border); font-size:12px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <b style="color:var(--primary);">${inv.invoiceNumber}</b>
                <span>${Utils.date(inv.createdAt)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
                <span>${Utils.statusText(inv.status)}</span>
                <span>إجمالي: <b>${Utils.money(inv.total)}</b> | مدفوع: <b>${Utils.money(inv.paidAmount || 0)}</b></span>
              </div>
            </div>
          `).join('') : `
            <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">
              لا توجد فواتير مسجلة لهذا العميل.
            </div>
          `}
        </div>

        <!-- أزرار الطباعة -->
        <button class="btn btn-primary" onclick="Customers.printStatement('${id}')" style="width:100%; padding:12px;">
          🖨️ طباعة كشف الحساب
        </button>
      </div>
    `;

    UI.openModal(`كشف حساب: ${customer.name}`, bodyHtml, '<button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>');
  },

  /** 🖨️ طباعة كشف الحساب */
  printStatement(customerId) {
    const customer = DB.find('customers', customerId);
    if (!customer) return;

    const invoices = (DB.get('invoices') || []).filter(i => i.customerId === customerId);
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const balance = totalInvoiced - totalPaid;
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${customer.name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:750px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563eb; padding-bottom:16px; margin-bottom:24px; }
          .company-info h1 { font-size:20px; color:#2563eb; font-weight:800; margin-bottom:4px; }
          .company-info p { font-size:11px; color:#64748b; line-height:1.6; }
          .report-title { text-align:left; }
          .report-title h2 { font-size:18px; color:#1e293b; margin-bottom:4px; }
          .report-title p { font-size:12px; color:#64748b; }
          
          .customer-info {
            background:#f8fafc; padding:16px; border-radius:10px; margin-bottom:20px;
            display:flex; justify-content:space-between; align-items:center;
            border-right:4px solid #2563eb;
          }
          .customer-info h3 { font-size:16px; color:#1e293b; margin-bottom:4px; }
          .customer-info p { font-size:12px; color:#64748b; }
          
          .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:24px; }
          .kpi-box { background:#f8fafc; padding:14px; border-radius:10px; text-align:center; }
          .kpi-box.primary { background:#dbeafe; }
          .kpi-box.success { background:#dcfce7; }
          .kpi-box.danger { background:#fee2e2; }
          .kpi-label { font-size:10px; color:#64748b; margin-bottom:4px; }
          .kpi-value { font-size:16px; font-weight:800; color:#1e293b; }
          .kpi-box.success .kpi-value { color:#166534; }
          .kpi-box.danger .kpi-value { color:#991b1b; }
          
          table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .status-paid { background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; }
          .status-partial { background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; }
          .status-unpaid { background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; }
          
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; }
          
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#2563eb; color:#fff; }
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
              ${logo ? `<img src="${logo}" style="width:50px; height:50px; object-fit:contain; margin-bottom:8px;">` : ''}
              <h1>${settings.companyName || 'ورشة التصنيع'}</h1>
              <p>${settings.companyPhone || ''}<br>${settings.companyAddress || ''}</p>
            </div>
            <div class="report-title">
              <h2>كشف حساب عميل</h2>
              <p>${Utils.date(new Date(), true)}</p>
            </div>
          </div>

          <div class="customer-info">
            <div>
              <h3>${Utils.esc(customer.name)}</h3>
              <p>📞 ${Utils.esc(customer.phone || '—')}</p>
            </div>
            <div style="text-align:left; font-size:12px; color:#64748b;">
              ${customer.address ? `📍 ${Utils.esc(customer.address)}` : ''}
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box primary">
              <div class="kpi-label">إجمالي الفواتير</div>
              <div class="kpi-value">${Utils.money(totalInvoiced)}</div>
            </div>
            <div class="kpi-box success">
              <div class="kpi-label">المدفوع</div>
              <div class="kpi-value">${Utils.money(totalPaid)}</div>
            </div>
            <div class="kpi-box ${balance > 0 ? 'danger' : ''}">
              <div class="kpi-label">المتبقي</div>
              <div class="kpi-value">${Utils.money(balance)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.length ? invoices.map(inv => {
                const remaining = (inv.total || 0) - (inv.paidAmount || 0);
                const statusClass = inv.status === 'paid' ? 'status-paid' : (inv.status === 'partial' ? 'status-partial' : 'status-unpaid');
                return `
                  <tr>
                    <td style="font-weight:700; color:#2563eb;">${inv.invoiceNumber}</td>
                    <td>${Utils.date(inv.createdAt)}</td>
                    <td>${Utils.money(inv.total)}</td>
                    <td style="color:#16a34a;">${Utils.money(inv.paidAmount || 0)}</td>
                    <td style="color:${remaining > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">${Utils.money(remaining)}</td>
                    <td><span class="${statusClass}">${Utils.statusText(inv.status)}</span></td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">لا توجد فواتير مسجلة لهذا العميل.</td></tr>
              `}
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
    if (document.getElementById('cust-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'cust-styles-v4';
    style.innerHTML = `
      .cust-tabs {
        display: flex; gap: 6px; margin-bottom: 16px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
      }
      .ct-btn {
        flex: 1; padding: 12px; background: transparent; border: none;
        border-radius: 8px; font-size: 13px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .ct-btn.active { background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; }
      
      .cust-hero {
        background: linear-gradient(135deg, #1e40af 0%, #1e293b 100%);
        border-radius: 20px; padding: 20px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(30,64,175,0.3);
        position: relative; overflow: hidden;
      }
      .cust-hero::before {
        content: ''; position: absolute;
        top: -50px; right: -50px; width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ch-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .ch-title h2 { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
      .ch-title p { font-size: 12px; opacity: 0.85; }
      .ch-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; position: relative; z-index: 1; }
      .chs-item { background: rgba(255,255,255,0.12); backdrop-filter: blur(10px); border-radius: 10px; padding: 10px 14px; }
      .chs-label { font-size: 10px; opacity: 0.85; margin-bottom: 4px; }
      .chs-value { font-size: 18px; font-weight: 800; }
      
      .cust-list { display: grid; gap: 12px; }
      .cust-card {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border); border-right: 4px solid #2563eb;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: all 0.2s;
      }
      .cust-debt { border-right-color: #dc2626; }
      .cust-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      
      .cc-header {
        padding: 16px; display: flex; gap: 12px;
        align-items: center; border-bottom: 1px solid var(--border);
      }
      .cc-avatar {
        width: 50px; height: 50px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 800; color: #fff; flex-shrink: 0;
      }
      .cc-avatar-cust { background: linear-gradient(135deg, #3b82f6, #1e40af); }
      .cc-avatar-supp { background: linear-gradient(135deg, #0891b2, #155e75); }
      .cc-info { flex: 1; min-width: 0; }
      .cc-name { font-size: 15px; font-weight: 800; color: var(--text); }
      .cc-phone { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .cc-address { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      
      .cc-balance {
        padding: 10px 16px; display: flex; justify-content: space-between;
        align-items: center; font-size: 12px;
        border-bottom: 1px solid var(--border);
      }
      .cc-balance.debt { background: #fef2f2; color: #991b1b; }
      .cc-balance.credit { background: #f0fdf4; color: #166534; }
      .cc-balance.zero { background: #f8fafc; color: var(--text-muted); }
      .cc-balance b { font-size: 14px; }
      
      .cc-actions { padding: 10px 16px; display: flex; gap: 6px; background: #f8fafc; }
      .cc-btn {
        flex: 1; padding: 8px; border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700; cursor: pointer;
        font-family: inherit; transition: all 0.2s;
      }
      .cc-stmt { background: #dbeafe; color: #1e40af; }
      .cc-edit { background: #fef3c7; color: #92400e; flex: 0.5; }
      .cc-delete { background: #fee2e2; color: #991b1b; flex: 0.5; }
      
      .cust-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .cf-header { padding: 20px; color: #fff; display: flex; align-items: center; gap: 14px; }
      .cf-blue { background: linear-gradient(135deg, #2563eb, #1e40af); }
      .cf-teal { background: linear-gradient(135deg, #0891b2, #155e75); }
      .cfh-icon {
        width: 50px; height: 50px; background: rgba(255,255,255,0.2);
        border-radius: 14px; display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .cf-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .cf-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .cf-body { padding: 20px; display: grid; gap: 14px; }
      .cff-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .cff-field input, .cff-field textarea {
        width: 100%; padding: 11px 14px; border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px; font-family: inherit;
        background: #fff; outline: none; box-sizing: border-box;
      }
      .cff-field input:focus, .cff-field textarea:focus {
        border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      
      .cf-actions {
        padding: 14px 20px; display: flex; gap: 10px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .cf-btn { padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .cf-btn.cancel { flex: 1; background: #fff; color: var(--text); border: 1px solid var(--border); }
      .cf-btn.save { flex: 2; background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Customers v4 loaded (with statement printing)');