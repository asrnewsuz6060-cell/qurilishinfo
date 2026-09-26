const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "qurilishinfo.db");

function openDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        reject(err);
      } else {
        db.run("PRAGMA journal_mode = WAL", (err) => {
          if (err) {
            console.error("WAL xatosi:", err);
          }
          resolve(db);
        });
      }
    });
  });
}

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initializeDatabase(db) {
  await runSql(db, `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_uz TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#0b4f7c',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runSql(db, `
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
    )
  `);

  await runSql(db, `
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
    )
  `);

  await runSql(db, `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_uz TEXT,
      value_ru TEXT
    )
  `);

  await runSql(db, `
    CREATE TABLE IF NOT EXISTS translations (
      key TEXT PRIMARY KEY,
      value_uz TEXT,
      value_ru TEXT
    )
  `);

  // Default categories
  const count = await getSql(db, "SELECT COUNT(*) as c FROM categories");

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

    for (const cat of defaultCategories) {
      await runSql(db, `
        INSERT INTO categories (name_uz, name_ru, slug, color, is_active, sort_order)
        VALUES (?, ?, ?, ?, 1, ?)
      `, [cat.name_uz, cat.name_ru, cat.slug, cat.color, cat.sort_order]);
    }
  }

  // Default settings
  const settingsCount = await getSql(db, "SELECT COUNT(*) as c FROM settings");

  if (settingsCount.c === 0) {
    const defaultSettings = [
      ["site_name_uz", "QurilishInfo", null],
      ["site_name_ru", null, "QurilishInfo"],
      ["site_tagline_uz", "Qurilishdagi to‘g‘ri qarorlar uchun amaliy ma’lumot", null],
      ["site_tagline_ru", null, "Практическая информация для правильных решений в строительстве"],
      ["telegram_url", "https://t.me/qurilishinfo", null],
      ["contact_uz", "@qurilishinfo_admin", null],
      ["contact_url", "https://t.me/qurilishinfo_admin", null],
      ["about_text_uz", "QurilishInfo — uy qurish, uy sotib olish, ruxsatnoma, ta’mirlash va qurilish nazorati bo‘yicha amaliy ma’lumotlar platformasi.", null],
      ["about_text_ru", null, "QurilishInfo — практическая платформа по строительству, покупке дома, разрешениям, ремонту и контролю за строительством."],
      ["editorial_policy_uz", "Reklama va tahririy materiallar alohida belgilanadi.", null],
      ["editorial_policy_ru", null, "Рекламные и редакционные материалы помечаются отдельно."]
    ];

    for (const setting of defaultSettings) {
      await runSql(db, `
        INSERT OR REPLACE INTO settings (key, value_uz, value_ru)
        VALUES (?, ?, ?)
      `, setting);
    }
  }

  // Default translations
  const translationsCount = await getSql(db, "SELECT COUNT(*) as c FROM translations");

  if (translationsCount.c === 0) {
    const defaultTranslations = [
      ["nav_home_uz", "Bosh sahifa", null],
      ["nav_home_ru", null, "Главная"],
      ["nav_articles_uz", "Maqolalar", null],
      ["nav_articles_ru", null, "Статьи"],
      ["nav_ads_uz", "Reklama", null],
      ["nav_ads_ru", null, "Реклама"],
      ["nav_settings_uz", "Sozlamalar", null],
      ["nav_settings_ru", null, "Настройки"],
      ["btn_save_uz", "Saqlash", null],
      ["btn_save_ru", null, "Сохранить"],
      ["btn_cancel_uz", "Bekor qilish", null],
      ["btn_cancel_ru", null, "Отмена"],
      ["btn_delete_uz", "O‘chirish", null],
      ["btn_delete_ru", null, "Удалить"],
      ["btn_edit_uz", "Tahrirlash", null],
      ["btn_edit_ru", null, "Редактировать"],
      ["status_draft_uz", "Qoralama", null],
      ["status_draft_ru", null, "Черновик"],
      ["status_published_uz", "Chiqarilgan", null],
      ["status_published_ru", null, "Опубликовано"]
    ];

    for (const t of defaultTranslations) {
      await runSql(db, `
        INSERT OR REPLACE INTO translations (key, value_uz, value_ru)
        VALUES (?, ?, ?)
      `, t);
    }
  }
}

module.exports = {
  openDatabase,
  initializeDatabase,
  runSql,
  getSql,
  allSql
};
