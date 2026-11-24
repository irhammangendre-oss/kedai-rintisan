# Kedai Rintisan

## Tujuan
Game simulasi bisnis berbasis giliran harian: pemain menumbuhkan satu warung kopi menjadi jaringan waralaba. Untuk dimainkan sendiri oleh pemilik repo, di laptop, sesi panjang, nuansa santai tapi realistis.

## Pemakai dan peran
- Pemain tunggal. Tidak ada login dan tidak ada server.

## Aturan permainan (wajib benar)
- Kalender: 30 hari per bulan, 7 hari per minggu, hari 1 = 1 Mei (awal kemarau). Ramadan = Maret, libur Lebaran = 1–7 April.
- Pajak: omzet sampai Rp 500 juta setahun bebas; di atasnya PPh final 0,5% dari omzet; omzet 12 bulan > Rp 4,8 miliar → 22% dari laba bulanan. Contoh: omzet bulan ini Rp 60 juta dan omzet tahun berjalan sudah lewat Rp 500 juta → pajak Rp 300.000, dibayar tanggal 15.
- THR = 30 hari gaji, dibayar 20 Maret. Gaji dibayar tiap Sabtu, sewa tanggal 1, cicilan tanggal 5, biaya hidup pemilik Rp 3 juta tanggal 25.
- Bangkrut bila kas minus 14 hari berturut-turut (30 hari di mode Santai).
- "Harga wajar" = harga acuan menu × faktor lokasi × inflasi × (1 + (kualitas − 40)/200).
- Racikan per outlet (kopi, susu, gula; 70–140%, langkah 10): selera ideal tiap lokasi ada di `IDEAL` (engine.js) dan sengaja tidak ditampilkan ke pemain. Bonus kualitas = 5,5 − 0,2 × total selisih persen, dibatasi −10 sampai +5. Hujan menggeser ideal kopi +10, terik menggeser ideal susu +10. Contoh: Gang Kampung idealnya 100/100/120, jadi racikan standar 100/100/100 selisihnya 20 → bonus +1,5.
- Arah desain: mekanik genre kios minuman (racikan, komentar pelanggan, cuaca) boleh dipakai, tetapi jangan meniru nama, gambar, tampilan, atau musik game lain.

## Stack dan cara menjalankan
- Stack: HTML + CSS + JavaScript murni. Hasil akhir satu berkas `index.html`. Library gerak dimuat dari CDN dan semuanya opsional (game tetap jalan tanpa internet): GSAP 3.12.5 + ScrollTrigger, Motion 12.23.24, Lenis 1.1.20.
- Sumber: `src/engine.js` (aturan, tanpa DOM), `src/ui.js` (antarmuka), `src/scene.js` (adegan kanvas: toko, kerumunan, cuaca), `src/audio.js` (musik dan efek suara disintesis dengan Web Audio, tanpa berkas audio), `src/motion-kit.js` (salinan dari skill web-motion-kit, jangan diubah), `src/style.css`, `src/template.html`.
- Pembagian peran gerak: GSAP untuk judul per kata, angka kas, dan struk; Motion untuk kartu masuk dan hover; Lenis untuk scroll halus pada `#view`. Jangan menganimasikan satu elemen dengan dua library.
- Rakit: `node build.js` (menghasilkan `index.html`; jangan sunting `index.html` langsung)
- Jalankan: buka `index.html` di browser
- Uji keseimbangan: `node test/sim.js` (bot memainkan 4 tahun; lihat kapan tiap pencapaian tercapai)
- Uji browser: `node test/smoke.js <folder-screenshot> <folder node_modules berisi gsap, motion, lenis>` (butuh Playwright; CDN dialihkan ke salinan lokal)
- Deploy: BELUM DIPUTUSKAN (saat ini diterbitkan sebagai artifact Claude)

## Data
- Tidak ada data luar. Simpanan pemain ada di localStorage (`kedai-rintisan-v1`) dan, bila tersedia, di penyimpanan akun artifact.

## Jangan diubah tanpa izin
- Format simpanan (`VERSION` di engine.js): mengubah bentuk state tanpa migrasi membuat simpanan pemain tidak terbaca.
- Angka keseimbangan di engine.js: setiap perubahan harus dicek ulang dengan `node test/sim.js`. Sasaran: bot pasif bertahan tipis, bot wajar buka cabang kedua sekitar hari 400 dan mencapai valuasi Rp 5 miliar di tahun ketiga.

## Cara kerja di repo ini
- Bahasa antarmuka dan komunikasi: Indonesia
- Commit dan push setiap satu bagian pekerjaan selesai dan sudah dicek
- Perbarui berkas ini bila aturan permainan atau cara menjalankan berubah
