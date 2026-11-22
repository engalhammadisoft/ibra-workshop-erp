/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — السندات والدفعات (قبض وصرف)
   ═══════════════════════════════════════════════════════════════ */

const Vouchers = {
  currentView: 'list', // list, receipt, payment
  filter: 'all', // all, receipt, payment

  render() {
    const content = document.getElementById('content');
    
    if (this.currentView === 'list') {
      this.renderList(content);
    } else {
      this.renderForm(content);
    }
  },

  renderList(content) {
    const vouchers = DB.get('vouchers') || [];
    
    // تصفية السندات
    let filtered = vouchers;
    if (this.filter === 'receipt') filtered = vouchers.filter(v => v.type === 'receipt');
    if (this.filter === 'payment') filtered = vouchers.filter(v => v.type === 'payment');

    // ترتيب من الأحدث
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات
    const totalReceipts = vouchers.filter(v => v.type === 'receipt').length;
    const totalPayments = vouchers.filter(v => v.type === 'payment').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">السندات والدفعات</h1>
      </div>

      <!-- البطاقة الرئيسية للتحكم -->
      <div class="voucher-hero">
        <div class="voucher-hero-title">
          <span>السندات والدفعات</span>
          <small>إدارة كاملة لجميع السندات</small>
        </div>
        <div class="voucher-hero-stats">
          <div class="vh-stat ${this.filter === 'all' ? 'active' : ''}" onclick="Vouchers.setFilter('all')">
            <div class="vh-icon">📊</div>
            <div class="vh-value">${vouchers.length}</div>
            <div class="vh-label">الكل</div>
          </div>
          <div class="vh-stat ${this.filter === 'receipt' ? 'active' : ''}" onclick="Vouchers.setFilter('receipt')">
            <div class="vh-icon">📥</div>
            <div class="vh-value">${totalReceipts}</div>
            <div class="vh-label">قبض</div>
          </div>
          <div class="vh-stat ${this.filter === 'payment' ? 'active' : ''}" onclick="Vouchers.setFilter('payment')">
            <div class="vh-icon">📤</div>
            <div class="vh-value">${totalPayments}</div>
            <div class="vh-label">صرف</div>
          </div>
        </div>
      </div>

      <!-- أزرار الإنشاء -->
      <div class="voucher-actions">
        <button class="voucher-action-btn receipt" onclick="Vouchers.openNew('receipt')">
          <div class="va-icon">📥</div>
          <div class="va-text">
            <b>سند قبض</b>
            <span>استلام مبلغ</span>
          </div>
        </button>
        <button class="voucher-action-btn payment" onclick="Vouchers.openNew('payment')">
          <div class="va-icon">📤</div>
          <div class="va-text">
            <b>سند صرف</b>
            <span>دفع مبلغ</span>
          </div>
        </button>
      </div>

      <!-- قائمة السندات -->
      <div class="voucher-list-header">
        <h3>${this.filter === 'all' ? 'جميع السندات' : (this.filter === 'receipt' ? 'سندات القبض' : 'سندات الصرف')}</h3>
      </div>

      <div class="voucher-list">
        ${filtered.length ? filtered.map(v => this.renderVoucherCard(v)).join('') : `
          <div class="empty-state">
            <div class="icon">🧾</div>
            <p>لا توجد سندات في هذه الفئة بعد.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderVoucherCard(v) {
    const isReceipt = v.type === 'receipt';
    const colorClass = isReceipt ? 'receipt' : 'payment';
    const bgClass = isReceipt ? 'bg-receipt' : 'bg-payment';
    
    return `
      <div class="voucher-card ${colorClass}">
        <div class="voucher-card-header ${bgClass}">
          <div class="vc-type">${isReceipt ? 'سند قبض' : 'سند صرف'} ${isReceipt ? '📥' : '📤'}</div>
          <div class="vc-number">${v.number}</div>
        </div>
        <div class="voucher-card-body">
          <div class="vc-row">
            <span>الجهة:</span>
            <b>${Utils.esc(v.partyName)}</b>
          </div>
          <div class="vc-row">
            <span>المبلغ:</span>
            <b class="${colorClass}-text">${Utils.money(v.amount)}</b>
          </div>
          <div class="vc-row">
            <span>التاريخ:</span>
            <span>${Utils.date(v.createdAt)}</span>
          </div>
        </div>
        <div class="voucher-card-actions">
          <button class="btn btn-ghost" style="flex:1; font-size:12px;" onclick="Vouchers.print('${v.id}')">🖨️ طباعة</button>
          <button class="btn btn-danger" style="flex:0.5; font-size:12px;" onclick="Vouchers.remove('${v.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  setFilter(filter) {
    this.filter = filter;
    this.render();
  },

  openNew(type) {
    this.currentView = type;
    this.render();
  },

  backToList() {
    this.currentView = 'list';
    this.render();
  },

  renderForm(content) {
  const isReceipt = this.currentView === 'receipt';
  const title = isReceipt ? 'سند قبض' : 'سند صرف';
  const subtitle = isReceipt ? 'استلام مبلغ نقدي' : 'دفع مبلغ نقدي';
  const color = isReceipt ? '#ea580c' : '#dc2626';

  // جلب الجهات
  const customers = DB.get('customers') || [];
  const suppliers = DB.get('suppliers') || [];
  const employees = DB.get('employees') || [];

  // خيارات الجهة (مجمعة)
  const partyOptions = [
    { group: 'عام', items: [
      { value: 'custom', label: '✏️ إدخال اسم مخصص' },
      { value: 'expenses', label: '💸 المصروفات' },
      { value: 'rent', label: '🏢 إيجارات' },
      { value: 'other', label: '📋 أخرى' }
    ]},
    { group: 'الموظفون', items: employees.filter(e => e.status === 'active').map(e => ({ value: e.id, label: `👤 ${e.name} (${e.role || 'موظف'})` })) },
    { group: 'العملاء', items: customers.map(c => ({ value: c.id, label: `👥 ${c.name}` })) },
    { group: 'الموردون', items: suppliers.map(s => ({ value: s.id, label: `🚚 ${s.name}` })) }
  ];

    let optionsHtml = '';
    partyOptions.forEach(group => {
      if (group.items.length === 0) return;
      optionsHtml += `<optgroup label="${group.group}">`;
      group.items.forEach(item => {
        optionsHtml += `<option value="${item.value}">${item.label}</option>`;
      });
      optionsHtml += `</optgroup>`;
    });

    let html = `
      <!-- رأس الصفحة -->
      <div class="voucher-page-header" style="background: linear-gradient(135deg, ${color}, ${isReceipt ? '#f59e0b' : '#b91c1c'});">
        <button class="voucher-back-btn" onclick="Vouchers.backToList()">←</button>
        <div class="voucher-page-title">
          <h2>${title} ${isReceipt ? '📥' : '📤'}</h2>
          <p>${subtitle}</p>
        </div>
      </div>

      <!-- نموذج السند -->
      <div class="voucher-form-card">
        
        <!-- القسم الأول: بيانات السند -->
        <div class="vf-section">
          <div class="vf-section-header">
            <span class="vf-section-icon">📋</span>
            <span>بيانات السند</span>
          </div>
          
          <div class="vf-field">
            <label>التاريخ 📅</label>
            <input type="text" id="vDate" value="${Utils.date(new Date())}" readonly style="background:var(--bg);">
          </div>

          <div class="vf-field">
            <label>${isReceipt ? 'استلمنا من' : 'دفعنا إلى'} 👤 <span style="color:var(--danger);">*</span></label>
            <select id="vParty" onchange="Vouchers.onPartyChange(this)">
              <option value="">— اختر الجهة —</option>
              ${optionsHtml}
            </select>
          </div>

          <div class="vf-field" id="customPartyField" style="display:none;">
            <label>اسم الجهة المخصص 👤</label>
            <input type="text" id="vCustomParty" placeholder="أدخل اسم الجهة">
          </div>

          <div class="vf-field">
            <label>الهاتف (اختياري) 📱</label>
            <input type="tel" id="vPhone" placeholder="7XX-XXX-XXX">
          </div>

          <div class="vf-field">
            <label>طريقة الدفع 💳</label>
            <input type="text" id="vPaymentMethod" value="نقدي 💵" readonly style="background:var(--bg);">
          </div>

          <div class="vf-field">
            <label>البيان / ملاحظات ✏️</label>
            <textarea id="vNotes" rows="2" placeholder="${isReceipt ? 'مثال: دفعة من العميل / إيداع' : 'مثال: مصروفات / رواتب'}"></textarea>
          </div>
        </div>

        <!-- القسم الثاني: المبلغ -->
        <div class="vf-section vf-amount-section ${isReceipt ? 'yellow' : 'red'}">
          <div class="vf-section-header">
            <span class="vf-section-icon">💰</span>
            <span>المبلغ</span>
          </div>

          <div class="vf-field">
            <label>العملة</label>
            <select id="vCurrency">
              <option value="YER">🇾🇪 ريال يمني (YER)</option>
              <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
              <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
            </select>
          </div>

          <div class="vf-field">
            <label>المبلغ <span style="color:var(--danger);">*</span></label>
            <input type="number" id="vAmount" value="0" step="0.01" oninput="Vouchers.updateAmountWords()" 
              style="font-size:20px; font-weight:800; text-align:center; color:${color};">
          </div>

          <div class="vf-field">
            <label>المبلغ بالحروف</label>
            <div id="vAmountWords" class="vf-amount-words">صفر</div>
          </div>

          ${!isReceipt ? `<div class="vf-available">المتاح: ${Utils.money(this.getAvailableBalance())}</div>` : ''}
        </div>

        <!-- القسم الثالث: الصندوق -->
        <div class="vf-section">
          <div class="vf-section-header">
            <span class="vf-section-icon">💰</span>
            <span>الصندوق</span>
          </div>
          <div class="vf-field">
            <label>اختر الصندوق</label>
            <select id="vCashbox">
              <option value="main">الصندوق الرئيسي</option>
            </select>
          </div>
          <div class="vf-field">
            <label>ملاحظات إضافية 📝</label>
            <textarea id="vAdditionalNotes" rows="2" placeholder="ملاحظات إضافية..."></textarea>
          </div>
        </div>

        <!-- أزرار الحفظ -->
        <div class="vf-actions">
          <button class="btn btn-ghost" style="flex:1;" onclick="Vouchers.backToList()">✖ إلغاء</button>
          <button class="btn" style="flex:2; background:${color}; color:#fff; font-weight:700;" onclick="Vouchers.save('${this.currentView}')">
            💾 حفظ السند
          </button>
        </div>
      </div>
    `;

    content.innerHTML = html;
    this.injectFormStyles();
  },

  onPartyChange(select) {
    const customField = document.getElementById('customPartyField');
    if (select.value === 'custom') {
      customField.style.display = 'block';
    } else {
      customField.style.display = 'none';
    }
  },

  updateAmountWords() {
    const amount = Number(document.getElementById('vAmount').value) || 0;
    document.getElementById('vAmountWords').textContent = this.numberToArabicWords(amount);
  },

  getAvailableBalance() {
    const payments = DB.get('payments') || [];
    const expenses = DB.get('expenses') || [];
    let balance = 0;
    payments.forEach(p => balance += (p.type === 'in' ? p.amount : -p.amount));
    expenses.forEach(e => balance -= e.amount);
    return balance;
  },

  save(type) {
    const partySelect = document.getElementById('vParty').value;
    const customParty = document.getElementById('vCustomParty') ? document.getElementById('vCustomParty').value.trim() : '';
    const phone = document.getElementById('vPhone').value.trim();
    const notes = document.getElementById('vNotes').value.trim();
    const currency = document.getElementById('vCurrency').value;
    const amount = Number(document.getElementById('vAmount').value) || 0;
    const additionalNotes = document.getElementById('vAdditionalNotes').value.trim();

    if (amount <= 0) {
      UI.toast('⚠️ يجب إدخال مبلغ أكبر من صفر', 'error');
      return;
    }

    let partyName = partySelect;
    if (partySelect === 'custom') partyName = customParty;
    if (!partyName) {
      UI.toast('⚠️ يجب اختيار الجهة', 'error');
      return;
    }

    const isReceipt = type === 'receipt';
    const number = Utils.docNumber(isReceipt ? 'RC' : 'PV');

    const voucher = {
      number,
      type,
      party: partySelect,
      partyName,
      phone,
      notes,
      amount,
      currency,
      additionalNotes,
      cashbox: 'main',
      createdAt: new Date().toISOString(),
      createdBy: Auth.current().userId
    };

    DB.insert('vouchers', voucher);

    // ربط بالخزينة (payments)
    DB.insert('payments', {
      type: isReceipt ? 'in' : 'out',
      amount,
      refId: voucher.id,
      refType: 'voucher',
      note: `${isReceipt ? 'سند قبض' : 'سند صرف'} ${number} - ${partyName}`,
      date: new Date().toISOString()
    });
// إذا كانت الجهة موظفاً، اربط العملية براتبه
if (partySelect && !['custom', 'expenses', 'rent', 'other'].includes(partySelect)) {
  const emp = DB.find('employees', partySelect);
  if (emp) {
    DB.insert('employee_transactions', {
      employeeId: partySelect,
      employeeName: emp.name,
      type: isReceipt ? 'credit' : 'debit',
      amount: amount,
      description: isReceipt ? 'استلام دفعة' : 'دفع مبلغ',
      reference: number,
      date: new Date().toISOString()
    });
  }
}
    // تسجيل في سجل النشاط
    try {
      DB.insert('activity_log', {
        userId: Auth.current().userId,
        action: 'voucher_create',
        detail: `إنشاء ${isReceipt ? 'سند قبض' : 'سند صرف'} بمبلغ ${Utils.money(amount)}`,
        at: new Date().toISOString()
      });
    } catch(e) {}

    UI.toast(`✅ تم حفظ ${isReceipt ? 'سند القبض' : 'سند الصرف'}`, 'success');

    // عرض نافذة النجاح مع طباعة
    setTimeout(() => this.showSuccess(voucher), 300);
    this.backToList();
  },

  showSuccess(voucher) {
    const isReceipt = voucher.type === 'receipt';
    const bodyHtml = `
      <div style="text-align:center; padding:20px 0;">
        <div style="font-size:60px; margin-bottom:12px;">${isReceipt ? '📥' : '📤'}</div>
        <h3 style="color:var(--success); margin-bottom:8px;">تم الحفظ بنجاح!</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">رقم السند:</p>
        <p style="font-size:18px; font-weight:800; color:var(--primary); margin-bottom:16px;">${voucher.number}</p>
        <div style="background:var(--bg); padding:12px; border-radius:8px;">
          <div style="font-size:13px; margin-bottom:4px;">الجهة: <b>${voucher.partyName}</b></div>
          <div style="font-size:18px; font-weight:800;">${Utils.money(voucher.amount)}</div>
        </div>
      </div>
    `;
    const actionsHtml = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="Vouchers.print('${voucher.id}')">🖨️ طباعة السند</button>
    `;
    UI.openModal('عملية ناجحة', bodyHtml, actionsHtml);
  },

  remove(id) {
    if (!confirm('هل تريد حذف هذا السند؟')) return;
    DB.remove('vouchers', id);
    this.render();
    UI.toast('✅ تم الحذف', 'success');
  },

  /** طباعة السند */
  print(id) {
    const voucher = DB.find('vouchers', id);
    if (!voucher) return;

    const settings = DB.getSettings();
    const isReceipt = voucher.type === 'receipt';
    const color = isReceipt ? '#ea580c' : '#dc2626';
    const logo = settings.companyLogo || '';

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${isReceipt ? 'سند قبض' : 'سند صرف'} ${voucher.number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            background: #f5f5f5; padding: 20px; direction: rtl;
          }
          .voucher {
            background: #fff; max-width: 400px; margin: 0 auto;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
          }
          .v-header {
            background: linear-gradient(135deg, ${color}, ${isReceipt ? '#f59e0b' : '#b91c1c'});
            color: #fff; padding: 24px 20px; text-align: center;
          }
          .v-logo { width: 50px; height: 50px; margin: 0 auto 8px; }
          .v-type { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          .v-number {
            font-size: 14px; font-weight: 700;
            background: rgba(255,255,255,0.2);
            padding: 4px 14px; border-radius: 20px; display: inline-block;
            margin-top: 8px;
          }
          .v-body { padding: 20px; }
          .v-row {
            display: flex; justify-content: space-between;
            padding: 10px 0; border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
          }
          .v-row:last-child { border-bottom: none; }
          .v-label { color: #64748b; }
          .v-value { font-weight: 700; color: #1e293b; }
          .v-amount-box {
            background: ${isReceipt ? '#fef3c7' : '#fee2e2'};
            border: 2px dashed ${color};
            border-radius: 10px; padding: 16px;
            text-align: center; margin: 16px 0;
          }
          .v-amount-label { font-size: 11px; color: ${color}; font-weight: 700; margin-bottom: 4px; }
          .v-amount-value { font-size: 26px; font-weight: 900; color: ${color}; }
          .v-amount-words {
            font-size: 11px; color: #64748b; margin-top: 6px;
            padding-top: 6px; border-top: 1px dashed ${color};
          }
          .v-footer {
            background: #f8fafc; padding: 12px; text-align: center;
            font-size: 10px; color: #94a3b8;
            border-top: 1px solid #e2e8f0;
          }
          .v-signatures {
            display: flex; justify-content: space-between;
            margin-top: 30px; padding-top: 15px;
            border-top: 1px dashed #e2e8f0;
          }
          .signature-box {
            text-align: center; flex: 1;
          }
          .sig-line { height: 40px; border-bottom: 1px solid #cbd5e1; margin: 0 10px; }
          .sig-label { font-size: 11px; color: #64748b; margin-top: 6px; }
          
          .print-actions {
            position: fixed; top: 15px; left: 15px;
            display: flex; gap: 8px; z-index: 999;
          }
          .print-btn {
            padding: 10px 18px; border-radius: 8px; border: none;
            font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          .btn-print { background: ${color}; color: #fff; }
          .btn-close { background: #fff; color: #333; border: 1px solid #ddd; }
          
          @media print {
            body { background: #fff; padding: 0; }
            .voucher { box-shadow: none; }
            .print-actions { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="print-btn btn-print" onclick="window.print()">🖨️ طباعة</button>
          <button class="print-btn btn-close" onclick="window.close()">✖ إغلاق</button>
        </div>

        <div class="voucher">
          <div class="v-header">
            ${logo ? `<img src="${logo}" class="v-logo">` : ''}
            <div class="v-type">${isReceipt ? 'سند قبض' : 'سند صرف'}</div>
            <div style="font-size:11px; opacity:0.9;">${isReceipt ? 'استلام مبلغ نقدي' : 'دفع مبلغ نقدي'}</div>
            <div class="v-number">${voucher.number}</div>
          </div>

          <div class="v-body">
            <div class="v-row">
              <span class="v-label">التاريخ:</span>
              <span class="v-value">${Utils.date(voucher.createdAt, true)}</span>
            </div>
            <div class="v-row">
              <span class="v-label">${isReceipt ? 'استلمنا من:' : 'دفعنا إلى:'}</span>
              <span class="v-value">${Utils.esc(voucher.partyName)}</span>
            </div>
            ${voucher.phone ? `
            <div class="v-row">
              <span class="v-label">الهاتف:</span>
              <span class="v-value" dir="ltr">${Utils.esc(voucher.phone)}</span>
            </div>` : ''}
            ${voucher.notes ? `
            <div class="v-row">
              <span class="v-label">البيان:</span>
              <span class="v-value" style="font-size:12px;">${Utils.esc(voucher.notes)}</span>
            </div>` : ''}

            <div class="v-amount-box">
              <div class="v-amount-label">المبلغ</div>
              <div class="v-amount-value">${Utils.money(voucher.amount)}</div>
              <div class="v-amount-words">${this.numberToArabicWords(voucher.amount)}</div>
            </div>

            <div class="v-signatures">
              <div class="signature-box">
                <div class="sig-line"></div>
                <div class="sig-label">التوقيع</div>
              </div>
              <div class="signature-box">
                <div class="sig-line"></div>
                <div class="sig-label">المستلم</div>
              </div>
            </div>
          </div>

          <div class="v-footer">
            ${settings.companyName || 'ورشة التصنيع'} — ${settings.companyPhone || ''}<br>
            تم إصداره بواسطة IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  },

  /** تحويل الأرقام إلى كلمات عربية */
  numberToArabicWords(num) {
    if (num === 0) return 'صفر';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
    
    function convertLessThan1000(n) {
      if (n === 0) return '';
      let parts = [];
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const o = n % 10;
      
      if (h > 0) parts.push(hundreds[h]);
      if (t > 0 || o > 0) {
        if (o > 0 && t === 0) parts.push(ones[o]);
        else if (o === 0 && t > 0) parts.push(tens[t]);
        else parts.push(ones[o] + ' و' + tens[t]);
      }
      return parts.join(' و');
    }
    
    num = Math.floor(num);
    if (num === 0) return 'صفر';
    
    let result = [];
    const millions = Math.floor(num / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;
    
    if (millions > 0) result.push(convertLessThan1000(millions) + ' مليون');
    if (thousands > 0) result.push(convertLessThan1000(thousands) + ' ألف');
    if (remainder > 0) result.push(convertLessThan1000(remainder));
    
    return result.join(' و');
  },

  injectStyles() {
    if (document.getElementById('vouchers-styles')) return;
    const style = document.createElement('style');
    style.id = 'vouchers-styles';
    style.innerHTML = `
      /* البطاقة الرئيسية */
      .voucher-hero {
        background: linear-gradient(135deg, #ea580c, #f59e0b);
        border-radius: 20px;
        padding: 20px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(234, 88, 12, 0.3);
      }
      .voucher-hero-title { text-align: center; margin-bottom: 16px; }
      .voucher-hero-title span { font-size: 22px; font-weight: 800; display: block; }
      .voucher-hero-title small { font-size: 12px; opacity: 0.85; }
      .voucher-hero-stats {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      }
      .vh-stat {
        background: rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 12px 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }
      .vh-stat.active {
        background: #fff;
        color: #ea580c;
        border-color: #ea580c;
      }
      .vh-icon { font-size: 22px; margin-bottom: 4px; }
      .vh-value { font-size: 22px; font-weight: 800; }
      .vh-label { font-size: 11px; opacity: 0.9; }
      
      /* أزرار الإنشاء */
      .voucher-actions {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        margin-bottom: 20px;
      }
      .voucher-action-btn {
        background: #fff;
        border: 2px solid var(--border);
        border-radius: 14px;
        padding: 16px;
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; transition: all 0.2s;
        text-align: right;
      }
      .voucher-action-btn.receipt { border-color: #ea580c; }
      .voucher-action-btn.payment { border-color: #dc2626; }
      .voucher-action-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }
      .va-icon { font-size: 28px; }
      .va-text b { display: block; font-size: 14px; font-weight: 800; }
      .va-text span { font-size: 11px; color: var(--text-muted); }
      
      /* قائمة السندات */
      .voucher-list-header {
        margin-bottom: 10px;
      }
      .voucher-list-header h3 {
        font-size: 15px; font-weight: 700; color: var(--text);
      }
      .voucher-list {
        display: grid; gap: 12px;
      }
      .voucher-card {
        background: #fff;
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .voucher-card-header {
        padding: 12px 16px;
        display: flex; justify-content: space-between; align-items: center;
        color: #fff;
      }
      .bg-receipt { background: linear-gradient(135deg, #ea580c, #f59e0b); }
      .bg-payment { background: linear-gradient(135deg, #dc2626, #b91c1c); }
      .vc-type { font-size: 13px; font-weight: 700; }
      .vc-number { font-size: 11px; font-weight: 600; opacity: 0.9; }
      .voucher-card-body { padding: 14px 16px; }
      .vc-row {
        display: flex; justify-content: space-between;
        padding: 6px 0; font-size: 13px;
      }
      .vc-row span:first-child { color: var(--text-muted); }
      .receipt-text { color: #ea580c; font-weight: 800; }
      .payment-text { color: #dc2626; font-weight: 800; }
      .voucher-card-actions {
        padding: 10px 16px; border-top: 1px solid var(--border);
        display: flex; gap: 8px;
      }
      
      /* صفحة النموذج */
      .voucher-page-header {
        border-radius: 16px;
        padding: 20px;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 16px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      }
      .voucher-back-btn {
        background: rgba(255,255,255,0.25);
        color: #fff;
        border: none;
        width: 40px; height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
      }
      .voucher-page-title h2 { font-size: 20px; font-weight: 800; margin: 0; }
      .voucher-page-title p { font-size: 12px; opacity: 0.9; margin: 2px 0 0; }
      
      .voucher-form-card {
        display: grid; gap: 14px;
      }
      .vf-section {
        background: #fff;
        border-radius: 14px;
        padding: 16px;
        border: 1px solid var(--border);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .vf-section.yellow {
        background: #fef3c7;
        border: 2px solid #f59e0b;
      }
      .vf-section.red {
        background: #fee2e2;
        border: 2px solid #dc2626;
      }
      .vf-section-header {
        display: flex; align-items: center; gap: 8px;
        font-size: 14px; font-weight: 700;
        margin-bottom: 12px;
        color: var(--text);
      }
      .vf-section-icon { font-size: 18px; }
      .vf-field { margin-bottom: 12px; }
      .vf-field:last-child { margin-bottom: 0; }
      .vf-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .vf-field input, .vf-field select, .vf-field textarea {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        font-family: inherit; font-size: 14px;
        background: #fff;
        outline: none;
        transition: all 0.2s;
      }
      .vf-field input:focus, .vf-field select:focus, .vf-field textarea:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      .vf-amount-words {
        background: #fff;
        border: 2px dashed #f59e0b;
        border-radius: 10px;
        padding: 12px;
        text-align: center;
        font-weight: 700;
        color: #92400e;
        font-size: 13px;
      }
      .vf-available {
        margin-top: 8px;
        font-size: 11px;
        color: #b91c1c;
        font-weight: 700;
        text-align: center;
      }
      .vf-actions {
        display: flex; gap: 10px;
        padding: 14px;
        background: #fff;
        border-radius: 14px;
        border: 1px solid var(--border);
      }
    `;
    document.head.appendChild(style);
  },

  injectFormStyles() {
    // التنسيقات موجودة بالفعل
  }
};

console.log('✅ Vouchers loaded');