const express = require("express");
const cors = require("cors");
const path = require("path");
const { openDatabase, initializeDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = openDatabase();
initializeDatabase(db);

// ==================== YORDAMCHI FUNKSIYALAR ====================

function getSetting(key, lang = "uz") {
  const row = db.prepare("SELECT value_uz, value_ru FROM settings WHERE key = ?").get(key);

  if (!row) {
    return "";
  }

  return lang === "ru" ? (row.value_ru || row.value_uz || "") : (row.value_uz || row.value_ru || "");
}

function getTranslation(key, lang = "uz") {
  const row = db.prepare("SELECT value_uz, value_ru FROM translations WHERE key = ?").get(key);

  if (!row) {
    return key;
  }

  return lang === "ru" ? (row.value_ru || row.value_uz || key) : (row.value_uz || row.value_ru || key);
}

// ==================== SETTINGS ====================

app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value_uz, value_ru FROM settings").all();
  const settings = {};

  for (const row of rows) {
    settings[row.key] = row.value_uz || row.value_ru || "";
  }

  res.json(settings);
});

app.post("/api/settings/update", (req, res) => {
  const data = req.body;

  const update = db.prepare(`
    INSERT INTO settings (key, value_uz, value_ru)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value_uz = excluded.value_uz,
      value_ru = excluded.value_ru
  `);

  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith("_uz")) {
      const ruKey = key.replace("_uz", "_ru");
      const ruValue = data[ruKey] || null;
      update.run(key, value, ruValue);
    } else if (!key.endsWith("_ru")) {
      update.run(key, value, null);
    }
  }

  res.json({ success: true });
});

// ==================== CATEGORIES ====================

app.get("/api/categories", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM categories
    ORDER BY sort_order ASC, id ASC
  `).all();

  res.json(rows);
});

app.post("/api/categories/create", (req, res) => {
  const { name_uz, name_ru, slug, color, is_active, sort_order } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO categories (name_uz, name_ru, slug, color, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name_uz, name_ru, slug, color, is_active ? 1 : 0, sort_order || 0);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/categories/update", (req, res) => {
  const { id, name_uz, name_ru, slug, color, is_active, sort_order } = req.body;

  try {
    db.prepare(`
      UPDATE categories
      SET name_uz = ?, name_ru = ?, slug = ?, color = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `).run(name_uz, name_ru, slug, color, is_active ? 1 : 0, sort_order || 0, id);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/categories/delete", (req, res) => {
  const { id } = req.body;

  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/categories/reorder", (req, res) => {
  const { categories } = req.body; // [{id, sort_order}]

  const update = db.prepare(`
    UPDATE categories SET sort_order = ? WHERE id = ?
  `);

  const transaction = db.transaction((items) => {
    for (const item of items) {
      update.run(item.sort_order, item.id);
    }
  });

  transaction(categories);
  res.json({ success: true });
});

// ==================== ARTICLES ====================

app.get("/api/articles", (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, c.name_uz as category_name_uz, c.name_ru as category_name_ru, c.slug as category_slug
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    ORDER BY a.published_at DESC, a.created_at DESC, a.id DESC
  `).all();

  res.json(rows);
});

app.post("/api/articles/create", (req, res) => {
  const {
    title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
    lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
    image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
    source_name_uz, source_name_ru, source_url, document_no, updated,
    published_at, tags, is_featured, is_pinned, is_advertisement
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO articles (
        title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
        lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
        image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
        source_name_uz, source_name_ru, source_url, document_no, updated,
        published_at, tags, is_featured, is_pinned, is_advertisement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
      lead_uz, lead_ru, body_uz, body_ru, author, minutes || 5, image_url,
      image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
      source_name_uz, source_name_ru, source_url, document_no, updated,
      published_at, tags, is_featured ? 1 : 0, is_pinned ? 1 : 0, is_advertisement ? 1 : 0
    );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/articles/update", (req, res) => {
  const {
    id, title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
    lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
    image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
    source_name_uz, source_name_ru, source_url, document_no, updated,
    published_at, tags, is_featured, is_pinned, is_advertisement
  } = req.body;

  try {
    db.prepare(`
      UPDATE articles SET
        title_uz = ?, title_ru = ?, slug_uz = ?, slug_ru = ?, category_id = ?,
        article_type = ?, status = ?, lead_uz = ?, lead_ru = ?, body_uz = ?, body_ru = ?,
        author = ?, minutes = ?, image_url = ?, image_caption_uz = ?, image_caption_ru = ?,
        steps = ?, warning_uz = ?, warning_ru = ?, source_name_uz = ?, source_name_ru = ?,
        source_url = ?, document_no = ?, updated = ?, published_at = ?, tags = ?,
        is_featured = ?, is_pinned = ?, is_advertisement = ?
      WHERE id = ?
    `).run(
      title_uz, title_ru, slug_uz, slug_ru, category_id,
      article_type, status, lead_uz, lead_ru, body_uz, body_ru,
      author, minutes || 5, image_url, image_caption_uz, image_caption_ru,
      steps, warning_uz, warning_ru, source_name_uz, source_name_ru,
      source_url, document_no, updated, published_at, tags,
      is_featured ? 1 : 0, is_pinned ? 1 : 0, is_advertisement ? 1 : 0,
      id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/articles/delete", (req, res) => {
  const { id } = req.body;

  db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  res.json({ success: true });
});

// ==================== ADVERTISEMENTS ====================

app.get("/api/advertisements", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM advertisements
    ORDER BY created_at DESC, id DESC
  `).all();

  res.json(rows);
});

app.post("/api/advertisements/create", (req, res) => {
  const {
    title_uz, title_ru, description_uz, description_ru, company_name,
    label, image_url, target_url, status, starts_at, ends_at
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO advertisements (
        title_uz, title_ru, description_uz, description_ru, company_name,
        label, image_url, target_url, status, starts_at, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at
    );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/advertisements/update", (req, res) => {
  const {
    id, title_uz, title_ru, description_uz, description_ru, company_name,
    label, image_url, target_url, status, starts_at, ends_at
  } = req.body;

  try {
    db.prepare(`
      UPDATE advertisements SET
        title_uz = ?, title_ru = ?, description_uz = ?, description_ru = ?,
        company_name = ?, label = ?, image_url = ?, target_url = ?,
        status = ?, starts_at = ?, ends_at = ?
      WHERE id = ?
    `).run(
      title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at, id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/advertisements/delete", (req, res) => {
  const { id } = req.body;

  db.prepare("DELETE FROM advertisements WHERE id = ?").run(id);
  res.json({ success: true });
});

// ==================== TRANSLATIONS ====================

app.get("/api/translations", (req, res) => {
  const rows = db.prepare("SELECT * FROM translations").all();
  res.json(rows);
});

app.post("/api/translations/update", (req, res) => {
  const { key, value_uz, value_ru } = req.body;

  try {
    db.prepare(`
      INSERT INTO translations (key, value_uz, value_ru)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_uz = excluded.value_uz,
        value_ru = excluded.value_ru
    `).run(key, value_uz, value_ru);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== SAYT UCHUN QO‘SHIMCHA API ====================

// Sayt uchun maqolalar (faqat published, lang bilan)
app.get("/api/site/articles", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "uz";
  const category = req.query.category;
  const query = req.query.q || "";

  let sql = `
    SELECT a.*, c.name_uz as category_name_uz, c.name_ru as category_name_ru, c.slug as category_slug, c.color as category_color
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'published'
  `;

  const params = [];

  if (category && category !== "Barchasi") {
    sql += ` AND c.name_${lang} = ?`;
    params.push(category);
  }

  if (query) {
    sql += ` AND (a.title_${lang} LIKE ? OR a.lead_${lang} LIKE ? OR a.body_${lang} LIKE ?)`;
    const likeQuery = `%${query}%`;
    params.push(likeQuery, likeQuery, likeQuery);
  }

  sql += ` ORDER BY a.published_at DESC, a.created_at DESC, a.id DESC`;

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Sayt uchun kategoriyalar (faqat active, lang bilan)
app.get("/api/site/categories", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "uz";

  const rows = db.prepare(`
    SELECT id, name_${lang} as name, slug, color, sort_order
    FROM categories
    WHERE is_active = 1
    ORDER BY sort_order ASC, id ASC
  `).all();

  res.json(rows);
});

// Sayt uchun sozlamalar (lang bilan)
app.get("/api/site/settings", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "uz";

  const rows = db.prepare("SELECT key, value_uz, value_ru FROM settings").all();
  const settings = {};

  for (const row of rows) {
    const value = lang === "ru" ? (row.value_ru || row.value_uz || "") : (row.value_uz || row.value_ru || "");
    settings[row.key] = value;
  }

  res.json(settings);
});

// Sayt uchun tarjimalar (lang bilan)
app.get("/api/site/translations", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "uz";

  const rows = db.prepare("SELECT key, value_uz, value_ru FROM translations").all();
  const translations = {};

  for (const row of rows) {
    const value = lang === "ru" ? (row.value_ru || row.value_uz || row.key) : (row.value_uz || row.value_ru || row.key);
    translations[row.key] = value;
  }

  res.json(translations);
});

// Sayt uchun reklamalar (faqat active, lang bilan)
app.get("/api/site/advertisements", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "uz";
  const now = new Date().toISOString();

  const rows = db.prepare(`
    SELECT id, title_${lang} as title, description_${lang} as description, company_name, label, image_url, target_url
    FROM advertisements
    WHERE status = 'active'
      AND (starts_at IS NULL OR starts_at <= ?)
      AND (ends_at IS NULL OR ends_at >= ?)
    ORDER BY created_at DESC, id DESC
  `).all(now, now);

  res.json(rows);
});

// ==================== SERVER ISHGA TUSHIRISH ====================

app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
