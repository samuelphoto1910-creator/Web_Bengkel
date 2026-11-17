# 📘 PANDUAN PENGGUNA APLIKASI BENGKEL MOTOR
### (Versi Super Gampang — Bahasa Santai & Mudah Dipahami)

Selamat datang di aplikasi **Sistem Inventory Bengkel Motor**!  
Buku panduan ini dibuat khusus dengan bahasa yang sangat sederhana, tanpa istilah teknis yang bikin pusing kepala. Siapapun—bahkan yang baru pertama kali pegang komputer/aplikasi kasir—pasti langsung bisa!

---

## 🧭 DAFTAR ISI

1. [Mengenal Dua Jenis Pengguna (Bos vs Kasir)](#bab-1-mengenal-dua-jenis-pengguna)
2. [Cara Masuk ke Aplikasi (Login)](#bab-2-cara-masuk-ke-aplikasi-login)
3. [Langkah Awal: Menyiapkan Toko (Supplier & Kategori)](#bab-3-langkah-awal-menyiapkan-toko)
4. [Cara Mendaftarkan Barang / Sparepart Baru](#bab-4-cara-mendaftarkan-barang-baru)
5. [Cara Catat Kulakan / Barang Masuk (Pembelian)](#bab-5-cara-catat-kulakan-barang-masuk)
6. [Cara Jualan ke Pelanggan & Cetak Struk (Kasir / POS)](#bab-6-cara-jualan-ke-pelanggan-pos-kasir)
7. [Memantau Barang & Catat Barang Rusak (Kartu Stok)](#bab-7-memantau-barang--catat-barang-rusak)
8. [Ritual Hitung Barang di Rak (Stok Opname)](#bab-8-ritual-hitung-barang-di-rak-stok-opname)
9. [Mencatat Biaya Bengkel: Listrik, Gaji, Kopi (Biaya Operasional)](#bab-9-mencatat-biaya-bengkel-pengeluaran)
10. [Melihat Untung Bersih Bengkel & Unduh Laporan](#bab-10-melihat-untung-bersih-bengkel)
11. [Khusus Bos: Menambah Akun Kasir & Atur Struk](#bab-11-khusus-bos-pemilik)
12. [Pertanyaan yang Sering Muncul (FAQ)](#bab-12-tanya-jawab-sering-ditanyakan)

---

## BAB 1: Mengenal Dua Jenis Pengguna

Di bengkel ini, aplikasi membagi pengguna menjadi 2 peran sederhana:

1. **👑 Pemilik Bengkel (Bos / OWNER)**:
   * Punya kunci ke semua pintu.
   * Bisa lihat laporan untung-rugi bengkel.
   * Bisa nambah/hapus akun karyawan.
   * Bisa ubah alamat bengkel dan pesan di struk nota.
   * Berhak membatalkan (*void*) transaksi kalau ada kasir yang salah input.

2. **🧑‍🔧 Operator (Kasir / Montir / OPERATOR)**:
   * Fokus kerja sehari-hari: melayani pembeli di kasir, mencatat barang kulakan baru datang, mengecek stok barang di rak, dan mencatat nota bon operasional (misal beli bensin/kopi mekanik).
   * **Tidak bisa**: mengintip atau mengacak-acak akun pengguna lain, dan tidak bisa mengubah nama toko bengkel.

---

## BAB 2: Cara Masuk ke Aplikasi (Login)

1. Buka browser (Chrome di HP atau Laptop kasir), lalu ketik alamat aplikasi (misal: `http://localhost:3000`).
2. Masukkan **Email** dan **Password**:
   * Jika Anda Bos:  
     👉 Email: `pemilik@bengkel.com` | Password: `admin123`
   * Jika Anda Operator/Kasir:  
     👉 Email: `operator@bengkel.com` | Password: `operator123`
3. Klik tombol biru **Masuk ke Sistem**.
4. Selesai! Anda langsung masuk ke halaman utama (*Dashboard*).

> 💡 *Catatan di HP:* Jika pakai layar ponsel, klik tombol garis tiga (**☰**) di pojok kiri atas untuk memunculkan daftar menu.

---

## BAB 3: Langkah Awal Menyiapkan Toko

Sebelum mulai jualan, ada 2 hal dasar yang perlu disiapkan:

### A. Kategori Barang (Menu: "Kategori Barang")
Ibaratnya ini adalah **label rak**. Contoh: *Oli Mesin, Ban Luar, Busi, Kampas Rem, Aki*.
1. Klik menu **Kategori Barang** di sebelah kiri.
2. Klik tombol biru **Tambah Kategori**.
3. Ketik namanya (misal: `Busi & Pengapian`), lalu klik **Simpan Kategori**.

### B. Daftar Supplier / Agen Kulakan (Menu: "Data Supplier")
Ini adalah daftar toko grosir atau agen tempat bengkel kita belanja onderdil.
1. Klik menu **Data Supplier**.
2. Klik tombol biru **Tambah Supplier**.
3. Isi nama toko grosir (misal: `PT Astra Otoparts`), nomor HP/WhatsApp sales-nya, dan alamatnya.
4. Klik **Simpan Supplier**.

---

## BAB 4: Cara Mendaftarkan Barang Baru

Setiap ada sparepart jenis baru yang belum pernah dicatat di komputer, daftarkan dulu di sini:

1. Klik menu **Master Barang**.
2. Klik tombol biru **+ Tambah Barang**.
3. Isi data barang:
   * **Kode SKU**: Kode unik barang (bisa pakai kode pabrik atau bikinan sendiri, contoh: `OLI-MPX2-800`).
   * **Nama Barang**: Nama lengkap onderdil (contoh: `Oli AHM MPX2 0.8L Matic`).
   * **Kategori**: Pilih kategorinya (misal: *Oli Mesin*).
   * **Satuan**: Pilih *Pcs, Botol, Set, Dus*, dll.
   * **Harga Modal (Beli)**: Modal beli pertama kali ke agen (contoh: `Rp45.000`).
   * **Harga Jual ke Pembeli**: Harga jual ke pelanggan (contoh: `Rp55.000`).
   * **Stok Awal Saat Ini**: Berapa biji barang yang nyata-nyata sudah ada di rak sekarang (contoh: `10`).
   * **Stok Minimum (Pengingat)**: Bila barang tinggal segini, sistem bakal kasih lampu peringatan merah agar Bos segera kulakan lagi (contoh: `3`).
4. Klik **Simpan Barang**.
5. Beres! Barang sudah terdaftar dan siap dijual.

### Cara Menghapus atau Menonaktifkan Barang:
1. Buka menu **Master Barang**.
2. Cari barang yang ingin dihapus, lalu klik ikon **Tong Sampah Merah (🗑️)** di kolom aksi sebelah kanan.
3. **Aturan Pintar Sistem:**
   * **Jika barang salah input & belum pernah ada transaksi**: Barang akan **dihapus permanen** bersih dari sistem.
   * **Jika barang sudah pernah ada riwayat penjualan / kulakan**: Barang otomatis **dinonaktifkan (diarsipkan)**. Barang ini tidak akan muncul lagi di kasir penjualan, tapi laporan pembukuan masa lalu tetap rapi dan tidak rusak.
4. **Mau mengaktifkan kembali barang yang pernah dinonaktifkan?**
   * Di filter atas, pilih `Status: Nonaktif (Arsip)`.
   * Klik tombol pensil **Edit**, ubah statusnya jadi `Aktif`, lalu klik **Perbarui Data**. Barang langsung bisa dijual lagi!

---

## BAB 5: Cara Catat Kulakan Barang Masuk

Saat mobil box distributor datang mengantar onderdil dan menyerahkan faktur kertas:

1. Klik menu **Pembelian / Masuk**.
2. Klik tombol **+ Catat Pembelian Baru**.
3. Pilih **Supplier** pengirim barang.
4. Masukkan nomor nota dari supplier (opsional, kalau kosong sistem bikinkan otomatis).
5. Pada bagian **Rincian Barang Masuk**, klik **+ Tambah Baris Barang**:
   * Pilih onderdil yang dibeli.
   * Masukkan **Kuantitas** (berapa biji).
   * Masukkan **Harga Beli Satuan** dari faktur itu.
   * *(Jika belanja banyak item, klik tombol tambah baris lagi).*
6. Kalau dapat diskon dari sales atau ada biaya ongkir, isi di kotak diskon/biaya.
7. Klik tombol biru **Posting Faktur Pembelian**.

> 🧠 **Keajaiban Otomatis Sistem:**
> - Jumlah stok di rak otomatis bertambah!
> - Sistem otomatis menghitung harga modal rata-rata baru (**Moving Average**) jika harganya naik atau turun dari agen. Jadi Bos tidak perlu hitung manual pakai kalkulator!

---

## BAB 6: Cara Jualan ke Pelanggan (POS Kasir)

Saat ada orang datang mau ganti oli atau beli ban:

1. Klik menu **Penjualan / POS**, lalu klik tombol hijau **Buka POS / Kasir Baru**.
2. Di sebelah kiri ada katalog onderdil:
   * Cari nama barang di kotak pencarian, atau klik langsung pada kartu barang.
   * Barang otomatis masuk ke **Keranjang Belanja** di sebelah kanan.
3. Di keranjang belanja:
   * Klik tanda **+** atau **-** untuk menambah/mengurangi jumlah barang yang dibeli.
   * Bila pelanggan dapat potongan harga khusus, isi di kotak diskon.
4. Masukkan **Nama Pelanggan** (kalau tidak kenal, biarkan saja *"Pelanggan Umum"*).
5. Masukkan **Uang Tunai Diterima** dari pembeli (misal belanja Rp55.000, pembeli bayar pakai uang Rp100.000).
6. Sistem langsung menghitung **Uang Kembalian** (`Rp45.000`).
7. Klik tombol hijau besar **Selesaikan Transaksi (Bayar)**.
8. Muncul nota struk di layar! Klik tombol **Cetak Struk** untuk mencetak struk ke printer kasir mini, atau tutup jika pembeli tidak minta struk kertas.

> 📦 *Stok barang yang terjual otomatis berkurang detik itu juga!*

---

## BAB 7: Memantau Barang & Catat Barang Rusak

Ibarat buku mutasi bank, menu ini mencatat semua jejak keluar-masuk barang.

1. Klik menu **Stok & Kartu Stok**.
2. Di tab **Kartu Stok (Mutasi)**:
   * Bos bisa pilih nama barang, lalu lihat riwayatnya: tanggal berapa barang masuk dari kulakan, tanggal berapa laku dibeli siapa, dan sisa saldonya.
3. **Bagaimana kalau ada barang rusak, tumpah, atau hilang?**
   * Klik tombol oranye **Penyesuaian Stok (Koreksi)**.
   * Pilih barangnya.
   * Pilih jenisnya: **Pengurangan (-)** atau **Penambahan (+)**.
   * Masukkan jumlahnya (misal: `1`).
   * **Wajib isi alasan**: (Contoh: *"Botol oli retak tumpah di gudang"*).
   * Klik **Simpan Penyesuaian**. Saldo stok langsung diperbaiki dan tercatat rapi di buku riwayat.

---

## BAB 8: Ritual Hitung Barang di Rak (Stok Opname)

Sebulan sekali atau seminggu sekali, sangat dianjurkan untuk menghitung barang secara fisik di rak bengkel:

1. Klik menu **Stok Opname**.
2. Klik tombol **Form Hitung Fisik Baru**.
3. Di layar akan muncul semua daftar barang beserta **Stok Sistem** (hitungan komputer).
4. Ambil barang di rak, hitung pakai tangan, lalu ketik jumlah aslinya di kolom **Hitung Nyata (Fisik)**.
5. Jika ada perbedaan (misal komputer bilang ada 10, tapi di rak cuma ada 9):
   * Kolom selisih akan menyala merah (`-1`).
   * Ketik keterangannya di kolom alasan (misal: *"Hilang / belum tercatat"*).
6. Klik **Konfirmasi & Sesuaikan Stok**.
7. Stok di komputer otomatis langsung sama persis dengan barang nyata di rak bengkel!

---

## BAB 9: Mencatat Biaya Bengkel (Pengeluaran)

Jangan campur aduk uang laci dengan uang operasional! Catat setiap uang bengkel yang keluar untuk keperluan toko:

1. Klik menu **Biaya Operasional**.
2. Klik tombol merah **+ Catat Pengeluaran**.
3. Pilih kategorinya:
   * *Listrik & Air*
   * *Gaji / Uang Makan Mekanik*
   * *Sewa Tempat*
   * *Beli Kopi & Konsumsi*
   * *Alat Bengkel & Perkakas*
4. Masukkan nominal uangnya (contoh: `Rp50.000`).
5. Tulis keterangannya (contoh: *"Beli sabun cuci tangan & kopi montir"*).
6. Klik **Simpan Pengeluaran**.
7. Angka ini nanti otomatis memotong laba kotor agar Bos tahu laba bersih yang sesungguhnya.

---

## BAB 10: Melihat Untung Bersih Bengkel

Ini halaman paling disukai pemilik bengkel!

1. Klik menu **Laporan & Laba Rugi**.
2. Pilih periode yang ingin dilihat:
   * Klik tombol **Hari Ini**, **7 Hari**, **Bulan Ini**, atau pilih tanggal suka-suka.
3. Lihat 4 kartu angka ajaib:
   * **Omzet (Penjualan Bersih)**: Total semua uang masuk dari pembeli.
   * **Total Modal Barang (HPP)**: Uang asli yang kita bayar ke distributor untuk onderdil yang laku tadi.
   * **Laba Kotor**: Uang penjualan dikurangi modal barang.
   * **Laba Bersih**: Laba kotor dikurangi biaya listrik, gaji, dan kopi tadi. **Inilah uang dingin yang nyata-nyata jadi hak Bos!**
4. Di bagian bawah juga ada grafik tren harian dan daftar **10 Barang Paling Laris**.
5. Mau serahkan laporan ke akuntan atau cetak kertas?
   * Klik tombol **Unduh Excel** untuk buka di spreadsheet Excel.
   * Klik tombol **Cetak PDF** untuk cetak dokumen resmi bertanda tangan.

---

## BAB 11: Khusus Bos (Pemilik)

Hanya akun ber-role **OWNER** yang bisa membuka dua menu ini:

### A. Kelola Pengguna (Menu: "Kelola Pengguna")
Bila ada karyawan baru yang dipercaya pegang kasir:
1. Klik menu **Kelola Pengguna** -> Klik **+ Tambah Pengguna Baru**.
2. Masukkan nama karyawan, email, password pertamanya, dan pilih perannya (**Operator**).
3. Klik **Simpan Pengguna**.
4. Bila karyawan sudah berhenti kerja, klik tombol pensil edit, lalu ubah statusnya jadi **Nonaktif** agar dia tidak bisa login lagi.

### B. Pengaturan Toko (Menu: "Pengaturan Toko")
1. Klik menu **Pengaturan Toko**.
2. Ganti Nama Bengkel, Nomor WhatsApp bengkel, dan Alamat lengkap.
3. Ganti pesan di kaki struk nota (contoh: *"Terima kasih! Garansi servis 7 hari"*).
4. Klik tombol biru **Simpan Pengaturan**.

---

## BAB 12: Tanya Jawab Sering Ditanyakan (FAQ)

**T: Kasir salah input kuantitas di nota penjualan, cara batalinnya gimana?**  
👉 *Jawab:* Minta Bos (akun Owner) buka menu **Penjualan / Kasir**, cari nomor invoice tersebut, lalu klik tombol panah melingkar merah (**Void / Batal**). Masukkan alasan pembatalan. Stok barang yang tadi terlanjur kepotong bakal otomatis balik lagi ke rak!

**T: Kenapa kasir tidak bisa lihat menu "Kelola Pengguna"?**  
👉 *Jawab:* Demi keamanan bengkel Anda! Hanya pemilik toko yang boleh mengatur akun dan kata sandi.

**T: Apakah aplikasi ini bisa dipakai di handphone?**  
👉 *Jawab:* **BISA BANGET!** Buka Google Chrome di HP Anda, buka alamat bengkel, dan tekan tombol garis tiga (**☰**) di pojok atas untuk membuka menu. Desainnya sudah otomatis menyesuaikan ukuran layar HP.

---
*Selamat mengelola bengkel Anda dengan rapi, anti tekor, dan bebas ribet!* 🚀🔧
