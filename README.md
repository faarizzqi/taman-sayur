# TaniSegar: Katalog produk pertanian B2C dan order otomatis WhatsApp

Studi kasus pembuatan katalog web untuk startup pertanian B2C (*farm-to-table*). Proyek ini menggabungkan struktur data Sistem Informasi, materi visual promosi, dan alur konversi penjualan langsung ke WhatsApp tanpa backend server.

---

## 1. Latar belakang dan masalah bisnis

Startup penyedia hasil panen segar sering menghadapi hambatan konversi saat calon konsumen berbelanja lewat web atau media sosial:

* Konsumen enggan memasang aplikasi baru di ponsel hanya untuk belanja sayur mingguan.
* Formulir registrasi dan verifikasi akun yang panjang memicu *cart abandonment*.
* Pembeli sayur online butuh kepastian waktu panen, asal petani, dan takaran porsi.
* Ibu rumah tangga dan pekerja perkotaan lebih menyukai bahan masakan yang sudah dikelompokkan per menu daripada harus meracik bumbu satu per satu.

### Solusi yang dibangun
Katalog web statis yang ringan, cepat dimuat di ponsel, memiliki 100 pilihan produk (80 produk satuan dan 20 paket masak), serta tombol checkout yang langsung merangkai daftar pesanan ke pesan WhatsApp terformat rapi.

---

## 2. Struktur data dan hubungan relasional

Data katalog disimpan pada `js/products.js` menggunakan struktur objek JavaScript murni tanpa ketergantungan database eksternal:

* **80 Produk satuan (`prod-01` s/d `prod-80`)**:
  * 25 Sayuran daun, batang, dan jamur (bayam, selada romaine, jamur tiram, kale).
  * 20 Sayuran buah, polong, dan umbi (wortel Berastagi, tomat cherry, kentang Dieng).
  * 20 Buah-buahan segar (alpukat mentega, pisang Cavendish, jeruk Medan).
  * 15 Bumbu dapur dan rempah (bawang merah Brebes, bawang putih kating, cabai rawit).

* **20 Paket bundling masak (`pkt-01` s/d `pkt-20`)**:
  * Setiap paket masakan merujuk langsung ke ID produk satuan melalui array `includedItemIds`.
  * Contoh: `pkt-01` (Paket Sayur Sop Komplit) memuat `prod-26` (Wortel), `prod-08` (Kubis), `prod-29` (Buncis), `prod-11` (Daun Bawang), `prod-12` (Seledri), dan `prod-67` (Bawang Putih).
  * Antarmuka web menyediakan tombol modal untuk melihat rincian setiap bahan penyusun paket dan perbandingan nilai hemat dibanding membeli eceran.

---

## 3. Fitur utama katalog

1. **Pencarian dan filter kategori seketika**:
   Pengguna dapat menyaring katalog berdasarkan kategori (Paket Masak, Sayuran, Buah, Bumbu) atau mengetik nama produk dan nama daerah petani mitra di kolom pencarian.

2. **Keranjang belanja interaktif**:
   Keranjang belanja sisi kanan (*drawer*) menyimpan item pilihan menggunakan `localStorage`, sehingga daftar belanja tidak hilang saat halaman disegarkan.

3. **Pelacak gratis ongkir**:
   Bilah progres visual yang memberi tahu sisa nominal belanja untuk mendapatkan promo bebas ongkos kirim dengan batas minimal Rp 100.000.

4. **Format pesan otomatis ke WhatsApp**:
   Tombol pemesanan membaca data nama, alamat, slot kirim pagi, catatan khusus, dan rincian produk, lalu membuka tautan `https://wa.me/` dengan teks pesanan yang rapi.

5. **Pemutar video proses panen**:
   Seksi khusus video interaktif untuk menampilkan rekaman proses panen hidroponik, penyortiran mutu, dan pengemasan higienis.

---

## 4. Susunan berkas proyek

Seluruh fungsionalitas aplikasi terbagi ke dalam empat berkas utama yang siap dijalankan langsung di peramban:

```text
product-catalog/
├── index.html            # Halaman utama katalog dan antarmuka belanja
├── css/
│   └── custom.css        # Gaya tampilan kustom, kartu produk, dan animasi drawer
├── js/
│   ├── products.js       # Database 100 item (80 produk satuan + 20 paket bundling)
│   └── app.js            # Logika filter, pencarian, keranjang, dan generator WhatsApp
└── README.md             # Dokumentasi studi kasus proyek
```

---

## 5. Menjalankan proyek secara lokal

Aplikasi ini tidak memerlukan instalasi Node.js atau proses kompilasi. Anda dapat menjalankannya dengan server lokal sederhana:

```bash
# Menggunakan Python 3
python3 -m http.server 8080
```

Buka peramban pada alamat `http://localhost:8080`.

---

## 6. Publikasi ke GitHub Pages

Langkah untuk mempublikasikan katalog ini secara online tanpa biaya:

1. Inisialisasi repositori Git dan simpan perubahan:
   ```bash
   git init
   git add .
   git commit -m "feat: rilis awal katalog web TaniSegar"
   ```
2. Hubungkan ke repositori GitHub Anda dan kirim ke cabang `main`.
3. Buka menu `Settings` lalu pilih menu `Pages` pada repositori GitHub.
4. Tentukan cabang `main` sebagai sumber publikasi.
5. Situs web akan aktif pada alamat `https://<username>.github.io/<nama-repo>/`.
