// server.js — QurilishInfo backend:
// ochiq API + admin uchun himoyalangan API + sozlamalar + reklama + murojaatlar

require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "qurilishinfo-vaqtinchalik-kalit-almashtiring",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.status(401).json({
    error: "Tizimga kirish talab qilinadi"
  });
}

function ensureDefaultSettings() {
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

ensureDefaultSettings();

/* =========================================================
   OCHIQ API — BOSH SAHIFA UCHUN
========================================================= */

app.get("/api/articles", (req, res) => {
  const category = String(req.query.category || "").trim();
  const search = String(req.query.search || "").trim();

  let rows = [];

  if (search) {
    const keyword = `%${search}%`;

    rows = db
      .prepare(
        `
          SELECT *
          FROM articles
          WHERE status = 'published'
            AND (
              title LIKE ?
              OR lead LIKE ?
              OR body LIKE ?
              OR category LIKE ?
            )
          ORDER BY created_at DESC, id DESC
        `
      )
      .all(keyword, keyword, keyword, keyword);
  } else if (category && category !== "Barchasi") {
    rows = db
      .prepare(
        `
          SELECT *
          FROM articles
          WHERE status = 'published' AND category = ?
          ORDER BY created_at DESC, id DESC
        `
      )
      .all(category);
  } else {
    rows = db
      .prepare(
        `
          SELECT *
          FROM articles
          WHERE status = 'published'
          ORDER BY created_at DESC, id DESC
        `
      )
      .all();
  }

  res.json(rows);
});

app.get("/api/articles/:id", (req, res) => {
  const row = db
    .prepare(
      `
        SELECT *
        FROM articles
        WHERE id = ? AND status = 'published'
      `
    )
    .get(req.params.id);

  if (!row) {
    return res.status(404).json({
      error: "Maqola topilmadi"
    });
  }

  res.json(row);
});

app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};

  for (const row of rows) {
    settings[row.key] = row.value;
  }

  res.json(settings);
});

app.get("/api/advertisements", (req, res) => {
  const rows = db
    .prepare(
      `
        SELECT *
        FROM advertisements
        WHERE status = 'active'
        ORDER BY created_at DESC, id DESC
      `
    )
    .all();

  res.json(rows);
});

app.post("/api/appeals", (req, res) => {
  const { name, phone, region, topic, message } = req.body || {};

  if (!region || !topic || !message) {
    return res.status(400).json({
      error: "Hudud, mavzu va savol to'ldirilishi shart"
    });
  }

  const info = db
    .prepare(
      `
        INSERT INTO appeals (name, phone, region, topic, message, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      String(name || "").trim(),
      String(phone || "").trim(),
      String(region).trim(),
      String(topic).trim(),
      String(message).trim(),
      "new"
    );

  res.json({
    ok: true,
    id: info.lastInsertRowid
  });
});

/* =========================================================
   KIRISH / CHIQISH
========================================================= */

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  const user = db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .get(String(username || "").trim());

  if (!user || !bcrypt.compareSync(String(password || ""), user.password_hash)) {
    return res.status(401).json({
      error: "Login yoki parol noto'g'ri"
    });
  }

  req.session.isAdmin = true;
  req.session.username = user.username;

  res.json({
    ok: true,
    username: user.username
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

app.get("/api/admin/check", (req, res) => {
  res.json({
    loggedIn: Boolean(req.session && req.session.isAdmin),
    username:
      req.session && req.session.username ? req.session.username : null
  });
});

/* =========================================================
   ADMIN API — MAQOLALAR
========================================================= */

app.get("/api/admin/articles", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM articles ORDER BY created_at DESC, id DESC")
    .all();

  res.json(rows);
});

app.post("/api/admin/articles", requireAuth, (req, res) => {
  const {
    category,
    status,
    title,
    lead,
    body,
    minutes,
    author,
    image_url,
    source_name,
    source_url,
    document_no,
    updated,
    steps,
    warning,
    is_advertisement
  } = req.body || {};

  if (!category || !title || !lead || !body) {
    return res.status(400).json({
      error: "Bo'lim, sarlavha, qisqacha va matn to'ldirilishi shart"
    });
  }

  const allowedStatuses = ["published", "draft", "archived"];
  const normalizedStatus = allowedStatuses.includes(status)
    ? status
    : "published";

  const info = db
    .prepare(
      `
        INSERT INTO articles (
          category,
          status,
          title,
          lead,
          body,
          minutes,
          author,
          image_url,
          source_name,
          source_url,
          document_no,
          updated,
          steps,
          warning,
          is_advertisement
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      String(category).trim(),
      normalizedStatus,
      String(title).trim(),
      String(lead).trim(),
      String(body).trim(),
      Number(minutes) || 5,
      String(author || "QurilishInfo tahririyati").trim(),
      String(image_url || "").trim(),
      String(source_name || "").trim(),
      String(source_url || "").trim(),
      String(document_no || "").trim(),
      String(updated || "").trim(),
      String(steps || "").trim(),
      String(warning || "").trim(),
      Number(is_advertisement) ? 1 : 0
    );

  res.json({
    ok: true,
    id: info.lastInsertRowid
  });
});

app.put("/api/admin/articles/:id", requireAuth, (req, res) => {
  const {
    category,
    status,
    title,
    lead,
    body,
    minutes,
    author,
    image_url,
    source_name,
    source_url,
    document_no,
    updated,
    steps,
    warning,
    is_advertisement
  } = req.body || {};

  const exists = db
    .prepare("SELECT id FROM articles WHERE id = ?")
    .get(req.params.id);

  if (!exists) {
    return res.status(404).json({
      error: "Maqola topilmadi"
    });
  }

  if (!category || !title || !lead || !body) {
    return res.status(400).json({
      error: "Bo'lim, sarlavha, qisqacha va matn to'ldirilishi shart"
    });
  }

  const allowedStatuses = ["published", "draft", "archived"];
  const normalizedStatus = allowedStatuses.includes(status)
    ? status
    : "published";

  db.prepare(
    `
      UPDATE articles
      SET
        category = ?,
        status = ?,
        title = ?,
        lead = ?,
        body
