/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — المحاسبة والخزينة (v3)
   ═══════════════════════════════════════════════════════════════ */

const Accounting = {
  filter: 'all', // all, in, out

  render() {
    const content = document.getElementById('content');
    
    // جلب البيانات
    const payments = DB.get('payments') || [];
    const expenses = DB.get('expenses') || [];
    const vouchers = DB.get('vouchers') || [];

    // حساب الرصيد
    let totalIn = 0;
    let totalOut = 0;

    payments.forEach(p => {
      if (p.type === 'in') totalIn += Number(p.amount) || 0;
      else totalOut += Number(p.amount) || 0;
    });
    expenses.forEach(e => totalOut += Number(e.amount) || 0);

    const balance = totalIn - totalOut;

    // دمج الحركات
    const allTransactions = [
      ...payments.map(p => ({ ...p, _source: 'payment' })),
      ...expenses.map(e => ({ ...e, _source: 'expense', type: 'out' })),
      ...vouchers.filter(v => !payments.find(p => p.refId === v.id)).map(v => ({
        id: v.id,
        type: v.type === 'receipt' ? 'in' : 'out',
        amount: v.amount,
        note: `${v.type === 'receipt' ? 'سند قبض' : 'سند صرف'} - ${v.partyName}`,
        date: v.createdAt,
        _source: 'voucher'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // تصفية
    let filtered = allTransactions;
    if (this.filter === 'in') filtered = allTransactions.filter(t => t.type === 'in');
    if (this.filter === 'out') filtered = allTransactions.filter(t => t.type === 'out');

    // بيانات الرسم البياني
    const last7Days = this.getLast7DaysData(payments, expenses);

    let html = `
      <div class="page-header">
        <h1 class="page-title">المحاسبة والخزينة</h1>
        <button class="btn btn-primary" onclick="Accounting.openExpenseForm()">➕ مصروف جديد</button>
      </div>

      <!-- بطاقة الرصيد -->
      <div class="acc-balance-card">
        <div class="abc-header">
          <div class="abc-icon">💰</div>
          <div class="abc-title">
            <h2>رصيد الصندوق</h2>
            <p>السيولة النقدية الحالية</p>
          </div>
        </div>
        <div class="abc-value">${Utils.money(balance)}</div>
        <div class="abc-details">
          <div class="abcd-item">
            <div class="abcd-icon in">📥</div>
            <div>
              <div class="abcd-label">إيرادات</div>
              <div class="abcd-value">${Utils.money(totalIn)}</div>
            </div>
          </div>
          <div class="abcd-item">
            <div class="abcd-icon out">📤</div>
            <div>
              <div class="abcd-label">مصروفات</div>
              <div class="abcd-value">${Utils.money(totalOut)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الرسم البياني للسيولة -->
      <div class="card">
        <div class="chart-header-v2">
          <h3>📊 حركة الخزينة (آخر 7 أيام)</h3>
        </div>
        <div class="cashflow-chart">
          ${last7Days.map(d => `
            <div class="cf-bar-item">
              <div class="cf-bars">
                <div class="cf-bar in" style="height: ${d.inPercent}%;" title="إيرادات: ${Utils.money(d.in)}"></div>
                <div class="cf-bar out" style="height: ${d.outPercent}%;" title="مصروفات: ${Utils.money(d.out)}"></div>
              </div>
              <div class="cf-label">${d.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="cf-legend">
          <div class="cfl-item"><span class="cfl-dot in"></span> إيرادات</div>
          <div class="cfl-item"><span class="cfl-dot out"></span> مصروفات</div>
        </div>
      </div>

      <!-- فلاتر -->
      <div class="acc-filters">
        <button class="af-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Accounting.setFilter('all')">📋 الكل</button>
        <button class="af-btn ${this.filter === 'in' ? 'active' : ''}" onclick="Accounting.setFilter('in')">📥 إيرادات</button>
        <button class="af-btn ${this.filter === 'out' ? 'active' : ''}" onclick="Accounting.setFilter('out')">📤 مصروفات</button>
      </div>

      <!-- قائمة الحركات -->
      <div class="card" style="padding:0;">
        <div style="padding:14px 16px; border-bottom:1px solid var(--border); font-weight:700; font-size:14px;">
          📋 سجل الحركات (${filtered.length})
        </div>
        <div class="transactions-list">
          ${filtered.length ? filtered.slice(0, 50).map(t => this.renderTransaction(t)).join('') : `
            <div class="empty-state" style="padding:30px;">
              <p>لا توجد حركات في هذه الفئة.</p>
            </div>
          `}
        </div>
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderTransaction(t) {
    const isIn = t.type === 'in';
    const color = isIn ? 'success' : 'danger';
    const icon = isIn ? '📥' : '📤';
    const sign = isIn ? '+' : '-';

    return `
      <div class="trans-item">
        <div class="ti-icon ${isIn ? 'ti-in' : 'ti-out'}">${icon}</div>
        <div class="ti-content">
          <div class="ti-title">${Utils.esc(t.note || (isIn ? 'إيراد' : 'مصروف'))}</div>
          <div class="ti-date">${Utils.date(t.date, true)}</div>
        </div>
        <div class="ti-amount" style="color: var(--${color});">
          ${sign}${Utils.money(t.amount)}
        </div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  getLast7DaysData(payments, expenses) {
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const result = [];
    let max = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const dayIn = payments.filter(p => p.type === 'in' && p.date && p.date.startsWith(dateStr))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const dayOut = expenses.filter(e => e.date && e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        + payments.filter(p => p.type === 'out' && p.date && p.date.startsWith(dateStr))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      if (dayIn > max) max = dayIn;
      if (dayOut > max) max = dayOut;

      result.push({ label: days[d.getDay()], in: dayIn, out: dayOut, inPercent: 0, outPercent: 0 });
    }

    result.forEach(r => {
      r.inPercent = max > 0 ? Math.max(3, (r.in / max) * 100) : 3;
      r.outPercent = max > 0 ? Math.max(3, (r.out / max) * 100) : 3;
    });

    return result;
  },

  openExpenseForm() {
    if (!Auth.require('accounting.manage', 'إدارة المحاسبة')) return;

    const formHtml = `
      <div class="exp-form">
        <div class="exp-header">
          <div class="exp-icon">💸</div>
          <div>
            <h2>تسجيل مصروف جديد</h2>
            <p>إضافة مصروف للخزينة</p>
          </div>
        </div>
        
        <div class="exp-body">
          <div class="ef-field">
            <label>بند المصروف <span style="color:var(--danger);">*</span></label>
            <input type="text" id="expTitle" placeholder="مثال: كهرباء، صيانة، شراء مواد..." />
          </div>
          
          <div class="ef-field">
            <label>المبلغ <span style="color:var(--danger);">*</span></label>
            <input type="number" id="expAmount" value="0" placeholder="0" style="font-size:18px; font-weight:800; text-align:center; color:#dc2626;" />
          </div>

          <div class="ef-field">
            <label>ملاحظات إضافية</label>
            <textarea id="expNotes" rows="2" placeholder="تفاصيل المصروف..."></textarea>
          </div>
        </div>
        
        <div class="exp-actions">
          <button class="exp-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="exp-btn save" onclick="Accounting.saveExpense()">💾 حفظ المصروف</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  saveExpense() {
    const title = document.getElementById('expTitle').value.trim();
    const amount = Number(document.getElementById('expAmount').value) || 0;
    const notes = document.getElementById('expNotes').value.trim();

    if (!title || amount <= 0) {
      UI.toast('⚠️ أدخل البند والمبلغ', 'error');
      return;
    }

    DB.insert('expenses', {
      title, amount, notes,
      date: new Date().toISOString(),
      userId: Auth.current().userId
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم تسجيل المصروف', 'success');
  },

  injectStyles() {
    if (document.getElementById('acc-styles')) return;
    const style = document.createElement('style');
    style.id = 'acc-styles';
    style.innerHTML = `
      /* بطاقة الرصيد */
      .acc-balance-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border-radius: 24px;
        padding: 24px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(15,23,42,0.3);
        position: relative; overflow: hidden;
      }
      .acc-balance-card::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%);
        border-radius: 50%;
      }
      .abc-header {
        display: flex; align-items: center; gap: 12px;
        margin-bottom: 16px; position: relative; z-index: 1;
      }
      .abc-icon {
        width: 50px; height: 50px;
        background: rgba(255,255,255,0.1);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .abc-title h2 { font-size: 16px; font-weight: 700; margin: 0; opacity: 0.9; }
      .abc-title p { font-size: 11px; opacity: 0.6; margin-top: 2px; }
      .abc-value {
        font-size: 36px; font-weight: 900;
        margin-bottom: 20px;
        position: relative; z-index: 1;
        letter-spacing: -1px;
      }
      .abc-details {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        position: relative; z-index: 1;
      }
      .abcd-item {
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 12px;
        display: flex; align-items: center; gap: 10px;
      }
      .abcd-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      .abcd-icon.in { background: rgba(16,185,129,0.25); }
      .abcd-icon.out { background: rgba(239,68,68,0.25); }
      .abcd-label { font-size: 10px; opacity: 0.8; }
      .abcd-value { font-size: 14px; font-weight: 800; }
      
      /* الرسم البياني */
      .chart-header-v2 {
        margin-bottom: 16px;
      }
      .chart-header-v2 h3 { font-size: 14px; margin: 0; }
      .cashflow-chart {
        display: flex; gap: 4px;
        height: 120px;
        align-items: flex-end;
        padding: 10px 0;
      }
      .cf-bar-item {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; height: 100%;
        justify-content: flex-end;
        gap: 6px;
      }
      .cf-bars {
        width: 100%; height: 100%;
        display: flex; gap: 2px;
        align-items: flex-end;
        justify-content: center;
        max-width: 30px;
      }
      .cf-bar {
        flex: 1; border-radius: 4px 4px 0 0;
        transition: height 0.6s;
        min-height: 4px;
      }
      .cf-bar.in { background: #10b981; }
      .cf-bar.out { background: #ef4444; }
      .cf-label {
        font-size: 9px; color: var(--text-muted);
        font-weight: 600;
      }
      .cf-legend {
        display: flex; gap: 14px;
        justify-content: center;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed var(--border);
        font-size: 11px;
      }
      .cfl-item { display: flex; align-items: center; gap: 4px; }
      .cfl-dot {
        width: 10px; height: 10px; border-radius: 3px;
      }
      .cfl-dot.in { background: #10b981; }
      .cfl-dot.out { background: #ef4444; }
      
      /* الفلاتر */
      .acc-filters {
        display: flex; gap: 6px; margin-bottom: 14px;
        background: #fff; padding: 6px;
        border-radius: 12px; border: 1px solid var(--border);
      }
      .af-btn {
        flex: 1; padding: 10px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 12px;
        font-weight: 700; color: var(--text-muted);
        cursor: pointer; font-family: inherit;
      }
      .af-btn.active {
        background: linear-gradient(135deg, #0f172a, #1e293b);
        color: #fff;
      }
      
      /* قائمة الحركات */
      .transactions-list { max-height: 500px; overflow-y: auto; }
      .trans-item {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
      }
      .trans-item:hover { background: #f8fafc; }
      .trans-item:last-child { border-bottom: none; }
      .ti-icon {
        width: 40px; height: 40px;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      .ti-in { background: rgba(16,185,129,0.15); color: #10b981; }
      .ti-out { background: rgba(239,68,68,0.15); color: #ef4444; }
      .ti-content { flex: 1; min-width: 0; }
      .ti-title {
        font-size: 13px; font-weight: 700;
        color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .ti-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .ti-amount { font-size: 14px; font-weight: 800; white-space: nowrap; }
      
      /* نموذج المصروف */
      .exp-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .exp-header {
        padding: 20px;
        background: linear-gradient(135deg, #dc2626, #991b1b);
        color: #fff;
        display: flex; align-items: center; gap: 14px;
      }
      .exp-icon {
        width: 50px; height: 50px;
        background: rgba(255,255,255,0.2);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .exp-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .exp-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .exp-body { padding: 20px; display: grid; gap: 14px; }
      .ef-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .ef-field input, .ef-field textarea {
        width: 100%; padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px;
        font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .ef-field input:focus, .ef-field textarea:focus {
        border-color: #dc2626;
        box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
      }
      
      .exp-actions {
        padding: 14px 20px;
        display: flex; gap: 10px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
      }
      .exp-btn {
        padding: 12px;
        border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .exp-btn.cancel {
        flex: 1; background: #fff; color: var(--text);
        border: 1px solid var(--border);
      }
      .exp-btn.save {
        flex: 2; background: linear-gradient(135deg, #dc2626, #991b1b);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Accounting v3 loaded');
