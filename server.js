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
    ["editorial_policy", "Reklama va tahririy materiallar alohida belgilanadi."],
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
   OCHIQ API — bosh sahifa uchun
========================================================= */

app.get("/api/articles", (req, res) => {
  const category = req.query.category;
  const search = String(req.query.search || "").trim();

  let rows;

  if (search) {
    const keyword = `%${search}%`;

    rows = db
      .prepare(
        `
        SELECT *
        FROM articles
        WHERE title LIKE ?
           OR lead LIKE ?
           OR body LIKE ?
           OR category LIKE ?
        ORDER BY created_at DESC, id DESC
      `
      )
      .all(keyword, keyword, keyword, keyword);
  } else if (category && category !== "Barchasi") {
    rows = db
      .prepare(
        "SELECT * FROM articles WHERE category = ? ORDER BY created_at DESC, id DESC"
      )
      .all(category);
  } else {
    rows = db
      .prepare("SELECT * FROM articles ORDER BY created_at DESC, id DESC")
      .all();
  }

  res.json(rows);
});

app.get("/api/articles/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM articles WHERE id = ?")
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

/* =========================================================
   ADMIN KIRISH / CHIQISH
========================================================= */

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  const user = db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .get(username || "");

  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({
      error: "Login yoki parol noto'g'ri"
    });
  }

  req.session.isAdmin = true;
  req.session.username = username;

  res.json({
    ok: true,
    username
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
    loggedIn: !!(req.session && req.session.isAdmin),
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
  const { category, title, lead, body, minutes } = req.body || {};

  if (!category || !title || !lead || !body) {
    return res.status(400).json({
      error: "Bo'lim, sarlavha, qisqacha va matn to'ldirilishi shart"
    });
  }

  const info = db
    .prepare(
      `
      INSERT INTO articles (category, title, lead, body, minutes)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(category, title, lead, body, Number(minutes) || 5);

  res.json({
    id: info.lastInsertRowid
  });
});

app.put("/api/admin/articles/:id", requireAuth, (req, res) => {
  const { category, title, lead, body, minutes } = req.body || {};

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

  db.prepare(
    `
    UPDATE articles
    SET category = ?, title = ?, lead = ?, body = ?, minutes = ?
    WHERE id = ?
  `
  ).run(category, title, lead, body, Number(minutes) || 5, req.params.id);

  res.json({
    ok: true
  });
});

app.delete("/api/admin/articles/:id", requireAuth, (req, res) => {
  const exists = db
    .prepare("SELECT id FROM articles WHERE id = ?")
    .get(req.params.id);

  if (!exists) {
    return res.status(404).json({
      error: "Maqola topilmadi"
    });
  }

  db.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);

  res.json({
    ok: true
  });
});

/* =========================================================
   ADMIN API — SAYT SOZLAMALARI VA IJTIMOIY TARMOQLAR
========================================================= */

app.get("/api/admin/settings", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();

  const settings = {};

  for (const row of rows) {
    settings[row.key] = row.value;
  }

  res.json(settings);
});

app.put("/api/admin/settings", requireAuth, (req, res) => {
  const settings = req.body || {};

  const allowedKeys = [
    "site_name",
    "site_description",
    "telegram_url",
    "contact",
    "contact_url",
    "instagram_url",
    "facebook_url",
    "youtube_url",
    "tiktok_url",
    "about_text",
    "editorial_policy",
    "cta_title",
    "cta_text"
  ];

  const statement = db.prepare(
    `
    INSERT INTO site_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `
  );

  const updateMany = db.transaction(() => {
    for (const key of allowedKeys) {
      if (typeof settings[key] === "string") {
        statement.run(key, settings[key].trim());
      }
    }
  });

  updateMany();

  res.json({
    ok: true
  });
});

/* =========================================================
   ADMIN API — REKLAMALAR
========================================================= */

app.get("/api/admin/advertisements", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM advertisements ORDER BY created_at DESC, id DESC")
    .all();

  res.json(rows);
});

app.post("/api/admin/advertisements", requireAuth, (req, res) => {
  const {
    title,
    description,
    company_name,
    image_url,
    target_url,
    label,
    status
  } = req.body || {};

  if (!title || !description) {
    return res.status(400).json({
      error: "Reklama sarlavhasi va tavsifi to'ldirilishi shart"
    });
  }

  const info = db
    .prepare(
      `
      INSERT INTO advertisements
      (title, description, company_name, image_url, target_url, label, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      title.trim(),
      description.trim(),
      (company_name || "").trim(),
      (image_url || "").trim(),
      (target_url || "").trim(),
      (label || "Reklama").trim(),
      status === "inactive" ? "inactive" : "active"
    );

  res.json({
    id: info.lastInsertRowid
  });
});

app.put("/api/admin/advertisements/:id", requireAuth, (req, res) => {
  const {
    title,
    description,
    company_name,
    image_url,
    target_url,
    label,
    status
  } = req.body || {};

  const exists = db
    .prepare("SELECT id FROM advertisements WHERE id = ?")
    .get(req.params.id);

  if (!exists) {
    return res.status(404).json({
      error: "Reklama topilmadi"
    });
  }

  if (!title || !description) {
    return res.status(400).json({
      error: "Reklama sarlavhasi va tavsifi to'ldirilishi shart"
    });
  }

  db.prepare(
    `
    UPDATE advertisements
    SET
      title = ?,
      description = ?,
      company_name = ?,
      image_url = ?,
      target_url = ?,
      label = ?,
      status = ?
    WHERE id = ?
  `
  ).run(
    title.trim(),
    description.trim(),
    (company_name || "").trim(),
    (image_url || "").trim(),
    (target_url || "").trim(),
    (label || "Reklama").trim(),
    status === "inactive" ? "inactive" : "active",
    req.params.id
  );

  res.json({
    ok: true
  });
});

app.delete("/api/admin/advertisements/:id", requireAuth, (req, res) => {
  const exists = db
    .prepare("SELECT id FROM advertisements WHERE id = ?")
    .get(req.params.id);

  if (!exists) {
    return res.status(404).json({
      error: "Reklama topilmadi"
    });
  }

  db.prepare("DELETE FROM advertisements WHERE id = ?").run(req.params.id);

  res.json({
    ok: true
  });
});

/* =========================================================
   ADMIN API — MUROJAATLAR
========================================================= */

app.get("/api/admin/appeals", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM appeals ORDER BY created_at DESC, id DESC")
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
      (name || "").trim(),
      (phone || "").trim(),
      region.trim(),
      topic.trim(),
      message.trim(),
      "new"
    );

  res.json({
    ok: true,
    id: info.lastInsertRowid
  });
});

app.put("/api/admin/appeals/:id/status", requireAuth, (req, res) => {
  const { status } = req.body || {};

  const allowedStatuses = ["new", "reviewing", "answered", "archived"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Noto'g'ri holat"
    });
  }

  const exists = db
    .prepare("SELECT id FROM appeals WHERE id = ?")
    .get(req.params.id);

  if (!exists) {
    return res.status(404).json({
      error: "Murojaat topilmadi"
    });
  }

  db.prepare("UPDATE appeals SET status = ? WHERE id = ?").run(
    status,
    req.params.id
  );

  res.json({
    ok: true
  });
});

/* =========================================================
   ADMIN API — PAROL
========================================================= */

app.post("/api/admin/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  const user = db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .get(req.session.username);

  if (
    !user ||
    !bcrypt.compareSync(currentPassword || "", user.password_hash)
  ) {
    return res.status(401).json({
      error: "Joriy parol noto'g'ri"
    });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      error: "Yangi parol kamida 8 belgidan iborat bo'lsin"
    });
  }

  const hash = bcrypt.hashSync(newPassword, 10);

  db.prepare(
    "UPDATE admin_users SET password_hash = ? WHERE username = ?"
  ).run(hash, req.session.username);

  res.json({
    ok: true
  });
});

/* =========================================================
   SAYT OCHILMAGAN MANZILLAR UCHUN
========================================================= */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================================================
   SERVER
========================================================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[QurilishInfo] Server ishga tushdi: http://0.0.0.0:${PORT}`);
});
