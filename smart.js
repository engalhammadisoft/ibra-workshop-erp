/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — الجرد الذكي (v2 - مع فروقات وعجز)
   ═══════════════════════════════════════════════════════════════ */

const Smart = {
  // تخزين الأرصدة الفعلية التي يدخلها المستخدم (مؤقت)
  physicalStock: {},

  render() {
    const content = document.getElementById('content');
    
    const materials = DB.get('materials') || [];
    const moves = DB.get('inventory_moves') || [];
    const projects = DB.get('projects') || [];
    const machines = DB.get('machines') || [];
    const orders = DB.get('production_orders') || [];
    const invoices = DB.get('invoices') || [];
    const cashboxes = DB.get('cashboxes') || [];
    
    // ─── تحليل الاستهلاك ───
    const today = new Date();
    const last30Days = new Date(today - 30 * 24 * 60 * 60 * 1000);
    
    const materialAnalysis = materials.map(m => {
      const uses = moves.filter(mv => 
        mv.materialId === m.id && 
        mv.type === 'out' && 
        new Date(mv.date) >= last30Days
      );
      
      const totalUsed30d = uses.reduce((sum, mv) => sum + (mv.qty || 0), 0);
      const dailyRate = totalUsed30d / 30;
      const daysUntilEmpty = dailyRate > 0 ? Math.floor(m.stock / dailyRate) : 999;
      const suggestedOrder = Math.max(0, Math.ceil((dailyRate * 30) + (m.minStock || 0) - m.stock));
      
      const allUses = moves.filter(mv => mv.materialId === m.id && mv.type === 'out');
      const lastUse = allUses.length ? new Date(Math.max(...allUses.map(u => new Date(u.date).getTime()))) : null;
      const daysSinceLastUse = lastUse ? Math.floor((today - lastUse) / (24 * 60 * 60 * 1000)) : 999;
      
      // الرصيد الفعلي (إذا أدخله المستخدم)
      const physical = this.physicalStock[m.id];
      const diff = physical !== undefined ? physical - m.stock : 0;
      
      let status = 'healthy';
      if (m.stock <= m.minStock) status = 'critical';
      else if (daysUntilEmpty <= 7) status = 'warning';
      else if (daysSinceLastUse > 60) status = 'dead';
      
      return {
        material: m,
        totalUsed30d,
        dailyRate: dailyRate.toFixed(2),
        daysUntilEmpty,
        suggestedOrder,
        status,
        daysSinceLastUse,
        lastUse,
        physical: physical,
        diff: diff
      };
    });
    
    // ─── تحليل المكائن ───
    const last60Days = new Date(today - 60 * 24 * 60 * 60 * 1000);
    const machineAnalysis = machines.map(m => {
      const recent = orders.filter(o => o.machineId === m.id && new Date(o.createdAt) >= last60Days);
      const hours = recent.reduce((sum, o) => sum + (Number(o.totalHours) || 0), 0);
      return {
        machine: m,
        recentOrders: recent.length,
        recentHours: hours,
        efficiency: hours > 40 ? 'high' : (hours > 10 ? 'medium' : 'low')
      };
    }).sort((a, b) => b.recentHours - a.recentHours);
    
    // ─── الإحصائيات ───
    const completionRate = projects.length > 0 
      ? Math.round((projects.filter(p => ['completed', 'delivered'].includes(p.status)).length / projects.length) * 100)
      : 0;
    
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
    
    const criticalItems = materialAnalysis.filter(x => x.status === 'critical').length;
    const warningItems = materialAnalysis.filter(x => x.status === 'warning').length;
    const deadItems = materialAnalysis.filter(x => x.status === 'dead').length;
    
    let healthScore = 100;
    healthScore -= criticalItems * 15;
    healthScore -= warningItems * 5;
    if (collectionRate < 50) healthScore -= 15;
    if (completionRate < 40) healthScore -= 10;
    healthScore = Math.max(0, healthScore);

    // ─── حساب إحصائيات الفروقات والعجز ───
    let totalShortage = 0;
    let totalSurplus = 0;
    let itemsWithDiff = 0;
    
    materialAnalysis.forEach(a => {
      if (a.physical !== undefined) {
        if (a.diff < 0) { totalShortage += Math.abs(a.diff); itemsWithDiff++; }
        else if (a.diff > 0) { totalSurplus += a.diff; itemsWithDiff++; }
      }
    });
    
    // ─── بناء الواجهة ───
    let html = `
      <div class="page-header">
        <h1 class="page-title">الجرد الذكي 🤖</h1>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-ghost" onclick="Smart.exportData()">📥 تصدير</button>
          <button class="btn btn-primary" onclick="Smart.printReport()">🖨️ طباعة التقرير</button>
          <button class="btn btn-warning" onclick="Smart.openPhysicalCount()">📋 جرد فعلي</button>
        </div>
      </div>

      <!-- بطاقة صحة الورشة (برتقالية) -->
      <div class="health-hero-orange ${healthScore >= 70 ? 'health-good' : healthScore >= 40 ? 'health-mid' : 'health-bad'}">
        <div class="health-circle-orange">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" class="health-bg-orange"/>
            <circle cx="50" cy="50" r="42" class="health-fill-orange" 
              style="stroke-dasharray: ${healthScore * 2.64} 264;"/>
          </svg>
          <div class="health-text-orange">
            <div class="health-value-orange">${healthScore}</div>
            <div class="health-label-orange">/ 100</div>
          </div>
        </div>
        <div class="health-info-orange">
          <h2>${healthScore >= 70 ? '🟢 ورشة ممتازة' : healthScore >= 40 ? '🟡 تحتاج انتباه' : '🔴 حالة حرجة'}</h2>
          <p>تقييم شامل بناءً على ${materials.length} مادة، ${projects.length} مشروع، ${invoices.length} فاتورة</p>
          <div class="health-stats-orange">
            <span>📦 ${materials.length} صنف</span>
            <span>📁 ${projects.length} مشروع</span>
            <span>⚙️ ${machines.length} ماكينة</span>
          </div>
        </div>
      </div>

      <!-- إحصائيات الفروقات والعجز (جديدة) -->
      <div class="diff-stats-grid">
        <div class="diff-stat-card diff-shortage">
          <div class="diff-icon">📉</div>
          <div class="diff-info">
            <div class="diff-label">إجمالي العجز</div>
            <div class="diff-value">${totalShortage} وحدة</div>
          </div>
        </div>
        <div class="diff-stat-card diff-surplus">
          <div class="diff-icon">📈</div>
          <div class="diff-info">
            <div class="diff-label">إجمالي الزيادة</div>
            <div class="diff-value">${totalSurplus} وحدة</div>
          </div>
        </div>
        <div class="diff-stat-card diff-items">
          <div class="diff-icon">📋</div>
          <div class="diff-info">
            <div class="diff-label">أصناف بها فرق</div>
            <div class="diff-value">${itemsWithDiff} صنف</div>
          </div>
        </div>
      </div>

      <!-- التنبيهات الذكية -->
      ${this.renderSmartAlerts(materialAnalysis, collectionRate, completionRate)}

      <!-- جدول تحليل المواد مع الجرد -->
      <div class="card" style="padding:0; overflow:hidden;">
        <div class="smart-header-orange">
          <div>
            <h3>📦 تحليل المواد والجرد</h3>
            <p>توقعات النقص والجرد الفعلي</p>
          </div>
          <div class="smart-legend-orange">
            <span class="legend-item-orange"><span class="legend-dot-orange" style="background:#dc2626;"></span> حرج</span>
            <span class="legend-item-orange"><span class="legend-dot-orange" style="background:#f59e0b;"></span> تحذير</span>
            <span class="legend-item-orange"><span class="legend-dot-orange" style="background:#10b981;"></span> سليم</span>
            <span class="legend-item-orange"><span class="legend-dot-orange" style="background:#64748b;"></span> راكد</span>
          </div>
        </div>
        
        <div class="smart-table-wrapper-orange">
          <table class="smart-table-orange">
            <thead>
              <tr>
                <th>المادة</th>
                <th>الرصيد</th>
                <th>الاستهلاك/شهر</th>
                <th>متوقع النفاذ</th>
                <th>اقتراح الطلب</th>
                <th>الجرد الفعلي</th>
                <th>الفرق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${materialAnalysis.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty).map(a => `
                <tr class="smart-row-${a.status}">
                  <td>
                    <div class="material-name-orange">${Utils.esc(a.material.name)}</div>
                    <div class="material-code-orange">${Utils.esc(a.material.code)}</div>
                  </td>
                  <td><b>${a.material.stock}</b></td>
                  <td>${a.totalUsed30d}</td>
                  <td>
                    ${a.daysUntilEmpty >= 999 ? '—' : 
                      a.daysUntilEmpty <= 0 ? '<span style="color:#dc2626;">نفذ</span>' :
                      a.daysUntilEmpty <= 7 ? `<span style="color:#dc2626;">${a.daysUntilEmpty} يوم</span>` :
                      a.daysUntilEmpty <= 30 ? `<span style="color:#f59e0b;">${a.daysUntilEmpty} يوم</span>` :
                      `<span style="color:#10b981;">${a.daysUntilEmpty} يوم</span>`
                    }
                  </td>
                  <td>
                    ${a.suggestedOrder > 0 
                      ? `<span style="color:#2563eb; font-weight:700;">${a.suggestedOrder} وحدة</span>` 
                      : '—'}
                  </td>
                  <td>
                    <input type="number" class="physical-input" 
                      value="${a.physical !== undefined ? a.physical : ''}" 
                      placeholder="${a.material.stock}"
                      onchange="Smart.updatePhysical('${a.material.id}', this.value)"
                      style="width:70px; padding:4px; text-align:center; border:1px solid var(--border); border-radius:6px;">
                  </td>
                  <td>
                    ${a.physical !== undefined 
                      ? (a.diff === 0 ? '<span style="color:#10b981;">✔ متطابق</span>' :
                         a.diff < 0 ? `<span style="color:#dc2626;">عجز ${Math.abs(a.diff)}</span>` :
                         `<span style="color:#f59e0b;">زيادة ${a.diff}</span>`)
                      : '<span style="color:var(--text-muted);">—</span>'
                    }
                  </td>
                  <td>
                    <span class="smart-badge-orange smart-${a.status}">
                      ${a.status === 'critical' ? '🔴 حرج' :
                        a.status === 'warning' ? '🟡 تحذير' :
                        a.status === 'dead' ? '⚪ راكد' : '🟢 سليم'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        ${itemsWithDiff > 0 ? `
          <div style="padding:14px; background:#fef3c7; border-top:1px solid #fcd34d; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="font-size:12px; color:#92400e;">
              <b>⚠️ تم إدخال ${itemsWithDiff} صنف في الجرد الفعلي</b>
              <div style="font-size:11px;">هل تريد حفظ التعديلات وتحديث الأرصدة؟</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-ghost" style="font-size:12px; padding:8px 14px;" onclick="Smart.clearPhysical()">إلغاء</button>
              <button class="btn" style="font-size:12px; padding:8px 14px; background:#d97706; color:#fff;" onclick="Smart.savePhysicalCount()">💾 حفظ الجرد</button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- تحليل المكائن -->
      <div class="card">
        <div class="smart-header-orange">
          <div>
            <h3>⚙️ أداء المكائن (آخر 60 يوم)</h3>
            <p>ترتيب المكائن حسب الإنتاجية</p>
          </div>
        </div>
        <div class="machine-analysis-orange">
          ${machineAnalysis.map((a, i) => `
            <div class="machine-analysis-item-orange">
              <div class="ma-rank-orange" style="background: ${i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#e2e8f0'}; color: ${i < 3 ? '#fff' : '#475569'};">
                ${i + 1}
              </div>
              <div class="ma-info-orange">
                <div class="ma-name-orange">${Utils.esc(a.machine.name)}</div>
                <div class="ma-code-orange">${Utils.esc(a.machine.code)}</div>
              </div>
              <div class="ma-stats-orange">
                <div><b>${a.recentOrders}</b> أمر</div>
                <div><b>${a.recentHours}</b> ساعة</div>
              </div>
              <div class="ma-eff-orange ma-eff-${a.efficiency}-orange">
                ${a.efficiency === 'high' ? '🔥 ممتاز' :
                  a.efficiency === 'medium' ? '👍 جيد' : '💤 منخفض'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- الرواكد -->
      ${deadItems > 0 ? `
        <div class="card" style="border-right:4px solid #64748b;">
          <div class="smart-header-orange">
            <div>
              <h3>⚪ مواد راكدة (لم تُستخدم منذ 60+ يوم)</h3>
              <p>يمكن بيعها أو استخدامها في مشاريع أخرى</p>
            </div>
          </div>
          <div class="dead-stock-list-orange">
            ${materialAnalysis.filter(a => a.status === 'dead').map(a => `
              <div class="dead-item-orange">
                <div>
                  <b>${Utils.esc(a.material.name)}</b>
                  <span style="font-size:11px; color:var(--text-muted);">• ${a.material.stock} وحدة</span>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">
                  آخر استخدام: ${a.daysSinceLastUse} يوم
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  /** تحديث الرصيد الفعلي للمادة */
  updatePhysical(materialId, value) {
    if (value === '' || value === null) {
      delete this.physicalStock[materialId];
    } else {
      this.physicalStock[materialId] = Number(value) || 0;
    }
    this.render();
  },

  /** مسح كل الجرد الفعلي */
  clearPhysical() {
    if (!confirm('هل تريد إلغاء كل التعديلات؟')) return;
    this.physicalStock = {};
    this.render();
    UI.toast('✅ تم إلغاء الجرد', 'info');
  },

  /** حفظ الجرد الفعلي */
  savePhysicalCount() {
    if (!confirm('هل تريد حفظ الجرد وتحديث أرصدة المواد؟')) return;
    
    const materials = DB.get('materials') || [];
    let updated = 0;
    
    Object.keys(this.physicalStock).forEach(materialId => {
      const material = materials.find(m => m.id === materialId);
      if (material) {
        const newStock = this.physicalStock[materialId];
        const diff = newStock - material.stock;
        
        if (diff !== 0) {
          // تسجيل الحركة
          DB.insert('inventory_moves', {
            materialId,
            materialName: material.name,
            type: diff > 0 ? 'in' : 'out',
            qty: Math.abs(diff),
            unitPrice: material.costPerUnit || 0,
            note: `تسوية جرد (${diff > 0 ? 'زيادة' : 'عجز'})`,
            date: new Date().toISOString(),
            userId: Auth.current().userId
          });
          
          // تحديث المخزون
          DB.update('materials', materialId, { stock: newStock });
          updated++;
        }
      }
    });
    
    this.physicalStock = {};
    this.render();
    UI.toast(`✅ تم تحديث ${updated} صنف`, 'success');
  },

  /** جرد فعلي سريع (نافذة) */
  openPhysicalCount() {
    const materials = DB.get('materials') || [];
    if (!materials.length) { UI.toast('⚠️ لا توجد مواد', 'warning'); return; }
    
    const body = `
      <div style="max-height:60vh; overflow-y:auto; display:grid; gap:8px;">
        ${materials.map(m => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f8fafc; border-radius:8px;">
            <div>
              <div style="font-weight:700; font-size:13px;">${Utils.esc(m.name)}</div>
              <div style="font-size:11px; color:var(--text-muted);">الرصيد: ${m.stock}</div>
            </div>
            <input type="number" value="${this.physicalStock[m.id] !== undefined ? this.physicalStock[m.id] : ''}" 
              placeholder="${m.stock}"
              onchange="Smart.updatePhysical('${m.id}', this.value)"
              style="width:80px; padding:6px; text-align:center; border:1px solid var(--border); border-radius:6px; font-weight:700;">
          </div>
        `).join('')}
      </div>
    `;
    
    UI.openModal('📋 الجرد الفعلي السريع', body, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="UI.closeModal(); Smart.savePhysicalCount()">💾 حفظ الجرد</button>
    `);
  },

  /** تصدير البيانات */
  exportData() {
    const data = DB.exportAll();
    Utils.download(`IBRA-Inventory-${Utils.today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    UI.toast('✅ تم تصدير البيانات', 'success');
  },

  /** طباعة تقرير الجرد */
  printReport() {
    const materials = DB.get('materials') || [];
    const settings = DB.getSettings();
    const logo = settings.companyLogo || '';
    
    const win = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الجرد الذكي</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; padding:20px; direction:rtl; }
          .page { background:#fff; max-width:850px; margin:0 auto; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
          
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #d97706; padding-bottom:16px; margin-bottom:24px; }
          .company-info h1 { font-size:20px; color:#d97706; margin-bottom:4px; font-weight:800; }
          .company-info p { font-size:11px; color:#64748b; }
          .company-logo { width:60px; height:60px; object-fit:contain; margin-bottom:8px; }
          .report-title { text-align:left; }
          .report-title h2 { font-size:22px; color:#1e293b; margin-bottom:4px; }
          .report-title p { font-size:12px; color:#64748b; }
          
          table { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px; }
          thead { background:#d97706; color:#fff; }
          th { padding:10px; text-align:right; font-weight:600; }
          td { padding:10px; border-bottom:1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          .status-critical { color:#dc2626; font-weight:700; }
          .status-warning { color:#f59e0b; font-weight:700; }
          .status-healthy { color:#10b981; font-weight:700; }
          .status-dead { color:#64748b; font-weight:700; }
          .diff-positive { color:#f59e0b; font-weight:700; }
          .diff-negative { color:#dc2626; font-weight:700; }
          
          .footer { text-align:center; font-size:10px; color:#94a3b8; padding-top:20px; border-top:1px solid #e2e8f0; margin-top:20px; }
          .print-actions { position:fixed; top:15px; left:15px; display:flex; gap:8px; z-index:999; }
          .btn { padding:10px 20px; border:none; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
          .btn-p { background:#d97706; color:#fff; }
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
              <p>📞 ${settings.companyPhone || ''}<br>${settings.companyAddress || ''}</p>
            </div>
            <div class="report-title">
              <h2>تقرير الجرد الذكي</h2>
              <p>${Utils.date(new Date(), true)}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>الرصيد</th>
                <th>الاستهلاك/شهر</th>
                <th>متوقع النفاذ</th>
                <th>اقتراح الطلب</th>
                <th>الجرد الفعلي</th>
                <th>الفرق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${materials.map(m => {
                const physical = this.physicalStock[m.id];
                const diff = physical !== undefined ? physical - m.stock : 0;
                return `
                  <tr>
                    <td style="font-weight:700;">${Utils.esc(m.name)}</td>
                    <td>${m.stock}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>${physical !== undefined ? physical : '—'}</td>
                    <td class="${diff < 0 ? 'diff-negative' : diff > 0 ? 'diff-positive' : ''}">
                      ${physical !== undefined ? (diff === 0 ? '✔' : (diff > 0 ? '+' : '') + diff) : '—'}
                    </td>
                    <td class="status-${m.stock <= m.minStock ? 'critical' : 'healthy'}">
                      ${m.stock <= m.minStock ? 'حرج' : 'سليم'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            ${settings.companyName || 'ورشة التصنيع'} — تقرير صادر عن IBRA Soft ERP
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  },

  renderSmartAlerts(materialAnalysis, collectionRate, completionRate) {
    const alerts = [];
    
    const critical = materialAnalysis.filter(a => a.status === 'critical');
    if (critical.length > 0) {
      alerts.push({ type: 'danger', icon: '🚨', title: `${critical.length} مادة نفذت أو على وشك النفاذ`, desc: 'اطلبها الآن', action: () => UI.navigate('inventory') });
    }
    
    const warning = materialAnalysis.filter(a => a.status === 'warning');
    if (warning.length > 0) {
      alerts.push({ type: 'warning', icon: '⚠️', title: `${warning.length} مادة ستنفد خلال أسبوع`, desc: 'ابدأ بإجراءات الشراء', action: () => UI.navigate('inventory') });
    }
    
    if (collectionRate < 70) {
      alerts.push({ type: 'warning', icon: '💵', title: `نسبة التحصيل ${collectionRate}% فقط`, desc: 'تابع الفواتير غير المحصلة', action: () => UI.navigate('invoices') });
    }
    
    if (completionRate < 50) {
      alerts.push({ type: 'info', icon: '📁', title: `نسبة إنجاز المشاريع ${completionRate}%`, desc: 'بعض المشاريع قد تكون متأخرة', action: () => UI.navigate('projects') });
    }
    
    if (alerts.length === 0) {
      return `<div class="smart-alert-success-orange"><div style="font-size:36px;">✨</div><div><b>كل شيء ممتاز!</b><span>لا توجد تنبيهات عاجلة</span></div></div>`;
    }
    
    return `
      <div class="smart-alerts-container-orange">
        ${alerts.map(a => `
          <div class="smart-alert-orange smart-alert-${a.type}-orange" onclick="(${a.action.toString()})()">
            <div class="smart-alert-icon-orange">${a.icon}</div>
            <div class="smart-alert-body-orange">
              <div class="smart-alert-title-orange">${a.title}</div>
              <div class="smart-alert-desc-orange">${a.desc}</div>
            </div>
            <div class="smart-alert-arrow-orange">›</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  injectStyles() {
    if (document.getElementById('smart-styles-v2')) return;
    const style = document.createElement('style');
    style.id = 'smart-styles-v2';
    style.innerHTML = `
      /* بطاقة صحة الورشة */
      .health-hero-orange {
        border-radius: 20px; padding: 20px;
        display: flex; align-items: center; gap: 20px;
        margin-bottom: 16px; color: #fff;
        position: relative; overflow: hidden; flex-wrap: wrap;
      }
      .health-good { background: linear-gradient(135deg, #10b981, #047857); box-shadow: 0 10px 30px rgba(16,185,129,0.3); }
      .health-mid { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 10px 30px rgba(245,158,11,0.3); }
      .health-bad { background: linear-gradient(135deg, #dc2626, #991b1b); box-shadow: 0 10px 30px rgba(220,38,38,0.3); }
      
      .health-circle-orange { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
      .health-circle-orange svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .health-bg-orange { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 8; }
      .health-fill-orange { fill: none; stroke: #fff; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 1s; }
      .health-text-orange { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .health-value-orange { font-size: 30px; font-weight: 900; line-height: 1; }
      .health-label-orange { font-size: 11px; opacity: 0.8; }
      .health-info-orange { flex: 1; min-width: 200px; }
      .health-info-orange h2 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
      .health-info-orange p { font-size: 12px; opacity: 0.9; margin-bottom: 10px; }
      .health-stats-orange { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px; }
      .health-stats-orange span { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 10px; font-weight: 600; }
      
      /* إحصائيات الفروقات */
      .diff-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
      .diff-stat-card { background: #fff; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
      .diff-shortage { border-right: 4px solid #dc2626; }
      .diff-surplus { border-right: 4px solid #f59e0b; }
      .diff-items { border-right: 4px solid #2563eb; }
      .diff-icon { font-size: 26px; }
      .diff-label { font-size: 10px; color: var(--text-muted); }
      .diff-value { font-size: 14px; font-weight: 800; margin-top: 2px; }
      .diff-shortage .diff-value { color: #dc2626; }
      .diff-surplus .diff-value { color: #f59e0b; }
      .diff-items .diff-value { color: #2563eb; }
      
      /* التنبيهات */
      .smart-alerts-container-orange { display: grid; gap: 8px; margin-bottom: 16px; }
      .smart-alert-orange { background: #fff; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; border-right: 4px solid; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
      .smart-alert-orange:hover { transform: translateX(-3px); }
      .smart-alert-danger-orange { border-color: #dc2626; background: linear-gradient(90deg, #fef2f2, #fff); }
      .smart-alert-warning-orange { border-color: #f59e0b; background: linear-gradient(90deg, #fffbeb, #fff); }
      .smart-alert-info-orange { border-color: #2563eb; background: linear-gradient(90deg, #eff6ff, #fff); }
      .smart-alert-icon-orange { font-size: 28px; }
      .smart-alert-body-orange { flex: 1; }
      .smart-alert-title-orange { font-size: 13px; font-weight: 800; color: var(--text); }
      .smart-alert-desc-orange { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .smart-alert-arrow-orange { font-size: 20px; color: var(--text-light); }
      
      .smart-alert-success-orange { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .smart-alert-success-orange b { display: block; font-size: 14px; color: #166534; }
      .smart-alert-success-orange span { font-size: 12px; color: #16a34a; }
      
      /* الجدول */
      .smart-header-orange { padding: 16px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f8fafc; }
      .smart-header-orange h3 { font-size: 14px; font-weight: 800; margin: 0; }
      .smart-header-orange p { font-size: 11px; color: var(--text-muted); margin: 2px 0 0; }
      .smart-legend-orange { display: flex; gap: 10px; flex-wrap: wrap; }
      .legend-item-orange { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); }
      .legend-dot-orange { width: 8px; height: 8px; border-radius: 50%; }
      
      .smart-table-wrapper-orange { overflow-x: auto; }
      .smart-table-orange { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 800px; }
      .smart-table-orange th { padding: 10px; background: #f1f5f9; color: var(--text-muted); text-align: right; font-weight: 700; font-size: 11px; border-bottom: 1px solid var(--border); }
      .smart-table-orange td { padding: 12px 10px; border-bottom: 1px solid var(--border); }
      .material-name-orange { font-weight: 700; color: var(--text); }
      .material-code-orange { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
      .smart-badge-orange { padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .smart-critical { background: #fee2e2; color: #991b1b; }
      .smart-warning { background: #fef3c7; color: #92400e; }
      .smart-healthy { background: #dcfce7; color: #166534; }
      .smart-dead { background: #f1f5f9; color: #475569; }
      
      .physical-input { background: #fff; }
      .physical-input:focus { border-color: #d97706; outline: none; box-shadow: 0 0 0 3px rgba(217,119,6,0.1); }
      
      /* المكائن */
      .machine-analysis-orange { padding: 10px; display: grid; gap: 6px; }
      .machine-analysis-item-orange { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: #f8fafc; }
      .ma-rank-orange { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
      .ma-info-orange { flex: 1; }
      .ma-name-orange { font-size: 13px; font-weight: 700; }
      .ma-code-orange { font-size: 10px; color: var(--text-muted); }
      .ma-stats-orange { display: flex; gap: 12px; font-size: 11px; }
      .ma-stats-orange div { text-align: center; }
      .ma-stats-orange b { display: block; font-size: 14px; color: var(--primary); }
      .ma-eff-orange { padding: 4px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .ma-eff-high-orange { background: #dcfce7; color: #166534; }
      .ma-eff-medium-orange { background: #fef3c7; color: #92400e; }
      .ma-eff-low-orange { background: #f1f5f9; color: #64748b; }
      
      /* الرواكد */
      .dead-stock-list-orange { padding: 10px; }
      .dead-item-orange { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 6px; font-size: 12px; }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Smart Inventory v2 loaded');