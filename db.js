// db.js — QurilishInfo SQLite bazasi.
// Amaliy qurilish ma'lumotlari, yangiliklar, reklama, sozlamalar va tahririyat xabarlari.

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
    placement TEXT NOT NULL DEFAULT 'homepage',
    starts_at TEXT NOT NULL DEFAULT '',
    ends_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* =========================================================
   MAVJUD JADVALLARNI XAVFSIZ KENGAYTIRISH
   Eski maqola, reklama va admin ma'lumotlari o'chmaydi.
========================================================= */

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[QurilishInfo] ${table}.${column} ustuni qo'shildi.`);
  }
}

/* ---------- MAQOLALAR ---------- */

addColumnIfMissing("articles", "status", "TEXT NOT NULL DEFAULT 'published'");
addColumnIfMissing("articles", "article_type", "TEXT NOT NULL DEFAULT 'guide'");
addColumnIfMissing("articles", "tags", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "image_url", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "image_caption", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "image_credit", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "author", "TEXT NOT NULL DEFAULT 'QurilishInfo tahririyati'");
addColumnIfMissing("articles", "source_name", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "source_url", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "document_no", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "updated", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "steps", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "warning", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "is_advertisement", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("articles", "is_featured", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("articles", "is_pinned", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("articles", "published_at", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "seo_title", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("articles", "seo_description", "TEXT NOT NULL DEFAULT ''");

/* ---------- REKLAMALAR ---------- */

addColumnIfMissing("advertisements", "placement", "TEXT NOT NULL DEFAULT 'homepage'");
addColumnIfMissing("advertisements", "starts_at", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("advertisements", "ends_at", "TEXT NOT NULL DEFAULT ''");

/* =========================================================
   INDEXLAR — TEZ ISHLASH UCHUN
========================================================= */

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_articles_category
  ON articles(category);

  CREATE INDEX IF NOT EXISTS idx_articles_status
  ON articles(status);

  CREATE INDEX IF NOT EXISTS idx_articles_type
  ON articles(article_type);

  CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON articles(is_featured);

  CREATE INDEX IF NOT EXISTS idx_articles_pinned
  ON articles(is_pinned);

  CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles(published_at);

  CREATE INDEX IF NOT EXISTS idx_advertisements_status
  ON advertisements(status);

  CREATE INDEX IF NOT EXISTS idx_advertisements_placement
  ON advertisements(placement);

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
      "site_tagline",
      "Uy qurish, uy sotib olish va ta'mirlash bo'yicha sodda, amaliy yo'l-yo'riqlar"
    ],
    [
      "site_description",
      "Uy qurish, ruxsatnoma, smeta, ta'mirlash va qurilishdagi huquqlar bo'yicha amaliy ma'lumotlar."
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
      "Reklama, hamkorlik materiali va tahririy maqolalar aniq alohida belgilanadi. Materiallardagi ma'lumot umumiy xarakterda bo'lib, qaror qilishdan oldin rasmiy manbani tekshirish tavsiya qilinadi."
    ],
    ["cta_title", "Qurilish bo'yicha savolingiz bormi?"],
    [
      "cta_text",
      "Ruxsatnoma, uy qurish, uy sotib olish, ta'mirlash yoki qurilish nazorati bo'yicha foydali maqolalarni toping."
    ],
    ["important_notice_title", ""],
    ["important_notice_url", ""],
    ["important_notice_until", ""]
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
   Faqat baza bo'sh bo'lsa qo'shiladi.
========================================================= */

function seedArticles() {
  const result = db.prepare("SELECT COUNT(*) AS count FROM articles").get();

  if (result.count > 0) {
    return;
  }

  const paragraphs = (items) => items.join("\n\n");

  const seed = [
    {
      category: "Boshlashdan oldin",
      article_type: "guide",
      tags: "yer,ruxsatnoma,loyiha,hujjatlar",
      title: "Uy qurishni nimadan boshlash kerak?",
      lead: "Yer, loyiha, ruxsatnoma va smetani tartib bilan tayyorlash uchun amaliy yo'l xaritasi.",
      minutes: 7,
      is_featured: 1,
      is_pinned: 1,
      body: paragraphs([
        "Uy qurishni boshlashdan oldin yer uchastkasi hujjatlari, loyiha va qurilishga qo'yiladigan talablarni aniqlab oling.",
        "Birinchi qadam — yer uchastkasining hujjatlarda ko'rsatilgan maqsadli vazifasini tekshirish. Keyin loyiha va taxminiy smeta tayyorlanadi.",
        "Ruxsat va kelishuv talablari hudud hamda obyekt turiga qarab farq qilishi mumkin. Shuning uchun boshlashdan oldin tegishli mahalliy organ yoki mutaxassisdan aniq ro'yxatni so'rang."
      ]),
      steps: "Yer uchastkasi hujjatlarini tekshiring\nLoyiha va smeta tayyorlang\nRuxsat talablari haqida aniqlik kiriting\nPudratchi yoki usta bilan yozma shartnoma qiling\nQurilish jarayonini bosqichma-bosqich nazorat qiling",
      warning: "Ruxsat va loyiha talablarini aniqlamasdan qurilishni boshlash keyinchalik qo'shimcha xarajat va nizolarga olib kelishi mumkin."
    },
    {
      category: "Xarajat va narxlar",
      article_type: "guide",
      tags: "smeta,xarajat,uy qurish,materiallar",
      title: "Uy qurish uchun qancha pul kerak: xarajatni qanday hisoblash mumkin?",
      lead: "Smetani poydevor, devor, tom, kommunikatsiya va pardozlashga bo'lib hisoblashning qulay usuli.",
      minutes: 8,
      is_featured: 0,
      is_pinned: 1,
      body: paragraphs([
        "Uy qurish narxi uy maydoni, hudud, material sifati, loyiha va pardozlash darajasiga bog'liq. Shu sabab yagona universal narx aytish to'g'ri emas.",
        "Xarajatni alohida guruhlarga ajratish foydali: loyiha va hujjatlar, poydevor, devor va karkas, tom, elektr-suv-kanalizatsiya, deraza-eshik va pardozlash.",
        "Har bir ish turi uchun kamida ikki yoki uchta taklif oling. Kutilmagan xarajatlar uchun ham zaxira rejalashtiring."
      ]),
      steps: "Uy maydoni va loyiha turini aniqlang\nIshlarni bosqichlarga ajrating\nMaterial va ish haqi bo'yicha bir nechta narx oling\nYozma smeta tuzing\nKutilmagan xarajatlar uchun zaxira belgilang",
      warning: "Faqat kvadrat metri bo'yicha aytilgan umumiy narxga tayanmang. Kommunikatsiya, tom, pardozlash va tashqi ishlar ko'pincha alohida xarajat hisoblanadi."
    },
    {
      category: "Huquq va idoralar",
      article_type: "guide",
      tags: "idora,kadastr,hokimlik,inspeksiya,ruxsatnoma",
      title: "Qurilish masalasida qaysi idoraga murojaat qilish kerak?",
      lead: "Ruxsatnoma, kadastr, noqonuniy qurilish yoki sifat muammosida qayerdan boshlash mumkinligi haqida yo'nalish.",
      minutes: 6,
      is_featured: 0,
      is_pinned: 0,
      body: paragraphs([
        "Qurilish bilan bog'liq masalalarda murojaat qilinadigan idora muammo turiga bog'liq bo'ladi.",
        "Yer va ro'yxatdan o'tkazish masalalarida kadastr organlari, hududiy qurilish tartiblari bo'yicha tegishli mahalliy organlar, nazorat va xavfsizlik masalalarida esa vakolatli inspeksiya yoki boshqa idoralar muhim bo'lishi mumkin.",
        "Murojaat qilishdan oldin mavjud hujjatlar, manzil, fotosurat va boshqa dalillarni tayyorlab qo'yish foydali."
      ]),
      steps: "Muammo turini aniq belgilang\nYer va mulk bo'yicha hujjatlarni tayyorlang\nTegishli idora vakolatini aniqlang\nMurojaatni yozma yoki elektron shaklda yuboring\nJavob va hujjatlarni saqlab qo'ying",
      warning: "Vakolatlar hudud va holatga qarab farq qilishi mumkin. Rasmiy manba yoki tegishli idora orqali aniq tartibni tekshiring."
    },
    {
      category: "Uy sotib olish",
      article_type: "guide",
      tags: "uy sotib olish,kadastr,shartnoma,hujjatlar",
      title: "Uy sotib olishdan oldin tekshiriladigan asosiy hujjatlar",
      lead: "Kadastr, egalik, shartnoma va binoning texnik holatini tekshirish bo'yicha qisqa ro'yxat.",
      minutes: 7,
      is_featured: 0,
      is_pinned: 0,
      body: paragraphs([
        "Uy sotib olayotganda faqat narx va joylashuvga emas, balki huquqiy va texnik holatga ham e'tibor bering.",
        "Sotuvchidan mulkka egalik hujjatlari, kadastr ma'lumotlari va kerakli boshqa rasmiy ma'lumotlarni so'rang.",
        "Shubhali joy bo'lsa, mustaqil mutaxassis yoki malakali yurist bilan maslahatlashish xaridorni katta xavfdan saqlashi mumkin."
      ]),
      steps: "Sotuvchi va mulk hujjatlarini tekshiring\nKadastr ma'lumotlarini solishtiring\nUyda yoriq, namlik va kommunikatsiyalarni ko'ring\nTo'lov shartlarini yozma belgilang\nShartnomani rasmiylashtiring",
      warning: "Hujjatlar to'liq tekshirilmasdan katta miqdordagi oldindan to'lovni bermang."
    }
  ];

  const insert = db.prepare(`
    INSERT INTO articles (
      category,
      article_type,
      tags,
      title,
      lead,
      body,
      minutes,
      is_featured,
      is_pinned,
      steps,
      warning,
      status,
      published_at
    )
    VALUES (
      @category,
      @article_type,
      @tags,
      @title,
      @lead,
      @body,
      @minutes,
      @is_featured,
      @is_pinned,
      @steps,
      @warning,
      'published',
      datetime('now')
    )
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  insertMany(seed);

  console.log(
    `[QurilishInfo] ${seed.length} ta boshlang'ich amaliy maqola qo'shildi.`
  );
}

seedAdmin();
seedSettings();
seedArticles();

module.exports = db;
