// db.js — SQLite bazasini yaratadi va boshlang'ich ma'lumot bilan to'ldiradi.
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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
`);

function seedAdmin() {
  const existing = db.prepare('SELECT * FROM admin_users LIMIT 1').get();
  if (existing) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change-me-123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log('[QurilishInfo] Admin yaratildi: ' + username + ' / ' + password + ' — darhol almashtiring!');
}

function seedArticles() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM articles').get().c;
  if (count > 0) return;

  const p = (arr) => arr.join('\n\n');
  const seed = [
    { category: 'Ruxsatnoma', title: "Uy qurish uchun ruxsatnoma: qayerdan boshlash kerak", lead: "Qurilishni boshlashdan oldin qaysi bosqichlardan o'tish kerakligi haqida umumiy yo'l xaritasi.", minutes: 6, body: p([
      "Uy qurishni boshlashdan oldin yer uchastkasi hujjatlari va qurilish loyihasi tayyor bo'lishi kerak.",
      "Birinchi qadam: yer uchastkasining maqsadli vazifasi hujjatda qanday yozilganini tekshirish.",
      "Keyingi qadam: mahalliy arxitektura va qurilish organiga murojaat qilib, aniq hujjatlar ro'yxatini so'rash."
    ])},
    { category: 'Uy sotib olish', title: "Yangi qurilgan uyni sotib olishdan oldin tekshiriladigan narsalar", lead: "Hujjatlar va binoning holati bo'yicha xaridor uchun oddiy tekshiruv ro'yxati.", minutes: 7, body: p([
      "Sotuvchi yoki quruvchi kompaniyaning barcha hujjatlarini so'rang: yerga va binoga egalik, qurilishga ruxsat, foydalanishga topshirilgani haqidagi hujjat.",
      "Binoni o'zingiz ko'zdan kechiring: devor va shiftda yoriq, namlik izlari, deraza va eshiklarning yopilishi.",
      "Shubhali joy bo'lsa, mustaqil mutaxassisdan ko'rik o'tkazishni so'rash pulingizni himoya qiladi."
    ])},
    { category: 'Uy qurish', title: "Uy qurish xarajatini oldindan qanday hisoblash mumkin", lead: "Loyiha, material, ish haqi va kutilmagan xarajatlar uchun zaxira.", minutes: 6, body: p([
      "Xarajatni guruhlarga bo'ling: loyiha va hujjatlar, poydevor va karkas, tom, pardozlash, kommunikatsiyalar.",
      "Har guruh uchun kamida ikki-uch ustadan alohida narx oling va yozma saqlang.",
      "Kutilmagan xarajatlar uchun umumiy summaning bir qismini zaxira sifatida ajrating."
    ])},
    { category: 'Materiallar', title: "Qurilish materialini tanlashda ko'p qilinadigan xatolar", lead: "Narx va sifat o'rtasida to'g'ri tanlov qilish uchun nimalarga qarash kerak.", minutes: 5, body: p([
      "Faqat arzon narxga qarab tanlamang, material sertifikatini so'rang.",
      "Bir necha do'kondan bir xil o'lcham va markadagi mahsulotlarni solishtiring.",
      "Kerak bo'lgandan biroz ko'proq oling, keyin xuddi shu partiyani topish qiyin bo'lishi mumkin."
    ])},
    { category: 'Savol-javob', title: "Usta bilan shartnoma tuzishda nimalar yozilishi kerak", lead: "Ish hajmi, muddat, to'lov va kafolat bandlarini aniq belgilash.", minutes: 5, body: p([
      "Og'zaki kelishuv o'rniga yozma shartnoma tuzing: ish turi, hajmi, muddat va narx aniq yozilsin.",
      "To'lovni bosqichlarga bo'lish yaxshi: har tugagan bosqichdan keyin to'lanadi.",
      "Kafolat muddati va kamchilik chiqsa kim tuzatishi ham shartnomada yozilsin."
    ])},
    { category: 'Ruxsatnoma', title: "Ta'mirlashda ruxsat kerak bo'ladimi", lead: "Oddiy ta'mirlash va konstruksiyaga tegadigan o'zgartirishning farqi.", minutes: 5, body: p([
      "Bo'yash, pol almashtirish odatda konstruksiyaga tegmaydi, lekin devor buzish boshqa masala.",
      "Yuk ko'taruvchi devorga tegishdan oldin mutaxassis xulosasi va ruxsat haqida aniqlab oling.",
      "Ko'p qavatli uyda umumiy qismlarga ta'sir qiluvchi ishlar qo'shimcha tartibga ega bo'lishi mumkin."
    ])},
    { category: 'Uy qurish', title: "Qurilish bosqichlari: poydevordan tomgacha", lead: "Qurilish ketma-ketligi va har bosqichda nimani nazorat qilish kerak.", minutes: 8, body: p([
      "Odatda ketma-ketlik: loyiha, yer ishlari va poydevor, devor va karkas, tom, kommunikatsiyalar, pardozlash.",
      "Har bosqich tugagach keyingisiga o'tishdan oldin ishning sifatini tekshiring.",
      "Fotosuratlar va yozuvlar saqlang, keyinchalik nizo chiqsa yordam beradi."
    ])},
    { category: 'Yangiliklar', title: "Qurilish sohasidagi qonun o'zgarishlarini qanday kuzatish kerak", lead: "Yangi qoidalardan xabardor bo'lish uchun ishonchli manbalar.", minutes: 4, body: p([
      "Rasmiy huquqiy hujjatlar bazasi va tegishli idoralarning ochiq e'lonlarini muntazam kuzating.",
      "Ijtimoiy tarmoqdagi gaplarga emas, hujjatning o'ziga qarang: kuchga kirgan sana muhim.",
      "Har bir yangilik yonida manba havolasi bo'lishi ishonchni oshiradi."
    ])}
  ];

  const insert = db.prepare('INSERT INTO articles (category, title, lead, body, minutes) VALUES (@category, @title, @lead, @body, @minutes)');
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(seed);
  console.log('[QurilishInfo] ' + seed.length + ' ta boshlang\'ich maqola qo\'shildi.');
}

seedAdmin();
seedArticles();

module.exports = db;
