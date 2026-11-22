/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — النواة (Core)
   قاعدة البيانات المحلية + دوال مساعدة عامة
   ═══════════════════════════════════════════════════════════════ */

const DB = {
  PREFIX: 'ibra_',
  _cache: {},

  /** تهيئة قاعدة البيانات */
  init() {
    // التأكد من وجود المفاتيح الأساسية
    if (!localStorage.getItem(this.PREFIX + 'settings')) {
      localStorage.setItem(this.PREFIX + 'settings', JSON.stringify({}));
    }
    console.log('✅ DB initialized');
  },

  /** قراءة جدول كامل */
  get(table) {
    const key = this.PREFIX + table;
    if (this._cache[key] !== undefined) return this._cache[key];
    try {
      const raw = localStorage.getItem(key);
      const val = raw ? JSON.parse(raw) : [];
      this._cache[key] = val;
      return val;
    } catch (e) {
      console.error('DB.get error:', table, e);
      return [];
    }
  },

  /** كتابة جدول كامل */
  set(table, data) {
    const key = this.PREFIX + table;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this._cache[key] = data;
      return true;
    } catch (e) {
      console.error('DB.set error:', table, e);
      if (e.name === 'QuotaExceededError') {
        alert('⚠️ مساحة التخزين ممتلئة! احذف بعض البيانات أو الملفات.');
      }
      return false;
    }
  },

  /** إضافة سجل جديد */
  insert(table, row) {
    const list = this.get(table);
    if (!row.id) row.id = this.uid();
    if (!row.createdAt) row.createdAt = new Date().toISOString();
    list.push(row);
    this.set(table, list);
    return row;
  },

  /** تحديث سجل */
  update(table, id, changes) {
    const list = this.get(table);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
    this.set(table, list);
    return list[idx];
  },

  /** حذف سجل */
  remove(table, id) {
    const list = this.get(table);
    const filtered = list.filter(r => r.id !== id);
    this.set(table, filtered);
    return filtered.length !== list.length;
  },

  /** البحث بسجل واحد */
  find(table, id) {
    return this.get(table).find(r => r.id === id) || null;
  },

  /** تصفية */
  filter(table, predicate) {
    return this.get(table).filter(predicate);
  },

  /** تفريغ جدول */
  clear(table) {
    this.set(table, []);
  },

  /** توليد معرّف فريد */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /** إعدادات */
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.PREFIX + 'settings') || '{}');
    } catch { return {}; }
  },

  saveSettings(obj) {
    const current = this.getSettings();
    const merged = { ...current, ...obj };
    localStorage.setItem(this.PREFIX + 'settings', JSON.stringify(merged));
    return merged;
  },

  /** تصدير كل البيانات */
  exportAll() {
    const data = { _version: 1, _date: new Date().toISOString() };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.PREFIX)) {
        const shortKey = key.replace(this.PREFIX, '');
        try { data[shortKey] = JSON.parse(localStorage.getItem(key)); }
        catch { data[shortKey] = localStorage.getItem(key); }
      }
    }
    return data;
  },

  /** استيراد كل البيانات */
  importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('بيانات غير صالحة');
    Object.keys(data).forEach(key => {
      if (key.startsWith('_')) return;
      localStorage.setItem(this.PREFIX + key, JSON.stringify(data[key]));
    });
    this._cache = {};
    return true;
  },

  /** حذف كل شيء */
  wipe() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(this.PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    this._cache = {};
  }
};

/* ═══════════════════════════════════════════════════════════════
   دوال مساعدة عامة
   ═══════════════════════════════════════════════════════════════ */

const Utils = {
  /** تنسيق التاريخ */
  date(iso, withTime = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    let out = `${y}/${m}/${day}`;
    if (withTime) {
      const h = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      out += ` ${h}:${mi}`;
    }
    return out;
  },

  /** تنسيق اليوم */
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  /** تنسيق المبلغ */
  money(amount, currency = null) {
    const settings = DB.getSettings();
    const cur = currency || settings.currency || 'YER';
    const num = Number(amount) || 0;
    const symbols = { YER: 'ر.ي', SAR: 'ر.س', USD: '$' };
    const symbol = symbols[cur] || cur;
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${symbol}`;
  },

  /** تنسيق رقم */
  num(n, decimals = 2) {
    const v = Number(n);
    if (isNaN(v)) return '0';
    return v.toLocaleString('en-US', { maximumFractionDigits: decimals });
  },

  /** تحويل آمن لرقم */
  toNum(v, def = 0) {
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  },

  /** جلب سعر الصرف */
  getRate(currency) {
    const settings = DB.getSettings();
    const base = settings.currency || 'YER';
    if (currency === base) return 1;
    const rates = settings.rates || { YER: 1, SAR: 145, USD: 540 };
    return rates[currency] || 1;
  },

  /** تحويل بين العملات */
  convert(amount, from, to) {
    if (from === to) return amount;
    const rateFrom = this.getRate(from);
    const rateTo = this.getRate(to);
    // كل شيء يُحول إلى العملة الأساسية ثم للعملة الهدف
    const inBase = amount * rateFrom;
    return inBase / rateTo;
  },

  /** تنظيف النص من HTML */
  esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /** جلب قيمة من كائن بأمان */
  get(obj, path, def = '') {
    if (!obj) return def;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || cur[p] === undefined) return def;
      cur = cur[p];
    }
    return cur === null ? def : cur;
  },

  /** إنشاء رقم مستند */
  docNumber(prefix) {
    const settings = DB.getSettings();
    const counter = (settings.counters || {});
    const n = (counter[prefix] || 0) + 1;
    counter[prefix] = n;
    DB.saveSettings({ counters: counter });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
  },

  /** حساب عمر الأيام */
  daysBetween(d1, d2) {
    const a = new Date(d1);
    const b = new Date(d2 || new Date());
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  },

  /** نصوص الحالات */
  statusText(s) {
    const map = {
      draft: 'مسودة',
      pending: 'قيد المراجعة',
      approved: 'معتمد',
      in_progress: 'قيد التنفيذ',
      paused: 'متوقف',
      completed: 'مكتمل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
      paid: 'مدفوع',
      unpaid: 'غير مدفوع',
      partial: 'مدفوع جزئيًا',
      active: 'نشط',
      inactive: 'غير نشط',
      maintenance: 'صيانة',
      broken: 'معطل'
    };
    return map[s] || s || '—';
  },

  /** ألوان الحالات */
  statusColor(s) {
    const map = {
      draft: 'gray', pending: 'warning', approved: 'info',
      in_progress: 'primary', paused: 'warning', completed: 'success',
      delivered: 'success', cancelled: 'danger', rejected: 'danger',
      paid: 'success', unpaid: 'danger', partial: 'warning',
      active: 'success', inactive: 'gray', maintenance: 'warning', broken: 'danger'
    };
    return map[s] || 'gray';
  },

  /** تنزيل ملف نصي */
  download(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

console.log('✅ Core loaded');