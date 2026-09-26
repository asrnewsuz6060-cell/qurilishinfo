// db.js — QurilishInfo SQLite bazasi:
// maqolalar, admin, reklama, sayt sozlamalari va murojaatlar.

const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "data.sqlite");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

/* =========================================================
   ASOSIY JADVALLAR
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    lead TEXT NOT NULL,
    body TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 5,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    target_url TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT 'Reklama',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* =========================================================
   ESKI ARTICLES JADVALIGA YANGI USTUNLARNI XAVFSIZ QO'SHISH
========================================================= */

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[QurilishInfo] ${table}.${column} ustuni qo'shildi.`);
  }
}

addColumnIfMissing("articles", "status", "TEXT NOT NULL DEFAULT 'published'");
addColumnIfMissing("articles", "image_url", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "author", "TEXT NOT NULL DEFAULT 'QurilishInfo tahririyati'");
addColumnIfMissing("articles", "source_name", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "source_url", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "document_no", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "updated", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "steps", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "warning", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "is_advertisement", "INTEGER NOT NULL DEFAULT 0");

/* =========================================================
   INDEXLAR — TEZ QIDIRUV UCHUN
========================================================= */

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_articles_category
  ON articles(category);

  CREATE INDEX IF NOT EXISTS idx_articles_status
  ON articles(status);

  CREATE INDEX IF NOT EXISTS idx_advertisements_status
  ON advertisements(status);

  CREATE INDEX IF NOT EXISTS idx_appeals_status
  ON appeals(status);
`);

/* =========================================================
   ADMIN YARATISH
========================================================= */

function seedAdmin() {
  const existing = db.prepare("SELECT * FROM admin_users LIMIT 1").get();

  if (existing) {
    return;
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "change-me-123";
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)"
  ).run(username, hash);

  console.log(
    `[QurilishInfo] Admin yaratildi: ${username} / ${password} — darhol almashtiring!`
  );
}

/* =========================================================
   STANDART SAYT SOZLAMALARI
========================================================= */

function seedSettings() {
  const settings = [
    ["site_name", "QurilishInfo"],
    [
      "site_description",
      "Uy qurish, ruxsatnoma va qurilish nazorati bo'yicha amaliy ma'lumotlar"
    ],
    ["telegram_url", "https://t.me/qurilishinfo"],
    ["contact", "@qurilishinfo_admin"],
    ["contact_url", "https://t.me/qurilishinfo_admin"],
    ["instagram_url", ""],
    ["facebook_url", ""],
    ["youtube_url", ""],
    ["tiktok_url", ""],
    [
      "about_text",
      "QurilishInfo — uy qurish, uy sotib olish, ruxsatnoma, ta'mirlash va qurilish nazorati bo'yicha amaliy ma'lumotlar platformasi. Loyiha rasmiy davlat organi emas. Materiallar rasmiy hujjatlar, davlat organlari e'lonlari va mutaxassislarning izohlari asosida tayyorlanadi."
    ],
    [
      "editorial_policy",
      "Reklama va tahririy materiallar alohida belgilanadi."
    ],
    ["cta_title", "Qurilishda muammo bormi?"],
    [
      "cta_text",
      "Ruxsatnoma, noqonuniy qurilish, uy sifati, shartnoma yoki ta'mirlash bo'yicha savolingizni yuboring."
    ]
  ];

  const statement = db.prepare(
    "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)"
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      statement.run(item[0], item[1]);
    }
  });

  insertMany(settings);
}

/* =========================================================
   BOSHLANG'ICH MAQOLALAR
========================================================= */

function seedArticles() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM articles").get()
    .count;

  if (count > 0) {
    return;
  }

  const p = (items) => items.join("\n\n");

  const seed = [
    {
      category: "Ruxsatnoma",
      title: "Uy qurish uchun ruxsatnoma: qayerdan boshlash kerak",
      lead: "Qurilishni boshlashdan oldin qaysi bosqichlardan o'tish kerakligi haqida umumiy yo'l xaritasi.",
      minutes: 6,
      body: p([
        "Uy qurishni boshlashdan oldin yer uchastkasi hujjatlari va qurilish loyihasi tayyor bo'lishi kerak.",
        "Birinchi qadam: yer uchastkasining maqsadli vazifasi hujjatda qanday yozilganini tekshirish.",
        "Keyingi qadam: mahalliy arxitektura va qurilish organiga murojaat qilib, aniq hujjatlar ro'yxatini so'rash."
      ])
    },
    {
      category: "Uy sotib olish",
      title: "Yangi qurilgan uyni sotib olishdan oldin tekshiriladigan narsalar",
      lead: "Hujjatlar va binoning holati bo'yicha xaridor uchun oddiy tekshiruv ro'yxati.",
      minutes: 7,
      body: p([
        "Sotuvchi yoki quruvchi kompaniyaning barcha hujjatlarini so'rang: yerga va binoga egalik, qurilishga ruxsat, foydalanishga topshirilgani haqidagi hujjat.",
        "Binoni o'zingiz ko'zdan kechiring: devor va shiftda yoriq, namlik izlari, deraza va eshiklarning yopilishi.",
        "Shubhali joy bo'lsa, mustaqil mutaxassisdan ko'rik o'tkazishni so'rash pulingizni himoya qiladi."
      ])
    },
    {
      category: "Uy qurish",
      title: "Uy qurish xarajatini oldindan qanday hisoblash mumkin",
      lead: "Loyiha, material, ish haqi va kutilmagan xarajatlar uchun zaxira.",
      minutes: 6,
      body: p([
        "Xarajatni guruhlarga bo'ling: loyiha va hujjatlar, poydevor va
