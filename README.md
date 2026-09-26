# QurilishInfo — backend (SQLite + admin panel)

## Ichida nima bor
- `server.js` — Express server, ochiq API va admin API
- `db.js` — SQLite bazani yaratadi, birinchi ishga tushganda admin va namunaviy maqolalarni qo'shadi
- `public/index.html` — saytning o'zi (maqolalarni bazadan avtomatik oladi)
- `public/admin.html` — admin panel: `/admin.html` manzilida ochiladi
- `data.sqlite` — server birinchi marta ishga tushganda avtomatik yaratiladi (bazaning o'zi)

## MUHIM: qanday hosting kerak
Bu endi statik HTML emas, **Node.js dasturi**. Oddiy arzon "statik sayt" hostingda (faqat fayl joylashtiriladigan turdagi) ishlamaydi.
Kerak bo'ladigan hosting turi: **Node.js'ni ishga tushira oladigan server** — masalan VPS (virtual server) yoki Node'ni qo'llab-quvvatlaydigan platforma. Buyurtma berishdan oldin hosting provayderdan aniq: "Node.js ilovasini ishga tushirish mumkinmi?" deb so'rang.

## Kompyuteringizda sinab ko'rish
1. [Node.js](https://nodejs.org) o'rnatilgan bo'lishi kerak (16-versiyadan yuqori).
2. Terminalda loyihaning ichiga kiring:
   ```
   cd qurilishinfo-backend
   npm install
   ```
3. `.env.example` faylidan nusxa oling va nomini `.env` deb o'zgartiring, ichidagi qiymatlarni to'ldiring (ayniqsa `ADMIN_PASSWORD`).
4. Serverni ishga tushiring:
   ```
   npm start
   ```
5. Brauzerda oching: `http://localhost:3000` — sayt, `http://localhost:3000/admin.html` — admin panel.
6. Birinchi kirishda `.env` faylidagi `ADMIN_USERNAME` / `ADMIN_PASSWORD` bilan kiring, so'ng darhol "Parolni almashtirish" orqali parolni o'zgartiring.

## Serverga (hostingga) chiqarish — umumiy tartib
1. Butun `qurilishinfo-backend` papkasini serverga yuklang (Git orqali yoki fayl menejeri bilan).
2. Serverda `.env` faylini yarating (`.env.example` asosida), maxfiy qiymatlarni to'ldiring.
3. Serverda: `npm install` so'ng `npm start` (yoki hosting sizga ko'rsatgan "ilovani ishga tushirish" usuli bilan — ko'p platformalar buni avtomatik qiladi, faqat start buyrug'ini `npm start` deb ko'rsatasiz).
4. Hosting odatda ilovani biror portda ishga tushiradi va shu portni domeningizga ulaydi — bu qism hostingga qarab farq qiladi, aniq qadamlarni tanlagan hosting/platforma nomini ayting, o'shanga moslab ko'rsataman.
5. Domeningizni (`qurilishinfo.uz`) shu ilova ishlab turgan manzilga yo'naltirasiz (odatda hosting DNS ko'rsatmasini beradi).

## Zaxira nusxa (backup)
Barcha maqolalar `data.sqlite` faylida saqlanadi. Bu faylni muntazam (masalan haftada bir marta) nusxalab, alohida joyda saqlab qo'ying — server buzilib qolsa, maqolalar yo'qolmaydi.

## Xavfsizlik bo'yicha eslatmalar
- `.env` faylini hech qachon ochiq joyga (masalan GitHub'ning ochiq repozitoriyasiga) yuklamang.
- Birinchi kirishdanoq admin parolini albatta almashtiring.
- `SESSION_SECRET` qiymatini uzun va tasodifiy qatorga o'zgartiring.
