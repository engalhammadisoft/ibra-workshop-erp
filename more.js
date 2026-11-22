/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — شاشة المزيد / الملف الشخصي
   ═══════════════════════════════════════════════════════════════ */

const MorePage = {
  render() {
    const content = document.getElementById('content');
    const session = Auth.current();
    const settings = DB.getSettings();
    
    if (!session) return;

    const initial = session.fullName ? session.fullName.charAt(0) : 'م';

    let html = `
      <div class="more-page">
        
        <!-- البطاقة الشخصية -->
        <div class="profile-card">
          <div class="profile-avatar">${initial}</div>
          <div class="profile-info">
  <h2>${Utils.esc(session.fullName || 'مستخدم')}</h2>
  <p>${Utils.esc(session.username)}@</p>
  <button class="profile-change-pass" onclick="MorePage.openChangePassword()">
    🔑 تغيير كلمة المرور
  </button>
</div>
        </div>

        <!-- الأزرار السريعة العلوية -->
        <div class="more-quick-actions">
          <button class="more-quick-btn" onclick="UI.navigate('settings')">
            <div class="mq-icon">⚙️</div>
            <div class="mq-label">الإعدادات</div>
          </button>
          <button class="more-quick-btn" onclick="MorePage.showAbout()">
            <div class="mq-icon">ℹ️</div>
            <div class="mq-label">عن التطبيق</div>
          </button>
        </div>

        <!-- الخيارات -->
        <div class="more-list">
          
          <!-- أدوات مساعدة -->
          <div class="more-section-title">أدوات مساعدة</div>
          
          <button class="more-item" onclick="UI.navigate('fraud')">
            <div class="mi-icon" style="background:#fee2e2; color:#dc2626;">🚨</div>
            <div class="mi-text">كاشف الاحتيال</div>
            <div class="mi-arrow">‹</div>
          </button>

          <button class="more-item" onclick="UI.navigate('archive')">
            <div class="mi-icon" style="background:#e2e8f0; color:#334155;">📚</div>
            <div class="mi-text">الأرشيف</div>
            <div class="mi-arrow">‹</div>
          </button>

          <!-- النظام -->
          <div class="more-section-title">النظام</div>

          <button class="more-item" onclick="UI.navigate('notifications')">
            <div class="mi-icon" style="background:#fef3c7; color:#d97706;">🔔</div>
            <div class="mi-text">التنبيهات</div>
            <div class="mi-arrow">‹</div>
          </button>

          <button class="more-item" onclick="UI.navigate('audit')">
            <div class="mi-icon" style="background:#f1f5f9; color:#475569;">📋</div>
            <div class="mi-text">سجل التدقيق</div>
            <div class="mi-arrow">‹</div>
          </button>

          <button class="more-item" onclick="MorePage.showHelp()">
            <div class="mi-icon" style="background:#dbeafe; color:#2563eb;">📖</div>
            <div class="mi-text">دليل الاستخدام</div>
            <div class="mi-arrow">‹</div>
          </button>

          <button class="more-item" onclick="UI.navigate('settings')">
            <div class="mi-icon" style="background:#e2e8f0; color:#475569;">⚙️</div>
            <div class="mi-text">الإعدادات</div>
            <div class="mi-arrow">‹</div>
          </button>

        </div>

        <!-- زر الخروج -->
        <button class="more-logout" onclick="Auth.logout()">
          🚪 تسجيل الخروج
        </button>

        <!-- معلومات النظام في الأسفل -->
        <div class="more-footer">
          <div class="mf-brand">IBRA Soft Workshop ERP</div>
          <div class="mf-version">الإصدار 1.0.0 — v2026.1.0</div>
        </div>

      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

/** فتح نافذة تغيير كلمة المرور */
openChangePassword() {
  const session = Auth.current();
  if (!session) return;

  const bodyHtml = `
    <div class="pass-form">
      <div class="pass-header">
        <div class="pass-icon">🔑</div>
        <div>
          <h2>تغيير كلمة المرور</h2>
          <p>تأمين حسابك بكلمة مرور جديدة</p>
        </div>
      </div>
      
      <div class="pass-body">
        <div class="pass-field">
          <label>كلمة المرور الحالية</label>
          <input type="password" id="oldPass" placeholder="أدخل كلمة المرور الحالية">
        </div>
        <div class="pass-field">
          <label>كلمة المرور الجديدة</label>
          <input type="password" id="newPass" placeholder="4 أحرف على الأقل">
        </div>
        <div class="pass-field">
          <label>تأكيد كلمة المرور</label>
          <input type="password" id="confirmPass" placeholder="أعد كتابة كلمة المرور الجديدة">
        </div>
        <div id="passError" class="pass-error-box"></div>
      </div>
      
      <div class="pass-actions">
        <button class="pass-btn cancel" onclick="UI.closeModal()">إلغاء</button>
        <button class="pass-btn save" onclick="MorePage.savePassword()">💾 حفظ</button>
      </div>
    </div>
  `;

  UI.openModal('', bodyHtml, '');
  document.querySelector('.modal-content h2')?.remove();
  document.querySelector('.modal-content').style.padding = '0';
  
  // التركيز على حقل كلمة المرور القديمة
  setTimeout(() => document.getElementById('oldPass')?.focus(), 200);
},

/** حفظ كلمة المرور الجديدة */
savePassword() {
  const session = Auth.current();
  if (!session) return;

  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  const errorBox = document.getElementById('passError');

  // التحقق من الحقول
  if (!oldPass || !newPass || !confirmPass) {
    errorBox.textContent = '⚠️ املأ جميع الحقول';
    errorBox.classList.add('show');
    return;
  }
  if (newPass.length < 4) {
    errorBox.textContent = '⚠️ كلمة المرور قصيرة جداً (4 أحرف على الأقل)';
    errorBox.classList.add('show');
    return;
  }
  if (newPass !== confirmPass) {
    errorBox.textContent = '⚠️ كلمتا المرور غير متطابقتين';
    errorBox.classList.add('show');
    return;
  }

  // البحث عن المستخدم في جدول employees أو users
  const employees = DB.get('employees') || [];
  let user = employees.find(e => e.id === session.userId);
  let table = 'employees';
  
  if (!user) {
    const users = DB.get('users') || [];
    user = users.find(u => u.id === session.userId);
    table = 'users';
  }

  if (!user) {
    errorBox.textContent = '❌ لم يتم العثور على المستخدم';
    errorBox.classList.add('show');
    return;
  }

  // التحقق من كلمة المرور القديمة
  if (user.password !== oldPass) {
    errorBox.textContent = '❌ كلمة المرور الحالية غير صحيحة';
    errorBox.classList.add('show');
    return;
  }

  // تحديث كلمة المرور
  DB.update(table, session.userId, { password: newPass });

  UI.closeModal();
  UI.toast('✅ تم تغيير كلمة المرور بنجاح', 'success');
},
  showAbout() {
  const devInfo = {
    nameAr: "م/ إبراهيم الحمادي",
    nameEn: "Eng. Ibrahim Al-Hammadi",
    title: "مهندس برمجيات وأمن سيبراني",
    orgAr: "إبراهيم الحمادي",
    orgEn: "IBRA Soft ERP",
    services: ["تطوير تطبيقات", "برمجيات ERP", "أنظمة شبكات", "أمن سيبراني"],
    phones: [
      { label: "Phone 1", number: "+967 736 574 726" },
      { label: "Phone 2", number: "+967 781 458 044" }
    ]
  };

  const body = `
    <div class="about-page">
      <!-- بطاقة المطور -->
      <div class="dev-card-about">
        <div class="dev-card-header">
          <div class="dev-logo-box">
            <div class="dev-logo-inner">
              <span class="dev-logo-en">IBRA</span>
              <span class="dev-logo-ar">SOFT</span>
            </div>
          </div>
          <div class="dev-system-name">IBRA SOFT ERP 💻</div>
        </div>
        
        <div class="dev-card-body">
          <div class="dev-info-section">
            <div class="dev-label">المطور 👨‍💻</div>
            <div class="dev-name-ar">${devInfo.nameAr}</div>
            <div class="dev-name-en">${devInfo.nameEn}</div>
            <div class="dev-title">${devInfo.title}</div>
          </div>

          <div class="dev-org-section">
            <div class="dev-label">المؤسسة 🏢</div>
            <div class="dev-org-ar">${devInfo.orgAr}</div>
            <div class="dev-org-en">${devInfo.orgEn}</div>
          </div>

          <div class="dev-services">
            ${devInfo.services.map(s => `<span class="dev-service-tag">${s}</span>`).join('')}
          </div>
        </div>
      </div>

      <!-- بطاقة التواصل -->
      <div class="about-contact-card">
        <div class="contact-header">
          <span class="contact-title">التواصل 📞</span>
        </div>
        
        ${devInfo.phones.map(p => `
          <div class="contact-item">
            <div class="contact-phone">${p.number}</div>
            <div class="contact-actions">
              <button class="c-btn c-call" onclick="window.location.href='tel:${p.number.replace(/\s/g, '')}'">
                📞 اتصال
              </button>
              <button class="c-btn c-wa" onclick="window.open('https://wa.me/${p.number.replace(/[\+\s]/g, '')}', '_blank')">
                💬 واتساب
              </button>
              <button class="c-btn c-copy" onclick="MorePage.copyText('${p.number}')">
                📋 نسخ
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- بطاقة معلومات النظام -->
      <div class="about-system-card">
        <div class="sys-header">معلومات النظام 📊</div>
        <div class="sys-row">
          <span class="sys-label">اسم النظام:</span>
          <span class="sys-value">IBRA Soft Exchange</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">الإصدار:</span>
          <span class="sys-value">2026.1.0</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">قاعدة البيانات:</span>
          <span class="sys-value">IndexedDB v4</span>
        </div>
      </div>

      <!-- الحقوق -->
      <div class="about-footer">
        <p>جميع الحقوق محفوظة © ${new Date().getFullYear()} م/ إبراهيم الحمادي</p>
        <p style="font-size:10px; color:var(--text-light); margin-top:4px;">IBRA Soft ERP v2026.1.0</p>
      </div>
    </div>
  `;

  // نفتح المودال بحجم أكبر قليلاً
  UI.openModal('', body, '');
  document.querySelector('.modal-content h2')?.remove();
  document.querySelector('.modal-content').style.maxWidth = '500px';
  
  // إضافة تنسيقات خاصة بالشاشة
  this.injectAboutStyles();
},

copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      UI.toast('✅ تم نسخ الرقم', 'success');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    UI.toast('✅ تم نسخ الرقم', 'success');
  }
},

injectAboutStyles() {
  if (document.getElementById('about-styles')) return;
  const style = document.createElement('style');
  style.id = 'about-styles';
  style.innerHTML = `
    .about-page { display: flex; flex-direction: column; gap: 14px; }

    /* بطاقة المطور */
    .dev-card-about {
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border: 1px solid var(--border);
    }
    .dev-card-header {
      height: 80px;
      background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%);
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0 20px;
    }
    .dev-logo-box {
      position: absolute;
      bottom: -40px;
      right: 20px;
      width: 80px;
      height: 80px;
      background: #fff;
      border-radius: 16px;
      padding: 4px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .dev-logo-inner {
      width: 100%; height: 100%;
      background: #0f172a;
      border-radius: 12px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #fff;
    }
    .dev-logo-en { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
    .dev-logo-ar { font-size: 10px; color: #d97706; letter-spacing: 3px; font-weight: 700; }
    .dev-system-name {
      color: rgba(255,255,255,0.8);
      font-size: 11px;
      letter-spacing: 2px;
      font-weight: 600;
    }
    
    .dev-card-body {
      padding: 50px 20px 20px;
      text-align: right;
    }
    .dev-info-section { margin-bottom: 16px; }
    .dev-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
    .dev-name-ar { font-size: 20px; font-weight: 800; color: var(--text); }
    .dev-name-en { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
    .dev-title { font-size: 13px; color: #10b981; font-weight: 600; }

    .dev-org-section { margin-bottom: 16px; }
    .dev-org-ar { font-size: 15px; font-weight: 700; color: var(--text); }
    .dev-org-en { font-size: 12px; color: var(--text-muted); }

    .dev-services {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .dev-service-tag {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    /* بطاقة التواصل */
    .about-contact-card {
      background: #fff;
      border-radius: 20px;
      padding: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .contact-header { margin-bottom: 12px; }
    .contact-title { font-size: 14px; font-weight: 700; color: var(--text); }
    .contact-item {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .contact-item:last-child { margin-bottom: 0; }
    .contact-phone {
      font-size: 16px; font-weight: 800;
      text-align: center; margin-bottom: 8px;
      color: var(--text);
      font-family: monospace;
      direction: ltr;
    }
    .contact-actions { display: flex; gap: 6px; }
    .c-btn {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.2s;
    }
    .c-btn:hover { opacity: 0.8; }
    .c-call { background: #e2e8f0; color: #334155; }
    .c-wa { background: #dcfce7; color: #166534; }
    .c-copy { background: #dbeafe; color: #1e40af; }

    /* بطاقة معلومات النظام */
    .about-system-card {
      background: #fff;
      border-radius: 20px;
      padding: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .sys-header { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    .sys-row {
      display: flex; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px dashed #e2e8f0;
      font-size: 13px;
    }
    .sys-row:last-child { border-bottom: none; }
    .sys-label { color: var(--text-muted); }
    .sys-value { font-weight: 700; color: var(--text); }

    /* التذييل */
    .about-footer {
      text-align: center;
      padding: 10px 0;
      font-size: 12px;
      color: var(--text-secondary);
    }
  `;
  document.head.appendChild(style);
},

  showHelp() {
  const body = `
    <div class="help-container">
      <!-- رأس الدليل -->
      <div class="help-header">
        <div class="hh-icon">📖</div>
        <div>
          <h2>دليل الاستخدام</h2>
          <p>دليلك الشامل لإدارة الورشة</p>
        </div>
      </div>

      <!-- محتوى الدليل -->
      <div class="help-content">
        
        <!-- 1. الرئيسية -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">🏠</span>
            <h3>لوحة التحكم (الرئيسية)</h3>
          </div>
          <ul class="hs-list">
            <li>تعرض لك ملخصاً سريعاً لـ: (المشاريع النشطة، أوامر التصنيع، إجمالي المبيعات، الديون).</li>
            <li>يمكنك من خلالها الانتقال السريع لأي قسم بضغطة زر.</li>
            <li>تُظهر لك التنبيهات العاجلة (نقص المخزون، فواتير غير محصلة).</li>
          </ul>
        </div>

        <!-- 2. المشاريع -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">📁</span>
            <h3>المشاريع والطلبات</h3>
          </div>
          <ul class="hs-list">
            <li>ابدأ بإنشاء <b>مشروع جديد</b> للعميل (تحديد المنتج، المقاسات، الكمية).</li>
            <li>يمكنك <b>اعتماد</b> المشروع ثم <b>بدء التنفيذ</b> ومتابعة نسبة الإنجاز.</li>
            <li>داخل المشروع يمكنك <b>صرف المواد</b> من المخزون (تُحسب تكلفتها تلقائياً).</li>
            <li>أيضاً يمكنك <b>إرفاق ملفات التصميم</b> (DXF, PDF, صور).</li>
          </ul>
        </div>

        <!-- 3. التصنيع -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">🏭</span>
            <h3>أوامر التصنيع والمكائن</h3>
          </div>
          <ul class="hs-list">
            <li>أضف ماكينات الورشة (ليزر، CNC، بلازما...) في قسم <b>المكائن</b>.</li>
            <li>عند بدء التصنيع، أنشئ <b>أمر تصنيع</b> جديد واربطه بالمشروع والماكينة.</li>
            <li>حدد ساعات التشغيل، وسيتم حساب <b>تكلفة الماكينة</b> تلقائياً بناءً على سعر الساعة.</li>
          </ul>
        </div>

        <!-- 4. المخزون -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">📦</span>
            <h3>المخزون والخامات</h3>
          </div>
          <ul class="hs-list">
            <li>أضف المواد الخام (حديد، خشب، دهانات...) مع سعر الوحدة والحد الأدنى.</li>
            <li>النظام ينبهك عندما يصل رصيد المادة للحد الأدنى.</li>
            <li>استخدم زر <b>صرف</b> أو <b>إدخال</b> لحركة المخزون السريعة.</li>
          </ul>
        </div>

        <!-- 5. التكاليف -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">💰</span>
            <h3>التكاليف والتسعير</h3>
          </div>
          <ul class="hs-list">
            <li>اضغط على <b>🧮 حاسبة التكلفة</b> بجانب أي مشروع.</li>
            <li>سيقوم النظام بجمع: (تكلفة المواد المصروفة + تكلفة المكائن + العمالة + التكاليف الإضافية).</li>
            <li>سيقترح عليك سعر بيع بناءً على هامش الربح في الإعدادات، ويمكنك تعديله يدوياً.</li>
          </ul>
        </div>

        <!-- 6. المبيعات -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">🧾</span>
            <h3>المبيعات والفواتير</h3>
          </div>
          <ul class="hs-list">
            <li>أصدر <b>فاتورة</b> من المشروع بعد تحديد سعر البيع.</li>
            <li>يمكنك تسجيل <b>الدفعات</b> (تحصيل) لاحقاً.</li>
            <li>اضغط <b>🖨️ طباعة</b> لطباعة الفاتورة بحجم A4 أو حراري (حسب الإعدادات).</li>
          </ul>
        </div>

        <!-- 7. نقطة البيع -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">🛒</span>
            <h3>نقطة البيع (POS)</h3>
          </div>
          <ul class="hs-list">
            <li>مخصصة للبيع السريع للمنتجات الجاهزة أو استلام الدفعات.</li>
            <li>اختر المنتجات من الشبكة، ثم اضغط <b>الدفع</b> وادخل المبلغ.</li>
            <li>يتم خصم المنتجات من المخزون تلقائياً بعد البيع.</li>
          </ul>
        </div>

        <!-- 8. المحاسبة -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">🧮</span>
            <h3>المحاسبة والخزينة</h3>
          </div>
          <ul class="hs-list">
            <li>تجد فيها <b>رصيد الصندوق</b>، وكل الحركات (سندات قبض، سندات صرف، مصروفات).</li>
            <li>يمكنك تسجيل <b>سندات القبض والصرف</b> وطباعتها.</li>
            <li>تسجيل <b>المصروفات</b> التشغيلية (كهرباء، إيجار، إلخ).</li>
          </ul>
        </div>

        <!-- 9. الموظفون والرواتب -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">👷</span>
            <h3>الموظفون والرواتب</h3>
          </div>
          <ul class="hs-list">
            <li>أضف موظفيك وحدد رواتبهم وأدوارهم (صلاحياتهم).</li>
            <li>اذهب إلى <b>الرواتب</b>، اختر الشهر، واضغط <b>توليد</b>.</li>
            <li>عند الضغط على <b>دفع</b>، يُسجل الراتب في الخزينة ويُطبع إيصال الراتب.</li>
          </ul>
        </div>

        <!-- 10. الإعدادات -->
        <div class="help-section">
          <div class="hs-header">
            <span class="hs-icon">⚙️</span>
            <h3>الإعدادات</h3>
          </div>
          <ul class="hs-list">
            <li>فيها <b>بيانات الورشة</b> (الاسم، الهاتف، الشعار).</li>
            <li><b>إعدادات الطباعة</b> (A4 / 80mm / 58mm) وألوان الفواتير.</li>
            <li><b>النسخ الاحتياطي</b>: احرص على تصدير نسخة أسبوعياً.</li>
          </ul>
        </div>

      </div>
    </div>
  `;

  // نافذة تحتوي على زر طباعة
  UI.openModal('📖 دليل الاستخدام', body, `
    <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
    <button class="btn btn-primary" onclick="MorePage.printHelp()">🖨️ طباعة الدليل</button>
  `);

  this.injectHelpStyles();
},

printHelp() {
  const win = window.open('', '_blank', 'width=800,height=600');
  const settings = DB.getSettings();
  const logo = settings.companyLogo || '';

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>دليل استخدام - IBRA Soft ERP</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; line-height:1.6; }
        .page { background:#fff; max-width:750px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align:center; border-bottom:3px solid #2563eb; padding-bottom:16px; margin-bottom:24px; }
        .logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
        .company-name { font-size:22px; font-weight:800; color:#2563eb; }
        .title { font-size:16px; color:#1e293b; margin-top:4px; }
        .date { font-size:11px; color:#64748b; margin-top:4px; }
        .section { margin-bottom:20px; page-break-inside:avoid; }
        .section-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .section-icon { font-size:20px; }
        .section-header h3 { font-size:15px; color:#1e293b; margin:0; }
        ul { padding-right:20px; }
        li { font-size:12px; color:#475569; margin-bottom:6px; }
        .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; margin-top:30px; }
        .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
        .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
        .btn-p { background:#2563eb; color:#fff; }
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
          ${logo ? `<img src="${logo}" class="logo">` : ''}
          <div class="company-name">${settings.companyName || 'ورشة التصنيع'}</div>
          <div class="title">دليل استخدام نظام IBRA Soft ERP</div>
          <div class="date">${Utils.date(new Date(), true)}</div>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">🏠</span><h3>لوحة التحكم (الرئيسية)</h3></div>
          <ul>
            <li>تعرض لك ملخصاً سريعاً لـ: (المشاريع النشطة، أوامر التصنيع، إجمالي المبيعات، الديون).</li>
            <li>يمكنك من خلالها الانتقال السريع لأي قسم بضغطة زر.</li>
            <li>تُظهر لك التنبيهات العاجلة (نقص المخزون، فواتير غير محصلة).</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">📁</span><h3>المشاريع والطلبات</h3></div>
          <ul>
            <li>ابدأ بإنشاء <b>مشروع جديد</b> للعميل (تحديد المنتج، المقاسات، الكمية).</li>
            <li>يمكنك <b>اعتماد</b> المشروع ثم <b>بدء التنفيذ</b> ومتابعة نسبة الإنجاز.</li>
            <li>داخل المشروع يمكنك <b>صرف المواد</b> من المخزون (تُحسب تكلفتها تلقائياً).</li>
            <li>أيضاً يمكنك <b>إرفاق ملفات التصميم</b> (DXF, PDF, صور).</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">🏭</span><h3>أوامر التصنيع والمكائن</h3></div>
          <ul>
            <li>أضف ماكينات الورشة (ليزر، CNC، بلازما...) في قسم <b>المكائن</b>.</li>
            <li>عند بدء التصنيع، أنشئ <b>أمر تصنيع</b> جديد واربطه بالمشروع والماكينة.</li>
            <li>حدد ساعات التشغيل، وسيتم حساب <b>تكلفة الماكينة</b> تلقائياً بناءً على سعر الساعة.</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">📦</span><h3>المخزون والخامات</h3></div>
          <ul>
            <li>أضف المواد الخام (حديد، خشب، دهانات...) مع سعر الوحدة والحد الأدنى.</li>
            <li>النظام ينبهك عندما يصل رصيد المادة للحد الأدنى.</li>
            <li>استخدم زر <b>صرف</b> أو <b>إدخال</b> لحركة المخزون السريعة.</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">💰</span><h3>التكاليف والتسعير</h3></div>
          <ul>
            <li>اضغط على <b>🧮 حاسبة التكلفة</b> بجانب أي مشروع.</li>
            <li>سيقوم النظام بجمع: (تكلفة المواد المصروفة + تكلفة المكائن + العمالة + التكاليف الإضافية).</li>
            <li>سيقترح عليك سعر بيع بناءً على هامش الربح في الإعدادات، ويمكنك تعديله يدوياً.</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">🧾</span><h3>المبيعات والفواتير</h3></div>
          <ul>
            <li>أصدر <b>فاتورة</b> من المشروع بعد تحديد سعر البيع.</li>
            <li>يمكنك تسجيل <b>الدفعات</b> (تحصيل) لاحقاً.</li>
            <li>اضغط <b>🖨️ طباعة</b> لطباعة الفاتورة بحجم A4 أو حراري (حسب الإعدادات).</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">🛒</span><h3>نقطة البيع (POS)</h3></div>
          <ul>
            <li>مخصصة للبيع السريع للمنتجات الجاهزة أو استلام الدفعات.</li>
            <li>اختر المنتجات من الشبكة، ثم اضغط <b>الدفع</b> وادخل المبلغ.</li>
            <li>يتم خصم المنتجات من المخزون تلقائياً بعد البيع.</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">🧮</span><h3>المحاسبة والخزينة</h3></div>
          <ul>
            <li>تجد فيها <b>رصيد الصندوق</b>، وكل الحركات (سندات قبض، سندات صرف، مصروفات).</li>
            <li>يمكنك تسجيل <b>سندات القبض والصرف</b> وطباعتها.</li>
            <li>تسجيل <b>المصروفات</b> التشغيلية (كهرباء، إيجار، إلخ).</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">👷</span><h3>الموظفون والرواتب</h3></div>
          <ul>
            <li>أضف موظفيك وحدد رواتبهم وأدوارهم (صلاحياتهم).</li>
            <li>اذهب إلى <b>الرواتب</b>، اختر الشهر، واضغط <b>توليد</b>.</li>
            <li>عند الضغط على <b>دفع</b>، يُسجل الراتب في الخزينة ويُطبع إيصال الراتب.</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-header"><span class="section-icon">⚙️</span><h3>الإعدادات</h3></div>
          <ul>
            <li>فيها <b>بيانات الورشة</b> (الاسم، الهاتف، الشعار).</li>
            <li><b>إعدادات الطباعة</b> (A4 / 80mm / 58mm) وألوان الفواتير.</li>
            <li><b>النسخ الاحتياطي</b>: احرص على تصدير نسخة أسبوعياً.</li>
          </ul>
        </div>

        <div class="footer">
          ${settings.companyName || 'ورشة التصنيع'} — تقرير صادر عن IBRA Soft ERP<br>
          للدعم الفني: 736574726+
        </div>
      </div>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
},

injectHelpStyles() {
  if (document.getElementById('help-styles')) return;
  const style = document.createElement('style');
  style.id = 'help-styles';
  style.innerHTML = `
    .help-container { max-height:65vh; overflow-y:auto; }
    .help-header {
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: #fff; padding: 20px; border-radius: 12px;
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .hh-icon { font-size: 40px; }
    .help-header h2 { font-size: 20px; font-weight: 800; margin: 0; }
    .help-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
    
    .help-section {
      background: #fff; border: 1px solid var(--border);
      border-radius: 12px; padding: 14px; margin-bottom: 10px;
      border-right: 4px solid var(--primary);
    }
    .hs-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .hs-icon { font-size: 20px; }
    .hs-header h3 { font-size: 14px; font-weight: 800; color: var(--text); margin: 0; }
    .hs-list { padding-right: 20px; font-size: 12px; color: var(--text-muted); line-height: 1.8; }
  `;
  document.head.appendChild(style);
},
  showToast(msg) {
    UI.toast(msg, 'info');
  },

  injectStyles() {
    if (document.getElementById('more-styles')) return;
    const style = document.createElement('style');
    style.id = 'more-styles';
    style.innerHTML = `
      .more-page {
        max-width: 600px;
        margin: 0 auto;
        padding-bottom: 20px;
      }
      
      /* البطاقة الشخصية */
      .profile-card {
        background: linear-gradient(135deg, #10b981, #047857);
        border-radius: 20px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 25px rgba(16,185,129,0.3);
        position: relative;
        overflow: hidden;
      }
      .profile-card::before {
        content: '';
        position: absolute;
        top: -50%; right: -10%;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .profile-avatar {
        width: 70px; height: 70px;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.4);
        border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-size: 32px; font-weight: 900;
        position: relative; z-index: 1;
      }
      .profile-info { position: relative; z-index: 1; }
      .profile-info h2 { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
      .profile-info p { font-size: 13px; opacity: 0.85; margin: 0; }
      
      /* الأزرار العلوية */
      .more-quick-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 20px;
      }
      .more-quick-btn {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px;
        display: flex; flex-direction: column;
        align-items: center; gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .more-quick-btn:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      }
      .mq-icon { font-size: 24px; }
      .mq-label { font-size: 13px; font-weight: 700; color: var(--text); }
      
      /* القائمة */
      .more-list {
        background: #fff;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid var(--border);
        margin-bottom: 20px;
      }
      .more-section-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        padding: 14px 20px 6px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .more-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 20px;
        background: transparent;
        border: none;
        width: 100%;
        cursor: pointer;
        border-top: 1px solid #f1f5f9;
        transition: background 0.2s;
        font-family: inherit;
        text-align: right;
      }
      .more-item:hover { background: #f8fafc; }
      .mi-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      .mi-text {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
      }
      .mi-arrow {
        font-size: 20px;
        color: var(--text-light);
      }
      
      /* زر الخروج */
      .more-logout {
        width: 100%;
        padding: 16px;
        background: #fee2e2;
        color: #b91c1c;
        border: none;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        font-family: inherit;
        margin-bottom: 20px;
        transition: all 0.2s;
      }
      .more-logout:hover {
        background: #fecaca;
        transform: translateY(-1px);
      }
      /* زر تغيير كلمة المرور في البطاقة الشخصية */
.profile-change-pass {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  font-family: inherit;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}
.profile-change-pass:hover {
  background: rgba(255,255,255,0.3);
}

/* نموذج كلمة المرور */
.pass-form {
  background: #fff; border-radius: 20px; overflow: hidden;
}
.pass-header {
  padding: 20px; background: linear-gradient(135deg, #1e3a8a, #0f172a);
  color: #fff; display: flex; align-items: center; gap: 14px;
}
.pass-icon {
  width: 50px; height: 50px;
  background: rgba(255,255,255,0.15);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
}
.pass-header h2 { font-size: 18px; font-weight: 800; margin: 0; }
.pass-header p { font-size: 12px; opacity: 0.85; margin-top: 2px; }

.pass-body { padding: 20px; display: grid; gap: 14px; }
.pass-field label {
  display: block; font-size: 12px; font-weight: 600;
  color: var(--text-muted); margin-bottom: 6px;
}
.pass-field input {
  width: 100%; padding: 12px 14px;
  border: 1px solid var(--border); border-radius: 10px;
  font-size: 14px; font-family: inherit; background: #fff;
  outline: none; box-sizing: border-box;
  transition: all 0.2s;
}
.pass-field input:focus {
  border-color: #1e3a8a;
  box-shadow: 0 0 0 3px rgba(30,58,138,0.1);
}

.pass-error-box {
  display: none; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #991b1b;
  font-size: 12px; font-weight: 600;
}
.pass-error-box.show { display: block; animation: shake 0.4s; }

.pass-actions {
  padding: 14px 20px; display: flex; gap: 10px;
  background: #f8fafc; border-top: 1px solid var(--border);
}
.pass-btn {
  padding: 12px; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}
.pass-btn.cancel {
  flex: 1; background: #fff; color: var(--text);
  border: 1px solid var(--border);
}
.pass-btn.save {
  flex: 2; background: linear-gradient(135deg, #1e3a8a, #0f172a);
  color: #fff;
}
      
      /* التذييل */
      .more-footer {
        text-align: center;
        padding: 16px 0;
      }
      .mf-brand { font-size: 13px; font-weight: 800; color: var(--text); }
      .mf-version { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ More Page loaded');