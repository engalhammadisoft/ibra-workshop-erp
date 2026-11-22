/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — الصناديق والخزائن (v2 - احترافي)
   ═══════════════════════════════════════════════════════════════ */

const Cashboxes = {
  render() {
    const content = document.getElementById('content');
    
    let cashboxes = DB.get('cashboxes') || [];
    if (cashboxes.length === 0) {
      DB.insert('cashboxes', {
        name: 'الصندوق الرئيسي',
        currency: DB.getSettings().currency || 'YER',
        isMain: true,
        createdAt: new Date().toISOString()
      });
      cashboxes = DB.get('cashboxes');
    }

    const payments = DB.get('payments') || [];
    const expenses = DB.get('expenses') || [];
    const vouchers = DB.get('vouchers') || [];

    const boxesData = cashboxes.map(box => {
      const boxPayments = payments.filter(p => p.cashboxId === box.id || (!p.cashboxId && box.isMain));
      const boxExpenses = expenses.filter(e => e.cashboxId === box.id || (!e.cashboxId && box.isMain));
      const boxVouchers = vouchers.filter(v => v.cashboxId === box.id || (!v.cashboxId && box.isMain));

      let totalIn = 0, totalOut = 0, sales = 0;
      
      boxPayments.forEach(p => {
        if (p.type === 'in') {
          totalIn += Number(p.amount) || 0;
          if (p.refType === 'pos_invoice' || p.refType === 'invoice') sales += Number(p.amount) || 0;
        } else totalOut += Number(p.amount) || 0;
      });
      boxExpenses.forEach(e => totalOut += Number(e.amount) || 0);
      boxVouchers.forEach(v => {
        if (v.type === 'receipt') totalIn += Number(v.amount) || 0;
        else totalOut += Number(v.amount) || 0;
      });

      return { ...box, balance: totalIn - totalOut, totalIn, totalOut, sales };
    });

    const totalCash = boxesData.reduce((sum, b) => sum + b.balance, 0);
    const today = Utils.today();
    const todayIn = payments.filter(p => p.type === 'in' && p.date && p.date.startsWith(today))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const todayOut = payments.filter(p => p.type === 'out' && p.date && p.date.startsWith(today))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
      + expenses.filter(e => e.date && e.date.startsWith(today))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const allTransactions = this.getAllTransactions(payments, expenses, vouchers).slice(0, 30);

    let html = `
      <div class="page-header">
        <h1 class="page-title">الصناديق والخزائن</h1>
      </div>

      <!-- البطاقة الرئيسية (برتقالية) -->
      <div class="cashbox-hero">
        <div class="ch-title">إجمالي النقدية في جميع الصناديق</div>
        <div class="ch-main-value">${Utils.money(totalCash)}</div>
        <div class="ch-today-row">
          <div class="ch-today-item">
            <div class="ch-today-label">مقبوضات اليوم</div>
            <div class="ch-today-value in">+${Utils.money(todayIn)}</div>
          </div>
          <div class="ch-today-divider"></div>
          <div class="ch-today-item">
            <div class="ch-today-label">مدفوعات اليوم</div>
            <div class="ch-today-value out">-${Utils.money(todayOut)}</div>
          </div>
        </div>
      </div>

      <!-- أزرار سريعة -->
      <div class="cashbox-actions">
        <button class="ca-btn" onclick="Cashboxes.openTransfer()">🔄 <span>تحويل</span></button>
        <button class="ca-btn" onclick="Cashboxes.openDeposit()">➕ <span>إيداع</span></button>
        <button class="ca-btn" onclick="Cashboxes.openWithdraw()">➖ <span>سحب</span></button>
        <button class="ca-btn ca-primary" onclick="Cashboxes.openAddBox()">➕ <span>صندوق جديد</span></button>
        <button class="ca-btn ca-secondary" onclick="Cashboxes.printAllReport()">🖨️ <span>طباعة</span></button>
      </div>

      <!-- بطاقات الصناديق -->
      <div class="cashboxes-grid">
        ${boxesData.map(box => this.renderBoxCard(box)).join('')}
      </div>

      <!-- آخر الحركات -->
      <div class="card" style="padding:0;">
        <div class="trans-header">
          <h3>🕐 آخر الحركات</h3>
        </div>
        <div class="trans-list">
          ${allTransactions.length ? allTransactions.map(t => this.renderTransaction(t)).join('') : 
            '<div class="empty-state" style="padding:30px;"><p>لا توجد حركات بعد.</p></div>'}
        </div>
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderBoxCard(box) {
    return `
      <div class="cashbox-card">
        <div class="cc-header">
          <div class="cc-icon">💼</div>
          <div class="cc-info">
            <div class="cc-name">${Utils.esc(box.name)}</div>
            <div class="cc-currency">${box.currency || 'YER'}</div>
          </div>
          <div class="cc-actions">
            <button class="cc-action-btn cc-print" onclick="Cashboxes.printBoxReport('${box.id}')" title="طباعة">🖨️</button>
            <button class="cc-action-btn cc-edit" onclick="Cashboxes.editBox('${box.id}')" title="تعديل">✏️</button>
            ${!box.isMain ? `<button class="cc-action-btn cc-delete" onclick="Cashboxes.removeBox('${box.id}')" title="حذف">🗑️</button>` : ''}
          </div>
        </div>
        
        <div class="cc-balance-box">
          <div class="cc-balance-label">الرصيد الحالي</div>
          <div class="cc-balance-value">${Utils.money(box.balance)}</div>
        </div>
        
        <div class="cc-stats">
          <div class="cc-stat cc-stat-sales">
            <div class="ccs-label">مبيعات</div>
            <div class="ccs-value">${Utils.num(box.sales, 0)}</div>
          </div>
          <div class="cc-stat cc-stat-in">
            <div class="ccs-label">قبض</div>
            <div class="ccs-value">${Utils.num(box.totalIn, 0)}</div>
          </div>
          <div class="cc-stat cc-stat-out">
            <div class="ccs-label">صرف</div>
            <div class="ccs-value">${Utils.num(box.totalOut, 0)}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderTransaction(t) {
    const isIn = t.type === 'in';
    const color = isIn ? 'in' : 'out';
    const sign = isIn ? '+' : '-';
    return `
      <div class="trans-item">
        <div class="trans-icon trans-icon-${color}">${isIn ? '⬇️' : '⬆️'}</div>
        <div class="trans-info">
          <div class="trans-title">${Utils.esc(t.note || (isIn ? 'إيراد' : 'مصروف'))}</div>
          <div class="trans-date">${Utils.date(t.date, true)}</div>
        </div>
        <div class="trans-amount trans-amount-${color}">${sign}${Utils.money(t.amount)}</div>
      </div>
    `;
  },

  getAllTransactions(payments, expenses, vouchers) {
    return [
      ...payments.map(p => ({ id: p.id, type: p.type === 'in' ? 'in' : 'out', amount: p.amount, note: p.note, date: p.date })),
      ...expenses.map(e => ({ id: e.id, type: 'out', amount: e.amount, note: e.title, date: e.date })),
      ...vouchers.map(v => ({ id: v.id, type: v.type === 'receipt' ? 'in' : 'out', amount: v.amount, note: `${v.type === 'receipt' ? 'سند قبض' : 'سند صرف'} - ${v.partyName}`, date: v.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // ─── إضافة صندوق ───
  openAddBox() {
    if (!Auth.require('accounting.manage', 'إدارة المحاسبة')) return;
    const body = `
      <div style="display:grid; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">اسم الصندوق *</label>
          <input type="text" id="newBoxName" placeholder="صندوق الكاشير" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">العملة</label>
          <select id="newBoxCurrency" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
            <option value="YER">ريال يمني</option>
            <option value="SAR">ريال سعودي</option>
            <option value="USD">دولار أمريكي</option>
          </select>
        </div>
      </div>
    `;
    UI.openModal('➕ إضافة صندوق جديد', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Cashboxes.saveNewBox()">💾 حفظ</button>
    `);
  },

  saveNewBox() {
    const name = document.getElementById('newBoxName').value.trim();
    const currency = document.getElementById('newBoxCurrency').value;
    if (!name) { UI.toast('⚠️ أدخل اسم الصندوق', 'error'); return; }
    DB.insert('cashboxes', { name, currency, isMain: false, createdAt: new Date().toISOString() });
    UI.closeModal();
    this.render();
    UI.toast('✅ تم إضافة الصندوق', 'success');
  },

  removeBox(id) {
    if (!confirm('حذف الصندوق؟')) return;
    DB.remove('cashboxes', id);
    this.render();
    UI.toast('✅ تم الحذف', 'success');
  },

  editBox(id) {
    const box = DB.find('cashboxes', id);
    if (!box) return;
    const newName = prompt('اسم الصندوق الجديد:', box.name);
    if (newName && newName.trim()) {
      DB.update('cashboxes', id, { name: newName.trim() });
      this.render();
      UI.toast('✅ تم التعديل', 'success');
    }
  },

  // ─── إيداع / سحب / تحويل ───
  openDeposit() {
    const boxes = DB.get('cashboxes') || [];
    const body = `
      <div style="display:grid; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الصندوق</label>
          <select id="depBox" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
            ${boxes.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ *</label>
          <input type="number" id="depAmount" value="0" min="1" style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; margin-top:4px; font-size:18px; font-weight:800; text-align:center; color:#10b981;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">ملاحظات</label>
          <input type="text" id="depNote" placeholder="سبب الإيداع..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
        </div>
      </div>
    `;
    UI.openModal('➕ إيداع في الصندوق', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-success" onclick="Cashboxes.saveDeposit()">✅ إيداع</button>
    `);
  },

  saveDeposit() {
    const boxId = document.getElementById('depBox').value;
    const amount = Number(document.getElementById('depAmount').value) || 0;
    const note = document.getElementById('depNote').value.trim();
    if (amount <= 0) return;

    DB.insert('payments', {
      type: 'in', amount, cashboxId: boxId,
      note: note || 'إيداع',
      date: new Date().toISOString()
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم الإيداع', 'success');
  },

  openWithdraw() {
    const boxes = DB.get('cashboxes') || [];
    const body = `
      <div style="display:grid; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الصندوق</label>
          <select id="wdBox" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
            ${boxes.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ *</label>
          <input type="number" id="wdAmount" value="0" min="1" style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; margin-top:4px; font-size:18px; font-weight:800; text-align:center; color:#dc2626;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">ملاحظات</label>
          <input type="text" id="wdNote" placeholder="سبب السحب..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
        </div>
      </div>
    `;
    UI.openModal('➖ سحب من الصندوق', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-danger" onclick="Cashboxes.saveWithdraw()">💸 سحب</button>
    `);
  },

  saveWithdraw() {
    const boxId = document.getElementById('wdBox').value;
    const amount = Number(document.getElementById('wdAmount').value) || 0;
    const note = document.getElementById('wdNote').value.trim();
    if (amount <= 0) return;

    DB.insert('payments', {
      type: 'out', amount, cashboxId: boxId,
      note: note || 'سحب',
      date: new Date().toISOString()
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم السحب', 'success');
  },

  openTransfer() {
    const boxes = DB.get('cashboxes') || [];
    if (boxes.length < 2) { UI.toast('⚠️ تحتاج صندوقين على الأقل', 'warning'); return; }
    
    const body = `
      <div style="display:grid; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">من صندوق</label>
          <select id="trFrom" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
            ${boxes.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">إلى صندوق</label>
          <select id="trTo" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
            ${boxes.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ *</label>
          <input type="number" id="trAmount" value="0" min="1" style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; margin-top:4px; font-size:18px; font-weight:800; text-align:center;">
        </div>
      </div>
    `;
    UI.openModal('🔄 تحويل بين الصناديق', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Cashboxes.saveTransfer()">🔄 تحويل</button>
    `);
  },

  saveTransfer() {
    const from = document.getElementById('trFrom').value;
    const to = document.getElementById('trTo').value;
    const amount = Number(document.getElementById('trAmount').value) || 0;
    if (amount <= 0 || from === to) return;

    DB.insert('payments', { type: 'out', amount, cashboxId: from, note: 'تحويل بين الصناديق', date: new Date().toISOString() });
    DB.insert('payments', { type: 'in', amount, cashboxId: to, note: 'تحويل بين الصناديق', date: new Date().toISOString() });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم التحويل', 'success');
  },

  // ─── الطباعة ───
  printBoxReport(boxId) {
    const box = DB.find('cashboxes', boxId);
    if (!box) return;
    
    const payments = DB.get('payments') || [];
    const expenses = DB.get('expenses') || [];
    const vouchers = DB.get('vouchers') || [];
    const transactions = this.getAllTransactions(payments, expenses, vouchers);
    const boxTransactions = transactions.filter(t => {
      // تصفية حسب الصندوق (افتراضياً نعرض كل الحركات للصندوق الرئيسي)
      return true;
    });
    
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    let totalIn = 0, totalOut = 0;
    boxTransactions.forEach(t => {
      if (t.type === 'in') totalIn += Number(t.amount) || 0;
      else totalOut += Number(t.amount) || 0;
    });
    const balance = totalIn - totalOut;

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${box.name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:800px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #d97706; padding-bottom:16px; margin-bottom:20px; }
          .company-info h1 { font-size:20px; color:#d97706; margin-bottom:4px; font-weight:800; }
          .company-info p { font-size:11px; color:#64748b; }
          .company-logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
          .report-title { text-align:left; }
          .report-title h2 { font-size:22px; color:#1e293b; margin-bottom:4px; }
          .report-title p { font-size:12px; color:#64748b; }
          
          .box-info { background:#fef3c7; padding:16px; border-radius:10px; margin-bottom:20px; border-right:4px solid #d97706; }
          .box-info h3 { font-size:16px; color:#92400e; margin-bottom:8px; }
          .box-info .row { display:flex; justify-content:space-between; font-size:12px; padding:4px 0; }
          .box-info .row b { color:#92400e; }
          
          .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
          .kpi-box { padding:12px; border-radius:10px; text-align:center; }
          .kpi-in { background:#dcfce7; }
          .kpi-out { background:#fee2e2; }
          .kpi-balance { background:#dbeafe; }
          .kpi-label { font-size:11px; font-weight:600; margin-bottom:4px; opacity:0.8; }
          .kpi-value { font-size:16px; font-weight:800; }
          .kpi-in .kpi-value { color:#166534; }
          .kpi-out .kpi-value { color:#991b1b; }
          .kpi-balance .kpi-value { color:#1e40af; }
          
          table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .in { color:#16a34a; font-weight:700; text-align:center; }
          .out { color:#dc2626; font-weight:700; text-align:center; }
          
          .final-box { background:linear-gradient(135deg, #d97706, #92400e); color:#fff; padding:16px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
          .final-box .label { font-size:14px; }
          .final-box .value { font-size:22px; font-weight:900; }
          
          .signatures { display:flex; justify-content:space-between; margin-top:40px; padding-top:20px; border-top:1px dashed #cbd5e1; }
          .signature { text-align:center; flex:1; }
          .sig-line { height:40px; border-bottom:1px solid #cbd5e1; margin:0 20px; }
          .sig-label { font-size:11px; color:#64748b; margin-top:8px; }
          
          .footer { text-align:center; margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; }
          
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#d97706; color:#fff; }
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
              <p>${settings.companyAddress || ''}<br>📞 ${settings.companyPhone || ''}</p>
            </div>
            <div class="report-title">
              <h2>كشف حساب صندوق</h2>
              <p>${Utils.date(new Date(), true)}</p>
            </div>
          </div>
          
          <div class="box-info">
            <h3>💼 ${Utils.esc(box.name)}</h3>
            <div class="row"><span>العملة:</span><b>${box.currency || 'YER'}</b></div>
            <div class="row"><span>عدد الحركات:</span><b>${boxTransactions.length}</b></div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box kpi-in">
              <div class="kpi-label">📥 إجمالي الداخل</div>
              <div class="kpi-value">${Utils.money(totalIn)}</div>
            </div>
            <div class="kpi-box kpi-out">
              <div class="kpi-label">📤 إجمالي الخارج</div>
              <div class="kpi-value">${Utils.money(totalOut)}</div>
            </div>
            <div class="kpi-box kpi-balance">
              <div class="kpi-label">💰 الرصيد النهائي</div>
              <div class="kpi-value">${Utils.money(balance)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th style="text-align:center;">داخل</th>
                <th style="text-align:center;">خارج</th>
              </tr>
            </thead>
            <tbody>
              ${boxTransactions.length ? boxTransactions.slice(0, 30).map(t => `
                <tr>
                  <td>${Utils.date(t.date)}</td>
                  <td>${Utils.esc(t.note || '—')}</td>
                  <td class="in">${t.type === 'in' ? Utils.money(t.amount) : '—'}</td>
                  <td class="out">${t.type === 'out' ? Utils.money(t.amount) : '—'}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">لا توجد حركات مسجلة.</td></tr>`}
            </tbody>
          </table>
          
          <div class="final-box">
            <span class="label">الرصيد النهائي:</span>
            <span class="value">${Utils.money(balance)}</span>
          </div>
          
          <div class="signatures">
            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-label">توقيع المسؤول</div>
            </div>
            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-label">توقيع المدقق</div>
            </div>
          </div>
          
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — كشف صادر بواسطة IBRA Soft ERP<br>
            شكراً لتعاملكم معنا
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  printAllReport() {
    const boxes = DB.get('cashboxes') || [];
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';
    const boxesData = this.calculateAllBoxes();
    const totalBalance = boxesData.reduce((sum, b) => sum + b.balance, 0);

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير جميع الصناديق</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:800px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #d97706; padding-bottom:16px; margin-bottom:20px; }
          .company-info h1 { font-size:20px; color:#d97706; margin-bottom:4px; font-weight:800; }
          .company-info p { font-size:11px; color:#64748b; }
          .report-title { text-align:left; }
          .report-title h2 { font-size:22px; color:#1e293b; }
          
          .total-box { background:linear-gradient(135deg, #d97706, #92400e); color:#fff; padding:24px; border-radius:12px; text-align:center; margin-bottom:20px; }
          .total-box .label { font-size:13px; opacity:0.9; }
          .total-box .value { font-size:32px; font-weight:900; margin-top:6px; }
          
          table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px; }
          thead { background:#1e293b; color:#fff; }
          th { padding:12px; text-align:right; font-weight:600; }
          td { padding:12px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          
          .footer { text-align:center; margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#d97706; color:#fff; }
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
              ${logo ? `<img src="${logo}" style="width:50px; margin-bottom:6px;">` : ''}
              <h1>${settings.companyName || 'ورشة التصنيع'}</h1>
              <p>📞 ${settings.companyPhone || ''}</p>
            </div>
            <div class="report-title">
              <h2>تقرير الصناديق</h2>
              <p style="font-size:12px; color:#64748b;">${Utils.date(new Date(), true)}</p>
            </div>
          </div>
          
          <div class="total-box">
            <div class="label">إجمالي النقدية</div>
            <div class="value">${Utils.money(totalBalance)}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>الصندوق</th>
                <th>العملة</th>
                <th style="text-align:left;">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${boxesData.map(b => `
                <tr>
                  <td style="font-weight:700;">${Utils.esc(b.name)}</td>
                  <td>${b.currency || 'YER'}</td>
                  <td style="text-align:left; font-weight:800; color:#d97706;">${Utils.money(b.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — تقرير صادر بواسطة IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  calculateAllBoxes() {
    const cashboxes = DB.get('cashboxes') || [];
    const payments = DB.get('payments') || [];
    const expenses = DB.get('expenses') || [];
    const vouchers = DB.get('vouchers') || [];

    return cashboxes.map(box => {
      const boxPayments = payments.filter(p => p.cashboxId === box.id || (!p.cashboxId && box.isMain));
      const boxExpenses = expenses.filter(e => e.cashboxId === box.id || (!e.cashboxId && box.isMain));
      const boxVouchers = vouchers.filter(v => v.cashboxId === box.id || (!v.cashboxId && box.isMain));

      let totalIn = 0, totalOut = 0;
      boxPayments.forEach(p => { if (p.type === 'in') totalIn += Number(p.amount) || 0; else totalOut += Number(p.amount) || 0; });
      boxExpenses.forEach(e => totalOut += Number(e.amount) || 0);
      boxVouchers.forEach(v => { if (v.type === 'receipt') totalIn += Number(v.amount) || 0; else totalOut += Number(v.amount) || 0; });

      return { ...box, balance: totalIn - totalOut };
    });
  },

  injectStyles() {
    if (document.getElementById('cashbox-styles')) return;
    const style = document.createElement('style');
    style.id = 'cashbox-styles';
    style.innerHTML = `
      .cashbox-hero {
        background: linear-gradient(135deg, #d97706 0%, #92400e 100%);
        border-radius: 20px; padding: 24px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(217,119,6,0.3);
        position: relative; overflow: hidden;
      }
      .cashbox-hero::before {
        content: ''; position: absolute; top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%);
        border-radius: 50%;
      }
      .ch-title { font-size: 14px; opacity: 0.95; font-weight: 600; text-align: center; position: relative; z-index: 1; }
      .ch-main-value { font-size: 38px; font-weight: 900; text-align: center; margin: 12px 0 20px; position: relative; z-index: 1; letter-spacing: -1px; }
      .ch-today-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; position: relative; z-index: 1; }
      .ch-today-item { text-align: center; }
      .ch-today-label { font-size: 11px; opacity: 0.85; margin-bottom: 4px; }
      .ch-today-value { font-size: 16px; font-weight: 800; }
      .ch-today-value.in { color: #86efac; }
      .ch-today-value.out { color: #fca5a5; }
      .ch-today-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.3); }
      
      .cashbox-actions {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
        gap: 8px; margin-bottom: 16px;
      }
      .ca-btn {
        background: #fff; border: 1px solid var(--border);
        border-radius: 12px; padding: 12px 6px;
        display: flex; flex-direction: column;
        align-items: center; gap: 4px;
        font-family: inherit; font-size: 11px; font-weight: 700;
        color: var(--text); cursor: pointer;
        transition: all 0.2s;
      }
      .ca-btn:hover { border-color: #d97706; transform: translateY(-1px); }
      .ca-primary { background: linear-gradient(135deg, #d97706, #92400e); color: #fff; border-color: transparent; }
      .ca-secondary { background: #f8fafc; }
      
      .cashboxes-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
      @media (min-width: 768px) { .cashboxes-grid { grid-template-columns: 1fr 1fr; } }
      
      .cashbox-card {
        background: #fff; border-radius: 16px;
        border: 1px solid var(--border); padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      
      .cc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .cc-icon {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #d97706, #92400e);
        color: #fff; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
      }
      .cc-info { flex: 1; }
      .cc-name { font-size: 14px; font-weight: 800; color: var(--text); }
      .cc-currency { font-size: 10px; color: var(--text-muted); }
      .cc-actions { display: flex; gap: 4px; }
      .cc-action-btn {
        width: 30px; height: 30px; border: none; border-radius: 8px;
        font-size: 13px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .cc-print { background: #dbeafe; }
      .cc-edit { background: #f1f5f9; }
      .cc-delete { background: #fee2e2; }
      
      .cc-balance-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 10px; }
      .cc-balance-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
      .cc-balance-value { font-size: 22px; font-weight: 900; color: #d97706; }
      
      .cc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .cc-stat { padding: 8px; border-radius: 8px; text-align: center; }
      .cc-stat-sales { background: #dbeafe; }
      .cc-stat-in { background: #dcfce7; }
      .cc-stat-out { background: #fee2e2; }
      .ccs-label { font-size: 10px; font-weight: 600; opacity: 0.8; }
      .ccs-value { font-size: 13px; font-weight: 800; margin-top: 2px; }
      .cc-stat-sales .ccs-value { color: #1e40af; }
      .cc-stat-in .ccs-value { color: #166534; }
      .cc-stat-out .ccs-value { color: #991b1b; }
      
      .trans-header { padding: 14px 18px; border-bottom: 1px solid var(--border); background: #f8fafc; }
      .trans-header h3 { font-size: 14px; margin: 0; }
      .trans-list { padding: 6px 0; }
      .trans-item { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid var(--border); }
      .trans-item:last-child { border-bottom: none; }
      .trans-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
      .trans-icon-in { background: #dcfce7; color: #166534; }
      .trans-icon-out { background: #fee2e2; color: #991b1b; }
      .trans-info { flex: 1; min-width: 0; }
      .trans-title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .trans-date { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
      .trans-amount { font-size: 14px; font-weight: 800; white-space: nowrap; }
      .trans-amount-in { color: #166534; }
      .trans-amount-out { color: #991b1b; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Cashboxes v2 loaded');