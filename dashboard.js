/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — لوحة التحكم v4 (برتقالي احترافي)
   ═══════════════════════════════════════════════════════════════ */

const Dashboard = {
  render() {
    const content = document.getElementById('content');
    const session = Auth.current();
    const settings = DB.getSettings();

    // ─── جلب البيانات ───
    const projects = DB.get('projects') || [];
    const production = DB.get('production_orders') || [];
    const invoices = DB.get('invoices') || [];
    const materials = DB.get('materials') || [];
    const expenses = DB.get('expenses') || [];
    const payrolls = DB.get('payrolls') || [];
    const machines = DB.get('machines') || [];
    const cashboxes = DB.get('cashboxes') || [];

    // ─── الحسابات ───
    const activeProjects = projects.filter(p => ['draft', 'approved', 'in_progress', 'pending'].includes(p.status));
    const completedProjects = projects.filter(p => ['completed', 'delivered'].includes(p.status));
    const completionRate = projects.length ? Math.round((completedProjects.length / projects.length) * 100) : 0;

    // إجمالي المبيعات المحصلة
    let totalSales = 0;
    invoices.forEach(inv => {
      if (inv.status === 'paid' || inv.status === 'partial') totalSales += Number(inv.paidAmount) || 0;
    });

    // الديون
    let totalDebts = 0;
    invoices.forEach(inv => {
      totalDebts += (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0);
    });

    // الرصيد الإجمالي للصناديق
    const totalCash = this.calculateCashboxesTotal(cashboxes, invoices, expenses);

    // تنبيهات
    const lowStockItems = materials.filter(m => Number(m.stock) <= Number(m.minStock));
    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
    const pendingPayrolls = payrolls.filter(p => p.status !== 'paid');

    // بيانات الرسم البياني
    const last7Days = this.getLast7DaysData(invoices);

    // أحدث المشاريع
    const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

    // ─── بناء HTML ───
    let html = `
      <!-- شريط الترحيب البرتقالي -->
      <div class="welcome-hero-orange">
        <div class="who-content">
          <div class="who-greeting">
            <span class="who-icon">${this.getGreetingIcon()}</span>
            <div>
              <h1>${this.getGreeting()}، ${Utils.esc(session ? session.fullName : 'مستخدم')} 👋</h1>
              <p>${this.getWelcomeMessage()}</p>
            </div>
          </div>
          <div class="who-info">
            <div class="who-date">
              <div class="who-date-day">${this.getArabicDayName()}</div>
              <div class="who-date-full">${Utils.date(new Date())}</div>
            </div>
            <div class="who-cash">
              <div class="who-cash-label">💰 رصيد الصناديق</div>
              <div class="who-cash-value">${Utils.money(totalCash)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- المؤشرات الأربعة -->
      <div class="kpi-grid-orange">
        ${this.kpiCard('📁', activeProjects.length, 'مشاريع نشطة', 'orange', "UI.navigate('projects')")}
        ${this.kpiCard('🏭', production.filter(p => ['pending','in_progress'].includes(p.status)).length, 'أوامر تصنيع', 'amber', "UI.navigate('production')")}
        ${this.kpiCard('💰', Utils.money(totalSales), 'إجمالي المحصل', 'green', "UI.navigate('invoices')")}
        ${this.kpiCard('⚠️', Utils.money(totalDebts), 'ديون معلقة', 'red', "UI.navigate('invoices')")}
      </div>

      <!-- الصف الأوسط: الرسم البياني + مؤشر الأداء -->
      <div class="dashboard-middle-orange">
        
        <!-- الرسم البياني -->
        <div class="card chart-card-orange">
          <div class="chart-header-orange">
            <div>
              <h3>📈 حركة المبيعات</h3>
              <span>آخر 7 أيام</span>
            </div>
            <div class="chart-total-orange">${Utils.money(last7Days.reduce((s, d) => s + d.amount, 0))}</div>
          </div>
          <div class="chart-container-orange">
            ${last7Days.map(d => `
              <div class="chart-bar-item-orange">
                <div class="chart-bar-value-orange">${d.amount > 0 ? Utils.num(d.amount, 0) : ''}</div>
                <div class="chart-bar-track-orange">
                  <div class="chart-bar-fill-orange" style="height: ${d.percent}%"></div>
                </div>
                <div class="chart-bar-label-orange">${d.label}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- مؤشر الأداء -->
        <div class="card performance-card-orange">
          <h3>🎯 مؤشر الأداء</h3>
          <div class="perf-circle-orange">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" class="perf-bg-orange"/>
              <circle cx="60" cy="60" r="50" class="perf-fill-orange" style="stroke-dasharray: ${completionRate * 3.14} 314;"/>
            </svg>
            <div class="perf-text-orange">
              <div class="perf-value-orange">${completionRate}%</div>
              <div class="perf-label-orange">نسبة الاكتمال</div>
            </div>
          </div>
          <div class="perf-details-orange">
            <div class="perf-row-orange">
              <span>✅ مكتملة:</span>
              <b>${completedProjects.length}</b>
            </div>
            <div class="perf-row-orange">
              <span>⏳ نشطة:</span>
              <b>${activeProjects.length}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- التنبيهات -->
      ${this.renderAlerts(lowStockItems, unpaidInvoices, pendingPayrolls)}

      <!-- الوصول السريع -->
      <div class="card">
        <div class="card-header-orange">
          <h3>⚡ الوصول السريع</h3>
          <span class="card-hint-orange">كل ما تحتاجه في مكان واحد</span>
        </div>
        <div class="quick-grid-orange">
          ${this.quickBtn('➕', 'مشروع جديد', 'orange', "UI.navigate('projects')")}
          ${this.quickBtn('🛒', 'نقطة بيع', 'green', "UI.navigate('pos')")}
          ${this.quickBtn('📝', 'عرض سعر', 'amber', "UI.navigate('quotes')")}
          ${this.quickBtn('🧾', 'سندات', 'purple', "UI.navigate('vouchers')")}
          ${this.quickBtn('💰', 'رواتب', 'teal', "Payroll.render()")}
          ${this.quickBtn('📦', 'المخزون', 'red', "UI.navigate('inventory')")}
        </div>
      </div>

      <!-- أحدث المشاريع -->
      <div class="card">
        <div class="card-header-orange">
          <h3>📋 أحدث المشاريع</h3>
          <button class="btn btn-ghost" style="font-size:11px; padding:4px 10px; border-color:var(--warning); color:var(--warning);" onclick="UI.navigate('projects')">عرض الكل ←</button>
        </div>
        ${projects.length ? `
          <div class="projects-list-orange">
            ${recentProjects.map(p => `
              <div class="project-item-orange" onclick="UI.navigate('projects')">
                <div class="project-icon-orange">
                  ${p.productName.charAt(0)}
                </div>
                <div class="project-info-orange">
                  <div class="project-name-orange">${Utils.esc(p.productName)}</div>
                  <div class="project-meta-orange">${p.projectNumber} • ${Utils.esc(p.customerName)}</div>
                </div>
                <div class="project-status-orange status-${p.status}">
                  ${Utils.statusText(p.status)}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `<div class="empty-state" style="padding:30px;"><p>لا توجد مشاريع بعد.</p></div>`}
      </div>

      <!-- بطاقة الورشة -->
      <div class="company-footer-orange">
        <div class="cfo-icon">⚙️</div>
        <div class="cfo-info">
          <h3>${settings.companyName || 'ورشة التصنيع'}</h3>
          <p>${settings.companyPhone || ''} ${settings.companyAddress ? ' • ' + settings.companyAddress : ''}</p>
        </div>
        <div class="cfo-badge">IBRA Soft</div>
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  calculateCashboxesTotal(cashboxes, invoices, expenses) {
    const payments = DB.get('payments') || [];
    const vouchers = DB.get('vouchers') || [];
    
    let total = 0;
    cashboxes.forEach(box => {
      const boxPayments = payments.filter(p => p.cashboxId === box.id || (!p.cashboxId && box.isMain));
      const boxExpenses = expenses.filter(e => e.cashboxId === box.id || (!e.cashboxId && box.isMain));
      const boxVouchers = vouchers.filter(v => v.cashboxId === box.id || (!v.cashboxId && box.isMain));

      let inSum = 0, outSum = 0;
      boxPayments.forEach(p => { if (p.type === 'in') inSum += Number(p.amount) || 0; else outSum += Number(p.amount) || 0; });
      boxExpenses.forEach(e => outSum += Number(e.amount) || 0);
      boxVouchers.forEach(v => { if (v.type === 'receipt') inSum += Number(v.amount) || 0; else outSum += Number(v.amount) || 0; });

      total += (inSum - outSum);
    });
    return total;
  },

  kpiCard(icon, value, label, color, onclick) {
    return `
      <div class="kpi-card-orange kpi-${color}-orange" onclick="${onclick}">
        <div class="kpi-icon-orange">${icon}</div>
        <div class="kpi-content-orange">
          <div class="kpi-value-orange">${value}</div>
          <div class="kpi-label-orange">${label}</div>
        </div>
        <div class="kpi-arrow-orange">›</div>
      </div>
    `;
  },

  quickBtn(icon, label, color, onclick) {
    return `
      <button class="quick-btn-orange quick-${color}-orange" onclick="${onclick}">
        <div class="qb-icon-orange">${icon}</div>
        <div class="qb-label-orange">${label}</div>
      </button>
    `;
  },

  renderAlerts(lowStock, unpaid, payrolls) {
    const total = lowStock.length + unpaid.length + payrolls.length;
    if (total === 0) {
      return `
        <div class="alert-success-orange">
          <div class="as-icon-orange">✨</div>
          <div class="as-text-orange">
            <b>كل شيء ممتاز!</b>
            <span>لا توجد تنبيهات تحتاج لانتباهك</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="card alerts-wrapper-orange">
        <div class="card-header-orange">
          <h3>🔔 تحتاج لانتباهك</h3>
          <span class="alert-count-orange">${total}</span>
        </div>
        <div class="alerts-list-orange">
          ${lowStock.length ? `
            <div class="alert-item-orange alert-red-orange" onclick="UI.navigate('inventory')">
              <div class="ai-icon-orange">📦</div>
              <div class="ai-content-orange">
                <b>${lowStock.length} مادة منخفضة</b>
                <span>يجب إعادة الشراء</span>
              </div>
              <div class="ai-arrow-orange">›</div>
            </div>
          ` : ''}
          ${unpaid.length ? `
            <div class="alert-item-orange alert-amber-orange" onclick="UI.navigate('invoices')">
              <div class="ai-icon-orange">💵</div>
              <div class="ai-content-orange">
                <b>${unpaid.length} فاتورة غير محصلة</b>
                <span>بحاجة لمتابعة</span>
              </div>
              <div class="ai-arrow-orange">›</div>
            </div>
          ` : ''}
          ${payrolls.length ? `
            <div class="alert-item-orange alert-blue-orange" onclick="Payroll.render()">
              <div class="ai-icon-orange">💰</div>
              <div class="ai-content-orange">
                <b>${payrolls.length} راتب معلق</b>
                <span>لم يتم دفعها بعد</span>
              </div>
              <div class="ai-arrow-orange">›</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  getLast7DaysData(invoices) {
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const result = [];
    let max = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(dateStr));
      const amount = dayInvoices.reduce((s, inv) => s + (Number(inv.paidAmount) || 0), 0);
      if (amount > max) max = amount;
      result.push({ label: days[d.getDay()], amount, percent: 0 });
    }

    result.forEach(r => {
      r.percent = max > 0 ? Math.max(8, (r.amount / max) * 100) : 8;
    });

    return result;
  },

  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مساء الخير';
    return 'مساء النور';
  },

  getGreetingIcon() {
    const h = new Date().getHours();
    if (h < 12) return '🌅';
    if (h < 17) return '☀️';
    return '🌙';
  },

  getWelcomeMessage() {
    const messages = [
      'أهلاً بك مجدداً في مركز قيادة الورشة.',
      'نتمنى لك يوماً إنتاجياً موفقاً.',
      'ورشة منظمة = أرباح مضاعفة.',
      'كل شيء تحت السيطرة، ابدأ بثقة.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  },

  getArabicDayName() {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[new Date().getDay()];
  },

  injectStyles() {
    if (document.getElementById('dash-styles-v4')) return;
    const style = document.createElement('style');
    style.id = 'dash-styles-v4';
    style.innerHTML = `
      /* ═══════════════ شريط الترحيب البرتقالي ═══════════════ */
      .welcome-hero-orange {
        background: linear-gradient(135deg, #d97706 0%, #ea580c 50%, #b45309 100%);
        border-radius: 24px;
        padding: 22px;
        color: #fff;
        margin-bottom: 18px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(217,119,6,0.35);
      }
      .welcome-hero-orange::before {
        content: '';
        position: absolute;
        top: -80px; right: -80px;
        width: 280px; height: 280px;
        background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%);
        border-radius: 50%;
      }
      .welcome-hero-orange::after {
        content: '';
        position: absolute;
        bottom: -80px; left: -50px;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(251,191,36,0.3), transparent 70%);
        border-radius: 50%;
      }
      .who-content {
        display: flex; justify-content: space-between;
        align-items: center; gap: 16px;
        position: relative; z-index: 1;
        flex-wrap: wrap;
      }
      .who-greeting { display: flex; align-items: center; gap: 14px; }
      .who-icon { font-size: 42px; }
      .who-greeting h1 { font-size: 19px; font-weight: 800; margin: 0 0 4px; }
      .who-greeting p { font-size: 12px; opacity: 0.9; margin: 0; }
      
      .who-info { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .who-date {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 8px 14px;
        text-align: center;
      }
      .who-date-day { font-size: 11px; opacity: 0.85; }
      .who-date-full { font-size: 13px; font-weight: 700; }
      
      .who-cash {
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 8px 14px;
        text-align: left;
      }
      .who-cash-label { font-size: 10px; opacity: 0.9; }
      .who-cash-value { font-size: 18px; font-weight: 900; margin-top: 2px; }

      /* ═══════════════ المؤشرات ═══════════════ */
      .kpi-grid-orange {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .kpi-card-orange {
        background: #fff;
        border-radius: 16px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.25s;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        position: relative;
      }
      .kpi-card-orange:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(217,119,6,0.15);
        border-color: #f59e0b;
      }
      
      .kpi-icon-orange {
        width: 48px; height: 48px;
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
      }
      .kpi-orange-orange .kpi-icon-orange { background: linear-gradient(135deg, #fef3c7, #fcd34d); }
      .kpi-amber-orange .kpi-icon-orange { background: linear-gradient(135deg, #fed7aa, #fb923c); }
      .kpi-green-orange .kpi-icon-orange { background: linear-gradient(135deg, #bbf7d0, #86efac); }
      .kpi-red-orange .kpi-icon-orange { background: linear-gradient(135deg, #fecaca, #fca5a5); }
      
      .kpi-content-orange { flex: 1; min-width: 0; }
      .kpi-value-orange {
        font-size: 16px; font-weight: 800; color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .kpi-label-orange { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .kpi-arrow-orange { font-size: 18px; color: var(--text-light); }

      /* ═══════════════ الصف الأوسط ═══════════════ */
      .dashboard-middle-orange {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-bottom: 18px;
      }
      @media (min-width: 768px) {
        .dashboard-middle-orange { grid-template-columns: 1.7fr 1fr; }
      }

      .chart-card-orange { margin-bottom: 0; }
      .chart-header-orange {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 16px;
      }
      .chart-header-orange h3 { font-size: 14px; margin: 0; }
      .chart-header-orange span { font-size: 11px; color: var(--text-muted); }
      .chart-total-orange {
        background: linear-gradient(135deg, #ea580c, #d97706);
        color: #fff; padding: 6px 14px; border-radius: 20px;
        font-size: 12px; font-weight: 800;
        box-shadow: 0 4px 10px rgba(234,88,12,0.3);
      }
      .chart-container-orange {
        display: flex; gap: 8px; height: 160px;
        align-items: flex-end; padding-top: 20px;
      }
      .chart-bar-item-orange {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; gap: 4px; height: 100%;
        justify-content: flex-end;
      }
      .chart-bar-value-orange {
        font-size: 9px; color: var(--text-muted);
        font-weight: 700; height: 12px;
      }
      .chart-bar-track-orange {
        flex: 1; width: 100%; max-width: 40px;
        background: #fef3c7;
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }
      .chart-bar-fill-orange {
        position: absolute; bottom: 0;
        width: 100%;
        background: linear-gradient(180deg, #f59e0b, #ea580c);
        border-radius: 8px;
        transition: height 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .chart-bar-label-orange {
        font-size: 10px; color: var(--text-muted);
        font-weight: 600;
      }

      /* مؤشر الأداء */
      .performance-card-orange { margin-bottom: 0; text-align: center; }
      .performance-card-orange h3 { font-size: 14px; margin-bottom: 14px; }
      .perf-circle-orange {
        position: relative;
        width: 150px; height: 150px;
        margin: 0 auto 14px;
      }
      .perf-circle-orange svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .perf-bg-orange { fill: none; stroke: #fef3c7; stroke-width: 12; }
      .perf-fill-orange {
        fill: none; stroke: url(#perfGradient);
        stroke: #ea580c;
        stroke-width: 12; stroke-linecap: round;
        transition: stroke-dasharray 1s;
      }
      .perf-text-orange {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
      }
      .perf-value-orange { font-size: 30px; font-weight: 900; color: #ea580c; }
      .perf-label-orange { font-size: 10px; color: var(--text-muted); }
      .perf-details-orange {
        display: flex; justify-content: space-around;
        padding-top: 12px; border-top: 1px dashed var(--border);
        font-size: 12px;
      }
      .perf-row-orange { display: flex; flex-direction: column; gap: 2px; }
      .perf-row-orange span { color: var(--text-muted); font-size: 11px; }
      .perf-row-orange b { font-size: 15px; color: var(--text); }

      /* ═══════════════ التنبيهات ═══════════════ */
      .alerts-wrapper-orange { border-right: 4px solid #ea580c; }
      .card-header-orange {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 12px;
      }
      .card-header-orange h3 { font-size: 14px; margin: 0; }
      .card-hint-orange { font-size: 11px; color: var(--text-muted); }
      .alert-count-orange {
        background: #ea580c; color: #fff;
        width: 24px; height: 24px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 800;
      }
      .alerts-list-orange { display: grid; gap: 8px; }
      .alert-item-orange {
        display: flex; align-items: center; gap: 12px;
        padding: 12px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .alert-item-orange:hover { transform: translateX(-3px); }
      .alert-red-orange { background: linear-gradient(90deg, #fef2f2, #fff); }
      .alert-amber-orange { background: linear-gradient(90deg, #fffbeb, #fff); }
      .alert-blue-orange { background: linear-gradient(90deg, #eff6ff, #fff); }
      .ai-icon-orange { font-size: 22px; }
      .ai-content-orange { flex: 1; }
      .ai-content-orange b { display: block; font-size: 13px; color: var(--text); }
      .ai-content-orange span { font-size: 11px; color: var(--text-muted); }
      .ai-arrow-orange { font-size: 18px; color: var(--text-light); }
      
      .alert-success-orange {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 1px solid #bbf7d0;
        border-radius: 16px;
        padding: 16px;
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 18px;
      }
      .as-icon-orange { font-size: 28px; }
      .as-text-orange b { display: block; color: #166534; font-size: 14px; }
      .as-text-orange span { font-size: 12px; color: #16a34a; }

      /* ═══════════════ الوصول السريع ═══════════════ */
      .quick-grid-orange {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      @media (min-width: 600px) {
        .quick-grid-orange { grid-template-columns: repeat(6, 1fr); }
      }
      .quick-btn-orange {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px 6px;
        display: flex; flex-direction: column;
        align-items: center; gap: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .quick-btn-orange:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(217,119,6,0.15);
        border-color: #f59e0b;
      }
      .qb-icon-orange {
        width: 40px; height: 40px;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }
      .quick-orange-orange .qb-icon-orange { background: #fef3c7; }
      .quick-green-orange .qb-icon-orange { background: #dcfce7; }
      .quick-amber-orange .qb-icon-orange { background: #fed7aa; }
      .quick-purple-orange .qb-icon-orange { background: #e9d5ff; }
      .quick-teal-orange .qb-icon-orange { background: #ccfbf1; }
      .quick-red-orange .qb-icon-orange { background: #fecaca; }
      .qb-label-orange {
        font-size: 11px; font-weight: 700;
        color: var(--text); text-align: center;
      }

      /* ═══════════════ المشاريع ═══════════════ */
      .projects-list-orange { display: grid; gap: 8px; }
      .project-item-orange {
        display: flex; align-items: center; gap: 12px;
        padding: 12px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .project-item-orange:hover {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      .project-icon-orange {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #fef3c7, #fcd34d);
        color: #92400e;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 800;
        flex-shrink: 0;
      }
      .project-info-orange { flex: 1; min-width: 0; }
      .project-name-orange {
        font-size: 13px; font-weight: 700;
        color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .project-meta-orange { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .project-status-orange {
        padding: 3px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
      }
      .status-draft { background: #fef3c7; color: #92400e; }
      .status-pending { background: #fed7aa; color: #9a3412; }
      .status-approved { background: #dbeafe; color: #1e40af; }
      .status-in_progress { background: #e0e7ff; color: #4338ca; }
      .status-completed { background: #dcfce7; color: #166534; }
      .status-delivered { background: #dcfce7; color: #166534; }
      .status-cancelled { background: #fee2e2; color: #991b1b; }

      /* ═══════════════ بطاقة الورشة ═══════════════ */
      .company-footer-orange {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-radius: 20px;
        padding: 20px;
        display: flex; align-items: center; gap: 14px;
        color: #fff; margin-top: 18px;
        position: relative; overflow: hidden;
        border: 1px solid rgba(217,119,6,0.3);
      }
      .company-footer-orange::before {
        content: '';
        position: absolute;
        top: -50%; left: -10%;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(217,119,6,0.3), transparent 70%);
        border-radius: 50%;
      }
      .cfo-icon {
        font-size: 36px;
        width: 60px; height: 60px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(217,119,6,0.2);
        border-radius: 16px;
        position: relative; z-index: 1;
      }
      .cfo-info { flex: 1; position: relative; z-index: 1; }
      .cfo-info h3 { color: #fff; font-size: 16px; margin: 0 0 4px; }
      .cfo-info p { color: #94a3b8; font-size: 11px; }
      .cfo-badge {
        background: rgba(217,119,6,0.3);
        color: #fbbf24;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        position: relative; z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Dashboard v4 (Orange) loaded');