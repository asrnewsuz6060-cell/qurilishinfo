const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin paroli (xohlasangiz .env faylga ko'chirasiz)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qurilish2026';

// Tokenlar saqlanadigan joy (xotirada, server qayta ishga tushsa o'chadi)
const tokens = new Set();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Statik fayllar (public papkasi)
app.use(express.static(path.join(__dirname, 'public')));

// ---- YORDAMCHI FUNKSIYALAR ----
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(file, fallback = []) {
  try {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`O'qishda xato (${file}):`, err.message);
    return fallback;
  }
}

function writeData(file, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Yozishda xato (${file}):`, err.message);
    return false;
  }
}

// ---- TOKEN TEKSHIRUVI ----
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ message: 'Avtorizatsiya kerak' });
  }
  next();
}

// ============ LOGIN ============

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Parol noto\'g\'ri' });
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  tokens.add(token);
  
  res.json({ token });
});

// ============ MAQOLALAR ============

// Ommaviy: hamma maqolalarni olish (index.html uchun)
app.get('/api/articles', (req, res) => {
  res.json(readData('articles.json', []));
});

// Admin: bitta maqolani olish
app.get('/api/articles/:id', (req, res) => {
  const articles = readData('articles.json', []);
  const article = articles.find(a => String(a.id) === String(req.params.id));
  if (!article) return res.status(404).json({ message: 'Topilmadi' });
  res.json(article);
});

// Admin: yangi maqola qo'shish
app.post('/api/articles', checkAuth, (req, res) => {
  const articles = readData('articles.json', []);
  const newArticle = {
    id: Date.now(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  articles.push(newArticle);
  writeData('articles.json', articles);
  res.status(201).json(newArticle);
});

// Admin: maqolani tahrirlash
app.put('/api/articles/:id', checkAuth, (req, res) => {
  const articles = readData('articles.json', []);
  const index = articles.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Topilmadi' });
  
  articles[index] = {
    ...articles[index],
    ...req.body,
    id: articles[index].id,
    updated_at: new Date().toISOString()
  };
  writeData('articles.json', articles);
  res.json(articles[index]);
});

// Admin: maqolani o'chirish
app.delete('/api/articles/:id', checkAuth, (req, res) => {
  let articles = readData('articles.json', []);
  const before = articles.length;
  articles = articles.filter(a => String(a.id) !== String(req.params.id));
  if (articles.length === before) return res.status(404).json({ message: 'Topilmadi' });
  writeData('articles.json', articles);
  res.status(204).end();
});

// ============ REKLAMALAR ============

app.get('/api/advertisements', (req, res) => {
  res.json(readData('advertisements.json', []));
});

app.post('/api/advertisements', checkAuth, (req, res) => {
  const ads = readData('advertisements.json', []);
  const newAd = {
    id: Date.now(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  ads.push(newAd);
  writeData('advertisements.json', ads);
  res.status(201).json(newAd);
});

app.put('/api/advertisements/:id', checkAuth, (req, res) => {
  const ads = readData('advertisements.json', []);
  const index = ads.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Topilmadi' });
  
  ads[index] = { ...ads[index], ...req.body, id: ads[index].id };
  writeData('advertisements.json', ads);
  res.json(ads[index]);
});

app.delete('/api/advertisements/:id', checkAuth, (req, res) => {
  let ads = readData('advertisements.json', []);
  const before = ads.length;
  ads = ads.filter(a => String(a.id) !== String(req.params.id));
  if (ads.length === before) return res.status(404).json({ message: 'Topilmadi' });
  writeData('advertisements.json', ads);
  res.status(204).end();
});

// ============ SOZLAMALAR ============

app.get('/api/settings', (req, res) => {
  const settings = readData('settings.json', {
    site_name: 'QurilishInfo',
    site_tagline: 'Qurilishdagi to\'g\'ri qarorlar uchun amaliy ma\'lumot',
    site_description: 'Uy qurish, ruxsatnoma, smeta, ta\'mirlash va qurilishdagi huquqlar bo\'yicha amaliy ma\'lumotlar.',
    telegram_url: 'https://t.me/qurilishinfo',
    contact: '@qurilishinfo_admin',
    contact_url: 'https://t.me/qurilishinfo_admin'
  });
  res.json(settings);
});

app.put('/api/settings', checkAuth, (req, res) => {
  const current = readData('settings.json', {});
  const updated = { ...current, ...req.body };
  writeData('settings.json', updated);
  res.json(updated);
});

// ============ SAHIFALAR ============

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 — bosh sahifaga qaytarish
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🔐 Admin paroli: ${ADMIN_PASSWORD}`);
  console.log(`📁 Data papkasi: ${DATA_DIR}`);
});
