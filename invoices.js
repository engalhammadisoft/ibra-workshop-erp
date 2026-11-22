/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — المبيعات والفواتير (v4 - أزرق احترافي)
   ═══════════════════════════════════════════════════════════════ */

const Invoices = {
  filter: 'all', // all, paid, partial, unpaid

  render() {
    const content = document.getElementById('content');
    const invoices = DB.get('invoices') || [];

    // تصفية
    let filtered = invoices;
    if (this.filter === 'paid') filtered = invoices.filter(i => i.status === 'paid');
    if (this.filter === 'partial') filtered = invoices.filter(i => i.status === 'partial');
    if (this.filter === 'unpaid') filtered = invoices.filter(i => i.status === 'unpaid');

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات
    const total = invoices.length;
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const totalRemaining = totalInvoiced - totalCollected;
    
    const paidCount = invoices.filter(i => i.status === 'paid').length;
    const partialCount = invoices.filter(i => i.status === 'partial').length;
    const unpaidCount = invoices.filter(i => i.status === 'unpaid').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">المبيعات والفواتير</h1>
        <button class="btn btn-primary" onclick="Invoices.openForm()">➕ فاتورة جديدة</button>
      </div>

      <!-- البطاقة الرئيسية الزرقاء -->
      <div class="inv-hero-blue">
        <div class="ihb-header">
          <div class="ihb-title">إجمالي المبيعات</div>
          <div class="ihb-icon">🧾</div>
        </div>
        <div class="ihb-main-value">${Utils.money(totalInvoiced)}</div>
        <div class="ihb-stats">
          <div class="ihb-stat">
            <div class="ihb-stat-label">💰 المحصل</div>
            <div class="ihb-stat-value" style="color:#86efac;">${Utils.money(totalCollected)}</div>
          </div>
          <div class="ihb-divider"></div>
          <div class="ihb-stat">
            <div class="ihb-stat-label">⏳ المتبقي</div>
            <div class="ihb-stat-value" style="color:#fca5a5;">${Utils.money(totalRemaining)}</div>
          </div>
        </div>
      </div>

      <!-- إحصائيات سريعة -->
      <div class="inv-stats-grid">
        <div class="inv-stat-card inv-stat-total">
          <div class="isc-icon">📄</div>
          <div class="isc-info">
            <div class="isc-value">${total}</div>
            <div class="isc-label">إجمالي الفواتير</div>
          </div>
        </div>
        <div class="inv-stat-card inv-stat-paid">
          <div class="isc-icon">✅</div>
          <div class="isc-info">
            <div class="isc-value">${paidCount}</div>
            <div class="isc-label">مدفوعة</div>
          </div>
        </div>
        <div class="inv-stat-card inv-stat-partial">
          <div class="isc-icon">🟡</div>
          <div class="isc-info">
            <div class="isc-value">${partialCount}</div>
            <div class="isc-label">جزئية</div>
          </div>
        </div>
        <div class="inv-stat-card inv-stat-unpaid">
          <div class="isc-icon">🔴</div>
          <div class="isc-info">
            <div class="isc-value">${unpaidCount}</div>
            <div class="isc-label">غير مدفوعة</div>
          </div>
        </div>
      </div>

      <!-- الفلاتر -->
      <div class="inv-filters-blue">
        <button class="ifb-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Invoices.setFilter('all')">📋 الكل</button>
        <button class="ifb-btn ${this.filter === 'paid' ? 'active' : ''}" onclick="Invoices.setFilter('paid')">✅ مدفوعة</button>
        <button class="ifb-btn ${this.filter === 'partial' ? 'active' : ''}" onclick="Invoices.setFilter('partial')">🟡 جزئية</button>
        <button class="ifb-btn ${this.filter === 'unpaid' ? 'active' : ''}" onclick="Invoices.setFilter('unpaid')">🔴 غير مدفوعة</button>
      </div>

      <!-- قائمة الفواتير -->
      <div class="invoices-list-blue">
        ${filtered.length ? filtered.map(inv => this.renderCard(inv)).join('') : `
          <div class="empty-state">
            <div class="icon">🧾</div>
            <p>لا توجد فواتير في هذه الفئة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(inv) {
    const color = Utils.statusColor(inv.status);
    const remaining = (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0);
    const isPaid = inv.status === 'paid';

    return `
      <div class="inv-card-blue inv-card-${inv.status}">
        <div class="icb-header">
          <div class="icb-number">#${inv.invoiceNumber}</div>
          <div class="icb-status icb-status-${inv.status}">
            ${isPaid ? '✅ مدفوعة' : inv.status === 'partial' ? '🟡 جزئية' : '🔴 غير مدفوعة'}
          </div>
        </div>
        
        <div class="icb-body">
          <div class="icb-customer">
            <div class="icb-avatar">${Utils.esc(inv.customerName).charAt(0)}</div>
            <div class="icb-customer-info">
              <div class="icb-customer-name">${Utils.esc(inv.customerName)}</div>
              <div class="icb-project-name">${Utils.esc(inv.projectName || 'بيع مباشر')}</div>
            </div>
          </div>
          
          <div class="icb-amounts">
            <div class="icb-amount-item">
              <div class="icb-amount-label">الإجمالي</div>
              <div class="icb-amount-value">${Utils.money(inv.total)}</div>
            </div>
            <div class="icb-amount-item">
              <div class="icb-amount-label">المدفوع</div>
              <div class="icb-amount-value paid">${Utils.money(inv.paidAmount || 0)}</div>
            </div>
            <div class="icb-amount-item">
              <div class="icb-amount-label">المتبقي</div>
              <div class="icb-amount-value remaining">${Utils.money(remaining)}</div>
            </div>
          </div>
        </div>
        
        <div class="icb-footer">
          <div class="icb-date">📅 ${Utils.date(inv.createdAt)}</div>
          <div class="icb-actions">
            ${!isPaid ? `
              <button class="icb-btn icb-btn-pay" onclick="Invoices.openPayment('${inv.id}')">
                💵 تحصيل
              </button>
            ` : ''}
            <button class="icb-btn icb-btn-print" onclick="Invoices.printInvoice('${inv.id}')">
              🖨️ طباعة
            </button>
          </div>
        </div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  openForm() {
    if (!Auth.require('sales.manage', 'إدارة المبيعات')) return;

    const projects = DB.get('projects') || [];
    const validProjects = projects.filter(p => p.totalPrice > 0);

    if (!validProjects.length) {
      UI.toast('⚠️ لا توجد مشاريع لها سعر بيع محدد', 'warning');
      return;
    }

    const formHtml = `
      <div class="inv-form-blue">
        <div class="ifb-header">
          <div class="ifb-icon">🧾</div>
          <div>
            <h2>إصدار فاتورة جديدة</h2>
            <p>فاتورة مشروع للعميل</p>
          </div>
        </div>
        
        <div class="ifb-body">
          <div class="ifb-field">
            <label>المشروع <span style="color:var(--danger);">*</span></label>
            <select id="invProject">
              ${validProjects.map(p => `<option value="${p.id}" data-total="${p.totalPrice}">${p.projectNumber} - ${p.productName} (${Utils.money(p.totalPrice)})</option>`).join('')}
            </select>
          </div>
          
          <div class="ifb-field">
            <label>الدفعة المقدمة / المدفوع</label>
            <input type="number" id="invPaid" value="0" min="0">
          </div>

          <div class="ifb-field">
            <label>ملاحظات الفاتورة</label>
            <input type="text" id="invNotes" placeholder="مثال: دفعة مقدمة...">
          </div>
        </div>
        
        <div class="ifb-actions">
          <button class="ifb-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="ifb-btn save" onclick="Invoices.save()">✅ إصدار الفاتورة</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save() {
    const projectId = document.getElementById('invProject').value;
    const paid = Number(document.getElementById('invPaid').value) || 0;
    const notes = document.getElementById('invNotes').value.trim();

    const project = DB.find('projects', projectId);
    if (!project) return;

    const total = Number(project.totalPrice) || 0;
    let status = 'unpaid';
    if (paid >= total) status = 'paid';
    else if (paid > 0) status = 'partial';

    const invoiceNumber = Utils.docNumber('INV');

    DB.insert('invoices', {
      invoiceNumber,
      projectId,
      projectName: project.productName,
      customerId: project.customerId,
      customerName: project.customerName,
      total,
      paidAmount: paid,
      status,
      notes,
      createdAt: new Date().toISOString()
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم إصدار الفاتورة', 'success');
  },

  openPayment(invoiceId) {
    if (!Auth.require('sales.manage', 'إدارة المبيعات')) return;

    const inv = DB.find('invoices', invoiceId);
    if (!inv) return;

    const remaining = inv.total - (inv.paidAmount || 0);

    const formHtml = `
      <div style="display:grid; gap:14px;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding:14px; border-radius:10px; color:#fff;">
          <div style="font-weight:800; margin-bottom:4px;">${inv.invoiceNumber}</div>
          <div style="font-size:12px; opacity:0.9;">${inv.customerName}</div>
        </div>
        <div style="background:var(--bg); padding:12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
            <span>الإجمالي:</span>
            <b>${Utils.money(inv.total)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; color:var(--success);">
            <span>المدفوع:</span>
            <b>${Utils.money(inv.paidAmount || 0)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:14px; padding-top:6px; border-top:1px dashed var(--border); color:var(--danger); font-weight:800;">
            <span>المتبقي:</span>
            <b>${Utils.money(remaining)}</b>
          </div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ المحصل *</label>
          <input type="number" id="payAmount" value="${remaining}" min="1" max="${remaining}"
            style="width:100%; padding:12px; border:2px solid var(--primary); border-radius:8px; margin-top:6px; font-size:18px; font-weight:800; text-align:center; background:#fff;">
        </div>
      </div>
    `;

    UI.openModal('💵 تحصيل دفعة', formHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-success" onclick="Invoices.savePayment('${invoiceId}')">✅ تأكيد التحصيل</button>
    `);
  },

  savePayment(invoiceId) {
    const inv = DB.find('invoices', invoiceId);
    if (!inv) return;

    const amount = Number(document.getElementById('payAmount').value) || 0;
    if (amount <= 0) return;

    const newPaid = (inv.paidAmount || 0) + amount;
    const status = newPaid >= inv.total ? 'paid' : 'partial';

    DB.update('invoices', invoiceId, { paidAmount: newPaid, status });
    
    DB.insert('payments', {
      type: 'in',
      amount,
      refId: invoiceId,
      refType: 'invoice',
      note: `تحصيل فاتورة ${inv.invoiceNumber}`,
      date: new Date().toISOString()
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم التحصيل', 'success');
  },

  printInvoice(id) {
    const inv = DB.find('invoices', id);
    if (!inv) return;

    const settings = DB.getSettings();
    const printSize = settings.printSize || 'A4';
    const invoiceColor = settings.invoiceColor || 'blue';
    const logo = settings.companyLogo || '';

    const colors = {
      orange: { primary: '#ea580c', secondary: '#f59e0b', light: '#fef3c7' },
      blue: { primary: '#1e40af', secondary: '#2563eb', light: '#dbeafe' },
      green: { primary: '#15803d', secondary: '#16a34a', light: '#dcfce7' },
      dark: { primary: '#0f172a', secondary: '#334155', light: '#f1f5f9' }
    }[invoiceColor] || { primary: '#1e40af', secondary: '#2563eb', light: '#dbeafe' };

    const win = window.open('', '_blank', 'width=800,height=600');

    const itemsHtml = inv.items ? inv.items.map(it => `
      <tr>
        <td>${Utils.esc(it.name)}</td>
        <td>${it.qty}</td>
        <td>${Utils.money(it.price)}</td>
        <td>${Utils.money(it.price * it.qty)}</td>
      </tr>
    `).join('') : `
      <tr>
        <td>${Utils.esc(inv.projectName || 'مشروع')}</td>
        <td>1</td>
        <td>${Utils.money(inv.total)}</td>
        <td>${Utils.money(inv.total)}</td>
      </tr>
    `;

    const pageSize = printSize === 'A4' ? 'A4' : (printSize === '80mm' ? '80mm auto' : '58mm auto');
    const bodyWidth = printSize === 'A4' ? '700px' : (printSize === '80mm' ? '76mm' : '54mm');
    const fontSize = printSize === 'A4' ? '13px' : '11px';

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${inv.invoiceNumber}</title>
        <style>
          @page { size: ${pageSize}; margin: ${printSize === 'A4' ? '10mm' : '2mm'}; }
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .invoice {
            background:#fff; width:${bodyWidth}; max-width:100%;
            margin:0 auto; padding:${printSize === 'A4' ? '30px' : '10px'};
            border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1);
            font-size:${fontSize};
          }
          .header {
            display:flex; justify-content:space-between; align-items:flex-start;
            border-bottom:3px solid ${colors.primary}; padding-bottom:16px; margin-bottom:20px;
          }
          .header-logo { width:70px; height:70px; object-fit:contain; margin-bottom:8px; }
          .company-name { font-size:20px; font-weight:800; color:${colors.primary}; margin-bottom:4px; }
          .company-info { font-size:11px; color:#666; line-height:1.6; }
          .invoice-title { text-align:left; }
          .invoice-title h2 { font-size:18px; color:#1e293b; margin-bottom:6px; }
          .invoice-number {
            font-size:15px; font-weight:800; color:${colors.primary};
            background:${colors.light}; padding:4px 12px; border-radius:6px; display:inline-block;
          }
          .invoice-date { font-size:11px; color:#666; margin-top:6px; }
          .customer-section {
            background:${colors.light}; padding:12px 16px; border-radius:6px;
            margin-bottom:20px; display:flex; justify-content:space-between; font-size:12px;
          }
          table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:inherit; }
          thead { background:${colors.primary}; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .totals { margin-right:auto; width:${printSize === 'A4' ? '280px' : '100%'}; font-size:inherit; }
          .totals-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; }
          .totals-row.final {
            background:${colors.primary}; color:#fff; padding:12px;
            border-radius:6px; font-weight:700; font-size:15px; margin-top:8px; border:none;
          }
          .footer { text-align:center; margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#666; line-height:1.8; }
          .footer .thanks { font-size:14px; color:${colors.primary}; font-weight:700; margin-bottom:6px; }
          .print-actions { position:fixed; top:20px; left:20px; display:flex; gap:8px; z-index:999; }
          .print-btn { padding:10px 20px; border-radius:8px; border:none; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-print { background:${colors.primary}; color:#fff; }
          .btn-close { background:#fff; color:#333; border:1px solid #ddd; }
          @media print { body { background:#fff; padding:0; } .invoice { box-shadow:none; padding:0; } .print-actions { display:none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="print-btn btn-print" onclick="window.print()">🖨️ طباعة</button>
          <button class="print-btn btn-close" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="invoice">
          <div class="header">
            <div>
              ${logo ? `<img src="${logo}" class="header-logo">` : ''}
              <div class="company-name">${settings.companyName || 'ورشة التصنيع'}</div>
              <div class="company-info">${settings.companyPhone || ''}<br>${settings.companyAddress || ''}</div>
            </div>
            <div class="invoice-title">
              <h2>فاتورة</h2>
              <div class="invoice-number">#${inv.invoiceNumber}</div>
              <div class="invoice-date">${Utils.date(inv.createdAt, true)}</div>
            </div>
          </div>
          <div class="customer-section">
            <div><strong>العميل:</strong> ${Utils.esc(inv.customerName)}</div>
            <div><strong>الحالة:</strong> ${Utils.statusText(inv.status)}</div>
          </div>
          <table>
            <thead><tr><th>البيان</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>الإجمالي:</span><strong>${Utils.money(inv.total)}</strong></div>
            <div class="totals-row"><span>المدفوع:</span><strong style="color:#16a34a;">${Utils.money(inv.paidAmount || 0)}</strong></div>
            <div class="totals-row final"><span>المتبقي:</span><strong>${Utils.money((inv.total || 0) - (inv.paidAmount || 0))}</strong></div>
          </div>
          <div class="footer">
            <div class="thanks">شكراً لتعاملكم معنا 🤝</div>
            <div>${settings.companyName || 'ورشة التصنيع'} — © ${new Date().getFullYear()}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('inv-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'inv-styles-v4';
    style.innerHTML = `
      /* البطاقة الرئيسية الزرقاء */
      .inv-hero-blue {
        background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #0f172a 100%);
        border-radius: 20px;
        padding: 22px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(30,64,175,0.3);
        position: relative;
        overflow: hidden;
      }
      .inv-hero-blue::before {
        content: ''; position: absolute;
        top: -50px; right: -50px; width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ihb-header { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; margin-bottom: 8px; }
      .ihb-title { font-size: 14px; font-weight: 600; opacity: 0.9; }
      .ihb-icon { font-size: 32px; opacity: 0.5; }
      .ihb-main-value { font-size: 36px; font-weight: 900; text-align: center; margin-bottom: 18px; position: relative; z-index: 1; letter-spacing: -1px; }
      .ihb-stats {
        display: grid; grid-template-columns: 1fr auto 1fr;
        gap: 10px; align-items: center;
        background: rgba(255,255,255,0.1);
        border-radius: 12px; padding: 12px;
        position: relative; z-index: 1;
      }
      .ihb-stat { text-align: center; }
      .ihb-stat-label { font-size: 11px; opacity: 0.85; margin-bottom: 4px; }
      .ihb-stat-value { font-size: 16px; font-weight: 800; }
      .ihb-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.2); }

      /* إحصائيات سريعة */
      .inv-stats-grid {
        display: grid; grid-template-columns: repeat(2, 1fr);
        gap: 8px; margin-bottom: 16px;
      }
      @media (min-width: 600px) { .inv-stats-grid { grid-template-columns: repeat(4, 1fr); } }
      .inv-stat-card {
        background: #fff; border-radius: 12px; padding: 12px;
        display: flex; align-items: center; gap: 10px;
        border: 1px solid var(--border);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .inv-stat-total { border-right: 3px solid #3b82f6; }
      .inv-stat-paid { border-right: 3px solid #10b981; }
      .inv-stat-partial { border-right: 3px solid #f59e0b; }
      .inv-stat-unpaid { border-right: 3px solid #dc2626; }
      .isc-icon { font-size: 22px; }
      .isc-info { flex: 1; }
      .isc-value { font-size: 18px; font-weight: 800; color: var(--text); }
      .isc-label { font-size: 10px; color: var(--text-muted); }

      /* الفلاتر */
      .inv-filters-blue {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border); overflow-x: auto;
      }
      .ifb-btn {
        flex: 1; padding: 10px 8px; background: transparent; border: none;
        border-radius: 8px; font-size: 11px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .ifb-btn.active { background: linear-gradient(135deg, #1e40af, #1e3a8a); color: #fff; }

      /* بطاقات الفواتير */
      .invoices-list-blue { display: grid; gap: 12px; }
      .inv-card-blue {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border); border-right: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: all 0.2s;
      }
      .inv-card-paid { border-right-color: #10b981; }
      .inv-card-partial { border-right-color: #f59e0b; }
      .inv-card-unpaid { border-right-color: #dc2626; }
      .inv-card-blue:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }

      .icb-header {
        padding: 12px 16px; background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center; border-bottom: 1px solid var(--border);
      }
      .icb-number { font-weight: 800; font-size: 13px; color: #1e40af; }
      .icb-status { padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .icb-status-paid { background: #dcfce7; color: #166534; }
      .icb-status-partial { background: #fef3c7; color: #92400e; }
      .icb-status-unpaid { background: #fee2e2; color: #991b1b; }

      .icb-body { padding: 14px 16px; }
      .icb-customer { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      .icb-avatar {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, #dbeafe, #93c5fd);
        color: #1e40af;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 800; flex-shrink: 0;
      }
      .icb-customer-info { flex: 1; min-width: 0; }
      .icb-customer-name { font-size: 14px; font-weight: 800; color: var(--text); }
      .icb-project-name { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

      .icb-amounts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .icb-amount-item { background: #f8fafc; padding: 8px; border-radius: 8px; text-align: center; }
      .icb-amount-label { font-size: 9px; color: var(--text-muted); margin-bottom: 2px; }
      .icb-amount-value { font-size: 12px; font-weight: 800; color: var(--text); }
      .icb-amount-value.paid { color: #10b981; }
      .icb-amount-value.remaining { color: #dc2626; }

      .icb-footer {
        padding: 10px 16px; background: #f8fafc;
        border-top: 1px solid var(--border);
        display: flex; justify-content: space-between;
        align-items: center; flex-wrap: wrap; gap: 8px;
      }
      .icb-date { font-size: 11px; color: var(--text-muted); }
      .icb-actions { display: flex; gap: 6px; }
      .icb-btn { padding: 6px 12px; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
      .icb-btn-pay { background: #10b981; color: #fff; }
      .icb-btn-print { background: #dbeafe; color: #1e40af; }

      /* نموذج الفاتورة */
      .inv-form-blue { background: #fff; border-radius: 20px; overflow: hidden; }
      .ifb-header {
        padding: 20px; background: linear-gradient(135deg, #1e40af, #0f172a);
        color: #fff; display: flex; align-items: center; gap: 14px;
      }
      .ifb-icon {
        width: 50px; height: 50px; background: rgba(255,255,255,0.2);
        border-radius: 14px; display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .ifb-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .ifb-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }

      .ifb-body { padding: 20px; display: grid; gap: 14px; }
      .ifb-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .ifb-field input, .ifb-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border); border-radius: 10px;
        font-size: 14px; font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .ifb-field input:focus, .ifb-field select:focus {
        border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.1);
      }
      .ifb-actions {
        padding: 14px 20px; display: flex; gap: 10px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .ifb-btn {
        padding: 12px; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .ifb-btn.cancel { flex: 1; background: #fff; color: var(--text); border: 1px solid var(--border); }
      .ifb-btn.save { flex: 2; background: linear-gradient(135deg, #1e40af, #0f172a); color: #fff; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Invoices v4 (Blue) loaded');