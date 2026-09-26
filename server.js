const express = require("express");
const cors = require("cors");
const path = require("path");
const { openDatabase, initializeDatabase, runSql, getSql, allSql } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

async function startServer() {
  db = await openDatabase();
  await initializeDatabase(db);

  // ==================== SETTINGS ====================

  app.get("/api/settings", (req, res) => {
    allSql(db, "SELECT key, value_uz, value_ru FROM settings")
      .then((rows) => {
        const settings = {};
        for (const row of rows) {
          settings[row.key] = row.value_uz || row.value_ru || "";
        }
        res.json(settings);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.post("/api/settings/update", (req, res) => {
    const data = req.body;
    const promises = [];

    for (const [key, value] of Object.entries(data)) {
      if (key.endsWith("_uz")) {
        const ruKey = key.replace("_uz", "_ru");
        const ruValue = data[ruKey] || null;
        promises.push(
          runSql(db, `
            INSERT OR REPLACE INTO settings (key, value_uz, value_ru)
            VALUES (?, ?, ?)
          `, [key, value, ruValue])
        );
      } else if (!key.endsWith("_ru")) {
        promises.push(
          runSql(db, `
            INSERT OR REPLACE INTO settings (key, value_uz, value_ru)
            VALUES (?, ?, ?)
          `, [key, value, null])
        );
      }
    }

    Promise.all(promises)
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
  });

  // ==================== CATEGORIES ====================

  app.get("/api/categories", (req, res) => {
    allSql(db, `
      SELECT * FROM categories
      ORDER BY sort_order ASC, id ASC
    `)
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.post("/api/categories/create", (req, res) => {
    const { name_uz, name_ru, slug, color, is_active, sort_order } = req.body;

    runSql(db, `
      INSERT INTO categories (name_uz, name_ru, slug, color, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name_uz, name_ru, slug, color, is_active ? 1 : 0, sort_order || 0])
      .then(function () {
        res.json({ success: true, id: this.lastID });
      })
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/categories/update", (req, res) => {
    const { id, name_uz, name_ru, slug, color, is_active, sort_order } = req.body;

    runSql(db, `
      UPDATE categories
      SET name_uz = ?, name_ru = ?, slug = ?, color = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `, [name_uz, name_ru, slug, color, is_active ? 1 : 0, sort_order || 0, id])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/categories/delete", (req, res) => {
    const { id } = req.body;

    runSql(db, "DELETE FROM categories WHERE id = ?", [id])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
  });

  app.post("/api/categories/reorder", (req, res) => {
    const { categories } = req.body;

    const promises = categories.map((item) =>
      runSql(db, "UPDATE categories SET sort_order = ? WHERE id = ?", [item.sort_order, item.id])
    );

    Promise.all(promises)
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
  });

  // ==================== ARTICLES ====================

  app.get("/api/articles", (req, res) => {
    allSql(db, `
      SELECT a.*, c.name_uz as category_name_uz, c.name_ru as category_name_ru, c.slug as category_slug
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.published_at DESC, a.created_at DESC, a.id DESC
    `)
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.post("/api/articles/create", (req, res) => {
    const {
      title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
      lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
      image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
      source_name_uz, source_name_ru, source_url, document_no, updated,
      published_at, tags, is_featured, is_pinned, is_advertisement
    } = req.body;

    runSql(db, `
      INSERT INTO articles (
        title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
        lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
        image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
        source_name_uz, source_name_ru, source_url, document_no, updated,
        published_at, tags, is_featured, is_pinned, is_advertisement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
      lead_uz, lead_ru, body_uz, body_ru, author, minutes || 5, image_url,
      image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
      source_name_uz, source_name_ru, source_url, document_no, updated,
      published_at, tags, is_featured ? 1 : 0, is_pinned ? 1 : 0, is_advertisement ? 1 : 0
    ])
      .then(function () {
        res.json({ success: true, id: this.lastID });
      })
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/articles/update", (req, res) => {
    const {
      id, title_uz, title_ru, slug_uz, slug_ru, category_id, article_type, status,
      lead_uz, lead_ru, body_uz, body_ru, author, minutes, image_url,
      image_caption_uz, image_caption_ru, steps, warning_uz, warning_ru,
      source_name_uz, source_name_ru, source_url, document_no, updated,
      published_at, tags, is_featured, is_pinned, is_advertisement
    } = req.body;

    runSql(db, `
      UPDATE articles SET
        title_uz = ?, title_ru = ?, slug_uz = ?, slug_ru = ?, category_id = ?,
        article_type = ?, status = ?, lead_uz = ?, lead_ru = ?, body_uz = ?, body_ru = ?,
        author = ?, minutes = ?, image_url = ?, image_caption_uz = ?, image_caption_ru = ?,
        steps = ?, warning_uz = ?, warning_ru = ?, source_name_uz = ?, source_name_ru = ?,
        source_url = ?, document_no = ?, updated = ?, published_at = ?, tags = ?,
        is_featured = ?, is_pinned = ?, is_advertisement = ?
      WHERE id = ?
    `, [
      title_uz, title_ru, slug_uz, slug_ru, category_id,
      article_type, status, lead_uz, lead_ru, body_uz, body_ru,
      author, minutes || 5, image_url, image_caption_uz, image_caption_ru,
      steps, warning_uz, warning_ru, source_name_uz, source_name_ru,
      source_url, document_no, updated, published_at, tags,
      is_featured ? 1 : 0, is_pinned ? 1 : 0, is_advertisement ? 1 : 0,
      id
    ])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/articles/delete", (req, res) => {
    const { id } = req.body;

    runSql(db, "DELETE FROM articles WHERE id = ?", [id])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
  });

  // ==================== ADVERTISEMENTS ====================

  app.get("/api/advertisements", (req, res) => {
    allSql(db, `
      SELECT * FROM advertisements
      ORDER BY created_at DESC, id DESC
    `)
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.post("/api/advertisements/create", (req, res) => {
    const {
      title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at
    } = req.body;

    runSql(db, `
      INSERT INTO advertisements (
        title_uz, title_ru, description_uz, description_ru, company_name,
        label, image_url, target_url, status, starts_at, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at
    ])
      .then(function () {
        res.json({ success: true, id: this.lastID });
      })
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/advertisements/update", (req, res) => {
    const {
      id, title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at
    } = req.body;

    runSql(db, `
      UPDATE advertisements SET
        title_uz = ?, title_ru = ?, description_uz = ?, description_ru = ?,
        company_name = ?, label = ?, image_url = ?, target_url = ?,
        status = ?, starts_at = ?, ends_at = ?
      WHERE id = ?
    `, [
      title_uz, title_ru, description_uz, description_ru, company_name,
      label, image_url, target_url, status, starts_at, ends_at, id
    ])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  app.post("/api/advertisements/delete", (req, res) => {
    const { id } = req.body;

    runSql(db, "DELETE FROM advertisements WHERE id = ?", [id])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
  });

  // ==================== TRANSLATIONS ====================

  app.get("/api/translations", (req, res) => {
    allSql(db, "SELECT * FROM translations")
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.post("/api/translations/update", (req, res) => {
    const { key, value_uz, value_ru } = req.body;

    runSql(db, `
      INSERT OR REPLACE INTO translations (key, value_uz, value_ru)
      VALUES (?, ?, ?)
    `, [key, value_uz, value_ru])
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
      });
  });

  // ==================== SAYT UCHUN QO‘SHIMCHA API ====================

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

    allSql(db, sql, params)
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.get("/api/site/categories", (req, res) => {
    const lang = req.query.lang === "ru" ? "ru" : "uz";

    allSql(db, `
      SELECT id, name_${lang} as name, slug, color, sort_order
      FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `)
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.get("/api/site/settings", (req, res) => {
    const lang = req.query.lang === "ru" ? "ru" : "uz";

    allSql(db, "SELECT key, value_uz, value_ru FROM settings")
      .then((rows) => {
        const settings = {};
        for (const row of rows) {
          const value = lang === "ru" ? (row.value_ru || row.value_uz || "") : (row.value_uz || row.value_ru || "");
          settings[row.key] = value;
        }
        res.json(settings);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.get("/api/site/translations", (req, res) => {
    const lang = req.query.lang === "ru" ? "ru" : "uz";

    allSql(db, "SELECT key, value_uz, value_ru FROM translations")
      .then((rows) => {
        const translations = {};
        for (const row of rows) {
          const value = lang === "ru" ? (row.value_ru || row.value_uz || row.key) : (row.value_uz || row.value_ru || row.key);
          translations[row.key] = value;
        }
        res.json(translations);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  app.get("/api/site/advertisements", (req, res) => {
    const lang = req.query.lang === "ru" ? "ru" : "uz";
    const now = new Date().toISOString();

    allSql(db, `
      SELECT id, title_${lang} as title, description_${lang} as description, company_name, label, image_url, target_url
      FROM advertisements
      WHERE status = 'active'
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at >= ?)
      ORDER BY created_at DESC, id DESC
    `, [now, now])
      .then((rows) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Database error" });
      });
  });

  // ==================== SERVER ISHGA TUSHIRISH ====================

  app.listen(PORT, () => {
    console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server ishga tushishda xato:", err);
  process.exit(1);
});
