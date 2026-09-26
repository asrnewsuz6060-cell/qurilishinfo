const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "qurilishinfo.db");

function openDatabase() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

function initializeDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_uz TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#0b4f7c',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_uz TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      slug_uz TEXT,
      slug_ru TEXT,
      category_id INTEGER REFERENCES categories(id),
      article_type TEXT DEFAULT 'guide',
      status TEXT DEFAULT 'draft',
      lead_uz TEXT,
      lead_ru TEXT,
      body_uz TEXT,
      body_ru TEXT,
      author TEXT,
      minutes INTEGER DEFAULT 5,
      image_url TEXT,
      image_caption_uz TEXT,
      image_caption_ru TEXT,
      steps TEXT,
      warning_uz TEXT,
      warning_ru TEXT,
      source_name_uz TEXT,
      source_name_ru TEXT,
      source_url TEXT,
      document_no TEXT,
      updated DATE,
      published_at DATETIME,
      tags TEXT,
      is_featured INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_advertisement INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS advertisements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_uz TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      description_uz TEXT,
      description_ru TEXT,
      company_name TEXT,
      label TEXT DEFAULT 'Reklama',
      image_url TEXT,
      target_url TEXT,
      status TEXT DEFAULT 'active',
      starts_at DATETIME,
      ends_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_uz TEXT,
      value_ru TEXT
    );

    CREATE TABLE IF NOT EXISTS translations (
      key TEXT PRIMARY KEY,
      value_uz TEXT,
      value_ru TEXT
    );
  `);

  // Default categories (agar bo‘sh bo‘lsa)
  const count = db.prepare("SELECT COUNT(*) as c FROM categories").get();

  if (count.c === 0) {
    const defaultCategories = [
      { name_uz: "Boshlashdan oldin", name_ru: "Перед началом", slug: "boshlashdan-oldin", color: "#073b61", sort_order: 1 },
      { name_uz: "Uy qurish", name_ru: "Строительство дома", slug: "uy-qurish", color: "#0b4f7c", sort_order: 2 },
      { name_uz: "Xarajat va narxlar", name_ru: "Расходы и цены", slug: "xarajat-va-narxlar", color: "#138a5b", sort_order: 3 },
      { name_uz: "Uy sotib olish", name_ru: "Покупка дома", slug: "uy-sotib-olish", color: "#2b6c8e", sort_order: 4 },
      { name_uz: "Ta'mirlash", name_ru: "Ремонт", slug: "tamirlash", color: "#344b5e", sort_order: 5 },
      { name_uz: "Huquq va idoralar", name_ru: "Право и органы", slug: "huquq-va-idoralar", color: "#1d4f72", sort_order: 6 },
      { name_uz: "Inspeksiya izohlaydi", name_ru: "Инспекция объясняет", slug: "inspeksiya-izohlaydi", color: "#134c75", sort_order: 7 },
      { name_uz: "Qaror sodda tilda", name_ru: "Решение простым языком", slug: "qaror-sodda-tilda", color: "#0c486f", sort_order: 8 },
      { name_uz: "Rasmiy xabarlar", name_ru: "Официальные сообщения", slug: "rasmiy-xabarlar", color: "#123a58", sort_order: 9 }
    ];

    const insert = db.prepare(`
      INSERT INTO categories (name_uz, name_ru, slug, color, is_active, sort_order)
      VALUES (@name_uz, @name_ru, @slug, @color, 1, @sort_order)
    `);

    for (const cat of defaultCategories) {
      insert.run(cat);
    }
  }

  // Default settings
  const settingsCount = db.prepare("SELECT COUNT(*) as c FROM settings").get();

  if (settingsCount.c === 0) {
    const defaultSettings = [
      { key: "site_name_uz", value_uz: "QurilishInfo", value_ru: null },
      { key: "site_name_ru", value_uz: null, value_ru: "QurilishInfo" },
      { key: "site_tagline_uz", value_uz: "Qurilishdagi to‘g‘ri qarorlar uchun amaliy ma’lumot", value_ru: null },
      { key: "site_tagline_ru", value_uz: null, value_ru: "Практическая информация для правильных решений в строительстве" },
      { key: "telegram_url", value_uz: "https://t.me/qurilishinfo", value_ru: null },
      { key: "contact_uz", value_uz: "@qurilishinfo_admin", value_ru: null },
      { key: "contact_url", value_uz: "https://t.me/qurilishinfo_admin", value_ru: null },
      { key: "about_text_uz", value_uz: "QurilishInfo — uy qurish, uy sotib olish, ruxsatnoma, ta’mirlash va qurilish nazorati bo‘yicha amaliy ma’lumotlar platformasi.", value_ru: null },
      { key: "about_text_ru", value_uz: null, value_ru: "QurilishInfo — практическая платформа по строительству, покупке дома, разрешениям, ремонту и контролю за строительством." },
      { key: "editorial_policy_uz", value_uz: "Reklama va tahririy materiallar alohida belgilanadi.", value_ru: null },
      { key: "editorial_policy_ru", value_uz: null, value_ru: "Рекламные и редакционные материалы помечаются отдельно." }
    ];

    const insert = db.prepare(`
      INSERT INTO settings (key, value_uz, value_ru)
      VALUES (@key, @value_uz, @value_ru)
    `);

    for (const setting of defaultSettings) {
      insert.run(setting);
    }
  }

  // Default translations (interfeys matnlari)
  const translationsCount = db.prepare("SELECT COUNT(*) as c FROM translations").get();

  if (translationsCount.c === 0) {
    const defaultTranslations = [
      { key: "nav_home_uz", value_uz: "Bosh sahifa", value_ru: null },
      { key: "nav_home_ru", value_uz: null, value_ru: "Главная" },
      { key: "nav_articles_uz", value_uz: "Maqolalar", value_ru: null },
      { key: "nav_articles_ru", value_uz: null, value_ru: "Статьи" },
      { key: "nav_ads_uz", value_uz: "Reklama", value_ru: null },
      { key: "nav_ads_ru", value_uz: null, value_ru: "Реклама" },
      { key: "nav_settings_uz", value_uz: "Sozlamalar", value_ru: null },
      { key: "nav_settings_ru", value_uz: null, value_ru: "Настройки" },
      { key: "btn_save_uz", value_uz: "Saqlash", value_ru: null },
      { key: "btn_save_ru", value_uz: null, value_ru: "Сохранить" },
      { key: "btn_cancel_uz", value_uz: "Bekor qilish", value_ru: null },
      { key: "btn_cancel_ru", value_uz: null, value_ru: "Отмена" },
      { key: "btn_delete_uz", value_uz: "O‘chirish", value_ru: null },
      { key: "btn_delete_ru", value_uz: null, value_ru: "Удалить" },
      { key: "btn_edit_uz", value_uz: "Tahrirlash", value_ru: null },
      { key: "btn_edit_ru", value_uz: null, value_ru: "Редактировать" },
      { key: "status_draft_uz", value_uz: "Qoralama", value_ru: null },
      { key: "status_draft_ru", value_uz: null, value_ru: "Черновик" },
      { key: "status_published_uz", value_uz: "Chiqarilgan", value_ru: null },
      { key: "status_published_ru", value_uz: null, value_ru: "Опубликовано" }
    ];

    const insert = db.prepare(`
      INSERT INTO translations (key, value_uz, value_ru)
      VALUES (@key, @value_uz, @value_ru)
    `);

    for (const t of defaultTranslations) {
      insert.run(t);
    }
  }
}

module.exports = {
  openDatabase,
  initializeDatabase
};
