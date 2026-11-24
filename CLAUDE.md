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

## Stack dan cara menjalankan
- Stack: HTML + CSS + JavaScript murni, tanpa dependensi. Hasil akhir satu berkas `index.html`.
- Sumber: `src/engine.js` (aturan, tanpa DOM), `src/ui.js` (antarmuka), `src/style.css`, `src/template.html`.
- Rakit: `node build.js` (menghasilkan `index.html`; jangan sunting `index.html` langsung)
- Jalankan: buka `index.html` di browser
- Uji keseimbangan: `node test/sim.js` (bot memainkan 4 tahun; lihat kapan tiap pencapaian tercapai)
- Uji browser: `node test/smoke.js <folder-screenshot>` (butuh Playwright)
- Deploy: BELUM DIPUTUSKAN (saat ini diterbitkan sebagai artifact Claude)

## Data
- Tidak ada data luar. Simpanan pemain ada di localStorage (`kedai-rintisan-v1`) dan, bila tersedia, di penyimpanan akun artifact.

## Jangan diubah tanpa izin
- Format simpanan (`VERSION` di engine.js): mengubah bentuk state tanpa migrasi membuat simpanan pemain tidak terbaca.
- Angka keseimbangan di engine.js: setiap perubahan harus dicek ulang dengan `node test/sim.js`. Sasaran: bot pasif bertahan tipis, bot wajar buka cabang kedua sekitar hari 300 dan mencapai valuasi Rp 5 miliar di tahun ketiga.

## Cara kerja di repo ini
- Bahasa antarmuka dan komunikasi: Indonesia
- Commit dan push setiap satu bagian pekerjaan selesai dan sudah dicek
- Perbarui berkas ini bila aturan permainan atau cara menjalankan berubah
