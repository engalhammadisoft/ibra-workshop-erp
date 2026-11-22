/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — التكاليف والتسعير (v3)
   ═══════════════════════════════════════════════════════════════ */

const Costing = {
  render() {
    const content = document.getElementById('content');
    const projects = DB.get('projects') || [];

    // ترتيب المشاريع
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // إحصائيات عامة
    const totalCost = projects.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);
    const totalRevenue = projects.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    let html = `
      <div class="page-header">
        <h1 class="page-title">التكاليف والتسعير</h1>
      </div>

      <!-- البطاقة العلوية -->
      <div class="cost-hero">
        <div class="ch-title">
          <h2>ملخص الأرباح 💰</h2>
          <p>نظرة عامة على التكاليف والأرباح المتوقعة</p>
        </div>
        <div class="ch-stats">
          <div class="chs-item">
            <div class="chs-icon">💸</div>
            <div class="chs-info">
              <div class="chs-label">إجمالي التكاليف</div>
              <div class="chs-value">${Utils.money(totalCost)}</div>
            </div>
          </div>
          <div class="chs-item">
            <div class="chs-icon">💰</div>
            <div class="chs-info">
              <div class="chs-label">إجمالي المبيعات</div>
              <div class="chs-value">${Utils.money(totalRevenue)}</div>
            </div>
          </div>
          <div class="chs-item profit">
            <div class="chs-icon">📈</div>
            <div class="chs-info">
              <div class="chs-label">صافي الربح المتوقع</div>
              <div class="chs-value" style="color: ${totalProfit >= 0 ? '#4ade80' : '#f87171'};">
                ${Utils.money(totalProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- قائمة المشاريع -->
      <div class="cost-list">
        ${projects.length ? projects.map(p => this.renderProjectCost(p)).join('') : `
          <div class="empty-state">
            <div class="icon">💰</div>
            <p>لا توجد مشاريع لحساب تكاليفها.</p>
          </div>
        `}
      </div>
    `;

    content.innerHTML = html;
    this.injectStyles();
  },

  renderProjectCost(p) {
    const cost = Number(p.totalCost) || 0;
    const price = Number(p.totalPrice) || 0;
    const profit = price - cost;
    const isProfitable = profit >= 0;
    const profitColor = isProfitable ? 'success' : 'danger';

    return `
      <div class="cost-card">
        <div class="cc-header">
          <div class="cc-number">${p.projectNumber}</div>
          <div class="cc-status" style="background: var(--${Utils.statusColor(p.status)});">
            ${Utils.statusText(p.status)}
          </div>
        </div>
        
        <div class="cc-body">
          <div class="cc-title">${Utils.esc(p.productName)}</div>
          <div class="cc-customer">👤 ${Utils.esc(p.customerName)}</div>
          
          <div class="cc-financials">
            <div class="cc-fin-item">
              <span>💸 التكلفة</span>
              <b>${Utils.money(cost)}</b>
            </div>
            <div class="cc-fin-item">
              <span>🏷️ البيع</span>
              <b>${Utils.money(price)}</b>
            </div>
            <div class="cc-fin-item profit-${profitColor}">
              <span>📈 الربح</span>
              <b>${Utils.money(profit)}</b>
            </div>
          </div>
        </div>
        
        <div class="cc-footer">
          <button class="cc-btn cc-calc" onclick="Costing.openCalculator('${p.id}')">
            🧮 حاسبة التكلفة
          </button>
        </div>
      </div>
    `;
  },

  openCalculator(projectId) {
  if (!Auth.require('costing.manage', 'إدارة التكاليف')) return;
  const project = DB.find('projects', projectId);
  if (!project) return;

  const settings = DB.getSettings();
  
  // ─── 1. تكلفة المواد الخام ───
  const moves = DB.get('inventory_moves') || [];
  const projectMoves = moves.filter(m => m.projectId === projectId && m.type === 'out');
  const rawMaterialsCost = projectMoves.reduce((sum, m) => sum + (m.qty * (m.unitPrice || 0)), 0);

  // ─── 2. إضافة نسبة الهدر (Waste) ───
  const wastePercent = Number(settings.wastePercent) || 8;
  const wasteCost = rawMaterialsCost * (wastePercent / 100);
  
  // ─── 3. إضافة نسبة التالف (Damage) ───
  const damagePercent = Number(settings.damagePercent) || 2;
  const damageCost = rawMaterialsCost * (damagePercent / 100);
  
  const materialsTotalCost = rawMaterialsCost + wasteCost + damageCost;

  // ─── 4. تكلفة المكائن + الكهرباء ───
  const orders = DB.get('production_orders') || [];
  const machines = DB.get('machines') || [];
  const projectOrders = orders.filter(o => o.projectId === projectId);
  
  let machinesCost = 0;
  let electricityCost = 0;
  const electricityPrice = Number(settings.electricityPrice) || 250; // سعر الكيلوواط
  
  projectOrders.forEach(o => {
    const m = machines.find(x => x.id === o.machineId);
    if (m) {
      const hours = Number(o.totalHours) || 0;
      machinesCost += hours * (Number(m.hourlyCost) || 0);
      // حساب الكهرباء (افتراضياً كل ماكينة تستهلك 5 كيلوواط/ساعة إذا لم تحدد)
      const kwhRate = Number(m.kwhRate) || 5;
      electricityCost += hours * kwhRate * electricityPrice;
    }
  });

  // ─── 5. العمالة ───
  const laborHours = project.laborHours || 0;
  const laborRate = settings.laborHourPrice || 1500;
  const laborCost = laborHours * laborRate;

  // ─── 6. التكاليف الإضافية (نقل + تركيب) ───
  const transportCost = Number(settings.defaultTransport) || 0;
  const extraCost = Number(project.extraCost) || 0;

  // ─── الإجمالي ───
  const totalCost = materialsTotalCost + machinesCost + electricityCost + laborCost + transportCost + extraCost;
  
  // ─── التسعير ───
  const defaultMargin = Number(settings.profitMargin) || 25;
  const suggestedPrice = totalCost + (totalCost * (defaultMargin / 100));
  const currentPrice = project.totalPrice || 0;

  const bodyHtml = `
    <div style="display:grid; gap:14px; max-height:70vh; overflow-y:auto;">
      
      <!-- رأس المشروع -->
      <div style="background:linear-gradient(135deg, #10b981, #047857); padding:14px; border-radius:10px; color:#fff;">
        <div style="font-size:16px; font-weight:800; margin-bottom:2px;">${project.projectNumber}</div>
        <div style="font-size:13px; opacity:0.9;">${Utils.esc(project.productName)} • ${Utils.esc(project.customerName)}</div>
      </div>

      <!-- التفاصيل -->
      <div style="display:grid; gap:6px; font-size:13px;">
        
        <!-- المواد -->
        <div style="display:flex; justify-content:space-between; padding:10px; background:#f8fafc; border-radius:8px;">
          <span>📦 المواد الخام (${projectMoves.length} صنف)</span>
          <b>${Utils.money(rawMaterialsCost)}</b>
        </div>
        
        <!-- الهدر -->
        <div style="display:flex; justify-content:space-between; padding:8px 10px; font-size:12px; color:#b45309;">
          <span>🗑️ الهدر (${wastePercent}%)</span>
          <span>+${Utils.money(wasteCost)}</span>
        </div>
        
        <!-- التالف -->
        <div style="display:flex; justify-content:space-between; padding:8px 10px; font-size:12px; color:#b45309;">
          <span>⚠️ التالف (${damagePercent}%)</span>
          <span>+${Utils.money(damageCost)}</span>
        </div>
        
        <!-- إجمالي المواد -->
        <div style="display:flex; justify-content:space-between; padding:10px; background:#fef3c7; border-radius:8px; font-weight:700; color:#92400e;">
          <span>💰 إجمالي المواد (مع الهدر)</span>
          <b>${Utils.money(materialsTotalCost)}</b>
        </div>
        
        <!-- المكائن -->
        <div style="display:flex; justify-content:space-between; padding:10px; background:#f8fafc; border-radius:8px;">
          <span>⚙️ تشغيل المكائن (${projectOrders.length} أمر)</span>
          <b>${Utils.money(machinesCost)}</b>
        </div>

        <!-- الكهرباء -->
        <div style="display:flex; justify-content:space-between; padding:8px 10px; font-size:12px; color:#92400e;">
          <span>⚡ الكهرباء</span>
          <span>+${Utils.money(electricityCost)}</span>
        </div>

        <!-- العمالة -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f8fafc; border-radius:8px;">
          <span>👷 العمالة:</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="number" id="calcLaborHours" value="${laborHours}" min="0" step="0.5" 
              style="width:60px; padding:6px; border:1px solid var(--border); border-radius:6px; text-align:center; font-weight:700;"
              oninput="Costing.calculateLive('${projectId}')">
            <span style="font-size:11px; color:var(--text-muted);">ساعة</span>
            <b id="liveLaborCost" style="min-width:70px; text-align:left;">${Utils.money(laborCost)}</b>
          </div>
        </div>

        <!-- النقل -->
        <div style="display:flex; justify-content:space-between; padding:10px; background:#f8fafc; border-radius:8px;">
          <span>🚚 نقل وتركيب</span>
          <input type="number" id="calcExtra" value="${extraCost || transportCost}" min="0" 
            style="width:90px; padding:6px; border:1px solid var(--border); border-radius:6px; text-align:center; font-weight:700;"
            oninput="Costing.calculateLive('${projectId}')">
        </div>
      </div>

      <!-- الإجمالي -->
      <div style="background:rgba(220,38,38,0.08); padding:14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(220,38,38,0.2);">
        <span style="font-weight:700; font-size:14px;">💰 التكلفة الإجمالية:</span>
        <b id="liveTotalCost" style="font-size:22px; color:var(--danger);">${Utils.money(totalCost)}</b>
      </div>

      <!-- سعر البيع -->
      <div style="background:rgba(22,163,74,0.08); padding:14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(22,163,74,0.2);">
        <span style="font-weight:700; font-size:14px;">🏷️ سعر البيع:</span>
        <input type="number" id="calcSellPrice" value="${currentPrice || suggestedPrice}" min="0" 
          style="width:140px; padding:8px; border:2px solid var(--success); border-radius:6px; text-align:center; font-size:16px; font-weight:800; background:#fff;"
          oninput="Costing.calculateLive('${projectId}')">
      </div>

      <!-- الربح -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; border-radius:10px; background:#f8fafc; border:2px dashed var(--border);">
        <span style="font-weight:700; font-size:14px;">📈 صافي الربح المتوقع:</span>
        <b id="liveProfit" style="font-size:22px; color:var(--success);">${Utils.money(suggestedPrice - totalCost)}</b>
      </div>

      <div style="font-size:11px; color:var(--text-muted); text-align:center; padding:4px;">
        * التكلفة محسوبة تلقائياً بناءً على الإعدادات (الهدر ${wastePercent}%، التالف ${damagePercent}%).
      </div>
    </div>
  `;

  const actionsHtml = `
    <button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="Costing.save('${projectId}')">💾 حفظ التكلفة</button>
  `;

  UI.openModal('حاسبة تكلفة المشروع', bodyHtml, actionsHtml);
},

calculateLive(projectId) {
  const settings = DB.getSettings();
  const project = DB.find('projects', projectId);
  if (!project) return;

  // 1. المواد + الهدر والتالف
  const moves = DB.get('inventory_moves') || [];
  const rawMaterialsCost = moves.filter(m => m.projectId === projectId && m.type === 'out')
    .reduce((sum, m) => sum + (m.qty * (m.unitPrice || 0)), 0);
  
  const wastePercent = Number(settings.wastePercent) || 8;
  const damagePercent = Number(settings.damagePercent) || 2;
  const materialsTotalCost = rawMaterialsCost * (1 + (wastePercent + damagePercent) / 100);

  // 2. المكائن + الكهرباء
  const orders = DB.get('production_orders') || [];
  const machines = DB.get('machines') || [];
  let machinesCost = 0;
  let electricityCost = 0;
  const electricityPrice = Number(settings.electricityPrice) || 250;
  
  orders.filter(o => o.projectId === projectId).forEach(o => {
    const m = machines.find(x => x.id === o.machineId);
    if (m) {
      const hours = Number(o.totalHours) || 0;
      machinesCost += hours * (Number(m.hourlyCost) || 0);
      electricityCost += hours * (Number(m.kwhRate) || 5) * electricityPrice;
    }
  });

  // 3. العمالة
  const laborHours = Number(document.getElementById('calcLaborHours').value) || 0;
  const laborCost = laborHours * (settings.laborHourPrice || 1500);

  // 4. إضافي
  const extraCost = Number(document.getElementById('calcExtra').value) || 0;
  const sellPrice = Number(document.getElementById('calcSellPrice').value) || 0;

  // 5. الإجمالي والربح
  const totalCost = materialsTotalCost + machinesCost + electricityCost + laborCost + extraCost;
  const profit = sellPrice - totalCost;

  // تحديث
  document.getElementById('liveLaborCost').textContent = Utils.money(laborCost);
  document.getElementById('liveTotalCost').textContent = Utils.money(totalCost);
  
  const profitEl = document.getElementById('liveProfit');
  profitEl.textContent = Utils.money(profit);
  profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
},

save(projectId) {
  const settings = DB.getSettings();
  
  const laborHours = Number(document.getElementById('calcLaborHours').value) || 0;
  const extraCost = Number(document.getElementById('calcExtra').value) || 0;
  const sellPrice = Number(document.getElementById('calcSellPrice').value) || 0;
  const laborRate = settings.laborHourPrice || 1500;

  // المواد
  const moves = DB.get('inventory_moves') || [];
  const rawMaterialsCost = moves.filter(m => m.projectId === projectId && m.type === 'out')
    .reduce((sum, m) => sum + (m.qty * (m.unitPrice || 0)), 0);
  const wastePercent = Number(settings.wastePercent) || 8;
  const damagePercent = Number(settings.damagePercent) || 2;
  const materialsTotalCost = rawMaterialsCost * (1 + (wastePercent + damagePercent) / 100);

  // المكائن
  const orders = DB.get('production_orders') || [];
  const machines = DB.get('machines') || [];
  let machinesCost = 0;
  let electricityCost = 0;
  const electricityPrice = Number(settings.electricityPrice) || 250;
  
  orders.filter(o => o.projectId === projectId).forEach(o => {
    const m = machines.find(x => x.id === o.machineId);
    if (m) {
      const hours = Number(o.totalHours) || 0;
      machinesCost += hours * (Number(m.hourlyCost) || 0);
      electricityCost += hours * (Number(m.kwhRate) || 5) * electricityPrice;
    }
  });

  const laborCost = laborHours * laborRate;
  const totalCost = materialsTotalCost + machinesCost + electricityCost + laborCost + extraCost;

  DB.update('projects', projectId, {
    totalCost: totalCost,
    totalPrice: sellPrice,
    laborHours: laborHours,
    extraCost: extraCost,
    costDetails: {
      rawMaterials: rawMaterialsCost,
      waste: rawMaterialsCost * (wastePercent / 100),
      damage: rawMaterialsCost * (damagePercent / 100),
      materialsTotal: materialsTotalCost,
      machines: machinesCost,
      electricity: electricityCost,
      labor: laborCost,
      extra: extraCost
    }
  });

  UI.closeModal();
  this.render();
  UI.toast('✅ تم حفظ التكلفة تلقائياً', 'success');
},

  injectStyles() {
    if (document.getElementById('cost-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'cost-styles-v3';
    style.innerHTML = `
      .cost-hero {
        background: linear-gradient(135deg, #059669 0%, #065f46 100%);
        border-radius: 24px;
        padding: 22px;
        color: #fff;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(5,150,105,0.3);
        position: relative;
        overflow: hidden;
      }
      .cost-hero::before {
        content: '';
        position: absolute;
        top: -50px; right: -50px;
        width: 250px; height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
      }
      .ch-title { margin-bottom: 16px; position: relative; z-index: 1; }
      .ch-title h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .ch-title p { font-size: 13px; opacity: 0.9; }
      
      .ch-stats {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 8px; position: relative; z-index: 1;
      }
      .chs-item {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 12px;
        display: flex; align-items: center; gap: 10px;
      }
      .chs-item.profit {
        grid-column: span 2;
        background: rgba(255,255,255,0.25);
      }
      .chs-icon { font-size: 24px; }
      .chs-info { flex: 1; }
      .chs-label { font-size: 10px; opacity: 0.9; margin-bottom: 2px; }
      .chs-value { font-size: 16px; font-weight: 800; }
      .chs-item.profit .chs-value { font-size: 22px; }

      .cost-list { display: grid; gap: 12px; }
      
      .cost-card {
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.2s;
      }
      .cost-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      
      .cc-header {
        padding: 12px 16px;
        background: #f8fafc;
        display: flex; justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }
      .cc-number { font-weight: 800; font-size: 13px; color: var(--primary); }
      .cc-status {
        color: #fff; padding: 3px 10px;
        border-radius: 10px; font-size: 10px;
        font-weight: 700;
      }
      
      .cc-body { padding: 14px 16px; }
      .cc-title { font-size: 15px; font-weight: 800; color: var(--text); }
      .cc-customer { font-size: 12px; color: var(--text-muted); margin-top: 2px; margin-bottom: 12px; }
      
      .cc-financials {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .cc-fin-item {
        background: #f8fafc;
        padding: 10px;
        border-radius: 10px;
        text-align: center;
      }
      .cc-fin-item span { font-size: 10px; color: var(--text-muted); display: block; margin-bottom: 2px; }
      .cc-fin-item b { font-size: 13px; font-weight: 800; color: var(--text); }
      .cc-fin-item.profit-success { background: rgba(16,185,129,0.08); }
      .cc-fin-item.profit-success b { color: var(--success); }
      .cc-fin-item.profit-danger { background: rgba(239,68,68,0.08); }
      .cc-fin-item.profit-danger b { color: var(--danger); }
      
      .cc-footer {
        padding: 10px 16px;
        background: #f8fafc;
        border-top: 1px solid var(--border);
      }
      .cc-btn {
        width: 100%; padding: 10px;
        border: none; border-radius: 10px;
        font-size: 13px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .cc-calc {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: #fff;
      }
      .cc-calc:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    `;
    document.head.appendChild(style);
  }
};

console.log('✅ Costing v3 loaded');
