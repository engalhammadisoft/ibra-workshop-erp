/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — نقطة البيع (v4 - محسّنة)
   ═══════════════════════════════════════════════════════════════ */

const POS = {
  cart: [],
  searchTerm: '',
  activeCategory: 'all',
  discount: 0,

  render() {
    const content = document.getElementById('content');
    const products = DB.get('products') || [];
    const categories = DB.get('material_categories') || [];

    // تصفية حسب البحث والفئة
    let filtered = products;
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === this.activeCategory);
    }
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(s));
    }

    let html = `
      <div class="page-header">
        <h1 class="page-title">نقطة البيع</h1>
        <button class="btn btn-ghost" onclick="POS.openInvoicesLog()">📋 سجل الفواتير</button>
      </div>

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:12px;">
        <input type="text" placeholder="🔍 بحث عن منتج..." value="${Utils.esc(this.searchTerm)}" 
          oninput="POS.searchTerm = this.value; POS.render();"
          style="width:100%; padding:12px 16px; border:1px solid var(--border); border-radius:10px; background:var(--bg); font-size:15px;">
      </div>

      <!-- تبويبات الفئات -->
      <div class="pos-categories">
        <button class="pc-tab ${this.activeCategory === 'all' ? 'active' : ''}" onclick="POS.setCategory('all')">الكل</button>
        ${categories.map(c => `
          <button class="pc-tab ${this.activeCategory === c.id ? 'active' : ''}" onclick="POS.setCategory('${c.id}')">
            ${c.icon} ${c.name}
          </button>
        `).join('')}
      </div>

      <!-- شبكة المنتجات -->
      <div class="pos-grid">
        ${filtered.length ? filtered.map(p => {
          const cat = categories.find(c => c.id === p.categoryId);
          return `
            <div class="pos-item-new" onclick="POS.addToCart('${p.id}')">
              <div class="pos-item-icon-new">${cat ? cat.icon : '📦'}</div>
              <div class="pos-item-name-new">${Utils.esc(p.name)}</div>
              <div class="pos-item-price-new">${Utils.money(p.basePrice)}</div>
            </div>
          `;
        }).join('') : `<div class="empty-state" style="grid-column:1/-1;"><p>لا توجد منتجات مطابقة.</p></div>`}
      </div>

      <!-- سلة المبيعات -->
      <div id="posCartBar" class="pos-cart-bar hidden">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:10px;">
          <div style="flex:1;">
            <div style="font-size:11px; color:#94a3b8;">الإجمالي</div>
            <div style="font-size:18px; font-weight:800; color:#fff;" id="posTotal">0</div>
          </div>
          <button class="btn btn-danger" style="padding:10px; border-radius:8px;" onclick="POS.clearCart()" title="تفريغ السلة">🗑️</button>
          <button class="btn btn-success" style="padding:12px 20px; font-size:14px; box-shadow:0 4px 15px rgba(22,163,74,0.4);" onclick="POS.openCheckout()">
            🛒 الدفع (<span id="posCount">0</span>)
          </button>
        </div>
      </div>
    `;

    content.innerHTML = html;
    this.updateCartBar();
    this.injectStyles();
  },

  setCategory(catId) {
    this.activeCategory = catId;
    this.render();
  },

  addToCart(productId) {
    const product = DB.find('products', productId);
    if (!product) return;

    const existing = this.cart.find(item => item.productId === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({
        productId: product.id,
        name: product.name,
        price: product.basePrice,
        qty: 1
      });
    }

    UI.toast(`✅ ${product.name}`, 'success');
    this.updateCartBar();
  },

  updateCartBar() {
    const bar = document.getElementById('posCartBar');
    if (!bar) return;

    if (this.cart.length === 0) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = subtotal - this.discount;
    const count = this.cart.reduce((sum, item) => sum + item.qty, 0);

    document.getElementById('posTotal').textContent = Utils.money(total);
    document.getElementById('posCount').textContent = count;
  },

  clearCart() {
    if (!confirm('هل تريد تفريغ السلة؟')) return;
    this.cart = [];
    this.discount = 0;
    this.updateCartBar();
    UI.toast('✅ تم تفريغ السلة', 'info');
  },

  openCheckout() {
    if (this.cart.length === 0) return;

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = subtotal - this.discount;
    const customers = DB.get('customers') || [];

    const bodyHtml = `
      <div style="display:grid; gap:14px; max-height:60vh; overflow-y:auto;">
        
        <!-- قائمة العناصر -->
        <div style="background:var(--bg); border-radius:10px; padding:10px;">
          ${this.cart.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); font-size:13px;">
              <div style="flex:1;">
                <b>${item.name}</b>
                <div style="font-size:11px; color:var(--text-muted);">${Utils.money(item.price)} × ${item.qty}</div>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <button onclick="POS.updateQty(${idx}, -1)" style="background:#fff; border:1px solid var(--border); width:28px; height:28px; border-radius:6px; font-weight:700; cursor:pointer;">-</button>
                <span style="font-weight:700; min-width:20px; text-align:center;">${item.qty}</span>
                <button onclick="POS.updateQty(${idx}, 1)" style="background:#fff; border:1px solid var(--border); width:28px; height:28px; border-radius:6px; font-weight:700; cursor:pointer;">+</button>
                <button onclick="POS.removeItem(${idx})" style="color:var(--danger); background:none; border:none; font-size:16px; cursor:pointer;">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- العميل والخصم -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">العميل</label>
            <select id="posCustomer" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
              <option value="">-- عميل نقدي --</option>
              ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الخصم (اختياري)</label>
            <input type="number" id="posDiscount" value="${this.discount}" min="0" 
              oninput="POS.applyDiscount()"
              style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px; text-align:center; font-weight:700;">
          </div>
        </div>

        <!-- الإجمالي -->
        <div style="background:linear-gradient(135deg, #2563eb, #1e40af); padding:14px; border-radius:10px; color:#fff; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; opacity:0.9;">الإجمالي المطلوب</span>
          <span style="font-size:24px; font-weight:800;">${Utils.money(total)}</span>
        </div>

        <!-- المدفوع -->
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المبلغ المدفوع</label>
          <input type="number" id="posPaid" value="${total}" min="0" 
            oninput="POS.updateRemaining(${total})"
            onkeydown="if(event.key==='Enter') POS.confirmSale(${total})"
            style="width:100%; padding:14px; border:2px solid var(--primary); border-radius:8px; margin-top:4px; font-size:20px; font-weight:800; text-align:center; background:#fff;">
          
          <!-- أزرار الدفع السريع -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-top:8px;">
            <button onclick="POS.setPaid(${total})" style="padding:8px; background:#f1f5f9; border:1px solid var(--border); border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">بالضبط</button>
            <button onclick="POS.setPaid(${Math.ceil(total/1000)*1000 + 1000})" style="padding:8px; background:#f1f5f9; border:1px solid var(--border); border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">+1000</button>
            <button onclick="POS.setPaid(${Math.ceil(total/5000)*5000 + 5000})" style="padding:8px; background:#f1f5f9; border:1px solid var(--border); border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">+5000</button>
            <button onclick="POS.setPaid(${Math.ceil(total/10000)*10000 + 10000})" style="padding:8px; background:#f1f5f9; border:1px solid var(--border); border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">+10000</button>
          </div>
          
          <div id="posRemaining" style="text-align:center; margin-top:8px; font-size:13px; color:var(--success); font-weight:700;">
            المتبقي: 0
          </div>
        </div>
      </div>
    `;

    const actionsHtml = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-success" onclick="POS.confirmSale(${total})" style="padding:12px 24px;">✅ تأكيد البيع</button>
    `;

    UI.openModal('إتمام عملية البيع', bodyHtml, actionsHtml);
  },

  setPaid(amount) {
    const paidInput = document.getElementById('posPaid');
    if (paidInput) {
      paidInput.value = amount;
      const total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0) - this.discount;
      this.updateRemaining(total);
    }
  },

  updateRemaining(total) {
    const paid = Number(document.getElementById('posPaid').value) || 0;
    const remaining = total - paid;
    const el = document.getElementById('posRemaining');
    
    if (remaining > 0) {
      el.textContent = `المتبقي: ${Utils.money(remaining)}`;
      el.style.color = 'var(--danger)';
    } else if (remaining < 0) {
      el.textContent = `الباقي للعميل: ${Utils.money(Math.abs(remaining))}`;
      el.style.color = 'var(--success)';
    } else {
      el.textContent = 'مكتمل ✅';
      el.style.color = 'var(--success)';
    }
  },

  applyDiscount() {
    const disc = Number(document.getElementById('posDiscount').value) || 0;
    this.discount = disc;
    this.updateCartBar();
    
    // إعادة فتح النافذة لتحديث الإجمالي
    this.openCheckout();
  },

  updateQty(index, change) {
    if (!this.cart[index]) return;
    this.cart[index].qty += change;
    if (this.cart[index].qty <= 0) this.cart.splice(index, 1);
    
    this.updateCartBar();
    if (this.cart.length === 0) UI.closeModal();
    else this.openCheckout();
  },

  removeItem(index) {
    this.cart.splice(index, 1);
    this.updateCartBar();
    if (this.cart.length === 0) UI.closeModal();
    else this.openCheckout();
  },

  confirmSale(total) {
    const customerId = document.getElementById('posCustomer').value;
    const paid = Number(document.getElementById('posPaid').value) || 0;
    const customer = customerId ? DB.find('customers', customerId) : null;

    const invoiceNumber = Utils.docNumber('POS');
    const newInvoice = {
      invoiceNumber,
      projectId: null,
      projectName: 'بيع مباشر (نقطة بيع)',
      customerId: customerId || null,
      customerName: customer ? customer.name : 'عميل نقدي',
      items: [...this.cart],
      subtotal: this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
      discount: this.discount,
      total: total,
      paidAmount: paid,
      status: paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'),
      type: 'pos',
      createdAt: new Date().toISOString()
    };

    DB.insert('invoices', newInvoice);

    if (paid > 0) {
      DB.insert('payments', {
        type: 'in',
        amount: paid,
        refId: newInvoice.invoiceNumber,
        refType: 'pos_invoice',
        note: `بيع نقطة بيع - فاتورة ${invoiceNumber}`,
        date: new Date().toISOString()
      });
    }

    // تفريغ السلة
    this.cart = [];
    this.discount = 0;
    UI.closeModal();
    this.render();
    
    setTimeout(() => this.showSuccess(newInvoice), 300);
  },

  showSuccess(invoice) {
    const bodyHtml = `
      <div style="text-align:center; padding:20px 0;">
        <div style="font-size:60px; margin-bottom:12px;">✅</div>
        <h3 style="color:var(--success); margin-bottom:8px;">تم البيع بنجاح!</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">رقم الفاتورة:</p>
        <p style="font-size:18px; font-weight:800; color:var(--primary); margin-bottom:16px;">${invoice.invoiceNumber}</p>
        <div style="background:var(--bg); padding:12px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
            <span>الإجمالي:</span>
            <b>${Utils.money(invoice.subtotal)}</b>
          </div>
          ${invoice.discount > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; color:var(--danger);">
              <span>الخصم:</span>
              <b>-${Utils.money(invoice.discount)}</b>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; font-size:16px; padding-top:6px; border-top:1px solid var(--border); font-weight:800;">
            <span>المدفوع:</span>
            <b style="color:var(--success);">${Utils.money(invoice.paidAmount)}</b>
          </div>
        </div>
      </div>
    `;

    const actionsHtml = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="Invoices.printInvoice('${invoice.id}')">🖨️ طباعة الفاتورة</button>
    `;

    UI.openModal('عملية ناجحة', bodyHtml, actionsHtml);
  },

  openInvoicesLog() {
    const allInvoices = DB.get('invoices') || [];
    const posInvoices = allInvoices.filter(i => i.type === 'pos').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const bodyHtml = `
      <div style="max-height:60vh; overflow-y:auto;">
        ${posInvoices.length ? posInvoices.slice(0, 30).map(inv => `
          <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; color:var(--primary); font-size:13px;">${inv.invoiceNumber}</div>
              <div style="font-size:11px; color:var(--text-muted);">${Utils.date(inv.createdAt, true)}</div>
              <div style="font-size:12px; margin-top:4px;">${inv.customerName}</div>
            </div>
            <div style="text-align:left;">
              <div style="font-weight:800; font-size:14px;">${Utils.money(inv.total)}</div>
              <button class="btn btn-ghost" style="padding:4px 8px; font-size:11px; margin-top:4px;" onclick="Invoices.printInvoice('${inv.id}')">🖨️ طباعة</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state"><p>لا توجد فواتير سابقة.</p></div>'}
      </div>
    `;

    UI.openModal('سجل فواتير نقطة البيع', bodyHtml, '<button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>');
  },

  injectStyles() {
    if (document.getElementById('pos-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'pos-styles-v4';
    style.innerHTML = `
      .pos-categories {
        display: flex; gap: 6px; margin-bottom: 14px;
        overflow-x: auto; padding-bottom: 4px;
        -webkit-overflow-scrolling: touch;
      }
      .pc-tab {
        padding: 8px 16px; background: #fff; border: 1px solid var(--border);
        border-radius: 20px; font-size: 12px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .pc-tab.active {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff; border-color: transparent;
      }
      
      .pos-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 10px; margin-bottom: 100px;
      }
      .pos-item-new {
        background: #fff; border: 1px solid var(--border); border-radius: 12px;
        padding: 14px 8px; display: flex; flex-direction: column;
        align-items: center; text-align: center; gap: 6px;
        cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      }
      .pos-item-new:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 6px 15px rgba(37,99,235,0.15); }
      .pos-item-new:active { transform: scale(0.95); }
      .pos-item-icon-new { font-size: 30px; }
      .pos-item-name-new { font-size: 12px; font-weight: 700; color: var(--text); line-height: 1.2; }
      .pos-item-price-new { font-size: 11px; color: var(--primary); font-weight: 700; }
      
      .pos-cart-bar {
        position: fixed; bottom: 70px; left: 12px; right: 12px;
        background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff;
        padding: 14px 18px; border-radius: var(--radius-lg);
        box-shadow: 0 8px 25px rgba(0,0,0,0.3); z-index: 90;
        display: flex; align-items: center;
        animation: slideUpBar 0.3s ease;
      }
      @media (min-width: 901px) {
        .pos-cart-bar { bottom: 20px; left: auto; right: 20px; width: 420px; }
      }
      @keyframes slideUpBar {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
};


console.log('✅ POS v4 loaded (enhanced)');