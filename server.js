const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Statik fayllar (public papkasi)
app.use(express.static(path.join(__dirname, 'public')));

// ---- YORDAMCHI FUNKSIYALAR ----
const DATA_DIR = path.join(__dirname, 'data');

function readData(file, fallback = []) {
  try {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Xato (${file}):`, err.message);
    return fallback;
  }
}

function writeData(file, data) {
  try {
    const filePath = path.join(DATA_DIR, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Yozishda xato (${file}):`, err.message);
    return false;
  }
}

// data papkasi mavjud bo'lmasa — yaratish
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ---- API: MAQOLALAR ----

// Barcha maqolalarni olish
app.get('/api/articles', (req, res) => {
  const articles = readData('articles.json', []);
  res.json(articles);
});

// Bitta maqolani olish
app.get('/api/articles/:id', (req, res) => {
  const articles = readData('articles.json', []);
  const article = articles.find(a => String(a.id) === String(req.params.id));
  
  if (!article) {
    return res.status(404).json({ error: 'Maqola topilmadi' });
  }
  res.json(article);
});

// Yangi maqola qo'shish (admin)
app.post('/api/articles', (req, res) => {
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

// Maqolani yangilash (admin)
app.put('/api/articles/:id', (req, res) => {
  const articles = readData('articles.json', []);
  const index = articles.findIndex(a => String(a.id) === String(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Maqola topilmadi' });
  }
  
  articles[index] = {
    ...articles[index],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  writeData('articles.json', articles);
  res.json(articles[index]);
});

// Maqolani o'chirish (admin)
app.delete('/api/articles/:id', (req, res) => {
  let articles = readData('articles.json', []);
  const initialLength = articles.length;
  articles = articles.filter(a => String(a.id) !== String(req.params.id));
  
  if (articles.length === initialLength) {
    return res.status(404).json({ error: 'Maqola topilmadi' });
  }
  
  writeData('articles.json', articles);
  res.json({ success: true });
});

// ---- API: SOZLAMALAR ----

app.get('/api/settings', (req, res) => {
  const settings = readData('settings.json', {
    site_name: 'QurilishInfo',
    site_tagline: 'Qurilishdagi to\'g\'ri qarorlar uchun amaliy ma\'lumot',
    telegram_url: 'https://t.me/qurilishinfo',
    contact: '@qurilishinfo_admin',
    contact_url: 'https://t.me/qurilishinfo_admin'
  });
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const current = readData('settings.json', {});
  const updated = { ...current, ...req.body };
  writeData('settings.json', updated);
  res.json(updated);
});

// ---- API: REKLAMALAR ----

app.get('/api/advertisements', (req, res) => {
  const ads = readData('advertisements.json', []);
  res.json(ads);
});

app.post('/api/advertisements', (req, res) => {
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

// ---- QO'SHIMCHA API: QIDIRUV ----

app.get('/api/search', (req, res) => {
  const query = String(req.query.q || '').toLowerCase().trim();
  
  if (!query) {
    return res.json({ articles: [], laws: [], fines: [], organizations: [] });
  }
  
  const articles = readData('articles.json', []);
  const laws = readData('laws.json', []);
  const fines = readData('fines.json', []);
  const organizations = readData('organizations.json', []);
  
  function matches(item) {
    const text = Object.values(item).join(' ').toLowerCase();
    return text.includes(query);
  }
  
  res.json({
    articles: articles.filter(matches).slice(0, 10),
    laws: laws.filter(matches).slice(0, 10),
    fines: fines.filter(matches).slice(0, 10),
    organizations: organizations.filter(matches).slice(0, 10)
  });
});

// ---- ADMIN SAHIFASI ----

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---- BOSH SAHIFA ----

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- 404 ----

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`📁 Data papkasi: ${DATA_DIR}`);
});
