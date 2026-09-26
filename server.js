// server.js — QurilishInfo backend: ochiq API + admin uchun himoyalangan API
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'qurilishinfo-vaqtinchalik-kalit-almashtiring',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 } // 8 soat
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Tizimga kirish talab qilinadi' });
}

/* ---------- Ochiq API (sayt uchun) ---------- */

app.get('/api/articles', (req, res) => {
  const cat = req.query.category;
  const rows = cat && cat !== 'Barchasi'
    ? db.prepare('SELECT * FROM articles WHERE category = ? ORDER BY created_at DESC, id DESC').all(cat)
    : db.prepare('SELECT * FROM articles ORDER BY created_at DESC, id DESC').all();
  res.json(rows);
});

app.get('/api/articles/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Maqola topilmadi' });
  res.json(row);
});

/* ---------- Kirish / chiqish ---------- */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

/* ---------- Admin API (himoyalangan) ---------- */

app.get('/api/admin/articles', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM articles ORDER BY created_at DESC, id DESC').all());
});

app.post('/api/admin/articles', requireAuth, (req, res) => {
  const { category, title, lead, body, minutes } = req.body || {};
  if (!category || !title || !lead || !body) {
    return res.status(400).json({ error: "Bo'lim, sarlavha, qisqacha va matn to'ldirilishi shart" });
  }
  const info = db.prepare('INSERT INTO articles (category, title, lead, body, minutes) VALUES (?, ?, ?, ?, ?)')
    .run(category, title, lead, body, Number(minutes) || 5);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/admin/articles/:id', requireAuth, (req, res) => {
  const { category, title, lead, body, minutes } = req.body || {};
  const exists = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Maqola topilmadi' });
  db.prepare('UPDATE articles SET category=?, title=?, lead=?, body=?, minutes=? WHERE id=?')
    .run(category, title, lead, body, Number(minutes) || 5, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/articles/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(req.session.username);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: "Joriy parol noto'g'ri" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Yangi parol kamida 8 belgidan iborat bo'lsin" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, req.session.username);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('[QurilishInfo] Server ishga tushdi: http://localhost:' + PORT);
});
