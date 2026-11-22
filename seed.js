/* ═══════════════════════════════════════════════════════════════
   IBRA Soft Workshop ERP — البيانات الأولية
   ═══════════════════════════════════════════════════════════════ */

const Seed = {
  VERSION: 1,

  loadIfEmpty() {
    const settings = DB.getSettings();
    if (settings.seeded && settings.seeded >= this.VERSION) {
      console.log('ℹ️ Seed already loaded');
      return;
    }
    this.load();
  },

  load() {
    console.log('🌱 Seeding data...');

    // ─────── الإعدادات ───────
    DB.saveSettings({
      companyName: 'ورشة إبراهيم للتصنيع',
      companyPhone: '+967 777 000 000',
      companyAddress: 'صنعاء - اليمن',
      companyTaxNo: '',
      companyLogo: '',
      currency: 'YER',
      rates: { YER: 1, SAR: 145, USD: 540 },
      vatRate: 0,
      electricityPrice: 250,      // سعر الكيلوواط
      laborHourPrice: 1500,        // سعر ساعة العامل
      wastePercent: 8,             // نسبة الهدر الافتراضية %
      profitMargin: 25,            // هامش الربح الافتراضي %
      seeded: this.VERSION,
      counters: {}
    });

    // ─────── المستخدمون ───────
    if (!DB.get('users').length) {
      DB.set('users', [
        {
          id: 'u_admin',
          username: 'admin',
          password: 'admin123',
          fullName: 'مدير النظام',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'u_manager',
          username: 'manager',
          password: '123456',
          fullName: 'مدير الورشة',
          role: 'manager',
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'u_worker',
          username: 'worker',
          password: '123456',
          fullName: 'فني تشغيل',
          role: 'operator',
          active: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }

    // ─────── الأدوار والصلاحيات ───────
    if (!DB.get('roles').length) {
      DB.set('roles', [
        {
          key: 'admin',
          name: 'مدير النظام',
          permissions: ['*']
        },
        {
          key: 'manager',
          name: 'مدير ورشة',
          permissions: [
            'dashboard.view','projects.view','projects.manage',
            'production.view','production.manage',
            'inventory.view','inventory.manage',
            'machines.view','machines.manage',
            'costing.view','costing.manage',
            'sales.view','sales.manage',
            'reports.view','settings.view'
          ]
        },
        {
          key: 'operator',
          name: 'فني تشغيل',
          permissions: [
            'dashboard.view','projects.view','production.view',
            'production.manage','machines.view','inventory.view'
          ]
        },
        {
          key: 'accountant',
          name: 'محاسب',
          permissions: [
            'dashboard.view','sales.view','sales.manage',
            'accounting.view','accounting.manage',
            'reports.view','costing.view'
          ]
        },
        {
          key: 'viewer',
          name: 'مشاهد فقط',
          permissions: ['dashboard.view','projects.view','inventory.view','reports.view']
        }
      ]);
    }

    // ─────── وحدات القياس ───────
    if (!DB.get('units').length) {
      DB.set('units', [
        { id: 'unit_m',    name: 'متر طولي',  short: 'م',   type: 'length' },
        { id: 'unit_m2',   name: 'متر مربع',  short: 'م²',  type: 'area' },
        { id: 'unit_pc',   name: 'قطعة',      short: 'قطعة',type: 'count' },
        { id: 'unit_kg',   name: 'كيلوجرام',  short: 'كجم', type: 'weight' },
        { id: 'unit_sheet',name: 'لوح',       short: 'لوح', type: 'count' },
        { id: 'unit_l',    name: 'لتر',       short: 'لتر', type: 'volume' },
        { id: 'unit_box',  name: 'علبة',      short: 'علبة',type: 'count' }
      ]);
    }

    // ─────── فئات المواد ───────
    if (!DB.get('material_categories').length) {
      DB.set('material_categories', [
        { id: 'cat_iron',    name: 'حديد',          icon: '🔩' },
        { id: 'cat_wood',    name: 'خشب',           icon: '🪵' },
        { id: 'cat_alum',    name: 'ألمنيوم',       icon: '🔧' },
        { id: 'cat_stain',   name: 'ستانلس ستيل',   icon: '✨' },
        { id: 'cat_paint',   name: 'دهانات',        icon: '🎨' },
        { id: 'cat_weld',    name: 'مستلزمات لحام', icon: '⚡' },
        { id: 'cat_acc',     name: 'إكسسوارات',     icon: '🔗' }
      ]);
    }

    // ─────── أنواع المكائن ───────
    if (!DB.get('machine_types').length) {
      DB.set('machine_types', [
        { id: 'mt_laser_iron',  name: 'ليزر حديد CNC',  icon: '⚙️' },
        { id: 'mt_cnc_wood',    name: 'CNC خشب',        icon: '🪚' },
        { id: 'mt_laser_wood',  name: 'ليزر خشب',       icon: '🔦' },
        { id: 'mt_plasma',      name: 'بلازما CNC',     icon: '⚡' },
        { id: 'mt_router',      name: 'Router CNC',     icon: '🔧' },
        { id: 'mt_welding',     name: 'لحام',           icon: '🔥' },
        { id: 'mt_engrave',     name: 'حفر ونقش',       icon: '✏️' }
      ]);
    }

    // ─────── المكائن ───────
    if (!DB.get('machines').length) {
      DB.set('machines', [
        {
          id: 'm_laser_iron_1',
          code: 'CNC-LI-01',
          name: 'ليزر حديد رقم 1',
          typeId: 'mt_laser_iron',
          power: '3000W',
          workArea: '3000×1500 مم',
          hourlyCost: 8000,
          kwhRate: 6,
          status: 'active',
          note: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'm_cnc_wood_1',
          code: 'CNC-W-01',
          name: 'CNC خشب رقم 1',
          typeId: 'mt_cnc_wood',
          power: '5.5KW',
          workArea: '2500×1300 مم',
          hourlyCost: 5000,
          kwhRate: 5.5,
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'm_laser_wood_1',
          code: 'LSR-W-01',
          name: 'ليزر خشب رقم 1',
          typeId: 'mt_laser_wood',
          power: '150W',
          workArea: '1300×900 مم',
          hourlyCost: 4000,
          kwhRate: 2,
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'm_plasma_1',
          code: 'PLS-01',
          name: 'بلازما رقم 1',
          typeId: 'mt_plasma',
          power: '1500W',
          workArea: '2000×3000 مم',
          hourlyCost: 6000,
          kwhRate: 8,
          status: 'active',
          createdAt: new Date().toISOString()
        }
      ]);
    }

    // ─────── المواد الخام ───────
    if (!DB.get('materials').length) {
      DB.set('materials', [
        {
          id: 'mat_iron_sheet_2',
          code: 'IR-SH-2MM',
          name: 'صفيحة حديد 2مم',
          categoryId: 'cat_iron',
          unitId: 'unit_sheet',
          length: 2000, width: 1000, thickness: 2,
          costPerUnit: 28000,
          stock: 25,
          minStock: 5,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mat_iron_pipe_1',
          code: 'IR-PP-1IN',
          name: 'ماسورة حديد 1 إنش',
          categoryId: 'cat_iron',
          unitId: 'unit_m',
          length: 6, width: 0, thickness: 1,
          costPerUnit: 3500,
          stock: 120,
          minStock: 20,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mat_mdf_18',
          code: 'WD-MDF-18',
          name: 'لوح MDF 18مم',
          categoryId: 'cat_wood',
          unitId: 'unit_sheet',
          length: 2440, width: 1220, thickness: 18,
          costPerUnit: 18000,
          stock: 40,
          minStock: 10,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mat_plywood_12',
          code: 'WD-PLY-12',
          name: 'أبلكاش 12مم',
          categoryId: 'cat_wood',
          unitId: 'unit_sheet',
          length: 2440, width: 1220, thickness: 12,
          costPerUnit: 14000,
          stock: 30,
          minStock: 8,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mat_paint_black',
          code: 'PT-BLK-01',
          name: 'دهان أسود مطفي',
          categoryId: 'cat_paint',
          unitId: 'unit_l',
          length: 0, width: 0, thickness: 0,
          costPerUnit: 4500,
          stock: 60,
          minStock: 15,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mat_weld_rod',
          code: 'WL-RD-25',
          name: 'سلك لحام 2.5مم',
          categoryId: 'cat_weld',
          unitId: 'unit_kg',
          length: 0, width: 0, thickness: 0,
          costPerUnit: 3200,
          stock: 45,
          minStock: 10,
          warehouseId: 'wh_main',
          createdAt: new Date().toISOString()
        }
      ]);
    }

    // ─────── المستودعات ───────
    if (!DB.get('warehouses').length) {
      DB.set('warehouses', [
        { id: 'wh_main',  name: 'المستودع الرئيسي', location: 'الورشة', active: true },
        { id: 'wh_wood',  name: 'مستودع الخشب',     location: 'الورشة', active: true },
        { id: 'wh_iron',  name: 'مستودع الحديد',    location: 'الورشة', active: true }
      ]);
    }

    // ─────── العملاء ───────
    if (!DB.get('customers').length) {
      DB.set('customers', [
        {
          id: 'c_demo1',
          name: 'عميل تجريبي',
          phone: '+967 777 111 222',
          address: 'صنعاء',
          balance: 0,
          createdAt: new Date().toISOString()
        }
      ]);
    }

    // ─────── المنتجات/الخدمات ───────
    if (!DB.get('products').length) {
      DB.set('products', [
        { id: 'p_door_iron', name: 'باب حديد', categoryId: 'cat_iron', pricingMethod: 'area', basePrice: 55000, unitId: 'unit_m2' },
        { id: 'p_kitchen_wood', name: 'مطبخ خشبي', categoryId: 'cat_wood', pricingMethod: 'area', basePrice: 85000, unitId: 'unit_m2' },
        { id: 'p_window_alum', name: 'نافذة ألمنيوم', categoryId: 'cat_alum', pricingMethod: 'area', basePrice: 65000, unitId: 'unit_m2' },
        { id: 'p_railing', name: 'درابزين حديد', categoryId: 'cat_iron', pricingMethod: 'length', basePrice: 25000, unitId: 'unit_m' },
        { id: 'p_decor', name: 'ديكور خشبي', categoryId: 'cat_wood', pricingMethod: 'area', basePrice: 40000, unitId: 'unit_m2' }
      ]);
    }

    // ─────── الجداول الفارغة (لضمان وجودها) ───────
    const emptyTables = [
  'projects', 'production_orders', 'machine_logs',
  'inventory_moves', 'invoices', 'payments',
  'quotes', 'suppliers', 'employees', 'expenses',
  'accounts', 'journal_entries', 'activity_log', 
  'vouchers', 'payrolls', 'cashboxes', 'attendance',
  'purchases', 'employee_transactions'
];
    emptyTables.forEach(t => {
      if (!localStorage.getItem(DB.PREFIX + t)) DB.set(t, []);
    });

    console.log('✅ Seed completed');
  }
};

console.log('✅ Seed loaded');