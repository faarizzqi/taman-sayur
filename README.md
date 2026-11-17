# Taman Sayur: Katalog komoditas sayuran Jawa Tengah dan order otomatis WhatsApp

Studi kasus pembuatan katalog web untuk startup pertanian B2C berbasis sistem penerusan pesanan langsung (*on-demand farm forwarding*). Proyek ini menghubungkan konsumen keluarga perkotaan langsung ke kebun-kebun mitra di Jawa Tengah tanpa perantara panjang dan tanpa penyimpanan stok gudang.

---

## 1. Latar belakang dan model bisnis

Usaha rintisan hasil panen sering menghadapi risiko pembusukan stok (*food waste*) jika menyewa gudang penyimpanan sayur dalam jumlah besar. Untuk mengatasi kendala ini, Taman Sayur menerapkan sistem penerusan pesanan langsung (*zero-inventory on-demand forwarding*):

* Platform tidak menimbun sayur di gudang pendingin.
* Setiap pesanan yang masuk melalui WhatsApp langsung diteruskan (*forwarded*) ke klaster kebun mitra tujuan di Jawa Tengah (seperti Dataran Tinggi Dieng, Kopeng, Bandungan, Brebes, atau Wonogiri).
* Petani memetik sayuran sesuai jumlah pesanan riil pada hari pengiriman, lalu mengemas dan mengirimkannya langsung ke pemesan.
* Penetapan harga dibuat wajar langsung dari petani tanpa diskon artifisial; potongan harga hemat hanya diberikan pada paket bundling masakan.
* Promo bebas ongkos kirim dikhususkan bagi konsumen yang tinggal di area radius terdekat lokasi kebun mitra.

---

## 2. Struktur data dan hubungan relasional

Data katalog disimpan pada `js/products.js` menggunakan objek JavaScript murni dengan 40 item terkurasi:

* **32 Produk satuan (`prod-01` s/d `prod-32`)**:
  * 10 Sayuran daun, batang, dan jamur (bayam Sukoharjo, kangkung Boyolali, selada Romaine Kopeng, kubis Dieng, brokoli lereng Merbabu, jamur tiram Boyolali).
  * 10 Sayuran buah, polong, dan umbi (kentang Dieng, wortel Bandungan, tomat Magelang, buncis baby Bandungan, jagung Grobogan, labu siam Wonosobo).
  * 12 Bumbu dapur dan biofarmaka (bawang merah Bima Brebes, bawang putih Temanggung, cabai rawit Temanggung, cabai keriting Boyolali, jahe merah Wonogiri, kunyit Sukoharjo, kencur Wonogiri).

* **8 Paket bundling masak Jawa Tengah (`pkt-01` s/d `pkt-08`)**:
  * Setiap paket masakan merujuk langsung ke ID produk satuan melalui array `includedItemIds`.
  * Contoh: `pkt-01` (Paket Sayur Sop Dingin Dieng) memuat `prod-11` (Kentang Dieng), `prod-07` (Kubis Dieng), `prod-12` (Wortel Bandungan), `prod-14` (Buncis), `prod-09` (Daun Bawang), dan `prod-22` (Bawang Putih Temanggung).
  * Antarmuka web menyediakan tombol rincian bahan dan kalkulasi nilai hemat dibanding membeli eceran.

---

## 3. Fitur utama katalog

1. **Pencarian dan filter kategori Jawa Tengah**:
   Menyaring katalog berdasarkan tiga kelompok: Paket Masak Jateng, Sayuran Segar, serta Bumbu dan Rempah Asli.

2. **Keranjang belanja interaktif**:
   Menyimpan pilihan belanja menggunakan `localStorage` agar daftar barang tetap tersimpan saat peramban disegarkan.

3. **Pemilihan zona pengiriman**:
   Formulir belanja menyediakan pilihan zona radius dekat kebun mitra (klaim bebas ongkir) atau area kota reguler (tarif normal).

4. **Format pesan otomatis ke WhatsApp**:
   Merangkai nama pemesan, alamat lengkap, zona pengiriman, waktu antar, serta daftar komoditas beserta hub kebun tujuan pengiriman.

5. **Pemutar video cerita kebun**:
   Seksi khusus video interaktif untuk menampilkan proses panen sayur langsung di bedeng tanah kebun lereng pegunungan Jawa Tengah.

---

## 4. Susunan berkas proyek

Seluruh fungsionalitas aplikasi terbagi ke dalam empat berkas utama:

```text
product-catalog/
├── index.html            # Halaman utama katalog dan antarmuka belanja
├── css/
│   └── custom.css        # Gaya tampilan kustom, kartu produk, dan animasi drawer
├── js/
│   ├── products.js       # Database 40 komoditas sayur dan bumbu Jawa Tengah
│   └── app.js            # Logika filter, pencarian, keranjang, dan generator WhatsApp
└── README.md             # Dokumentasi studi kasus proyek
```

---

## 5. Menjalankan proyek secara lokal

Aplikasi ini tidak memerlukan instalasi Node.js atau proses kompilasi. Jalankan server lokal:

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
   git commit -m "feat: rilis katalog komoditas Jawa Tengah Taman Sayur"
   ```
2. Hubungkan ke repositori GitHub Anda dan kirim ke cabang `main`.
3. Buka menu `Settings` lalu pilih menu `Pages` pada repositori GitHub.
4. Tentukan cabang `main` sebagai sumber publikasi.
5. Situs web akan aktif pada alamat `https://<username>.github.io/<nama-repo>/`.
