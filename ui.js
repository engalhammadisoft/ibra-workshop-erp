/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — واجهة المستخدم (UI)
   ═══════════════════════════════════════════════════════════════ */

const UI = {
  currentPage: 'dashboard',
  routes: {},

  navItems: [
    { key: 'dashboard',  label: 'الرئيسية',          icon: '🏠', perm: 'dashboard.view' },
    { key: 'more', label: 'المزيد', icon: '☰', perm: 'dashboard.view' },
    { key: 'pos',        label: 'نقطة البيع',        icon: '🛒', perm: 'sales.view' },
    { key: 'sep1', type: 'separator' },
    { key: 'customers',  label: 'العملاء والموردون', icon: '👥', perm: 'sales.view' },
    { key: 'quotes',     label: 'عروض الأسعار',      icon: '📝', perm: 'projects.view' },
    { key: 'purchases', label: 'المشتريات', icon: '🛒', perm: 'inventory.manage' },
    { key: 'projects',   label: 'المشاريع والطلبات', icon: '📁', perm: 'projects.view' },
    { key: 'sep2', type: 'separator' },
    { key: 'production', label: 'أوامر التصنيع',     icon: '🏭', perm: 'production.view' },
    { key: 'machines',   label: 'مكائن CNC',        icon: '⚙️', perm: 'machines.view' },
    { key: 'sep3', type: 'separator' },
    { key: 'inventory',  label: 'المخزون',           icon: '📦', perm: 'inventory.view' },
    { key: 'smart', label: 'الجرد الذكي', icon: '🤖', perm: 'inventory.view' },
    { key: 'costing',    label: 'التكاليف',          icon: '💰', perm: 'costing.view' },
    { key: 'sep4', type: 'separator' },
    { key: 'invoices',   label: 'المبيعات والفواتير',icon: '🧾', perm: 'sales.view' },
    { key: 'vouchers', label: 'السندات والدفعات', icon: '🧾', perm: 'accounting.view' },
    { key: 'accounting', label: 'المحاسبة',          icon: '🧮', perm: 'accounting.view' },
    { key: 'statements', label: 'كشوف الحسابات', icon: '📊', perm: 'accounting.view' },
    { key: 'cashboxes', label: 'الصناديق', icon: '💼', perm: 'accounting.view' },
    { key: 'employees',  label: 'الموظفون',          icon: '👷', perm: 'hr.view' },
    { key: 'permissions', label: 'الصلاحيات', icon: '🔒', perm: 'users.manage' },
    { key: 'sep5', type: 'separator' },
    { key: 'reports',    label: 'التقارير',          icon: '📊', perm: 'reports.view' },
    { key: 'notifications', label: 'التنبيهات', icon: '🔔', perm: 'dashboard.view' },
    { key: 'fraud', label: 'كاشف الاحتيال', icon: '🔍', perm: 'users.manage' },
    { key: 'settings',   label: 'الإعدادات',         icon: '⚙️', perm: 'settings.view' }
    
  ],

  showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    const session = Auth.current();
    if (session) {
      document.getElementById('currentUser').textContent = session.fullName || session.username;
    }

    this.buildSidebar();
    this.navigate('dashboard');
  },

  buildSidebar() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    nav.innerHTML = '';

    let html = '<div class="nav-section-title">القائمة الرئيسية</div>';

    this.navItems.forEach(item => {
      if (item.type === 'separator') {
        html += '<div class="nav-separator"></div>';
        return;
      }
      if (item.perm && !Auth.can(item.perm)) return;

      html += `
        <button class="nav-item" data-page="${item.key}" onclick="UI.navigate('${item.key}')">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `;
    });

    nav.innerHTML = html;
  },

  navigate(pageKey) {
    this.currentPage = pageKey;
    
    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.add('hidden');
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageKey);
    });

    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === pageKey);
    });

    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading">جاري التحميل...</div>';

    setTimeout(() => {
      try {
        // التحقق من وجود الكائن قبل استدعائه
        if (pageKey === 'dashboard' && typeof Dashboard !== 'undefined') {
          Dashboard.render();
        } 
        else if (pageKey === 'more' && typeof MorePage !== 'undefined') {
  MorePage.render();
}
        else if (pageKey === 'projects' && typeof Projects !== 'undefined') {
          Projects.render();
        } 
        else if (pageKey === 'production' && typeof Production !== 'undefined') {
          Production.render();
        } 
        else if (pageKey === 'invoices' && typeof Invoices !== 'undefined') {
  Invoices.render();
}
else if (pageKey === 'accounting' && typeof Accounting !== 'undefined') {
  Accounting.render();
}
else if (pageKey === 'pos' && typeof POS !== 'undefined') {
  POS.render();
}
else if (pageKey === 'customers' && typeof Customers !== 'undefined') {
  Customers.render();
}
else if (pageKey === 'employees' && typeof Employees !== 'undefined') {
  Employees.render();
}
else if (pageKey === 'quotes' && typeof Quotes !== 'undefined') {
  Quotes.render();
}
else if (pageKey === 'vouchers' && typeof Vouchers !== 'undefined') {
  Vouchers.render();
}

        else if (pageKey === 'smart' && typeof Smart !== 'undefined') {
  Smart.render();
}
else if (pageKey === 'cashboxes' && typeof Cashboxes !== 'undefined') {
  Cashboxes.render();
}
else if (pageKey === 'permissions' && typeof Permissions !== 'undefined') {
  Permissions.render();
}
else if (pageKey === 'notifications' && typeof Notifications !== 'undefined') {
  Notifications.render();
}

else if (pageKey === 'fraud' && typeof Fraud !== 'undefined') {
  Fraud.render();
}

else if (pageKey === 'statements' && typeof Statements !== 'undefined') {
  Statements.render();
}
else if (pageKey === 'purchases' && typeof Purchases !== 'undefined') {
  Purchases.render();
}
        else if (pageKey === 'inventory' && typeof Inventory !== 'undefined') {
          Inventory.render();
        } 
        else if (pageKey === 'machines' && typeof Machines !== 'undefined') {
          Machines.render();
        } 
        else if (pageKey === 'costing' && typeof Costing !== 'undefined') {
          Costing.render();
        } 
        else if (pageKey === 'reports' && typeof Reports !== 'undefined') {
          Reports.render();
        } 
        else if (pageKey === 'settings' && typeof Settings !== 'undefined') {
          Settings.render();
        } 
        else {
          // صفحة قيد الإنشاء
          content.innerHTML = `
            <div class="page-header">
              <h1 class="page-title">${this.getPageTitle(pageKey)}</h1>
            </div>
            <div class="empty-state">
              <div class="icon">🚧</div>
              <h3>قيد الإنشاء</h3>
              <p>هذه الشاشة سيتم بناؤها في المراحل القادمة.</p>
            </div>
          `;
        }
      } catch (e) {
        console.error('Error rendering page:', e);
        content.innerHTML = `<div class="empty-state" style="color:var(--danger)"><h3>حدث خطأ</h3><p>${e.message}</p></div>`;
      }
    }, 50);
  },

  getPageTitle(key) {
    const item = this.navItems.find(i => i.key === key);
    return item ? item.label : key;
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay.classList.add('hidden');
    } else {
      sidebar.classList.add('open');
      overlay.classList.remove('hidden');
    }
  },

  openModal(title, bodyHtml, actionsHtml = '') {
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
      <h2>${title}</h2>
      <div class="modal-body">${bodyHtml}</div>
      ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
    `;
    
    modal.classList.remove('hidden');
  },

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalContent').innerHTML = '';
  },

  toast(message, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, 3000);
  },

  confirm(message, onConfirm) {
    if (confirm(message)) {
      if (typeof onConfirm === 'function') onConfirm();
      return true;
    }
    return false;
  }
};

console.log('✅ UI loaded');