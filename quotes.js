/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — عروض الأسعار (مع الطباعة)
   ═══════════════════════════════════════════════════════════════ */

const Quotes = {
  filter: 'all', // all, pending, approved
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const quotes = DB.get('quotes') || [];

    // تصفية
    let filtered = quotes;
    if (this.filter === 'pending') filtered = quotes.filter(q => q.status === 'pending');
    if (this.filter === 'approved') filtered = quotes.filter(q => q.status === 'approved');
    
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        (q.quoteNumber && q.quoteNumber.toLowerCase().includes(s)) ||
        (q.productName && q.productName.toLowerCase().includes(s)) ||
        (q.customerName && q.customerName.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات
    const totalQuotes = quotes.length;
    const pendingCount = quotes.filter(q => q.status === 'pending').length;
    const approvedCount = quotes.filter(q => q.status === 'approved').length;
    const totalValue = quotes.reduce((sum, q) => sum + (Number(q.totalPrice) || 0), 0);

    let html = `
      <div class="page-header">
        <h1 class="page-title">عروض الأسعار</h1>
        <button class="btn btn-primary" onclick="Quotes.openForm()">➕ عرض سعر جديد</button>
      </div>

      <!-- البطاقة العلوية -->
      <div class="quote-hero">
        <div class="quote-hero-title">
          <h2>عروض الأسعار 📝</h2>
          <p>إدارة العروض المقدمة للعملاء</p>
        </div>
        <div class="quote-hero-stats">
          <div class="qs-stat" onclick="Quotes.setFilter('all')">
            <div class="qs-value">${totalQuotes}</div>
            <div class="qs-label">الكل</div>
          </div>
          <div class="qs-stat" onclick="Quotes.setFilter('pending')">
            <div class="qs-value">${pendingCount}</div>
            <div class="qs-label">معلقة</div>
          </div>
          <div class="qs-stat" onclick="Quotes.setFilter('approved')">
            <div class="qs-value">${approvedCount}</div>
            <div class="qs-label">معتمدة</div>
          </div>
        </div>
        <div class="quote-hero-total">
          <span>إجمالي قيمة العروض:</span>
          <b>${Utils.money(totalValue)}</b>
        </div>
      </div>

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 بحث برقم العرض، المنتج، العميل..." value="${Utils.esc(this.searchTerm)}"
          oninput="Quotes.searchTerm = this.value; Quotes.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <!-- فلاتر -->
      <div class="quote-filters">
        <button class="qf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Quotes.setFilter('all')">الكل</button>
        <button class="qf-btn ${this.filter === 'pending' ? 'active' : ''}" onclick="Quotes.setFilter('pending')">⏳ معلقة</button>
        <button class="qf-btn ${this.filter === 'approved' ? 'active' : ''}" onclick="Quotes.setFilter('approved')">✅ معتمدة</button>
      </div>

      <!-- قائمة العروض -->
      <div class="quote-list">
        ${filtered.length ? filtered.map(q => this.renderQuoteCard(q)).join('') : `
          <div class="empty-state">
            <div class="icon">📝</div>
            <p>لا توجد عروض أسعار مطابقة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderQuoteCard(q) {
    const isApproved = q.status === 'approved';
    const color = isApproved ? 'green' : 'orange';

    return `
      <div class="quote-card quote-${color}">
        <div class="qc-header">
          <div class="qc-number">#${q.quoteNumber}</div>
          <div class="qc-status status-${q.status}">
            ${isApproved ? '✅ معتمد' : '⏳ قيد الانتظار'}
          </div>
        </div>
        
        <div class="qc-body">
          <div class="qc-product">${Utils.esc(q.productName)}</div>
          <div class="qc-customer">
            <span>👤 ${Utils.esc(q.customerName)}</span>
            <span>📅 ${Utils.date(q.createdAt)}</span>
          </div>
          ${q.width > 0 ? `
            <div class="qc-dims">
              📏 المقاسات: ${q.width} × ${q.height} سم 
              ${q.qty > 1 ? ` • الكمية: ${q.qty}` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="qc-footer">
          <div class="qc-price">
            <span>الإجمالي:</span>
            <b>${Utils.money(q.totalPrice)}</b>
          </div>
          <div class="qc-actions">
            <button class="qc-btn qc-print" onclick="Quotes.print('${q.id}')" title="طباعة">
              🖨️
            </button>
            ${!isApproved ? `
              <button class="qc-btn qc-approve" onclick="Quotes.approve('${q.id}')" title="اعتماد">
                ✅ اعتماد
              </button>
            ` : `
              <button class="qc-btn qc-project" onclick="Quotes.viewProject('${q.id}')" title="عرض المشروع">
                📁 المشروع
              </button>
            `}
            <button class="qc-btn qc-delete" onclick="Quotes.remove('${q.id}')" title="حذف">🗑️</button>
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
    if (!Auth.require('projects.manage', 'إدارة العروض')) return;

    const customers = DB.get('customers') || [];
    const products = DB.get('products') || [];

    const formHtml = `
      <div style="display:grid; gap:12px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">العميل</label>
          <select id="quoteCustomer" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
            <option value="">-- عميل نقدي --</option>
            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المنتج</label>
          <select id="quoteProduct" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
            <option value="">-- اختر منتجاً --</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (${Utils.money(p.basePrice)})</option>`).join('')}
            <option value="custom">منتج مخصص</option>
          </select>
        </div>
        <div id="quoteCustomDiv" style="display:none;">
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">اسم المنتج المخصص</label>
          <input type="text" id="quoteCustomName" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">العرض (سم)</label>
            <input type="number" id="quoteWidth" value="0" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الطول (سم)</label>
            <input type="number" id="quoteHeight" value="0" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الكمية</label>
            <input type="number" id="quoteQty" value="1" min="1" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
          </div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">سعر البيع الإجمالي</label>
          <input type="number" id="quotePrice" value="0" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px; font-size:16px; font-weight:700;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">ملاحظات / شروط</label>
          <textarea id="quoteNotes" rows="3" placeholder="مثال: السعر لا يشمل التركيب، مدة التنفيذ 15 يوم..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px; font-family:inherit;"></textarea>
        </div>
      </div>
    `;

    const actionsHtml = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Quotes.save()">حفظ العرض</button>
    `;

    UI.openModal('إنشاء عرض سعر', formHtml, actionsHtml);

    setTimeout(() => {
      const sel = document.getElementById('quoteProduct');
      const div = document.getElementById('quoteCustomDiv');
      if (sel && div) {
        sel.onchange = () => {
          div.style.display = sel.value === 'custom' ? 'block' : 'none';
          if (sel.value !== 'custom' && sel.value !== '') {
            const p = DB.find('products', sel.value);
            if (p) document.getElementById('quotePrice').value = p.basePrice;
          }
        };
      }
    }, 100);
  },

  save() {
    const customerId = document.getElementById('quoteCustomer').value;
    const productId = document.getElementById('quoteProduct').value;
    const customName = document.getElementById('quoteCustomName')?.value || '';
    const width = Number(document.getElementById('quoteWidth').value) || 0;
    const height = Number(document.getElementById('quoteHeight').value) || 0;
    const qty = Number(document.getElementById('quoteQty').value) || 1;
    const price = Number(document.getElementById('quotePrice').value) || 0;
    const notes = document.getElementById('quoteNotes').value.trim();

    if (!productId) {
      UI.toast('⚠️ اختر منتجاً', 'error');
      return;
    }

    let productName = '';
    if (productId === 'custom') {
      productName = customName || 'منتج مخصص';
    } else {
      const p = DB.find('products', productId);
      productName = p ? p.name : 'غير معروف';
    }

    const customer = customerId ? DB.find('customers', customerId) : null;

    const newQuote = {
      quoteNumber: Utils.docNumber('QT'),
      customerId: customerId || null,
      customerName: customer ? customer.name : 'عميل نقدي',
      customerPhone: customer ? customer.phone : '',
      productId: productId === 'custom' ? null : productId,
      productName,
      width, height, qty,
      totalPrice: price,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    DB.insert('quotes', newQuote);
    UI.closeModal();
    this.render();
    UI.toast('✅ تم إنشاء عرض السعر', 'success');

    setTimeout(() => this.print(newQuote.id), 500);
  },

  approve(id) {
    if (!confirm('اعتماد العرض وتحويله إلى مشروع؟')) return;
    const quote = DB.find('quotes', id);
    if (!quote) return;

    DB.update('quotes', id, { status: 'approved', projectId: null });

    const projectNumber = Utils.docNumber('PRJ');
    const newProject = {
      projectNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      productId: quote.productId,
      productName: quote.productName,
      width: quote.width,
      height: quote.height,
      qty: quote.qty,
      notes: quote.notes,
      status: 'approved',
      totalCost: 0,
      totalPrice: quote.totalPrice,
      createdAt: new Date().toISOString(),
      createdBy: Auth.current().userId,
      quoteRef: quote.quoteNumber
    };

    const saved = DB.insert('projects', newProject);
    DB.update('quotes', id, { projectId: saved.id });

    this.render();
    UI.toast('✅ تم تحويل العرض إلى مشروع', 'success');
    setTimeout(() => UI.navigate('projects'), 1000);
  },

  viewProject(id) {
    const q = DB.find('quotes', id);
    if (q && q.projectId) {
      UI.navigate('projects');
    } else {
      UI.toast('لا يوجد مشروع مرتبط', 'info');
    }
  },

  remove(id) {
    if (!confirm('حذف عرض السعر نهائياً؟')) return;
    DB.remove('quotes', id);
    this.render();
    UI.toast('✅ تم الحذف', 'success');
  },

  print(id) {
    const q = DB.find('quotes', id);
    if (!q) return;

    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>عرض سعر ${q.quoteNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px; direction: rtl; }
          .quote-doc {
            background: #fff; max-width: 750px; margin: 0 auto;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .q-header {
            background: linear-gradient(135deg, #ea580c, #f59e0b);
            color: #fff; padding: 30px;
            display: flex; justify-content: space-between; align-items: center;
          }
          .q-company { display: flex; gap: 14px; align-items: center; }
          .q-logo { width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 16px; padding: 8px; }
          .q-logo img { width: 100%; height: 100%; object-fit: contain; }
          .q-company-name { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
          .q-company-info { font-size: 12px; opacity: 0.9; line-height: 1.6; }
          .q-title-box { text-align: left; }
          .q-title { font-size: 26px; font-weight: 900; letter-spacing: 1px; }
          .q-number {
            font-size: 15px; font-weight: 700;
            background: rgba(255,255,255,0.25);
            padding: 4px 14px; border-radius: 20px;
            display: inline-block; margin-top: 8px;
            direction: ltr;
          }
          .q-body { padding: 30px; }
          .q-info-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 20px; margin-bottom: 24px;
          }
          .q-info-box {
            background: #f8fafc;
            padding: 14px 18px;
            border-radius: 10px;
            border-right: 4px solid #ea580c;
          }
          .q-info-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
          .q-info-value { font-size: 15px; font-weight: 800; color: #1e293b; }
          .q-details-table {
            width: 100%; border-collapse: collapse; margin-bottom: 24px;
          }
          .q-details-table thead { background: #1e293b; color: #fff; }
          .q-details-table th { padding: 12px; text-align: right; font-size: 13px; }
          .q-details-table td {
            padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;
          }
          .q-details-table tbody tr:nth-child(even) { background: #f8fafc; }
          
          .q-totals {
            margin-right: auto;
            width: 300px;
            background: #fef3c7;
            border: 2px solid #ea580c;
            border-radius: 12px;
            padding: 16px;
          }
          .q-total-row {
            display: flex; justify-content: space-between;
            padding: 8px 0; font-size: 13px;
            border-bottom: 1px dashed #fcd34d;
          }
          .q-total-row:last-child { border: none; }
          .q-total-final {
            padding: 12px 0 0;
            margin-top: 8px;
            border-top: 2px solid #ea580c;
            font-size: 16px;
            font-weight: 900;
            color: #ea580c;
          }
          
          .q-notes {
            background: #f8fafc;
            border-radius: 10px;
            padding: 16px;
            margin-top: 20px;
            border-right: 4px solid #f59e0b;
          }
          .q-notes-title { font-weight: 800; font-size: 13px; margin-bottom: 6px; color: #92400e; }
          .q-notes-text { font-size: 12px; color: #475569; line-height: 1.8; }

          .q-signatures {
            display: flex; justify-content: space-around;
            margin-top: 40px; padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
          }
          .signature { text-align: center; }
          .sig-line { width: 140px; height: 50px; border-bottom: 2px solid #cbd5e1; margin-bottom: 8px; }
          .sig-label { font-size: 12px; color: #64748b; font-weight: 600; }

          .q-footer {
            background: #1e293b; color: #94a3b8;
            padding: 16px; text-align: center;
            font-size: 11px; line-height: 1.8;
          }
          
          .print-actions {
            position: fixed; top: 20px; left: 20px;
            display: flex; gap: 8px; z-index: 999;
          }
          .print-btn {
            padding: 12px 24px; border-radius: 10px;
            border: none; font-family: inherit;
            font-size: 14px; font-weight: 700;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .btn-print { background: #ea580c; color: #fff; }
          .btn-close { background: #fff; color: #333; border: 1px solid #ddd; }
          
          @media print {
            body { background: #fff; padding: 0; }
            .quote-doc { box-shadow: none; border-radius: 0; max-width: 100%; }
            .print-actions { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="print-btn btn-print" onclick="window.print()">🖨️ طباعة العرض</button>
          <button class="print-btn btn-close" onclick="window.close()">✖ إغلاق</button>
        </div>

        <div class="quote-doc">
          <div class="q-header">
            <div class="q-company">
              ${logo ? `<div class="q-logo"><img src="${logo}"></div>` : ''}
              <div>
                <div class="q-company-name">${settings.companyName || 'ورشة التصنيع'}</div>
                <div class="q-company-info">
                  ${settings.companyPhone || ''}<br>
                  ${settings.companyAddress || ''}
                </div>
              </div>
            </div>
            <div class="q-title-box">
              <div class="q-title">عرض سعر</div>
              <div class="q-number">${q.quoteNumber}</div>
            </div>
          </div>

          <div class="q-body">
            <div class="q-info-grid">
              <div class="q-info-box">
                <div class="q-info-label">مقدم إلى / العميل:</div>
                <div class="q-info-value">${Utils.esc(q.customerName)}</div>
                ${q.customerPhone ? `<div style="font-size:11px; color:#64748b; margin-top:4px;" dir="ltr">${q.customerPhone}</div>` : ''}
              </div>
              <div class="q-info-box">
                <div class="q-info-label">التاريخ:</div>
                <div class="q-info-value">${Utils.date(q.createdAt, true)}</div>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">صالح لمدة 15 يوم</div>
              </div>
            </div>

            <table class="q-details-table">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>المقاسات</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;">${Utils.esc(q.productName)}</td>
                  <td>${q.width > 0 ? q.width + ' × ' + q.height + ' سم' : '—'}</td>
                  <td>${q.qty}</td>
                  <td style="font-weight:700; color:#ea580c;">${Utils.money(q.totalPrice)}</td>
                </tr>
              </tbody>
            </table>

            <div class="q-totals">
              <div class="q-total-row">
                <span>المجموع:</span>
                <span>${Utils.money(q.totalPrice)}</span>
              </div>
              <div class="q-total-row q-total-final">
                <span>الإجمالي النهائي:</span>
                <span>${Utils.money(q.totalPrice)}</span>
              </div>
            </div>

            ${q.notes ? `
              <div class="q-notes">
                <div class="q-notes-title">📌 ملاحظات وشروط:</div>
                <div class="q-notes-text">${Utils.esc(q.notes)}</div>
              </div>
            ` : ''}

            <div class="q-signatures">
              <div class="signature">
                <div class="sig-line"></div>
                <div class="sig-label">توقيع العميل</div>
              </div>
              <div class="signature">
                <div class="sig-line"></div>
                <div class="sig-label">توقيع الورشة</div>
              </div>
            </div>
          </div>

          <div class="q-footer">
            ${settings.companyName || 'ورشة التصنيع'} — شكراً لثقتكم بنا 🤝<br>
            هذا العرض صادر إلكترونياً بواسطة IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  },

  injectStyles() {
    if (document.getElementById('quote-styles-v2')) return;
    const style = document.createElement('style');
    style.id = 'quote-styles-v2';
    style.innerHTML = `
      .quote-hero {
        background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
        border-radius: 24px;
        padding: 22px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(234,88,12,0.3);
        position: relative; overflow: hidden;
      }
      .quote-hero::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%);
        border-radius: 50%;
      }
      .quote-hero-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .quote-hero-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .quote-hero-title p { font-size: 13px; opacity: 0.9; }
      
      .quote-hero-stats {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px; margin-bottom: 14px;
        position: relative; z-index: 1;
      }
      .qs-stat {
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        padding: 12px;
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .qs-stat:hover { background: rgba(255,255,255,0.3); }
      .qs-value { font-size: 22px; font-weight: 800; }
      .qs-label { font-size: 11px; opacity: 0.9; margin-top: 2px; }
      
      .quote-hero-total {
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        padding: 12px 16px;
        border-radius: 12px;
        display: flex; justify-content: space-between;
        align-items: center;
        position: relative; z-index: 1;
      }
      .quote-hero-total span { font-size: 12px; opacity: 0.9; }
      .quote-hero-total b { font-size: 18px; }

      .quote-filters {
        display: flex; gap: 6px; margin-bottom: 14px;
        background: #fff; padding: 6px;
        border-radius: 12px; border: 1px solid var(--border);
      }
      .qf-btn {
        flex: 1; padding: 10px;
        background: transparent; border: none;
        border-radius: 8px;
        font-size: 12px; font-weight: 700;
        color: var(--text-muted);
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .qf-btn.active {
        background: linear-gradient(135deg, #ea580c, #f59e0b);
        color: #fff;
      }

      .quote-list { display: grid; gap: 12px; }
      .quote-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .quote-orange { border-right: 4px solid #f59e0b; }
      .quote-green { border-right: 4px solid #10b981; }
      
      .qc-header {
        padding: 12px 16px;
        background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }
      .qc-number {
        font-weight: 800;
        font-size: 13px;
        color: var(--primary);
      }
      .qc-status {
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
      }
      .status-pending { background: #fef3c7; color: #b45309; }
      .status-approved { background: #dcfce7; color: #166534; }
      
      .qc-body { padding: 14px 16px; }
      .qc-product {
        font-size: 16px; font-weight: 800;
        color: var(--text); margin-bottom: 6px;
      }
      .qc-customer {
        font-size: 12px; color: var(--text-muted);
        display: flex; gap: 14px;
        margin-bottom: 6px;
      }
      .qc-dims {
        font-size: 11px; color: var(--text-muted);
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 6px;
        display: inline-block;
      }
      
      .qc-footer {
        padding: 12px 16px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
        display: flex; justify-content: space-between;
        align-items: center;
        flex-wrap: wrap; gap: 8px;
      }
      .qc-price {
        display: flex; align-items: baseline; gap: 6px;
      }
      .qc-price span { font-size: 11px; color: var(--text-muted); }
      .qc-price b { font-size: 18px; font-weight: 900; color: #ea580c; }
      
      .qc-actions { display: flex; gap: 6px; }
      .qc-btn {
        padding: 8px 12px;
        border: none; border-radius: 8px;
        font-size: 12px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .qc-print { background: #dbeafe; color: #1e40af; }
      .qc-approve { background: #dcfce7; color: #166534; }
      .qc-project { background: #dcfce7; color: #166534; }
      .qc-delete { background: #fee2e2; color: #991b1b; }
      .qc-btn:hover { transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Quotes v2 loaded (with printing)');
