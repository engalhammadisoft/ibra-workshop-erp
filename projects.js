/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — المشاريع (مع المرفقات والملفات)
   ═══════════════════════════════════════════════════════════════ */

const Projects = {
  filter: 'all',
  searchTerm: '',

  render() {
    const content = document.getElementById('content');
    const projects = DB.get('projects') || [];

    let filtered = projects;
    if (this.filter === 'active') {
      filtered = projects.filter(p => ['draft', 'approved', 'in_progress', 'pending'].includes(p.status));
    } else if (this.filter === 'in_progress') {
      filtered = projects.filter(p => p.status === 'in_progress');
    } else if (this.filter === 'completed') {
      filtered = projects.filter(p => ['completed', 'delivered'].includes(p.status));
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.projectNumber && p.projectNumber.toLowerCase().includes(s)) ||
        (p.productName && p.productName.toLowerCase().includes(s)) ||
        (p.customerName && p.customerName.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = projects.length;
    const active = projects.filter(p => ['draft', 'approved', 'in_progress', 'pending'].includes(p.status)).length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const completed = projects.filter(p => ['completed', 'delivered'].includes(p.status)).length;

    let html = `
      <div class="page-header">
        <h1 class="page-title">المشاريع والطلبات</h1>
        <button class="btn btn-primary" onclick="Projects.openForm()">➕ طلب / مشروع جديد</button>
      </div>

      <div class="proj-hero">
        <div class="ph-title">
          <h2>المشاريع 📁</h2>
          <p>إدارة وتتبع جميع مشاريع الورشة</p>
        </div>
        <div class="ph-stats">
          <div class="phs-stat" onclick="Projects.setFilter('all')"><div class="phs-value">${total}</div><div class="phs-label">الكل</div></div>
          <div class="phs-stat" onclick="Projects.setFilter('active')"><div class="phs-value">${active}</div><div class="phs-label">نشطة</div></div>
          <div class="phs-stat" onclick="Projects.setFilter('in_progress')"><div class="phs-value">${inProgress}</div><div class="phs-label">قيد التنفيذ</div></div>
          <div class="phs-stat" onclick="Projects.setFilter('completed')"><div class="phs-value">${completed}</div><div class="phs-label">مكتملة</div></div>
        </div>
      </div>

      <div class="card" style="padding:12px; margin-bottom:14px;">
        <input type="text" placeholder="🔍 ابحث برقم المشروع، المنتج، العميل..." value="${Utils.esc(this.searchTerm)}" 
          oninput="Projects.searchTerm = this.value; Projects.render();"
          style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
      </div>

      <div class="proj-filters">
        <button class="pf-btn ${this.filter === 'all' ? 'active' : ''}" onclick="Projects.setFilter('all')">الكل</button>
        <button class="pf-btn ${this.filter === 'active' ? 'active' : ''}" onclick="Projects.setFilter('active')">🟡 نشطة</button>
        <button class="pf-btn ${this.filter === 'in_progress' ? 'active' : ''}" onclick="Projects.setFilter('in_progress')">⚙️ قيد التنفيذ</button>
        <button class="pf-btn ${this.filter === 'completed' ? 'active' : ''}" onclick="Projects.setFilter('completed')">✅ مكتملة</button>
      </div>

      <div class="projects-grid">
        ${filtered.length ? filtered.map(p => this.renderProjectCard(p)).join('') : `
          <div class="empty-state"><div class="icon">📁</div><p>لا توجد مشاريع مطابقة.</p></div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderProjectCard(p) {
    const color = Utils.statusColor(p.status);
    const progress = this.getProgress(p.status);
    const attachmentsCount = p.attachments ? p.attachments.length : 0;
    
    return `
      <div class="project-card-v3" style="border-right-color: var(--${color});">
        <div class="pc-header">
          <div class="pc-number">${p.projectNumber}</div>
          <div class="pc-status" style="background: var(--${color});">
            ${Utils.statusText(p.status)}
          </div>
        </div>
        
        <div class="pc-body">
          <div class="pc-icon-row">
            <div class="pc-icon" style="background: rgba(37,99,235,0.1); color: var(--${color});">
              ${p.productName.charAt(0)}
            </div>
            <div class="pc-info">
              <div class="pc-product">${Utils.esc(p.productName)}</div>
              <div class="pc-customer">👤 ${Utils.esc(p.customerName)}</div>
            </div>
          </div>
          
          ${p.width > 0 ? `
            <div class="pc-dims">
              📏 ${p.width} × ${p.height} سم ${p.qty > 1 ? `• الكمية: ${p.qty}` : ''}
            </div>
          ` : ''}

          ${attachmentsCount > 0 ? `
            <div class="pc-attachments-badge">
              📎 ${attachmentsCount} ملف مرفق
            </div>
          ` : ''}
          
          <div class="pc-progress-wrapper">
            <div class="pc-progress-label">
              <span>التقدم</span>
              <b>${progress}%</b>
            </div>
            <div class="pc-progress-bar">
              <div class="pc-progress-fill" style="width: ${progress}%; background: var(--${color});"></div>
            </div>
          </div>
        </div>
        
        <div class="pc-footer">
          <div class="pc-date"><span>📅 ${Utils.date(p.createdAt)}</span></div>
          <div class="pc-actions">
            <button class="pc-btn pc-print" onclick="Projects.print('${p.id}')" title="طباعة">🖨️</button>
            <button class="pc-btn pc-view" onclick="Projects.openDetails('${p.id}')">👁️ عرض</button>
          </div>
        </div>
      </div>
    `;
  },

  getProgress(status) {
    return { draft: 10, pending: 25, approved: 40, in_progress: 65, completed: 90, delivered: 100, cancelled: 0 }[status] || 0;
  },

  setFilter(f) { this.filter = f; this.render(); },

  openForm() {
    if (!Auth.require('projects.manage', 'إدارة المشاريع')) return;

    const customers = DB.get('customers') || [];
    const products = DB.get('products') || [];

    const formHtml = `
      <div class="proj-form">
        <div class="pf-header">
          <div class="pfh-icon">📁</div>
          <div>
            <h2>مشروع جديد</h2>
            <p>إنشاء طلب تصنيع</p>
          </div>
        </div>
        
        <div class="pf-body">
          <div class="pff-field">
            <label>العميل</label>
            <select id="projCustomer">
              <option value="">-- عميل نقدي --</option>
              ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="pff-field">
            <label>المنتج المطلوب</label>
            <select id="projProduct">
              <option value="">-- اختر منتجاً --</option>
              ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              <option value="custom">منتج مخصص</option>
            </select>
          </div>
          <div id="customProductDiv" style="display:none;">
            <div class="pff-field">
              <label>اسم المنتج المخصص</label>
              <input type="text" id="projCustomName" placeholder="مثال: باب حديد مدخل">
            </div>
          </div>
          <div class="pff-row-3">
            <div class="pff-field">
              <label>العرض (سم)</label>
              <input type="number" id="projWidth" value="0">
            </div>
            <div class="pff-field">
              <label>الطول (سم)</label>
              <input type="number" id="projHeight" value="0">
            </div>
            <div class="pff-field">
              <label>الكمية</label>
              <input type="number" id="projQty" value="1" min="1">
            </div>
          </div>
          <div class="pff-field">
            <label>سعر البيع (اختياري)</label>
            <input type="number" id="projPrice" value="0">
          </div>
          <div class="pff-field">
            <label>ملاحظات / مواصفات</label>
            <textarea id="projNotes" rows="3"></textarea>
          </div>
        </div>
        
        <div class="pf-actions">
          <button class="pf-btn cancel" onclick="UI.closeModal()">إلغاء</button>
          <button class="pf-btn save" onclick="Projects.save()">💾 حفظ المشروع</button>
        </div>
      </div>
    `;

    UI.openModal('', formHtml, '');
    document.querySelector('.modal-content h2')?.remove();
    document.querySelector('.modal-content').style.padding = '0';

    setTimeout(() => {
      const sel = document.getElementById('projProduct');
      const div = document.getElementById('customProductDiv');
      if (sel && div) {
        sel.onchange = () => { div.style.display = sel.value === 'custom' ? 'block' : 'none'; };
      }
    }, 100);
  },

  save() {
    const customerId = document.getElementById('projCustomer').value;
    const productId = document.getElementById('projProduct').value;
    const customName = document.getElementById('projCustomName')?.value || '';
    const width = Number(document.getElementById('projWidth').value) || 0;
    const height = Number(document.getElementById('projHeight').value) || 0;
    const qty = Number(document.getElementById('projQty').value) || 1;
    const price = Number(document.getElementById('projPrice').value) || 0;
    const notes = document.getElementById('projNotes').value.trim();

    if (!productId) { UI.toast('⚠️ اختر منتجاً', 'error'); return; }

    let productName = '';
    if (productId === 'custom') productName = customName || 'منتج مخصص';
    else { const p = DB.find('products', productId); productName = p ? p.name : 'منتج'; }

    const customer = customerId ? DB.find('customers', customerId) : null;

    DB.insert('projects', {
      projectNumber: Utils.docNumber('PRJ'),
      customerId: customerId || null,
      customerName: customer ? customer.name : 'عميل نقدي',
      productId: productId === 'custom' ? null : productId,
      productName, width, height, qty,
      totalCost: 0, totalPrice: price, notes,
      status: 'draft',
      attachments: [],
      createdAt: new Date().toISOString(),
      createdBy: Auth.current().userId
    });

    UI.closeModal();
    this.render();
    UI.toast('✅ تم إنشاء المشروع', 'success');
  },

  openDetails(id) {
    const p = DB.find('projects', id);
    if (!p) return;

    const color = Utils.statusColor(p.status);
    const progress = this.getProgress(p.status);
    const moves = DB.get('inventory_moves') || [];
    const projectMoves = moves.filter(m => m.projectId === id && m.type === 'out');
    const materialsCost = projectMoves.reduce((sum, m) => sum + (m.qty * (m.unitPrice || 0)), 0);

    const attachments = p.attachments || [];

    const bodyHtml = `
      <div style="display:grid; gap:14px; max-height:65vh; overflow-y:auto;">
        
        <div style="background: linear-gradient(135deg, var(--${color}), var(--${color}-dark, var(--${color}))); padding:16px; border-radius:12px; color:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:18px; font-weight:900;">${p.projectNumber}</span>
            <span style="background:rgba(255,255,255,0.25); padding:4px 12px; border-radius:10px; font-size:11px; font-weight:700;">
              ${Utils.statusText(p.status)}
            </span>
          </div>
          <div style="font-size:12px; opacity:0.9;">تاريخ الإنشاء: ${Utils.date(p.createdAt, true)}</div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
            <span style="color:var(--text-muted);">نسبة الإنجاز</span>
            <b>${progress}%</b>
          </div>
          <div style="height:10px; background:#f1f5f9; border-radius:5px; overflow:hidden;">
            <div style="height:100%; width:${progress}%; background: var(--${color}); border-radius:5px;"></div>
          </div>
        </div>

        <div style="background:var(--bg); padding:14px; border-radius:10px;">
          <div style="font-weight:800; margin-bottom:8px; font-size:14px;">${Utils.esc(p.productName)}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
            <div><span style="color:var(--text-muted);">العميل:</span><br><b>${Utils.esc(p.customerName)}</b></div>
            <div><span style="color:var(--text-muted);">المقاسات:</span><br><b>${p.width > 0 ? p.width + ' × ' + p.height + ' سم' : '—'}</b></div>
            <div><span style="color:var(--text-muted);">الكمية:</span><br><b>${p.qty}</b></div>
            <div><span style="color:var(--text-muted);">سعر البيع:</span><br><b style="color:var(--success);">${Utils.money(p.totalPrice || 0)}</b></div>
          </div>
        </div>

        ${p.notes ? `<div style="background:var(--bg); padding:12px; border-radius:10px; font-size:12px;"><b>ملاحظات:</b><br>${Utils.esc(p.notes)}</div>` : ''}

        <!-- المواد المصروفة -->
        <div style="border:2px solid var(--border); border-radius:10px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:800; font-size:13px;">📦 المواد المصروفة</div>
            <button class="btn btn-primary" style="padding:6px 12px; font-size:11px;" onclick="Projects.openMaterialIssue('${p.id}')">➕ صرف مادة</button>
          </div>
          ${projectMoves.length ? `
            <div style="background:#f8fafc; padding:10px; border-radius:8px; margin-bottom:10px;">
              ${projectMoves.map(m => `
                <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px; border-bottom:1px dashed var(--border);">
                  <span>${Utils.esc(m.materialName)}</span>
                  <span><b>${m.qty}</b> × ${Utils.money(m.unitPrice || 0)}</span>
                </div>
              `).join('')}
              <div style="display:flex; justify-content:space-between; padding-top:8px; font-weight:800; font-size:13px; color:var(--primary);">
                <span>إجمالي تكلفة المواد:</span>
                <span>${Utils.money(materialsCost)}</span>
              </div>
            </div>
          ` : `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">لم يتم صرف مواد بعد.</div>`}
        </div>

        <!-- المرفقات -->
        <div style="border:2px dashed var(--border); border-radius:10px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:800; font-size:13px;">📎 ملفات التصميم والصور (${attachments.length})</div>
            <label class="btn btn-primary" style="cursor:pointer; padding:6px 12px; font-size:11px;">
              📤 رفع
              <input type="file" style="display:none;" multiple accept=".dxf,.svg,.pdf,image/*" onchange="Projects.uploadAttachment(event, '${p.id}')">
            </label>
          </div>
          
          ${attachments.length ? `
            <div style="display:grid; gap:8px;">
              ${attachments.map((a, i) => this.renderAttachmentItem(a, i, p.id)).join('')}
            </div>
          ` : `
            <div style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">
              لم يتم رفع أي ملفات بعد.<br>
              <span style="font-size:10px;">DXF, SVG, PDF, JPG, PNG</span>
            </div>
          `}
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-ghost" style="flex:1; font-size:12px;" onclick="Projects.print('${p.id}')">🖨️ طباعة</button>
          <button class="btn btn-warning" style="flex:1; font-size:12px;" onclick="Projects.updateStatus('${p.id}', 'approved')">✅ اعتماد</button>
          <button class="btn btn-primary" style="flex:1; font-size:12px;" onclick="Projects.updateStatus('${p.id}', 'in_progress')">🏭 بدء التنفيذ</button>
          <button class="btn btn-success" style="flex:1; font-size:12px;" onclick="Projects.updateStatus('${p.id}', 'completed')">✔️ إنجاز</button>
        </div>
      </div>
    `;

    UI.openModal('تفاصيل المشروع', bodyHtml, '<button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>');
  },

  renderAttachmentItem(a, index, projectId) {
    const isImage = a.type && a.type.startsWith('image/');
    const isPDF = a.type === 'application/pdf';
    const isDXF = a.name.toLowerCase().endsWith('.dxf') || a.name.toLowerCase().endsWith('.svg');
    
    let icon = '📄';
    if (isImage) icon = '🖼️';
    if (isPDF) icon = '📕';
    if (isDXF) icon = '📐';

    return `
      <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f8fafc; border-radius:10px; border:1px solid var(--border);">
        <div style="font-size:24px;">${icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${Utils.esc(a.name)}
          </div>
          <div style="font-size:10px; color:var(--text-muted);">${(a.size / 1024).toFixed(1)} KB</div>
        </div>
        <div style="display:flex; gap:4px;">
          ${isImage ? `<button onclick="Projects.previewImage('${a.data}')" style="background:#dbeafe; color:#1e40af; border:none; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;">👁️</button>` : ''}
          <button onclick="Projects.downloadAttachment('${a.data}', '${a.name}')" style="background:#dcfce7; color:#166534; border:none; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;">📥</button>
          <button onclick="Projects.removeAttachment('${projectId}', ${index})" style="background:#fee2e2; color:#991b1b; border:none; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;">🗑️</button>
        </div>
      </div>
    `;
  },

  uploadAttachment(event, projectId) {
    const files = event.target.files;
    if (!files.length) return;
    const p = DB.find('projects', projectId);
    if (!p) return;
    
    const attachments = p.attachments || [];
    let uploaded = 0;
    
    Array.from(files).forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        UI.toast(`⚠️ الملف ${file.name} أكبر من 2MB`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          uploadedAt: new Date().toISOString()
        });
        uploaded++;
        if (uploaded === files.length || reader.readyState === 2) {
          DB.update('projects', projectId, { attachments });
          UI.toast(`✅ تم رفع ${uploaded} ملف`, 'success');
          this.openDetails(projectId);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  removeAttachment(projectId, index) {
    if (!confirm('حذف الملف؟')) return;
    const p = DB.find('projects', projectId);
    if (!p || !p.attachments) return;
    p.attachments.splice(index, 1);
    DB.update('projects', projectId, { attachments: p.attachments });
    this.openDetails(projectId);
    UI.toast('✅ تم الحذف', 'success');
  },

  previewImage(dataUrl) {
    UI.openModal('معاينة الصورة', `
      <div style="text-align:center;">
        <img src="${dataUrl}" style="max-width:100%; max-height:70vh; border-radius:10px;">
      </div>
    `, '<button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>');
  },

  downloadAttachment(data, name) {
    const a = document.createElement('a');
    a.href = data;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    UI.toast('✅ جاري تحميل الملف', 'success');
  },

  openMaterialIssue(projectId) {
    const materials = DB.get('materials') || [];
    if (!materials.length) { UI.toast('⚠️ لا توجد مواد', 'warning'); return; }

    const formHtml = `
      <div style="display:grid; gap:12px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">المادة</label>
          <select id="issueMaterial" onchange="Projects.updateIssuePrice()" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
            ${materials.map(m => `<option value="${m.id}" data-price="${m.costPerUnit}">${m.name} (رصيد: ${m.stock})</option>`).join('')}
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">الكمية</label>
            <input type="number" id="issueQty" value="1" min="0.01" step="0.01" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">سعر الوحدة</label>
            <input type="number" id="issuePrice" value="0" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
          </div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">ملاحظات</label>
          <input type="text" id="issueNote" placeholder="صرف لمشروع..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; margin-top:4px;">
        </div>
      </div>
    `;
    UI.openModal('صرف مادة', formHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Projects.saveMaterialIssue('${projectId}')">📤 صرف</button>
    `);
    setTimeout(() => this.updateIssuePrice(), 100);
  },

  updateIssuePrice() {
    const sel = document.getElementById('issueMaterial');
    if (!sel) return;
    document.getElementById('issuePrice').value = sel.options[sel.selectedIndex].getAttribute('data-price') || 0;
  },

  saveMaterialIssue(projectId) {
    const materialId = document.getElementById('issueMaterial').value;
    const qty = Number(document.getElementById('issueQty').value) || 0;
    const price = Number(document.getElementById('issuePrice').value) || 0;
    const note = document.getElementById('issueNote').value.trim();
    if (qty <= 0) return;

    const material = DB.find('materials', materialId);
    if (!material) return;

    if (material.stock < qty) { UI.toast('⚠️ الرصيد غير كافٍ', 'error'); return; }

    DB.update('materials', materialId, { stock: material.stock - qty });
    DB.insert('inventory_moves', {
      materialId, materialName: material.name, projectId,
      type: 'out', qty, unitPrice: price,
      note: note || 'صرف للمشروع',
      date: new Date().toISOString(),
      userId: Auth.current().userId
    });

    UI.closeModal();
    UI.toast('✅ تم صرف المادة', 'success');
    this.openDetails(projectId);
  },

  updateStatus(id, newStatus) {
    if (!Auth.require('projects.manage', 'إدارة المشاريع')) return;
    DB.update('projects', id, { status: newStatus });
    UI.closeModal();
    this.render();
    UI.toast(`✅ ${Utils.statusText(newStatus)}`, 'success');
  },

  print(id) {
    const p = DB.find('projects', id);
    if (!p) return;
    const settings = DB.getSettings();
    const win = window.open('', '_blank', 'width=800,height=600');

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>مشروع ${p.projectNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .card { background:#fff; max-width:700px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          .header { background:linear-gradient(135deg,#2563eb,#1e40af); color:#fff; padding:24px; }
          .header h1 { font-size:22px; margin-bottom:4px; }
          .header p { font-size:12px; opacity:0.9; }
          .body { padding:24px; }
          .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px dashed #e2e8f0; font-size:13px; }
          .row:last-child { border:none; }
          .label { color:#64748b; }
          .value { font-weight:700; }
          .footer { background:#1e293b; color:#94a3b8; padding:12px; text-align:center; font-size:10px; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#2563eb; color:#fff; }
          .btn-c { background:#fff; color:#333; border:1px solid #ddd; }
          @media print { body { background:#fff; padding:0; } .print-actions { display:none; } }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="btn btn-p" onclick="window.print()">🖨️ طباعة</button>
          <button class="btn btn-c" onclick="window.close()">✖ إغلاق</button>
        </div>
        <div class="card">
          <div class="header">
            <h1>${settings.companyName || 'ورشة التصنيع'}</h1>
            <p>بطاقة مشروع — ${p.projectNumber}</p>
          </div>
          <div class="body">
            <div class="row"><span class="label">العميل:</span><span class="value">${Utils.esc(p.customerName)}</span></div>
            <div class="row"><span class="label">المنتج:</span><span class="value">${Utils.esc(p.productName)}</span></div>
            <div class="row"><span class="label">المقاسات:</span><span class="value">${p.width > 0 ? p.width + ' × ' + p.height + ' سم' : '—'}</span></div>
            <div class="row"><span class="label">الكمية:</span><span class="value">${p.qty}</span></div>
            <div class="row"><span class="label">الحالة:</span><span class="value">${Utils.statusText(p.status)}</span></div>
            <div class="row"><span class="label">التاريخ:</span><span class="value">${Utils.date(p.createdAt)}</span></div>
            <div class="row"><span class="label">سعر البيع:</span><span class="value">${Utils.money(p.totalPrice || 0)}</span></div>
            <div class="row"><span class="label">التكلفة:</span><span class="value">${Utils.money(p.totalCost || 0)}</span></div>
          </div>
          <div class="footer">تم إصدارها بواسطة IBRA Soft ERP — ${new Date().getFullYear()}</div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  injectStyles() {
    if (document.getElementById('proj-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'proj-styles-v4';
    style.innerHTML = `
      .proj-hero {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        border-radius: 24px; padding: 22px; color: #fff;
        margin-bottom: 16px; box-shadow: 0 10px 30px rgba(37,99,235,0.3);
        position: relative; overflow: hidden;
      }
      .proj-hero::before {
        content: ''; position: absolute;
        top: -50px; right: -50px; width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ph-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .ph-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .ph-title p { font-size: 13px; opacity: 0.9; }
      .ph-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; position: relative; z-index: 1; }
      .phs-stat {
        background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
        padding: 10px 4px; border-radius: 10px; text-align: center;
        cursor: pointer; transition: all 0.2s;
      }
      .phs-stat:hover { background: rgba(255,255,255,0.25); }
      .phs-value { font-size: 20px; font-weight: 800; }
      .phs-label { font-size: 10px; opacity: 0.9; margin-top: 2px; }
      
      .proj-filters {
        display: flex; gap: 4px; margin-bottom: 14px;
        background: #fff; padding: 6px; border-radius: 12px;
        border: 1px solid var(--border); overflow-x: auto;
      }
      .pf-btn {
        flex: 1; padding: 8px 10px; background: transparent; border: none;
        border-radius: 8px; font-size: 11px; font-weight: 700;
        color: var(--text-muted); cursor: pointer; font-family: inherit;
        white-space: nowrap; transition: all 0.2s;
      }
      .pf-btn.active { background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; }
      
      .projects-grid { display: grid; gap: 12px; }
      .project-card-v3 {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border); border-right: 4px solid var(--primary);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: all 0.2s;
      }
      .project-card-v3:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      
      .pc-header {
        padding: 12px 16px; background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center; border-bottom: 1px solid var(--border);
      }
      .pc-number { font-weight: 800; font-size: 13px; color: var(--primary); }
      .pc-status { color: #fff; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      
      .pc-body { padding: 14px 16px; }
      .pc-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
      .pc-icon {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 800; flex-shrink: 0;
      }
      .pc-info { flex: 1; min-width: 0; }
      .pc-product { font-size: 15px; font-weight: 800; color: var(--text); }
      .pc-customer { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      
      .pc-dims {
        font-size: 11px; color: var(--text-muted); background: #f1f5f9;
        padding: 5px 10px; border-radius: 8px;
        display: inline-block; margin-bottom: 8px;
      }
      .pc-attachments-badge {
        background: #dbeafe; color: #1e40af;
        padding: 4px 10px; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        display: inline-block; margin-bottom: 8px; margin-right: 6px;
      }
      
      .pc-progress-wrapper { margin-top: 8px; }
      .pc-progress-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
      .pc-progress-label span { color: var(--text-muted); }
      .pc-progress-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
      .pc-progress-fill { height: 100%; border-radius: 3px; transition: width 1s; }
      
      .pc-footer {
        padding: 10px 16px; background: #f8fafc; border-top: 1px solid var(--border);
        display: flex; justify-content: space-between; align-items: center;
      }
      .pc-date { font-size: 11px; color: var(--text-muted); }
      .pc-actions { display: flex; gap: 6px; }
      .pc-btn {
        padding: 6px 10px; border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .pc-print { background: #dbeafe; color: #1e40af; }
      .pc-view { background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; }
      
      /* نموذج المشروع */
      .proj-form { background: #fff; border-radius: 20px; overflow: hidden; }
      .pf-header {
        padding: 20px; background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff; display: flex; align-items: center; gap: 14px;
      }
      .pfh-icon {
        width: 50px; height: 50px; background: rgba(255,255,255,0.2);
        border-radius: 14px; display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .pf-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
      .pf-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      
      .pf-body { padding: 20px; display: grid; gap: 14px; }
      .pff-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .pff-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .pff-field input, .pff-field select, .pff-field textarea {
        width: 100%; padding: 11px 14px; border: 1px solid var(--border);
        border-radius: 10px; font-size: 14px; font-family: inherit;
        background: #fff; outline: none; box-sizing: border-box;
      }
      .pff-field input:focus, .pff-field select:focus, .pff-field textarea:focus {
        border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      
      .pf-actions {
        padding: 14px 20px; display: flex; gap: 10px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .pf-btn {
        padding: 12px; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .pf-btn.cancel { flex: 1; background: #fff; color: var(--text); border: 1px solid var(--border); }
      .pf-btn.save { flex: 2; background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Projects v4 loaded (with attachments)');