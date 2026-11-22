/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — الإعدادات الشاملة (v3)
   ═══════════════════════════════════════════════════════════════ */

const Settings = {
  activeTab: 'workshop',

  render() {
    const content = document.getElementById('content');
    const tabs = [
      { id: 'workshop', label: 'بيانات الورشة', icon: '🏢' },
      { id: 'invoice', label: 'الفواتير', icon: '🧾' },
      { id: 'printer', label: 'الطباعة', icon: '🖨️' },
      { id: 'costing', label: 'التكاليف', icon: '💰' },
      { id: 'backup', label: 'النسخ الاحتياطي', icon: '🗄️' },
      { id: 'developer', label: 'المطور', icon: '👨‍💻' }
    ];

    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">إعدادات النظام</h1>
      </div>

      <div class="settings-tabs">
        ${tabs.map(t => `
          <button class="settings-tab ${this.activeTab === t.id ? 'active' : ''}" 
            onclick="Settings.setTab('${t.id}')">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>

      <div id="settings-content" class="settings-content"></div>
    `;

    this.renderContent();
    this.injectStyles();
  },

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  renderContent() {
    switch (this.activeTab) {
      case 'workshop': this.renderWorkshop(); break;
      case 'invoice': this.renderInvoice(); break;
      case 'printer': this.renderPrinter(); break;
      case 'costing': this.renderCosting(); break;
      case 'backup': this.renderBackup(); break;
      case 'developer': this.renderDeveloper(); break;
    }
  },

  /** 1. بيانات الورشة */
  renderWorkshop() {
    const settings = DB.getSettings();
    const container = document.getElementById('settings-content');

    container.innerHTML = `
      <div class="set-card">
        <h3 class="set-card-title">🏢 بيانات الورشة</h3>
        <div class="set-form">
          <div class="set-field">
            <label>اسم الورشة</label>
            <input type="text" id="set-name" value="${Utils.esc(settings.companyName || '')}" placeholder="ورشة إبراهيم للتصنيع">
          </div>
          <div class="set-grid-2">
            <div class="set-field">
              <label>رقم الهاتف</label>
              <input type="text" id="set-phone" value="${Utils.esc(settings.companyPhone || '')}" placeholder="+967 7XX XXX XXX">
            </div>
            <div class="set-field">
              <label>العملة الافتراضية</label>
              <select id="set-currency">
                <option value="YER" ${settings.currency === 'YER' ? 'selected' : ''}>ريال يمني (YER)</option>
                <option value="SAR" ${settings.currency === 'SAR' ? 'selected' : ''}>ريال سعودي (SAR)</option>
                <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>
          <div class="set-field">
            <label>العنوان</label>
            <input type="text" id="set-address" value="${Utils.esc(settings.companyAddress || '')}" placeholder="صنعاء - اليمن">
          </div>
          <button class="set-btn-primary" onclick="Settings.saveWorkshop()">💾 حفظ البيانات</button>
        </div>
      </div>
    `;
  },

  saveWorkshop() {
    if (!Auth.require('settings.manage', 'إدارة الإعدادات')) return;
    DB.saveSettings({
      companyName: document.getElementById('set-name').value.trim(),
      companyPhone: document.getElementById('set-phone').value.trim(),
      companyAddress: document.getElementById('set-address').value.trim(),
      currency: document.getElementById('set-currency').value
    });
    UI.toast('✅ تم حفظ بيانات الورشة', 'success');
  },

  /** 2. الفواتير */
  renderInvoice() {
    const settings = DB.getSettings();
    const container = document.getElementById('settings-content');

    container.innerHTML = `
      <div class="set-card">
        <h3 class="set-card-title">🧾 إعدادات الفواتير</h3>
        
        <div class="set-field">
          <label>شعار الورشة</label>
          <div class="logo-upload-wrapper">
            <div id="logo-preview" class="logo-preview">
              ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="width:100%; height:100%; object-fit:contain;">` : '<span style="font-size:32px;">🏢</span>'}
            </div>
            <div class="logo-upload-actions">
              <label class="set-btn-secondary">
                📤 رفع شعار
                <input type="file" accept="image/*" style="display:none;" onchange="Settings.uploadLogo(event)">
              </label>
              ${settings.companyLogo ? `<button class="set-btn-danger" onclick="Settings.removeLogo()">🗑️ حذف</button>` : ''}
            </div>
          </div>
        </div>

        <div class="set-field">
          <label>لون الفواتير والسندات</label>
          <div class="color-grid">
            ${[
              { id: 'orange', name: 'برتقالي', c1: '#ea580c', c2: '#f59e0b' },
              { id: 'blue', name: 'أزرق', c1: '#1e40af', c2: '#3b82f6' },
              { id: 'green', name: 'أخضر', c1: '#15803d', c2: '#10b981' },
              { id: 'dark', name: 'داكن', c1: '#0f172a', c2: '#334155' }
            ].map(c => `
              <div class="color-option ${(settings.invoiceColor || 'orange') === c.id ? 'selected' : ''}" 
                onclick="Settings.selectInvoiceColor('${c.id}')">
                <div class="color-circle" style="background: linear-gradient(135deg, ${c.c1}, ${c.c2});"></div>
                <span>${c.name}</span>
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="set-invoiceColor" value="${settings.invoiceColor || 'orange'}">
        </div>

        <button class="set-btn-primary" onclick="Settings.saveInvoiceSettings()">💾 حفظ إعدادات الفواتير</button>
      </div>
    `;
  },

  uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      UI.toast('⚠️ حجم الشعار كبير (الحد 300KB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      DB.saveSettings({ companyLogo: e.target.result });
      const preview = document.getElementById('logo-preview');
      if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
      UI.toast('✅ تم رفع الشعار', 'success');
    };
    reader.readAsDataURL(file);
  },

  removeLogo() {
    DB.saveSettings({ companyLogo: '' });
    this.render();
    UI.toast('✅ تم حذف الشعار', 'success');
  },

  selectInvoiceColor(colorId) {
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('set-invoiceColor').value = colorId;
  },

  saveInvoiceSettings() {
    if (!Auth.require('settings.manage', 'إدارة الإعدادات')) return;
    DB.saveSettings({ invoiceColor: document.getElementById('set-invoiceColor').value });
    UI.toast('✅ تم حفظ إعدادات الفواتير', 'success');
  },

  /** 3. الطباعة */
  renderPrinter() {
    const settings = DB.getSettings();
    const container = document.getElementById('settings-content');
    const currentSize = settings.printSize || 'A4';

    container.innerHTML = `
      <div class="set-card">
        <h3 class="set-card-title">🖨️ إعدادات الطباعة</h3>
        
        <div class="set-field">
          <label>حجم الورق الافتراضي</label>
          <div class="print-size-grid">
            ${[
              { id: 'A4', name: 'A4', desc: 'ورق عادي', icon: '📄' },
              { id: '80mm', name: '80mm', desc: 'حراري كبير', icon: '🧾' },
              { id: '58mm', name: '58mm', desc: 'حراري صغير', icon: '🧾' }
            ].map(s => `
              <div class="print-size-option ${currentSize === s.id ? 'selected' : ''}" onclick="Settings.selectPrintSize('${s.id}')">
                <div class="ps-icon">${s.icon}</div>
                <div class="ps-name">${s.name}</div>
                <div class="ps-desc">${s.desc}</div>
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="set-printSize" value="${currentSize}">
        </div>

        <button class="set-btn-primary" onclick="Settings.savePrinterSettings()">💾 حفظ إعدادات الطباعة</button>
      </div>
    `;
  },

  selectPrintSize(size) {
    document.querySelectorAll('.print-size-option').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('set-printSize').value = size;
  },

  savePrinterSettings() {
    if (!Auth.require('settings.manage', 'إدارة الإعدادات')) return;
    DB.saveSettings({ printSize: document.getElementById('set-printSize').value });
    UI.toast('✅ تم حفظ إعدادات الطباعة', 'success');
  },

  /** 4. التكاليف (الميزة الجديدة) */
  renderCosting() {
    const settings = DB.getSettings();
    const container = document.getElementById('settings-content');

    container.innerHTML = `
      <div class="set-card">
        <h3 class="set-card-title">💰 إعدادات التكاليف التلقائية</h3>
        
        <div class="info-box">
          ⓘ هذه الإعدادات تُستخدم لحساب تكلفة المنتج النهائية تلقائياً في حاسبة التكاليف.
        </div>

        <div class="set-grid-2">
          <div class="set-field">
            <label>سعر ساعة العامل</label>
            <input type="number" id="set-labor" value="${settings.laborHourPrice || 1500}">
          </div>
          <div class="set-field">
            <label>هامش الربح الافتراضي (%)</label>
            <input type="number" id="set-margin" value="${settings.profitMargin || 25}">
          </div>
        </div>

        <div class="set-grid-2">
          <div class="set-field">
            <label>نسبة الهدر الافتراضية (%)</label>
            <input type="number" id="set-waste" value="${settings.wastePercent || 8}" min="0" max="100">
            <small style="color:var(--text-muted); font-size:10px;">تُضاف تلقائياً لتكلفة المواد</small>
          </div>
          <div class="set-field">
            <label>سعر الكهرباء (لكل كيلوواط)</label>
            <input type="number" id="set-electric" value="${settings.electricityPrice || 250}">
            <small style="color:var(--text-muted); font-size:10px;">تُحسب لكل ساعة تشغيل ماكينة</small>
          </div>
        </div>

        <div class="set-grid-2">
          <div class="set-field">
            <label>تكلفة النقل والتركيب الافتراضية</label>
            <input type="number" id="set-transport" value="${settings.defaultTransport || 0}">
          </div>
          <div class="set-field">
            <label>نسبة تالف المواد (%)</label>
            <input type="number" id="set-damage" value="${settings.damagePercent || 2}" min="0" max="100">
          </div>
        </div>

        <button class="set-btn-primary" onclick="Settings.saveCosting()">💾 حفظ إعدادات التكاليف</button>
      </div>
    `;
  },

  saveCosting() {
    if (!Auth.require('settings.manage', 'إدارة الإعدادات')) return;
    DB.saveSettings({
      laborHourPrice: Number(document.getElementById('set-labor').value) || 1500,
      profitMargin: Number(document.getElementById('set-margin').value) || 25,
      wastePercent: Number(document.getElementById('set-waste').value) || 8,
      electricityPrice: Number(document.getElementById('set-electric').value) || 250,
      defaultTransport: Number(document.getElementById('set-transport').value) || 0,
      damagePercent: Number(document.getElementById('set-damage').value) || 2
    });
    UI.toast('✅ تم حفظ إعدادات التكاليف', 'success');
  },

  /** 5. النسخ الاحتياطي */
  renderBackup() {
    const container = document.getElementById('settings-content');
    const allData = DB.exportAll();
    const dataSize = new Blob([JSON.stringify(allData)]).size;
    const sizeKB = (dataSize / 1024).toFixed(1);

    // عدّ السجلات
    const projects = (DB.get('projects') || []).length;
    const invoices = (DB.get('invoices') || []).length;
    const materials = (DB.get('materials') || []).length;
    const vouchers = (DB.get('vouchers') || []).length;

    container.innerHTML = `
      <div class="set-card">
        <h3 class="set-card-title">🗄️ النسخ الاحتياطي والاستعادة</h3>
        
        <div class="stats-grid-mini">
          <div class="stat-mini stat-blue"><b>${projects}</b><span>مشاريع</span></div>
          <div class="stat-mini stat-green"><b>${invoices}</b><span>فواتير</span></div>
          <div class="stat-mini stat-amber"><b>${materials}</b><span>مواد</span></div>
          <div class="stat-mini stat-purple"><b>${vouchers}</b><span>سندات</span></div>
        </div>

        <div class="backup-size-box">
          <div>
            <div style="font-weight:700; font-size:13px;">حجم البيانات الحالي</div>
            <div style="font-size:11px; color:var(--text-muted);">حجم قاعدة البيانات المحلية</div>
          </div>
          <b style="font-size:22px; color:var(--primary);">${sizeKB} KB</b>
        </div>

        <div class="backup-actions">
          <button class="set-btn-secondary backup-btn" onclick="Settings.exportData()">
            <div style="font-size:32px; margin-bottom:6px;">⬇️</div>
            <b>تصدير البيانات</b>
            <small>حفظ نسخة احتياطية</small>
          </button>
          <label class="set-btn-secondary backup-btn">
            <div style="font-size:32px; margin-bottom:6px;">⬆️</div>
            <b>استعادة من ملف</b>
            <small>استرجاع البيانات</small>
            <input type="file" accept=".json" style="display:none;" onchange="Settings.importData(event)">
          </label>
        </div>

        <div class="danger-zone">
          <h4 style="color:var(--danger); font-size:13px; font-weight:800; margin-bottom:8px;">⚠️ منطقة الخطر</h4>
          <button class="set-btn-danger" style="width:100%; padding:14px;" onclick="Settings.resetSystem()">
            🗑️ إعادة تعيين النظام (حذف جميع البيانات)
          </button>
        </div>
      </div>
    `;
  },

  exportData() {
    const data = DB.exportAll();
    const filename = `IBRA-ERP-Backup-${Utils.today()}.json`;
    Utils.download(filename, JSON.stringify(data, null, 2), 'application/json');
    UI.toast('✅ تم تصدير النسخة الاحتياطية', 'success');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('⚠️ سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        DB.importAll(JSON.parse(e.target.result));
        UI.toast('✅ تم الاستيراد. جاري إعادة التحميل...', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        UI.toast('❌ فشل الاستيراد', 'error');
      }
    };
    reader.readAsText(file);
  },

  resetSystem() {
    if (!confirm('⚠️ سيتم حذف جميع البيانات نهائياً. متأكد؟')) return;
    if (!confirm('تأكيد نهائي؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    DB.wipe();
    UI.toast('✅ تم إعادة التعيين', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  /** 6. المطور */
  renderDeveloper() {
    const container = document.getElementById('settings-content');
    const sys = DB.getSettings();

    const dev = {
      nameAr: 'م/ إبراهيم الحمادي',
      nameEn: 'Eng. Ibrahim Al-Hammadi',
      title: 'Software Developer & Cybersecurity',
      orgAr: 'IBRA Soft',
      orgEn: 'IBRA Soft ERP',
      services: ['تطوير تطبيقات', 'برمجيات', 'أنظمة شبكات', 'أمن سيبراني'],
      phones: [
        { label: 'Phone 1', number: '+967 736 574 726' },
        { label: 'Phone 2', number: '+967 781 458 044' }
      ],
      copyrightYear: '2026'
    };

    container.innerHTML = `
      <div class="dev-card">
        <div class="dev-header">
          <div class="dev-logo-box">
            <div class="dev-logo-inner">
              <span style="font-size:16px; font-weight:900;">IBRA</span>
              <span style="font-size:8px; color:var(--warning); letter-spacing:2px;">SOFT</span>
            </div>
          </div>
          <div class="dev-badge">IBRA SOFT ERP ⚙️</div>
        </div>
        
        <div class="dev-body">
          <div>
            <div class="dev-label">👨‍💻 المطور</div>
            <div class="dev-name-ar">${dev.nameAr}</div>
            <div class="dev-name-en">${dev.nameEn}</div>
            <div class="dev-title">${dev.title}</div>
          </div>
          
          <div>
            <div class="dev-label">🏢 المؤسسة</div>
            <div class="dev-org-ar">${dev.orgAr}</div>
            <div class="dev-org-en">${dev.orgEn}</div>
          </div>
          
          <div class="dev-services">
            ${dev.services.map(s => `<span class="dev-service-tag">${s}</span>`).join('')}
          </div>
        </div>
        
        <div class="dev-contact">
          <div class="dev-contact-title">📞 التواصل مع المطور</div>
          ${dev.phones.map(p => `
            <div class="dev-phone-box">
              <div class="dev-phone-num" dir="ltr">${p.number}</div>
              <div class="dev-actions">
                <button onclick="window.location.href='tel:${p.number.replace(/\s/g, '')}'" class="dev-btn dev-call">📞 اتصال</button>
                <button onclick="window.open('https://wa.me/${p.number.replace(/[\+\s]/g, '')}', '_blank')" class="dev-btn dev-wa">💬 واتساب</button>
                <button onclick="Settings.copyPhone('${p.number}')" class="dev-btn dev-copy">📋 نسخ</button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="dev-footer">
          © ${dev.copyrightYear} IBRA Soft — جميع الحقوق محفوظة
        </div>
      </div>
    `;
  },

  copyPhone(num) {
    navigator.clipboard.writeText(num).then(() => {
      UI.toast('✅ تم نسخ الرقم', 'success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = num;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      UI.toast('✅ تم نسخ الرقم', 'success');
    });
  },

  injectStyles() {
    if (document.getElementById('settings-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'settings-styles-v3';
    style.innerHTML = `
      .settings-tabs {
        display: flex; gap: 6px; margin-bottom: 16px;
        overflow-x: auto; padding-bottom: 4px;
      }
      .settings-tab {
        padding: 10px 16px; background: #fff;
        border: 1px solid var(--border); border-radius: 20px;
        font-size: 12px; font-weight: 700; color: var(--text-muted);
        cursor: pointer; font-family: inherit; white-space: nowrap;
        transition: all 0.2s;
      }
      .settings-tab.active {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff; border-color: transparent;
      }
      
      .set-card {
        background: #fff; border-radius: 20px;
        padding: 20px; border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      .set-card-title {
        font-size: 16px; font-weight: 800;
        color: var(--text); margin-bottom: 18px;
      }
      
      .set-form { display: grid; gap: 14px; }
      .set-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-muted); margin-bottom: 6px;
      }
      .set-field input, .set-field select {
        width: 100%; padding: 11px 14px;
        border: 1px solid var(--border); border-radius: 10px;
        font-size: 14px; font-family: inherit;
        background: #fff; outline: none; box-sizing: border-box;
      }
      .set-field input:focus, .set-field select:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
      }
      .set-field small {
        display: block; font-size: 10px;
        color: var(--text-muted); margin-top: 4px;
      }
      
      .set-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      
      .set-btn-primary {
        width: 100%; padding: 14px;
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; font-family: inherit; margin-top: 6px;
      }
      .set-btn-secondary {
        display: inline-block; padding: 10px 16px;
        background: #f1f5f9; color: var(--text);
        border: 1px solid var(--border); border-radius: 10px;
        font-size: 12px; font-weight: 700;
        cursor: pointer; font-family: inherit; text-align: center;
      }
      .set-btn-danger {
        padding: 10px 16px; background: #fee2e2;
        color: #991b1b; border: 1px solid #fecaca;
        border-radius: 10px; font-size: 12px;
        font-weight: 700; cursor: pointer; font-family: inherit;
      }
      
      /* الشعار */
      .logo-upload-wrapper {
        display: flex; gap: 14px; align-items: center;
      }
      .logo-preview {
        width: 100px; height: 100px;
        background: var(--bg); border: 2px dashed var(--border);
        border-radius: 14px; display: flex;
        align-items: center; justify-content: center;
        overflow: hidden; flex-shrink: 0;
      }
      .logo-upload-actions {
        display: flex; flex-direction: column; gap: 8px;
      }
      
      /* الألوان */
      .color-grid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
      }
      .color-option {
        padding: 12px; background: #fff;
        border: 2px solid var(--border); border-radius: 12px;
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; font-size: 12px;
        font-weight: 700; transition: all 0.2s;
      }
      .color-option.selected {
        border-color: var(--primary);
        background: rgba(37,99,235,0.05);
      }
      .color-circle {
        width: 28px; height: 28px;
        border-radius: 50%;
      }
      
      /* الطباعة */
      .print-size-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 10px; margin-bottom: 6px;
      }
      .print-size-option {
        padding: 16px 8px; background: #fff;
        border: 2px solid var(--border); border-radius: 12px;
        text-align: center; cursor: pointer;
        transition: all 0.2s;
      }
      .print-size-option.selected {
        border-color: var(--primary);
        background: rgba(37,99,235,0.05);
      }
      .ps-icon { font-size: 26px; margin-bottom: 4px; }
      .ps-name { font-size: 13px; font-weight: 800; color: var(--text); }
      .ps-desc { font-size: 10px; color: var(--text-muted); }
      
      /* Info Box */
      .info-box {
        background: #eff6ff; border: 1px solid #bfdbfe;
        border-radius: 10px; padding: 12px 14px;
        font-size: 12px; color: #1e40af; margin-bottom: 14px;
        line-height: 1.6;
      }
      
      /* Backup */
      .stats-grid-mini {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 8px; margin-bottom: 14px;
      }
      .stat-mini {
        padding: 12px 8px; border-radius: 10px;
        text-align: center;
      }
      .stat-mini b { display: block; font-size: 18px; font-weight: 800; }
      .stat-mini span { font-size: 10px; font-weight: 600; }
      .stat-blue { background: #dbeafe; color: #1e40af; }
      .stat-green { background: #dcfce7; color: #166534; }
      .stat-amber { background: #fef3c7; color: #92400e; }
      .stat-purple { background: #e9d5ff; color: #6b21a8; }
      
      .backup-size-box {
        background: #f8fafc; border: 1px solid var(--border);
        border-radius: 12px; padding: 14px;
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 14px;
      }
      
      .backup-actions {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 10px; margin-bottom: 16px;
      }
      .backup-btn {
        padding: 16px 12px; display: flex;
        flex-direction: column; align-items: center;
        text-align: center; cursor: pointer;
        border-radius: 12px; border: 2px solid var(--border);
        background: #fff; transition: all 0.2s;
      }
      .backup-btn:hover { border-color: var(--primary); }
      .backup-btn b { font-size: 13px; margin-bottom: 2px; color: var(--text); }
      .backup-btn small { font-size: 10px; color: var(--text-muted); }
      
      .danger-zone {
        border-top: 1px solid #fecaca; padding-top: 14px;
      }
      
      /* Developer Card */
      .dev-card {
        background: #fff; border-radius: 20px;
        overflow: hidden; border: 1px solid var(--border);
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      }
      .dev-header {
        background: linear-gradient(135deg, #0f172a, #1e40af);
        height: 100px; position: relative;
        padding: 16px;
      }
      .dev-logo-box {
        position: absolute; bottom: -30px; right: 20px;
        width: 70px; height: 70px; background: #fff;
        border-radius: 16px; padding: 3px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      }
      .dev-logo-inner {
        width: 100%; height: 100%;
        background: #0f172a; border-radius: 12px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        color: #fff;
      }
      .dev-badge {
        position: absolute; bottom: 12px; left: 16px;
        color: rgba(255,255,255,0.85);
        font-size: 11px; font-weight: 700;
      }
      .dev-body {
        padding: 40px 20px 20px;
        display: grid; gap: 14px;
      }
      .dev-label {
        font-size: 11px; color: var(--text-light);
        font-weight: 700; margin-bottom: 3px;
      }
      .dev-name-ar { font-size: 18px; font-weight: 800; color: var(--text); }
      .dev-name-en { font-size: 12px; color: var(--text-muted); }
      .dev-title { font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px; }
      .dev-org-ar { font-size: 14px; font-weight: 700; color: var(--text); }
      .dev-org-en { font-size: 11px; color: var(--text-muted); }
      .dev-services {
        display: flex; flex-wrap: wrap; gap: 6px;
      }
      .dev-service-tag {
        background: #f1f5f9; color: #475569;
        padding: 4px 10px; border-radius: 10px;
        font-size: 11px; font-weight: 600;
      }
      .dev-contact {
        background: #f8fafc; padding: 14px 20px;
        border-top: 1px solid var(--border);
      }
      .dev-contact-title {
        font-size: 13px; font-weight: 800;
        margin-bottom: 10px;
      }
      .dev-phone-box {
        background: #fff; border: 1px solid var(--border);
        border-radius: 10px; padding: 10px;
        margin-bottom: 8px;
      }
      .dev-phone-num {
        font-weight: 800; font-size: 14px;
        text-align: center; margin-bottom: 8px;
        font-family: monospace;
      }
      .dev-actions { display: flex; gap: 6px; }
      .dev-btn {
        flex: 1; padding: 7px;
        border: none; border-radius: 6px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
      }
      .dev-call { background: #e2e8f0; color: #334155; }
      .dev-wa { background: #dcfce7; color: #166534; }
      .dev-copy { background: #dbeafe; color: #1e40af; }
      .dev-footer {
        background: #f8fafc; padding: 12px;
        text-align: center; font-size: 10px;
        color: var(--text-muted); border-top: 1px solid var(--border);
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Settings v3 loaded');
 