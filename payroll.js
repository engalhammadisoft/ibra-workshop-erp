/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — الرواتب (v3 مع طباعة الإيصال)
   ═══════════════════════════════════════════════════════════════ */

const Payroll = {
  currentMonth: new Date().toISOString().slice(0, 7),

  render() {
    const content = document.getElementById('content');
    const employees = DB.get('employees') || [];
    const payrolls = DB.get('payrolls') || [];

    const currentPayrolls = payrolls.filter(p => p.month === this.currentMonth);
    const totalSalaries = currentPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const paidCount = currentPayrolls.filter(p => p.status === 'paid').length;
    const pendingCount = currentPayrolls.filter(p => p.status !== 'paid').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">رواتب الموظفين</h1>
        <button class="btn btn-ghost" onclick="Employees.render()">← رجوع للموظفين</button>
      </div>

      <div class="pay-hero">
        <div class="pay-hero-title">
          <h2>الرواتب 💰</h2>
          <p>إدارة وتوزيع رواتب الشهر</p>
        </div>
        <div class="pay-hero-stats">
          <div class="phs-item">
            <div class="phs-label">إجمالي الرواتب</div>
            <div class="phs-value">${Utils.money(totalSalaries)}</div>
          </div>
          <div class="phs-item">
            <div class="phs-label">تم الدفع</div>
            <div class="phs-value" style="color:#4ade80;">${paidCount}</div>
          </div>
          <div class="phs-item">
            <div class="phs-label">قيد الانتظار</div>
            <div class="phs-value" style="color:#fbbf24;">${pendingCount}</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الشهر:</label>
          <input type="month" value="${this.currentMonth}" 
            onchange="Payroll.currentMonth = this.value; Payroll.render();"
            style="padding:8px; border:1px solid var(--border); border-radius:6px; margin-right:8px; font-family:inherit;">
        </div>
        <button class="btn btn-primary" onclick="Payroll.generateAll()">⚡ توليد رواتب الشهر</button>
      </div>

      <div class="card" style="padding:0; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; min-width:600px;">
          <thead style="background:var(--bg); color:var(--text-muted);">
            <tr>
              <th style="padding:12px; text-align:right;">الموظف</th>
              <th style="padding:12px; text-align:right;">الأساسي</th>
              <th style="padding:12px; text-align:right;">المكافآت</th>
              <th style="padding:12px; text-align:right;">الخصومات</th>
              <th style="padding:12px; text-align:right;">الصافي</th>
              <th style="padding:12px; text-align:center;">الحالة</th>
              <th style="padding:12px; text-align:center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${employees.filter(e => e.status === 'active').map(emp => {
              const pr = currentPayrolls.find(p => p.employeeId === emp.id);
              if (!pr) {
                return `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px; font-weight:700;">${Utils.esc(emp.name)}</td>
                    <td colspan="5" style="padding:12px; color:var(--text-muted); font-size:12px;">لم يتم توليد راتب هذا الشهر بعد</td>
                    <td style="padding:12px; text-align:center;">
                      <button class="btn btn-ghost" style="font-size:11px;" onclick="Payroll.generateFor('${emp.id}')">➕ توليد</button>
                    </td>
                  </tr>
                `;
              }
              return `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px; font-weight:700;">${Utils.esc(emp.name)}</td>
                  <td style="padding:12px;">${Utils.money(pr.baseSalary)}</td>
                  <td style="padding:12px; color:var(--success);">+${Utils.money(pr.bonuses || 0)}</td>
                  <td style="padding:12px; color:var(--danger);">-${Utils.money(pr.deductions || 0)}</td>
                  <td style="padding:12px; font-weight:800;">${Utils.money(pr.netSalary)}</td>
                  <td style="padding:12px; text-align:center;">
                    <span style="background:var(--${pr.status === 'paid' ? 'success' : 'warning'}); color:#fff; padding:3px 8px; border-radius:10px; font-size:11px;">
                      ${pr.status === 'paid' ? 'مدفوع' : 'معلق'}
                    </span>
                  </td>
                  <td style="padding:12px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center;">
                      ${pr.status !== 'paid' ? `<button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="Payroll.pay('${pr.id}')">💵 دفع</button>` : ''}
                      <button class="btn btn-primary" style="padding:4px 8px; font-size:11px;" onclick="Payroll.print('${pr.id}')">🖨️</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  generateAll() {
    if (!confirm('هل تريد توليد رواتب جميع الموظفين لشهر ' + this.currentMonth + '؟')) return;
    const employees = DB.get('employees').filter(e => e.status === 'active');
    let count = 0;
    employees.forEach(emp => {
      if (this.generateFor(emp.id, true)) count++;
    });
    this.render();
    UI.toast(`✅ تم توليد ${count} راتب`, 'success');
  },

  generateFor(empId, silent = false) {
    const emp = DB.find('employees', empId);
    if (!emp) return false;

    const payrolls = DB.get('payrolls') || [];
    const existing = payrolls.find(p => p.employeeId === empId && p.month === this.currentMonth);
    if (existing) return false;

    DB.insert('payrolls', {
      employeeId: empId,
      employeeName: emp.name,
      month: this.currentMonth,
      baseSalary: emp.salary || 0,
      bonuses: 0,
      deductions: 0,
      netSalary: emp.salary || 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    if (!silent) {
      this.render();
      UI.toast('✅ تم توليد الراتب', 'success');
    }
    return true;
  },

  pay(id) {
    const pr = DB.find('payrolls', id);
    if (!pr) return;
    if (!confirm(`تأكيد دفع راتب ${pr.employeeName} بمبلغ ${Utils.money(pr.netSalary)}؟`)) return;

    DB.update('payrolls', id, { status: 'paid', paidAt: new Date().toISOString() });
    
    DB.insert('expenses', {
      title: `راتب ${pr.employeeName} - ${pr.month}`,
      amount: pr.netSalary,
      notes: 'راتب شهري',
      date: new Date().toISOString()
    });

    DB.insert('vouchers', {
      number: Utils.docNumber('PV'),
      type: 'payment',
      party: 'salaries',
      partyName: pr.employeeName,
      notes: `راتب شهر ${pr.month}`,
      amount: pr.netSalary,
      currency: 'YER',
      createdAt: new Date().toISOString()
    });

    this.render();
    UI.toast('✅ تم دفع الراتب وتسجيله في الخزينة', 'success');
    setTimeout(() => this.print(id), 500);
  },

  /** 🖨️ طباعة إيصال الراتب */
  print(id) {
    const pr = DB.find('payrolls', id);
    if (!pr) return;

    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=400,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال راتب - ${pr.employeeName}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .receipt { background:#fff; max-width:380px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 2px 15px rgba(0,0,0,0.1); }
          .r-header { background: linear-gradient(135deg, #10b981, #047857); color: #fff; padding: 24px 20px; text-align: center; }
          .r-logo { width: 50px; height: 50px; margin: 0 auto 8px; }
          .r-title { font-size: 20px; font-weight: 800; }
          .r-subtitle { font-size: 12px; opacity: 0.9; margin-top: 4px; }
          .r-body { padding: 20px; }
          .r-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .r-row:last-child { border-bottom: none; }
          .r-label { color: #64748b; }
          .r-value { font-weight: 700; color: #1e293b; }
          .r-amount-box { background: #f0fdf4; border: 2px dashed #10b981; border-radius: 10px; padding: 16px; text-align: center; margin: 16px 0; }
          .r-amount-label { font-size: 11px; color: #047857; font-weight: 700; margin-bottom: 4px; }
          .r-amount-value { font-size: 28px; font-weight: 900; color: #047857; }
          .r-footer { background: #f8fafc; padding: 12px; text-align: center; font-size: 10px; color: #94a3b8; }
          .r-signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #e2e8f0; }
          .signature-box { text-align: center; flex: 1; }
          .sig-line { height: 40px; border-bottom: 1px solid #cbd5e1; margin: 0 10px; }
          .sig-label { font-size: 11px; color: #64748b; margin-top: 6px; }
          .print-actions { position: fixed; top: 15px; left: 15px; display: flex; gap: 8px; z-index: 999; }
          .print-btn { padding: 10px 18px; border-radius: 8px; border: none; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
          .btn-print { background: #10b981; color: #fff; }
          .btn-close { background: #fff; color: #333; border: 1px solid #ddd; }
          @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; } .print-actions { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="print-btn btn-print" onclick="window.print()">🖨️ طباعة</button>
          <button class="print-btn btn-close" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="receipt">
          <div class="r-header">
            ${logo ? `<img src="${logo}" class="r-logo">` : ''}
            <div class="r-title">إيصال راتب</div>
            <div class="r-subtitle">شهر ${pr.month}</div>
          </div>
          <div class="r-body">
            <div class="r-row"><span class="r-label">اسم الموظف:</span><span class="r-value">${Utils.esc(pr.employeeName)}</span></div>
            <div class="r-row"><span class="r-label">الشهر:</span><span class="r-value">${pr.month}</span></div>
            <div class="r-row"><span class="r-label">الراتب الأساسي:</span><span class="r-value">${Utils.money(pr.baseSalary)}</span></div>
            ${pr.bonuses > 0 ? `<div class="r-row"><span class="r-label">المكافآت:</span><span class="r-value" style="color:#16a34a;">+${Utils.money(pr.bonuses)}</span></div>` : ''}
            ${pr.deductions > 0 ? `<div class="r-row"><span class="r-label">الخصومات:</span><span class="r-value" style="color:#dc2626;">-${Utils.money(pr.deductions)}</span></div>` : ''}
            <div class="r-amount-box">
              <div class="r-amount-label">صافي الراتب</div>
              <div class="r-amount-value">${Utils.money(pr.netSalary)}</div>
            </div>
            <div class="r-signatures">
              <div class="signature-box"><div class="sig-line"></div><div class="sig-label">توقيع الموظف</div></div>
              <div class="signature-box"><div class="sig-line"></div><div class="sig-label">توقيع الإدارة</div></div>
            </div>
          </div>
          <div class="r-footer">
            ${settings.companyName || 'ورشة التصنيع'} — ${settings.companyPhone || ''}<br>
            تم إصداره بواسطة IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('pay-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'pay-styles-v3';
    style.innerHTML = `
      .pay-hero {
        background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
        border-radius: 24px; padding: 22px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(245,158,11,0.3);
        position: relative; overflow: hidden;
      }
      .pay-hero::before {
        content: ''; position: absolute;
        top: -50px; right: -50px; width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .pay-hero-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .pay-hero-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .pay-hero-title p { font-size: 13px; opacity: 0.9; }
      .pay-hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; position: relative; z-index: 1; }
      .phs-item { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 12px; border-radius: 12px; }
      .phs-label { font-size: 10px; opacity: 0.9; }
      .phs-value { font-size: 18px; font-weight: 800; margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Payroll v3 loaded (with receipt printing)');
