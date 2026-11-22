/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — إدارة المخزون والخامات (v3)
   ═══════════════════════════════════════════════════════════════ */

const Inventory = {
  filter: 'all',
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const materials = DB.get('materials') || [];
    const categories = DB.get('material_categories') || [];
    const units = DB.get('units') || [];

    // تصفية
    let filtered = materials;
    if (this.filter === 'low') {
      filtered = materials.filter(m => Number(m.stock) <= Number(m.minStock));
    } else if (this.filter !== 'all') {
      filtered = materials.filter(m => m.categoryId === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(s) ||
        m.code.toLowerCase().includes(s)
      );
    }

    // إحصائيات
    const total = materials.length;
    const lowCount = materials.filter(m => Number(m.stock) <= Number(m.minStock)).length;
    const totalValue = materials.reduce((sum, m) => sum + ((m.stock || 0) * (m.costPerUnit || 0)), 0);

    let html = `
      <div class="page-header">
        <h1 class="page-title">المخزون والخامات</h1>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="Inventory.openForm()">➕ مادة جديدة</button>
          <button class="btn btn-ghost" onclick="Inventory.openMoveModal()">🔄 حركة مخزون</button>
        </div>
      </div>

      <!-- البطاقة العلوية -->
      <div class="inv-hero">
        <div class="ih-title">
          <h2>المخزون 📦</h2>
          <p>إدارة المواد والخامات</p>
        </div>
        <div class="ih-stats">
          <div class="ihs-stat">
            <div class="ihs-icon">📦</div>
            <div class="ihs-value">${total}</div>
            <div class="ihs-label">صنف</div>
          </div>
          <div class="ihs-stat">
            <div class="ihs-icon">⚠️</div>
            <div class="ihs-value">${lowCount}</div>
            <div class="ihs-label">منخفض</div>
          </div>
          <div class="ihs-stat" style="grid-column: span 2;">
            <div class="ihs-icon">💰</div>
            <div class="ihs-value" style="font-size:14px;">${Utils.money(totalValue)}</div>
            <div class="ihs-label">قيمة المخزون</div>
          </div>
        </div>
      </div>

      <!-- البحث -->
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 ابحث بالاسم أو الكود..." value="${Utils.esc(this.searchTerm)}" 
          oninput="Inventory.searchTerm = this.value; Inventory.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <!-- فلاتر -->
      <div class="inv-filters">
        <button class="if-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Inventory.setFilter('all')">الكل</button>
        <button class="if-btn ${this.filter === 'low' ? 'active' : ''}" onclick="Inventory.setFilter('low')">⚠️ منخفض</button>
        ${categories.map(c => `
          <button class="if-btn ${this.filter === c.id ? 'active' : ''}" onclick="Inventory.setFilter('${c.id}')">${c.icon} ${c.name}</button>
        `).join('')}
      </div>

      <!-- قائمة المواد -->
      <div class="materials-grid">
        ${filtered.length ? filtered.map(m => this.renderCard(m, categories, units)).join('') : `
          <div class="empty-state">
            <div class="icon">📦</div>
            <p>لا توجد مواد مطابقة.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderCard(m, categories, units) {
    const isLow = Number(m.stock) <= Number(m.minStock);
    const cat = categories.find(c => c.id === m.categoryId);
    const unit = units.find(u => u.id === m.unitId);
    const color = isLow ? 'danger' : 'success';
    const stockPercent = m.minStock > 0 ? Math.min(100, (m.stock / (m.minStock * 3)) * 100) : 100;

    return `
      <div class="mat-card mat-${color}">
        <div class="mat-header">
          <div class="mat-icon">${cat ? cat.icon : '📦'}</div>
          <div class="mat-info">
            <div class="mat-code">${Utils.esc(m.code)}</div>
            <div class="mat-name">${Utils.esc(m.name)}</div>
            <div class="mat-cat">${cat ? cat.name : 'عام'}</div>
          </div>
          ${isLow ? `<div class="mat-badge-low">⚠️</div>` : ''}
        </div>
        
        <div class="mat-body">
          <div class="mat-stock-wrapper">
            <div class="mat-stock-info">
              <div class="mat-stock-value" style="color: var(--${color});">
                ${m.stock} <span style="font-size:11px; color:var(--text-muted);">${unit ? unit.short : ''}</span>
              </div>
              <div class="mat-min">حد أدنى: ${m.minStock}</div>
            </div>
            <div class="mat-progress">
              <div class="mat-progress-fill" style="width: ${stockPercent}%; background: var(--${color});"></div>
            </div>
          </div>
          
          <div class="mat-price">
            <span>سعر الوحدة:</span>
            <b>${Utils.money(m.costPerUnit)}</b>
          </div>
        </div>
        
        <div class="mat-footer">
          <button class="mat-btn mat-in" onclick="Inventory.quickMove('${m.id}', 'in')">📥 إدخال</button>
          <button class="mat-btn mat-out" onclick="Inventory.quickMove('${m.id}', 'out')">📤 صرف</button>
          <button class="mat-btn mat-edit" onclick="Inventory.openForm('${m.id}')">✏️</button>
        </div>
      </div>
    `;
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  /** حركة مخزون سريعة */
  quickMove(id, type) {
    const material = DB.find('materials', id);
    if (!material) return;
    
    const isIn = type === 'in';
    const qty = prompt(`${isIn ? '📥 كمية الإدخال' : '📤 كمية الصرف'} للمادة "${material.name}":`, '1');
    if (!qty || isNaN(qty) || Number(qty) <= 0) return;

    const qtyNum = Number(qty);
    if (!isIn && qtyNum > material.stock) {
      UI.toast('⚠️ الرصيد غير كافٍ', 'error');
      return;
    }

    const newStock = isIn ? material.stock + qtyNum : material.stock - qtyNum;
    DB.update('materials', id, { stock: newStock });

    DB.insert('inventory_moves', {
      materialId: id,
      materialName: material.name,
      type,
      qty: qtyNum,
      note: isIn ? 'إدخال سريع' : 'صرف سريع',
      date: new Date().toISOString(),
      userId: Auth.current().userId
    });

    this.render();
    UI.toast(`✅ تم ${isIn ? 'الإدخال' : 'الصرف'} بنجاح`, 'success');
  },

  openForm(id = null) {
    if (!Auth.require('inventory.manage', 'إدارة المخزون')) return;

    const categories = DB.get('material_categories') || [];
    const units = DB.get('units') || [];
    const material = id ? DB.find('materials', id) : null;

    const formHtml = `
      <div class="mat-form">
        <div class="mat-form-header">
          <div class="mfh-icon">📦</div>
          <div>
            <h2>${material ? 'تعديل مادة' : 'مادة جديدة'}</h2>
            <p>${material ? 'تحديث بيانات المادة' : 'إضافة مادة للمخزون'}</p>
          </div>
        </div>
        
        <div class="mat-form-body">
          <div class="mf-row">
            <div class="mf-field">
              <label>الكود <span style="color:var(--danger);">*</span></label>
              <input type="text" id="matCode" value="${material ? Utils.esc(material.code) : ''}" placeholder="IR-SH-2MM">
            </div>
            <div class="mf-field">
              <label>الاسم <span style="color:var(--danger);">*</span></label>
              <input type="text" id="matName" value="${material ? Utils.esc(material.name) : ''}" placeholder="صفيحة حديد 2مم">
            </div>
          </div>
          
          <div class="mf-row">
            <div class="mf-field">
              <label>الفئة</label>
              <select id="matCat">
                ${categories.map(c => `<option value="${c.id}" ${material && material.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="mf-field">
              <label>الوحدة</label>
              <select id="matUnit">
                ${units.map(u => `<option value="${u.id}" ${material && material.unitId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="mf-row">
            <div class="mf-field">
              <label>سعر الوحدة</label>
              <input type="number" id="matCost" value="${material ? material.costPerUnit : 0}">
            </div>
            <div class="mf-field">
              <label>الرصيد الحالي</label>
              <input type="number" id="matStock" value="${material ? material.stock : 0}">
            </div>
            <div class="mf-field">
              <label>الحد الأدنى</label>
              <input type="number" id="matMinStock" value="${material ? material.minStock : 5}">
            </div>
          </div>
        </div>
        
        <div class="mat-form-actions">
          <button class="mf-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="mf-btn save" onclick="Inventory.save('${id || ''}')">💾 حفظ</button>
        </div>
      </div>
    `;
    
    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';
  },

  save(id) {
    const code = document.getElementById('matCode').value.trim();
    const name = document.getElementById('matName').value.trim();
    const categoryId = document.getElementById('matCat').value;
    const unitId = document.getElementById('matUnit').value;
    const costPerUnit = Number(document.getElementById('matCost').value) || 0;
    const stock = Number(document.getElementById('matStock').value) || 0;
    const minStock = Number(document.getElementById('matMinStock').value) || 0;

    if (!code || !name) {
      UI.toast('⚠️ الكود والاسم مطلوبان', 'error');
      return;
    }

    const data = { code, name, categoryId, unitId, costPerUnit, stock, minStock };

    if (id) {
      DB.update('materials', id, data);
      UI.toast('✅ تم التعديل', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      DB.insert('materials', data);
      UI.toast('✅ تمت الإضافة', 'success');
    }

    UI.closeModal();
    this.render();
  },

  openMoveModal() {
    if (!Auth.require('inventory.manage', 'إدارة المخزون')) return;
    const materials = DB.get('materials') || [];
    if (!materials.length) {
      UI.toast('⚠️ لا توجد مواد', 'warning');
      return;
    }

    const formHtml = `
      <div style="display:grid; gap:12px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">نوع الحركة</label>
          <select id="moveType" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
            <option value="in">📥 إدخال</option>
            <option value="out">📤 صرف</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المادة</label>
          <select id="moveMaterial" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
            ${materials.map(m => `<option value="${m.id}">${m.name} (${m.stock})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الكمية</label>
          <input type="number" id="moveQty" value="1" min="1" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">ملاحظات</label>
          <input type="text" id="moveNote" placeholder="مثال: صرف لمشروع..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
        </div>
      </div>
    `;
    
    UI.openModal('حركة مخزون', formHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Inventory.saveMove()">تنفيذ</button>
    `);
  },

  saveMove() {
    const type = document.getElementById('moveType').value;
    const id = document.getElementById('moveMaterial').value;
    const qty = Number(document.getElementById('moveQty').value) || 0;
    const note = document.getElementById('moveNote').value;

    if (qty <= 0) return;

    const material = DB.find('materials', id);
    if (!material) return;

    if (type === 'out' && material.stock < qty) {
      UI.toast('⚠️ الرصيد غير كافٍ', 'error');
      return;
    }

    const newStock = type === 'in' ? material.stock + qty : material.stock - qty;
    DB.update('materials', id, { stock: newStock });

    DB.insert('inventory_moves', {
      materialId: id, materialName: material.name,
      type, qty, note,
      date: new Date().toISOString(),
      userId: Auth.current().userId
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم تنفيذ الحركة', 'success');
  },

  injectStyles() {
    if (document.getElementById('inv-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'inv-styles-v3';
    style.innerHTML = `
      .inv-hero {
        background: linear-gradient(135deg, #0891b2 0%, #155e75 100%);
        border-radius: 24px;
        padding: 20px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(8,145,178,0.3);
        position: relative;
        overflow: hidden;
      }
      .inv-hero::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ih-title { margin-bottom: 14px; position: relative; z-index: 1; }
      .ih-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .ih-title p { font-size: 13px; opacity: 0.9; }
      .ih-stats {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; position: relative; z-index: 1;
      }
      .ihs-stat {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        padding: 10px 4px; border-radius: 10px;
        text-align: center;
      }
      .ihs-icon { font-size: 18px; }
      .ihs-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
      .ihs-label { font-size: 10px; opacity: 0.9; }
      
      .inv-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border);
        overflow-x: auto;
      }
      .if-btn {
        flex: 1; padding: 8px 10px;
        background: transparent; border: none;
        border-radius: 8px; font-size: 11px;
        font-weight: 700; color: var(--text-muted);
        cursor: pointer; font-family: inherit;
        white-space: nowrap;
      }
      .if-btn.active {
        background: linear-gradient(135deg, #0891b2, #155e75);
        color: #fff;
      }
      
      .materials-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 640px) {
        .materials-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 1024px) {
        .materials-grid { grid-template-columns: repeat(3, 1fr); }
      }
      
      .mat-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-right: 4px solid #10b981;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.2s;
      }
      .mat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      .mat-danger { border-right-color: #dc2626; }
      
      .mat-header {
        padding: 14px 14px 10px;
        display: flex; align-items: center; gap: 10px;
      }
      .mat-icon {
        width: 44px; height: 44px;
        background: #f1f5f9;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .mat-info { flex: 1; min-width: 0; }
      .mat-code {
        font-size: 10px; font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.5px;
      }
      .mat-name {
        font-size: 14px; font-weight: 800;
        color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mat-cat { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .mat-badge-low {
        background: #fee2e2;
        width: 30px; height: 30px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
        animation: pulseAlert 1.5s infinite;
      }
      @keyframes pulseAlert {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .mat-body {
        padding: 10px 14px;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: #f8fafc;
      }
      .mat-stock-wrapper { margin-bottom: 10px; }
      .mat-stock-info {
        display: flex; justify-content: space-between;
        align-items: baseline; margin-bottom: 6px;
      }
      .mat-stock-value { font-size: 20px; font-weight: 800; }
      .mat-min { font-size: 10px; color: var(--text-muted); }
      .mat-progress {
        height: 6px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
      }
      .mat-progress-fill {
        height: 100%; border-radius: 3px;
        transition: width 0.5s;
      }
      .mat-price {
        display: flex; justify-content: space-between;
        align-items: center; font-size: 12px;
      }
      .mat-price span { color: var(--text-muted); }
      .mat-price b { color: var(--text); font-size: 13px; }
      
      .mat-footer {
        padding: 10px 14px;
        display: flex; gap: 6px;
      }
      .mat-btn {
        flex: 1; padding: 8px 6px;
        border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .mat-in { background: #dcfce7; color: #166534; }
      .mat-out { background: #fef3c7; color: #92400e; }
      .mat-edit { background: #dbeafe; color: #1e40af; flex: 0.5; }
      .mat-btn:hover { transform: translateY(-1px); }
      
      /* نموذج المادة */
      .mat-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .mat-form-header {
        padding: 20px;
        background: linear-gradient(135deg, #0891b2, #155e75);
        color: #fff;
        display: flex; align-items: center; gap: 14px;
      }
      .mfh-icon {
        width: 50px; height: 50px;
        background: rgba(255,255,255,0.2);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .mat-form-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .mat-form-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .mat-form-body { padding: 20px; display: grid; gap: 14px; }
      .mf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .mf-row:has(> .mf-field:nth-child(3)) { grid-template-columns: 1fr 1fr 1fr; }
      .mf-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .mf-field input, .mf-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px;
        font-family: inherit; background: #fff;
        outline: none; box-sizing: border-box;
      }
      .mf-field input:focus, .mf-field select:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      
      .mat-form-actions {
        padding: 14px 20px;
        display: flex; gap: 10px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
      }
      .mf-btn {
        padding: 12px;
        border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .mf-btn.cancel {
        flex: 1; background: #fff; color: var(--text);
        border: 1px solid var(--border);
      }
      .mf-btn.save {
        flex: 2; background: linear-gradient(135deg, #0891b2, #155e75);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Inventory v3 loaded');
