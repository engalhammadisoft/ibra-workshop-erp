/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — إدارة الأدوار والصلاحيات
   ═══════════════════════════════════════════════════════════════ */

const Permissions = {
  // قائمة كل الصلاحيات المتاحة في النظام
  ALL_PERMISSIONS: [
    { key: 'dashboard.view', label: 'عرض لوحة التحكم', icon: '🏠' },
    { key: 'projects.view', label: 'عرض المشاريع', icon: '📁' },
    { key: 'projects.manage', label: 'إدارة المشاريع', icon: '📁' },
    { key: 'production.view', label: 'عرض التصنيع', icon: '🏭' },
    { key: 'production.manage', label: 'إدارة التصنيع', icon: '🏭' },
    { key: 'inventory.view', label: 'عرض المخزون', icon: '📦' },
    { key: 'inventory.manage', label: 'إدارة المخزون', icon: '📦' },
    { key: 'machines.view', label: 'عرض المكائن', icon: '⚙️' },
    { key: 'machines.manage', label: 'إدارة المكائن', icon: '⚙️' },
    { key: 'costing.view', label: 'عرض التكاليف', icon: '💰' },
    { key: 'costing.manage', label: 'إدارة التكاليف', icon: '💰' },
    { key: 'sales.view', label: 'عرض المبيعات', icon: '🧾' },
    { key: 'sales.manage', label: 'إدارة المبيعات', icon: '🧾' },
    { key: 'accounting.view', label: 'عرض المحاسبة', icon: '🧮' },
    { key: 'accounting.manage', label: 'إدارة المحاسبة', icon: '🧮' },
    { key: 'hr.view', label: 'عرض الموظفين', icon: '👷' },
    { key: 'hr.manage', label: 'إدارة الموظفين', icon: '👷' },
    { key: 'reports.view', label: 'عرض التقارير', icon: '📊' },
    { key: 'settings.view', label: 'عرض الإعدادات', icon: '⚙️' },
    { key: 'settings.manage', label: 'إدارة الإعدادات', icon: '⚙️' },
    { key: 'users.manage', label: 'إدارة المستخدمين والصلاحيات', icon: '🔒' },
    { key: 'backup.manage', label: 'النسخ الاحتياطي', icon: '🗄️' }
  ],

  render() {
    const content = document.getElementById('content');
    const roles = DB.get('roles') || [];

    let html = `
      <div class="page-header">
        <h1 class="page-title">الأدوار والصلاحيات</h1>
        <button class="btn btn-primary" onclick="Permissions.openAddRole()">➕ إضافة دور جديد</button>
      </div>

      <!-- البطاقة الرئيسية -->
      <div class="perm-hero">
        <div class="perm-hero-icon">🔒</div>
        <div class="perm-hero-content">
          <h2>إدارة الصلاحيات</h2>
          <p>حدد ما يمكن لكل دور فعله داخل النظام</p>
        </div>
      </div>

      <!-- قائمة الأدوار -->
      <div class="roles-grid">
        ${roles.map(role => this.renderRoleCard(role)).join('')}
      </div>

      <!-- شرح -->
      <div class="perm-info-box">
        💡 <strong>ملاحظة:</strong> أي تغيير في صلاحيات الدور ينعكس فوراً على جميع الموظفين المرتبطين به.
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderRoleCard(role) {
    const isAdmin = role.key === 'admin' || (role.permissions && role.permissions.includes('*'));
    const permCount = isAdmin ? 'كل الصلاحيات' : (role.permissions || []).length + ' صلاحية';
    const icon = isAdmin ? '👑' : '👤';
    const color = isAdmin ? 'orange' : 'blue';

    return `
      <div class="role-card role-${color}">
        <div class="role-header">
          <div class="role-icon">${icon}</div>
          <div class="role-info">
            <div class="role-name">${Utils.esc(role.name)}</div>
            <div class="role-key">${Utils.esc(role.key)}</div>
          </div>
          <div class="role-count">${permCount}</div>
        </div>
        
        <div class="role-body">
          <div class="role-permissions-preview">
            ${isAdmin ? `
              <span class="perm-chip perm-chip-all">✨ كل الصلاحيات</span>
            ` : (role.permissions || []).length > 0 ? 
              role.permissions.slice(0, 3).map(p => {
                const perm = this.ALL_PERMISSIONS.find(x => x.key === p);
                return `<span class="perm-chip">${perm ? perm.icon : '✓'} ${perm ? perm.label : p}</span>`;
              }).join('') + (role.permissions.length > 3 ? `<span class="perm-chip perm-chip-more">+${role.permissions.length - 3} أخرى</span>` : '')
              : `<span class="perm-chip perm-chip-none">لا توجد صلاحيات</span>`
            }
          </div>
        </div>
        
        <div class="role-actions">
          <button class="role-btn role-btn-edit" onclick="Permissions.openEditRole('${role.key}')">
            ✏️ تعديل الصلاحيات
          </button>
          ${!isAdmin && !['admin', 'manager', 'operator', 'accountant', 'viewer'].includes(role.key) ? `
            <button class="role-btn role-btn-delete" onclick="Permissions.removeRole('${role.key}')">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  openEditRole(roleKey) {
    if (!Auth.require('users.manage', 'إدارة الصلاحيات')) return;
    
    const roles = DB.get('roles') || [];
    const role = roles.find(r => r.key === roleKey);
    if (!role) return;

    const isAdmin = roleKey === 'admin';
    const currentPerms = role.permissions || [];

    const bodyHtml = `
      <div style="display:grid; gap:14px; max-height:65vh; overflow-y:auto;">
        
        <!-- رأس الدور -->
        <div style="background: linear-gradient(135deg, ${isAdmin ? '#d97706, #92400e' : '#2563eb, #1e40af'}); padding:16px; border-radius:12px; color:#fff;">
          <div style="font-size:18px; font-weight:800; margin-bottom:4px;">${Utils.esc(role.name)}</div>
          <div style="font-size:12px; opacity:0.9;">${isAdmin ? '👑 هذا الدور يملك كل الصلاحيات تلقائياً' : 'حدد الصلاحيات المسموحة لهذا الدور'}</div>
        </div>

        ${isAdmin ? `
          <div style="background:#fef3c7; padding:14px; border-radius:10px; border:1px solid #fcd34d; text-align:center;">
            <div style="font-size:32px; margin-bottom:6px;">👑</div>
            <div style="font-weight:700; color:#92400e;">مدير النظام</div>
            <div style="font-size:12px; color:#b45309; margin-top:4px;">لا يمكن تعديل صلاحيات مدير النظام (يملك كل شيء)</div>
          </div>
        ` : `
          <!-- أزرار سريعة -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="Permissions.toggleAll(true)" style="flex:1; padding:10px; background:#dcfce7; color:#166534; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit;">
              ✅ تحديد الكل
            </button>
            <button onclick="Permissions.toggleAll(false)" style="flex:1; padding:10px; background:#fee2e2; color:#991b1b; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit;">
              ❌ إلغاء الكل
            </button>
          </div>

          <!-- قائمة الصلاحيات -->
          <div style="display:grid; gap:6px;">
            ${this.ALL_PERMISSIONS.map(p => `
              <label class="perm-checkbox-row" onclick="Permissions.togglePerm(this, event)">
                <input type="checkbox" class="perm-checkbox" value="${p.key}" 
                  ${currentPerms.includes(p.key) || currentPerms.includes('*') ? 'checked' : ''}>
                <div class="perm-checkbox-icon">${p.icon}</div>
                <div class="perm-checkbox-label">${p.label}</div>
              </label>
            `).join('')}
          </div>
        `}
      </div>
    `;

    const actionsHtml = isAdmin ? `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
    ` : `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Permissions.saveRole('${roleKey}')">💾 حفظ الصلاحيات</button>
    `;

    UI.openModal('🔒 صلاحيات: ' + role.name, bodyHtml, actionsHtml);
  },

  togglePerm(label, event) {
    event.preventDefault();
    const cb = label.querySelector('.perm-checkbox');
    cb.checked = !cb.checked;
    label.classList.toggle('checked', cb.checked);
  },

  toggleAll(checked) {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
      cb.checked = checked;
      cb.closest('.perm-checkbox-row')?.classList.toggle('checked', checked);
    });
  },

  saveRole(roleKey) {
    const selected = Array.from(document.querySelectorAll('.perm-checkbox:checked')).map(cb => cb.value);
    const roles = DB.get('roles') || [];
    const idx = roles.findIndex(r => r.key === roleKey);
    
    if (idx !== -1) {
      roles[idx].permissions = selected;
      DB.set('roles', roles);
      UI.closeModal();
      this.render();
      UI.toast(`✅ تم تحديث صلاحيات "${roles[idx].name}"`, 'success');
    }
  },

  openAddRole() {
    if (!Auth.require('users.manage', 'إدارة الصلاحيات')) return;

    const bodyHtml = `
      <div style="display:grid; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">اسم الدور *</label>
          <input type="text" id="newRoleName" placeholder="مثال: مدير إنتاج" 
            style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--text-muted);">مفتاح الدور (بالإنجليزية) *</label>
          <input type="text" id="newRoleKey" placeholder="production_manager" dir="ltr"
            style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; margin-top:4px; font-family:monospace;">
        </div>
        <div style="background:#f0f9ff; padding:12px; border-radius:8px; font-size:12px; color:#0369a1;">
          💡 سيتم تحديد صلاحيات هذا الدور في الخطوة التالية بعد الحفظ.
        </div>
      </div>
    `;

    UI.openModal('➕ إضافة دور جديد', bodyHtml, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="Permissions.saveNewRole()">💾 حفظ</button>
    `);
  },

  saveNewRole() {
    const name = document.getElementById('newRoleName').value.trim();
    const key = document.getElementById('newRoleKey').value.trim().toLowerCase().replace(/\s/g, '_');

    if (!name || !key) {
      UI.toast('⚠️ أدخل الاسم والمفتاح', 'error');
      return;
    }

    const roles = DB.get('roles') || [];
    if (roles.find(r => r.key === key)) {
      UI.toast('⚠️ هذا المفتاح موجود مسبقاً', 'error');
      return;
    }

    roles.push({ key, name, permissions: [] });
    DB.set('roles', roles);
    UI.closeModal();
    this.render();
    UI.toast(`✅ تم إضافة الدور "${name}"`, 'success');
    
    setTimeout(() => this.openEditRole(key), 300);
  },

  removeRole(roleKey) {
    if (!confirm('حذف هذا الدور؟ سيتم إزالة ارتباطه بالموظفين.')) return;
    const roles = (DB.get('roles') || []).filter(r => r.key !== roleKey);
    DB.set('roles', roles);
    
    // تحديث الموظفين المرتبطين بهذا الدور إلى viewer
    const employees = DB.get('employees') || [];
    employees.forEach(e => {
      if (e.role === roleKey) {
        DB.update('employees', e.id, { role: 'viewer' });
      }
    });
    
    this.render();
    UI.toast('✅ تم حذف الدور', 'success');
  },

  injectStyles() {
    if (document.getElementById('perm-styles')) return;
    const style = document.createElement('style');
    style.id = 'perm-styles';
    style.innerHTML = `
      .perm-hero {
        background: linear-gradient(135deg, #1e40af 0%, #0f172a 100%);
        border-radius: 20px; padding: 20px; color: #fff;
        display: flex; align-items: center; gap: 16px;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(30,64,175,0.3);
      }
      .perm-hero-icon { font-size: 48px; }
      .perm-hero-content h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .perm-hero-content p { font-size: 13px; opacity: 0.9; }
      
      .roles-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      @media (min-width: 768px) { .roles-grid { grid-template-columns: 1fr 1fr; } }
      
      .role-card {
        background: #fff; border-radius: 16px; overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        transition: all 0.2s;
      }
      .role-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
      .role-orange { border-right: 4px solid #d97706; }
      .role-blue { border-right: 4px solid #2563eb; }
      
      .role-header {
        padding: 14px; display: flex; gap: 12px; align-items: center;
        background: #f8fafc; border-bottom: 1px solid var(--border);
      }
      .role-icon {
        width: 46px; height: 46px;
        background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
      }
      .role-orange .role-icon { background: linear-gradient(135deg, #fef3c7, #fcd34d); }
      .role-blue .role-icon { background: linear-gradient(135deg, #dbeafe, #93c5fd); }
      
      .role-info { flex: 1; }
      .role-name { font-size: 14px; font-weight: 800; color: var(--text); }
      .role-key { font-size: 10px; color: var(--text-muted); font-family: monospace; }
      .role-count {
        background: var(--bg);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
      }
      
      .role-body { padding: 12px 14px; }
      .role-permissions-preview { display: flex; flex-wrap: wrap; gap: 4px; }
      .perm-chip {
        background: #f1f5f9;
        color: #475569;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
      }
      .perm-chip-all { background: #fef3c7; color: #92400e; }
      .perm-chip-more { background: #dbeafe; color: #1e40af; }
      .perm-chip-none { background: #f1f5f9; color: #94a3b8; }
      
      .role-actions {
        padding: 10px 14px; display: flex; gap: 6px;
        background: #f8fafc; border-top: 1px solid var(--border);
      }
      .role-btn {
        flex: 1; padding: 8px; border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .role-btn-edit { background: #dbeafe; color: #1e40af; }
      .role-btn-delete { background: #fee2e2; color: #991b1b; flex: 0.4; }
      
      /* Checkbox row */
      .perm-checkbox-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: 8px;
        background: #f8fafc; border: 1px solid var(--border);
        cursor: pointer; transition: all 0.2s;
      }
      .perm-checkbox-row:hover { background: #f1f5f9; }
      .perm-checkbox-row.checked { background: #eff6ff; border-color: #93c5fd; }
      .perm-checkbox {
        width: 18px; height: 18px; cursor: pointer;
        accent-color: #2563eb;
      }
      .perm-checkbox-icon { font-size: 18px; }
      .perm-checkbox-label { font-size: 12px; font-weight: 600; color: var(--text); }
      
      .perm-info-box {
        background: #eff6ff; border: 1px solid #bfdbfe;
        border-radius: 12px; padding: 14px;
        font-size: 12px; color: #1e40af; line-height: 1.6;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Permissions loaded');