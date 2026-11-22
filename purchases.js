/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — إدارة المشتريات (فواتير الشراء)
   ═══════════════════════════════════════════════════════════════ */

const Purchases = {
  filter: 'all', // all, paid, partial, unpaid

  render() {
    const content = document.getElementById('content');
    const purchases = DB.get('purchases') || [];

    // تصفية
    let filtered = purchases;
    if (this.filter === 'paid') filtered = purchases.filter(p => p.status === 'paid');
    if (this.filter === 'partial') filtered = purchases.filter(p => p.status === 'partial');
    if (this.filter === 'unpaid') filtered = purchases.filter(p => p.status === 'unpaid');

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات
    const total = purchases.length;
    const totalInvoiced = purchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    const totalRemaining = totalInvoiced - totalPaid;

    const paidCount = purchases.filter(p => p.status === 'paid').length;
    const partialCount = purchases.filter(p => p.status === 'partial').length;
    const unpaidCount = purchases.filter(p => p.status === 'unpaid').length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">المشتريات</h1>
        <button class="btn btn-primary" onclick="Purchases.openForm()">➕ فاتورة شراء جديدة</button>
      </div>

      <!-- البطاقة الرئيسية -->
      <div class="pur-hero">
        <div class="pur-hero-icon">🛒</div>
        <div class="pur-hero-content">
          <div class="pur-hero-title">إجمالي المشتريات</div>
          <div class="pur-hero-value">${Utils.money(totalInvoiced)}</div>
          <div class="pur-hero-stats">
            <div class="pur-hero-stat">
              <div class="pur-hero-stat-label">المدفوع</div>
              <div class="pur-hero-stat-value in">${Utils.money(totalPaid)}</div>
            </div>
            <div class="pur-hero-stat">
              <div class="pur-hero-stat-label">المتبقي</div>
              <div class="pur-hero-stat-value out">${Utils.money(totalRemaining)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- إحصائيات سريعة -->
      <div class="pur-stats">
        <div class="pur-stat pur-stat-total">
          <div class="ps-icon">📋</div>
          <div class="ps-info">
            <div class="ps-value">${total}</div>
            <div class="ps-label">إجمالي الفواتير</div>
          </div>
        </div>
        <div class="pur-stat pur-stat-paid">
          <div class="ps-icon">✅</div>
          <div class="ps-info">
            <div class="ps-value">${paidCount}</div>
            <div class="ps-label">مدفوعة</div>
          </div>
        </div>
        <div class="pur-stat pur-stat-partial">
          <div class="ps-icon">🟡</div>
          <div class="ps-info">
            <div class="ps-value">${partialCount}</div>
            <div class="ps-label">جزئية</div>
          </div>
        </div>
        <div class="pur-stat pur-stat-unpaid">
          <div class="ps-icon">🔴</div>
          <div class="ps-info">
            <div class="ps-value">${unpaidCount}</div>
            <div class="ps-label">غير مدفوعة</div>
          </div>
        </div>
      </div>

      <!-- الفلاتر -->
      <div class="pur-filters">
        <button class="pf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Purchases.setFilter('all')">📋 الكل</button>
        <button class="pf-btn ${this.filter === 'paid' ? 'active' : ''}" onclick="Purchases.setFilter('paid')">✅ مدفوعة</button>
        <button class="pf-btn ${this.filter === 'partial' ? 'active' : ''}" onclick="Purchases.setFilter('partial')">🟡 جزئية</button>
        <button class="pf-btn ${this.filter === 'unpaid' ? 'active' : ''}" onclick="Purchases.setFilter('unpaid')">🔴 غير مدفوعة</button>
      </div>

      <!-- قائمة الفواتير -->
      <div class="pur-list">
        ${filtered.length ? filtered.map(p => this.renderCard(p)).join('') : `
          <div class="empty-state">
            <div class="icon">🛒</div>
            <p>لا توجد فواتير شراء بعد.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(p) {
    const remaining = (Number(p.total) || 0) - (Number(p.paidAmount) || 0);
    const isPaid = p.status === 'paid';

    return `
      <div class="pur-card pur-card-${p.status}">
        <div class="pur-card-header">
          <div class="pur-card-number">#${p.invoiceNumber}</div>
          <div class="pur-card-status pur-status-${p.status}">
            ${isPaid ? '✅ مدفوعة' : p.status === 'partial' ? '🟡 جزئية' : '🔴 غير مدفوعة'}
          </div>
        </div>
        
        <div class="pur-card-body">
          <div class="pur-supplier">
            <div class="pur-supplier-avatar">${Utils.esc(p.supplierName).charAt(0)}</div>
            <div class="pur-supplier-info">
              <div class="pur-supplier-name">${Utils.esc(p.supplierName)}</div>
              <div class="pur-supplier-items">${p.items ? p.items.length : 0} مادة</div>
            </div>
          </div>
          
          <div class="pur-amounts">
            <div class="pur-amount-item">
              <div class="pur-amount-label">الإجمالي</div>
              <div class="pur-amount-value">${Utils.money(p.total)}</div>
            </div>
            <div class="pur-amount-item">
              <div class="pur-amount-label">المدفوع</div>
              <div class="pur-amount-value paid">${Utils.money(p.paidAmount || 0)}</div>
            </div>
            <div class="pur-amount-item">
              <div class="pur-amount-label">المتبقي</div>
              <div class="pur-amount-value remaining">${Utils.money(remaining)}</div>
            </div>
          </div>
        </div>
        
        <div class="pur-card-footer">
          <div class="pur-date">📅 ${Utils.date(p.createdAt)}</div>
          <div class="pur-actions">
            ${!isPaid ? `<button class="pur-btn pur-btn-pay" onclick="Purchases.openPayment('${p.id}')">💵 دفع</button>` : ''}
            <button class="pur-btn pur-btn-print" onclick="Purchases.print('${p.id}')">🖨️</button>
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
    if (!Auth.require('inventory.manage', 'إدارة المشتريات')) return;

    const suppliers = DB.get('suppliers') || [];
    const materials = DB.get('materials') || [];

    if (!suppliers.length) {
      UI.toast('⚠️ أضف موردين أولاً من شاشة العملاء والموردين', 'warning');
      return;
    }
    if (!materials.length) {
      UI.toast('⚠️ أضف مواد في المخزون أولاً', 'warning');
      return;
    }

    const formHtml = `
      <div class="pur-form">
        <div class="pur-form-header">
          <div class="pur-form-icon">🛒</div>
          <div>
            <h2>فاتورة شراء جديدة</h2>
            <p>تسجيل مشتريات من مورد</p>
          </div>
        </div>
        
        <div class="pur-form-body">
          <div class="pur-field">
            <label>المورد <span style="color:var(--danger);">*</span></label>
            <select id="purSupplier">
              <option value="">-- اختر مورداً --</option>
              ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>

          <div class="pur-field">
            <label>المواد المشتراة</label>
            <div id="purItemsList" class="pur-items-list">
              <div class="pur-item-row" data-index="0">
                <select class="pur-item-material" onchange="Purchases.updateItemPrice(this)">
                  <option value="">-- اختر مادة --</option>
                  ${materials.map(m => `<option value="${m.id}" data-price="${m.costPerUnit}">${m.name} (${Utils.money(m.costPerUnit)})</option>`).join('')}
                </select>
                <input type="number" class="pur-item-qty" value="1" min="1" placeholder="الكمية" oninput="Purchases.recalcTotal()">
                <input type="number" class="pur-item-price" value="0" placeholder="السعر" oninput="Purchases.recalcTotal()">
                <button class="pur-item-remove" onclick="Purchases.removeItem(this)" title="حذف">✖</button>
              </div>
            </div>
            <button class="btn btn-ghost" style="width:100%; padding:8px; font-size:12px; margin-top:6px;" onclick="Purchases.addItem()">
              ➕ إضافة مادة أخرى
            </button>
          </div>

          <div class="pur-total-box">
            <div class="pur-total-label">الإجمالي:</div>
            <div class="pur-total-value" id="purTotalValue">0</div>
          </div>

          <div class="pur-field">
            <label>المبلغ المدفوع (اختياري)</label>
            <input type="number" id="purPaid" value="0" min="0" placeholder="0">
          </div>

          <div class="pur-field">
            <label>ملاحظات</label>
            <input type="text" id="purNotes" placeholder="ملاحظات الفاتورة...">
          </div>
        </div>
        
        <div class="pur-form-actions">
          <button class="pur-form-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="pur-form-btn save" onclick="Purchases.save()">💾 حفظ الفاتورة</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  addItem() {
    const list = document.getElementById('purItemsList');
    const index = list.children.length;
    const materials = DB.get('materials') || [];
    
    const row = document.createElement('div');
    row.className = 'pur-item-row';
    row.dataset.index = index;
    row.innerHTML = `
      <select class="pur-item-material" onchange="Purchases.updateItemPrice(this)">
        <option value="">-- اختر مادة --</option>
        ${materials.map(m => `<option value="${m.id}" data-price="${m.costPerUnit}">${m.name} (${Utils.money(m.costPerUnit)})</option>`).join('')}
      </select>
      <input type="number" class="pur-item-qty" value="1" min="1" placeholder="الكمية" oninput="Purchases.recalcTotal()">
      <input type="number" class="pur-item-price" value="0" placeholder="السعر" oninput="Purchases.recalcTotal()">
      <button class="pur-item-remove" onclick="Purchases.removeItem(this)" title="حذف">✖</button>
    `;
    list.appendChild(row);
  },

  removeItem(btn) {
    const row = btn.closest('.pur-item-row');
    const list = document.getElementById('purItemsList');
    if (list.children.length > 1) {
      row.remove();
      this.recalcTotal();
    }
  },

  updateItemPrice(select) {
    const row = select.closest('.pur-item-row');
    const price = select.options[select.selectedIndex].getAttribute('data-price');
    row.querySelector('.pur-item-price').value = price || 0;
    this.recalcTotal();
  },

  recalcTotal() {
    const list = document.getElementById('purItemsList');
    let total = 0;
    list.querySelectorAll('.pur-item-row').forEach(row => {
      const qty = Number(row.querySelector('.pur-item-qty').value) || 0;
      const price = Number(row.querySelector('.pur-item-price').value) || 0;
      total += qty * price;
    });
    document.getElementById('purTotalValue').textContent = Utils.money(total);
  },

  save() {
    const supplierId = document.getElementById('purSupplier').value;
    const paid = Number(document.getElementById('purPaid').value) || 0;
    const notes = document.getElementById('purNotes').value.trim();

    if (!supplierId) {
      UI.toast('⚠️ اختر مورداً', 'error');
      return;
    }

    const items = [];
    let total = 0;
    document.querySelectorAll('.pur-item-row').forEach(row => {
      const materialSelect = row.querySelector('.pur-item-material');
      const materialId = materialSelect.value;
      if (!materialId) return;
      
      const qty = Number(row.querySelector('.pur-item-qty').value) || 0;
      const price = Number(row.querySelector('.pur-item-price').value) || 0;
      const material = DB.find('materials', materialId);
      
      if (qty > 0 && material) {
        items.push({
          materialId,
          materialName: material.name,
          qty,
          price
        });
        total += qty * price;
      }
    });

    if (items.length === 0) {
      UI.toast('⚠️ أضف مادة واحدة على الأقل', 'error');
      return;
    }

    const supplier = DB.find('suppliers', supplierId);
    let status = 'unpaid';
    if (paid >= total) status = 'paid';
    else if (paid > 0) status = 'partial';

    const invoiceNumber = Utils.docNumber('PUR');

    // 1. إضافة فاتورة الشراء
    const purchase = DB.insert('purchases', {
      invoiceNumber,
      supplierId,
      supplierName: supplier.name,
      items,
      total,
      paidAmount: paid,
      status,
      notes,
      createdAt: new Date().toISOString()
    });

    // 2. تحديث المخزون
    items.forEach(item => {
      const material = DB.find('materials', item.materialId);
      if (material) {
        DB.update('materials', item.materialId, {
          stock: (Number(material.stock) || 0) + item.qty
        });

        // تسجيل حركة الإدخال
        DB.insert('inventory_moves', {
          materialId: item.materialId,
          materialName: item.materialName,
          type: 'in',
          qty: item.qty,
          unitPrice: item.price,
          note: `شراء - فاتورة ${invoiceNumber}`,
          date: new Date().toISOString(),
          userId: Auth.current().userId
        });
      }
    });

    // 3. إذا دفع جزء، سجل سند صرف للمورد
    if (paid > 0) {
      DB.insert('vouchers', {
        number: Utils.docNumber('PV'),
        type: 'payment',
        party: supplierId,
        partyName: supplier.name,
        notes: `دفعة على فاتورة شراء ${invoiceNumber}`,
        amount: paid,
        currency: 'YER',
        createdAt: new Date().toISOString()
      });

      DB.insert('payments', {
        type: 'out',
        amount: paid,
        refId: invoiceNumber,
        refType: 'purchase',
        note: `دفعة على فاتورة شراء ${invoiceNumber}`,
        date: new Date().toISOString()
      });
    }

    UI.closeModal();
    this.render();
    UI.toast('✅ تم حفظ فاتورة الشراء وتحديث المخزون', 'success');
  },

  openPayment(id) {
    const pur = DB.find('purchases', id);
    if (!pur) return;

    const remaining = pur.total - (pur.paidAmount || 0);

    const bodyHtml = `
      <div style="display:grid; gap:14px;">
        <div style="background: linear-gradient(135deg, #0891b2, #155e75); padding:14px; border-radius:10px; color:#fff;">
          <div style="font-weight:800; margin-bottom:4px;">${pur.invoiceNumber}</div>
          <div style="font-size:12px; opacity:0.9;">${pur.supplierName}</div>
        </div>
        <div style="background:var(--bg); padding:12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
            <span>الإجمالي:</span><b>${Utils.money(pur.total)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; color:var(--success);">
            <span>المدفوع:</span><b>${Utils.money(pur.paidAmount || 0)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:14px; padding-top:6px; border-top:1px dashed var(--border); color:var(--danger); font-weight:800;">
            <span>المتبقي:</span><b>${Utils.money(remaining)}</b>
          </div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ المدفوع *</label>
          <input type="number" id="purPayAmount" value="${remaining}" min="1" max="${remaining}"
            style="width:100%; padding:12px; border:2px solid var(--primary); border-radius:8px; margin-top:6px; font-size:18px; font-weight:800; text-align:center;">
        </div>
      </div>
    `;

    UI.openModal('💵 دفع للمورد', bodyHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-success" onclick="Purchases.savePayment('${id}')">✅ تأكيد الدفع</button>
    `);
  },

  savePayment(id) {
    const pur = DB.find('purchases', id);
    if (!pur) return;

    const amount = Number(document.getElementById('purPayAmount').value) || 0;
    if (amount <= 0) return;

    const newPaid = (pur.paidAmount || 0) + amount;
    const status = newPaid >= pur.total ? 'paid' : 'partial';

    DB.update('purchases', id, { paidAmount: newPaid, status });

    DB.insert('vouchers', {
      number: Utils.docNumber('PV'),
      type: 'payment',
      party: pur.supplierId,
      partyName: pur.supplierName,
      notes: `دفعة على فاتورة شراء ${pur.invoiceNumber}`,
      amount,
      currency: 'YER',
      createdAt: new Date().toISOString()
    });

    DB.insert('payments', {
      type: 'out',
      amount,
      refId: id,
      refType: 'purchase',
      note: `دفعة على فاتورة شراء ${pur.invoiceNumber}`,
      date: new Date().toISOString()
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم الدفع', 'success');
  },

  print(id) {
    const pur = DB.find('purchases', id);
    if (!pur) return;

    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';

    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة شراء ${pur.invoiceNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:750px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0891b2; padding-bottom:16px; margin-bottom:20px; }
          .company-info h1 { font-size:22px; color:#0891b2; margin-bottom:4px; font-weight:800; }
          .company-info p { font-size:11px; color:#64748b; }
          .company-logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
          .invoice-title { text-align:left; }
          .invoice-title h2 { font-size:22px; color:#1e293b; margin-bottom:4px; }
          .invoice-number { font-size:16px; font-weight:800; color:#0891b2; background:#cffafe; padding:4px 12px; border-radius:6px; display:inline-block; }
          
          .supplier-info { background:#f0f9ff; padding:14px; border-radius:10px; margin-bottom:20px; display:flex; justify-content:space-between; }
          .supplier-info h3 { font-size:14px; color:#0c4a6e; margin-bottom:4px; }
          .supplier-info p { font-size:11px; color:#64748b; }
          
          table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px; }
          thead { background:#0891b2; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          
          .totals { margin-right:auto; width:280px; }
          .total-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13px; }
          .total-row.final { background:#0891b2; color:#fff; padding:12px; border-radius:6px; font-weight:700; font-size:15px; margin-top:8px; }
          
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#0891b2; color:#fff; }
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
              <p>📞 ${settings.companyPhone || ''}</p>
            </div>
            <div class="invoice-title">
              <h2>فاتورة شراء</h2>
              <div class="invoice-number">${pur.invoiceNumber}</div>
              <div style="font-size:11px; color:#64748b; margin-top:6px;">${Utils.date(pur.createdAt, true)}</div>
            </div>
          </div>

          <div class="supplier-info">
            <div>
              <h3>🚚 ${Utils.esc(pur.supplierName)}</h3>
              <p>المورد</p>
            </div>
            <div style="text-align:left;">
              <p>حالة الدفع: ${pur.status === 'paid' ? '✅ مدفوعة' : pur.status === 'partial' ? '🟡 جزئية' : '🔴 غير مدفوعة'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>المادة</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${pur.items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-weight:700;">${Utils.esc(item.materialName)}</td>
                  <td>${item.qty}</td>
                  <td>${Utils.money(item.price)}</td>
                  <td style="font-weight:700;">${Utils.money(item.qty * item.price)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>الإجمالي:</span><strong>${Utils.money(pur.total)}</strong></div>
            <div class="total-row"><span>المدفوع:</span><strong style="color:#10b981;">${Utils.money(pur.paidAmount || 0)}</strong></div>
            <div class="total-row final"><span>المتبقي:</span><strong>${Utils.money((pur.total || 0) - (pur.paidAmount || 0))}</strong></div>
          </div>

          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — فاتورة صادرة عن IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('pur-styles')) return;
    const style = document.createElement('style');
    style.id = 'pur-styles';
    style.innerHTML = `
      /* البطاقة الرئيسية */
      .pur-hero {
        background: linear-gradient(135deg, #0891b2 0%, #155e75 100%);
        border-radius: 20px; padding: 22px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(8,145,178,0.3);
        position: relative; overflow: hidden;
        display: flex; align-items: center; gap: 16px;
      }
      .pur-hero::before {
        content: ''; position: absolute;
        top: -50px; right: -50px; width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .pur-hero-icon { font-size: 50px; position: relative; z-index: 1; }
      .pur-hero-content { flex: 1; position: relative; z-index: 1; }
      .pur-hero-title { font-size: 12px; opacity: 0.9; margin-bottom: 4px; }
      .pur-hero-value { font-size: 28px; font-weight: 900; margin-bottom: 12px; }
      .pur-hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .pur-hero-stat { background: rgba(255,255,255,0.15); padding: 8px 10px; border-radius: 8px; }
      .pur-hero-stat-label { font-size: 10px; opacity: 0.85; margin-bottom: 2px; }
      .pur-hero-stat-value { font-size: 14px; font-weight: 800; }
      .pur-hero-stat-value.in { color: #86efac; }
      .pur-hero-stat-value.out { color: #fca5a5; }

      /* إحصائيات */
      .pur-stats {
        display: grid; grid-template-columns: repeat(2, 1fr);
        gap: 8px; margin-bottom: 16px;
      }
      @media (min-width: 600px) { .pur-stats { grid-template-columns: repeat(4, 1fr); } }
      .pur-stat {
        background: #fff; border-radius: 12px; padding: 12px;
        display: flex; align-items: center; gap: 10px;
        border: 1px solid var(--border);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }
      .pur-stat-total { border-right: 3px solid #0891b2; }
      .pur-stat-paid { border-right: 3px solid #10b981; }
      .pur-stat-partial { border-right: 3px solid #f59e0b; }
      .pur-stat-unpaid { border-right: 3px solid #dc2626; }
      .ps-icon { font-size: 22px; }
      .ps-info { flex: 1; }
      .ps-value { font-size: 18px; font-weight: 800; color: var(--text); }
      .ps-label { font-size: 10px; color: var(--text-muted); }

      /* الفلاتر */
      .pur-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border); overflow-x: auto;
      }
      .pf-btn {
        flex: 1; padding: 10px 8px; background: transparent; border: none;
        border-radius: 8px; font-size: 11px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .pf-btn.active { background: linear-gradient(135deg, #0891b2, #155e75); color: #fff; }

      /* بطاقات الفواتير */
      .pur-list { display: grid; gap: 12px; }
      .pur-card {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border); border-right: 4px solid #0891b2;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .pur-card-paid { border-right-color: #10b981; }
      .pur-card-partial { border-right-color: #f59e0b; }
      .pur-card-unpaid { border-right-color: #dc2626; }
      .pur-card-header {
        padding: 12px 16px; background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center; border-bottom: 1px solid var(--border);
      }
      .pur-card-number { font-weight: 800; font-size: 13px; color: #0891b2; }
      .pur-card-status { padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .pur-status-paid { background: #dcfce7; color: #166534; }
      .pur-status-partial { background: #fef3c7; color: #92400e; }
      .pur-status-unpaid { background: #fee2e2; color: #991b1b; }

      .pur-card-body { padding: 14px 16px; }
      .pur-supplier { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      .pur-supplier-avatar {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, #cffafe, #67e8f9);
        color: #0891b2; display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 800; flex-shrink: 0;
      }
      .pur-supplier-info { flex: 1; min-width: 0; }
      .pur-supplier-name { font-size: 14px; font-weight: 800; color: var(--text); }
      .pur-supplier-items { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

      .pur-amounts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .pur-amount-item { background: #f8fafc; padding: 8px; border-radius: 8px; text-align: center; }
      .pur-amount-label { font-size: 9px; color: var(--text-muted); margin-bottom: 2px; }
      .pur-amount-value { font-size: 12px; font-weight: 800; color: var(--text); }
      .pur-amount-value.paid { color: #10b981; }
      .pur-amount-value.remaining { color: #dc2626; }

      .pur-card-footer {
        padding: 10px 16px; background: #f8fafc;
        border-top: 1px solid var(--border);
        display: flex; justify-content: space-between;
        align-items: center;
      }
      .pur-date { font-size: 11px; color: var(--text-muted); }
      .pur-actions { display: flex; gap: 6px; }
      .pur-btn {
        padding: 6px 12px; border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .pur-btn-pay { background: #10b981; color: #fff; }
      .pur-btn-print { background: #cffafe; color: #0891b2; }

      /* نموذج */
      .pur-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .pur-form-header {
        padding: 20px; background: linear-gradient(135deg, #0891b2, #155e75);
        color: #fff; display: flex; align-items: center; gap: 14px;
      }
      .pur-form-icon {
        width: 50px; height: 50px; background: rgba(255,255,255,0.2);
        border-radius: 14px; display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .pur-form-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .pur-form-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      .pur-form-body { padding: 20px; display: grid; gap: 14px; }
      .pur-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .pur-field input, .pur-field select, .pur-field textarea {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border); border-radius: 10px;
        font-size: 14px; font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .pur-field input:focus, .pur-field select:focus {
        border-color: #0891b2; box-shadow: 0 0 0 3px rgba(8,145,178,0.1);
      }

      .pur-items-list { display: grid; gap: 8px; }
      .pur-item-row {
        display: grid; grid-template-columns: 2fr 0.7fr 0.9fr 30px;
        gap: 6px; align-items: center;
      }
      .pur-item-row select, .pur-item-row input {
        padding: 8px; font-size: 12px; border: 1px solid var(--border); border-radius: 6px;
      }
      .pur-item-remove {
        background: #fee2e2; color: #dc2626; border: none;
        width: 30px; height: 30px; border-radius: 6px;
        cursor: pointer; font-weight: 700;
      }

      .pur-total-box {
        background: linear-gradient(135deg, #cffafe, #a5f3fc);
        padding: 14px 18px; border-radius: 12px;
        display: flex; justify-content: space-between;
        align-items: center; border: 2px solid #0891b2;
      }
      .pur-total-label { font-size: 14px; font-weight: 700; color: #0c4a6e; }
      .pur-total-value { font-size: 22px; font-weight: 900; color: #0891b2; }

      .pur-form-actions {
        padding: 14px 20px; display: flex; gap: 10px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .pur-form-btn {
        padding: 12px; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .pur-form-btn.cancel { flex: 1; background: #fff; color: var(--text); border: 1px solid var(--border); }
      .pur-form-btn.save { flex: 2; background: linear-gradient(135deg, #0891b2, #155e75); color: #fff; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Purchases loaded');