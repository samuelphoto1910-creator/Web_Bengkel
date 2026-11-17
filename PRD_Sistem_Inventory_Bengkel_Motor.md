# Product Requirements Document

## Sistem Inventory Bengkel Motor

Aplikasi web untuk pengelolaan barang, pembelian, penjualan, stok, pengeluaran operasional, dan laporan keuntungan.

| | |
|---|---|
| **Versi dokumen** | 1.0 - Draft MVP |
| **Tanggal** | 16 November 2026 |
| **Status** | Baseline kebutuhan awal; perlu validasi pemilik bengkel |
| **Target pengguna** | 2–3 pengguna (pemilik/admin) |
| **Target biaya hosting** | Rp0 menggunakan free tier, dengan batasan layanan |

> **Keputusan teknologi dalam dokumen ini**
> Next.js + TypeScript + Prisma ORM + Supabase PostgreSQL + Vercel. Pilihan ini menggantikan MySQL yang sebelumnya dipertimbangkan, karena Supabase menggunakan PostgreSQL, bukan MySQL.

Dokumen ini mendefinisikan ruang lingkup MVP dan aturan bisnis awal. Nilai, nama bengkel, format nomor transaksi, dan detail operasional yang belum diberikan ditandai sebagai asumsi untuk dikonfirmasi.

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Tujuan dan Indikator Keberhasilan](#2-tujuan-dan-indikator-keberhasilan)
3. [Pengguna dan Hak Akses](#3-pengguna-dan-hak-akses)
4. [Ruang Lingkup MVP](#4-ruang-lingkup-mvp)
5. [Kebutuhan Fungsional](#5-kebutuhan-fungsional)
6. [Aturan Bisnis dan Perhitungan](#6-aturan-bisnis-dan-perhitungan)
7. [Data dan Rancangan Entitas](#7-data-dan-rancangan-entitas)
8. [Kebutuhan Nonfungsional](#8-kebutuhan-nonfungsional)
9. [Teknologi dan Arsitektur](#9-teknologi-dan-arsitektur)
10. [Deployment dan Operasional](#10-deployment-dan-operasional)
11. [Kriteria Penerimaan MVP](#11-kriteria-penerimaan-mvp)
12. [Risiko, Asumsi, dan Keputusan Terbuka](#12-risiko-asumsi-dan-keputusan-terbuka)
13. [Tahapan Implementasi](#13-tahapan-implementasi)

---

## 1. Ringkasan Produk

Sistem Inventory Bengkel Motor adalah aplikasi web untuk membantu bengkel mencatat dan memantau persediaan barang serta transaksi barang masuk dan keluar. Sistem juga menyediakan pencatatan pengeluaran operasional dan laporan omzet, HPP, laba kotor, serta laba bersih harian maupun bulanan.

Aplikasi ditujukan untuk operasional skala kecil dengan 2–3 pengguna. Fokus produk adalah inventory dan pencatatan transaksi barang, bukan sistem manajemen servis atau antrean mekanik.

### Masalah yang ingin diselesaikan

- Pencatatan stok dan transaksi masih berpotensi tersebar di buku atau spreadsheet.
- Pemilik sulit mengetahui stok aktual dan barang yang perlu dibeli kembali.
- Perhitungan keuntungan membutuhkan data penjualan, HPP, dan biaya operasional yang tercatat konsisten.
- Pembuatan laporan secara manual memakan waktu dan rawan salah hitung.

## 2. Tujuan dan Indikator Keberhasilan

| Tujuan | Indikator keberhasilan MVP |
|---|---|
| Kontrol persediaan | Pengguna dapat melihat stok berjalan, stok minimum, dan riwayat pergerakan barang. |
| Pencatatan transaksi | Pembelian dan penjualan tercatat dengan detail item dan perubahan stok. |
| Transparansi keuntungan | Laporan menampilkan omzet, HPP, laba kotor, biaya operasional, dan laba bersih. |
| Pelaporan | Laporan dapat difilter berdasarkan tanggal dan diekspor ke Excel serta PDF. |
| Akses sederhana | 2–3 pengguna dapat masuk melalui browser dengan hak akses sesuai peran. |

## 3. Pengguna dan Hak Akses

| Peran | Hak akses utama |
|---|---|
| Pemilik / Admin utama | Akses seluruh modul, mengelola pengguna, master data, transaksi, stok, pengeluaran, dan laporan. |
| Admin / Operator | Mengelola barang dan transaksi operasional sesuai izin; tidak dapat mengelola pengguna atau pengaturan sensitif. |

> **Catatan:** jumlah akun diperkirakan 2–3. Model role dapat dimulai dari dua peran agar implementasi MVP tidak berlebihan. Hak akses final perlu dikonfirmasi dengan pemilik bengkel.

## 4. Ruang Lingkup MVP

### Termasuk dalam MVP

- Login, logout, dan pengelolaan peran pengguna.
- Dashboard ringkas: nilai stok/indikator stok, transaksi, omzet, dan ringkasan keuntungan.
- Master barang, kategori barang, dan supplier.
- Pencatatan pembelian/barang masuk beserta detail item.
- Pencatatan penjualan/barang keluar beserta detail item.
- Riwayat pergerakan stok, penyesuaian stok, dan stok opname sederhana.
- Pencatatan kategori dan nominal pengeluaran operasional.
- Laporan harian dan bulanan serta filter rentang tanggal.
- Ekspor data/laporan ke Excel (.xlsx) dan PDF.

### Tidak termasuk dalam MVP

- Manajemen servis, booking, antrean, mekanik, dan riwayat perbaikan kendaraan.
- Aplikasi mobile native, integrasi marketplace, payment gateway, dan barcode scanner.
- Foto produk/katalog visual barang.
- Akuntansi penuh seperti neraca, jurnal umum, pajak, dan laporan arus kas.
- Multi-cabang dan multi-gudang.

## 5. Kebutuhan Fungsional

| ID | Modul | Kebutuhan |
|---|---|---|
| FR-01 | Autentikasi | Pengguna dapat login/logout. Password disimpan dalam bentuk hash; sesi dan akses halaman/API divalidasi di server. |
| FR-02 | Dashboard | Menampilkan ringkasan stok menipis, jumlah barang, pembelian, penjualan, omzet, dan laba sesuai periode. |
| FR-03 | Barang | Tambah, lihat, ubah, dan nonaktifkan barang. Data minimal: SKU unik, nama, kategori, satuan, harga beli terakhir, harga jual, stok, stok minimum. |
| FR-04 | Kategori | CRUD kategori barang; kategori yang sudah digunakan tidak dihapus secara fisik. |
| FR-05 | Supplier | CRUD supplier: nama, kontak, alamat, dan catatan opsional. |
| FR-06 | Pembelian | Mencatat supplier, tanggal, nomor transaksi, item, kuantitas, harga beli, diskon/biaya bila dipakai, dan total. Pembelian terposting menambah stok. |
| FR-07 | Penjualan | Mencatat tanggal, nomor transaksi, item, kuantitas, harga jual, diskon, dan total. Penjualan terposting mengurangi stok. |
| FR-08 | Stok | Melihat saldo stok dan kartu stok. Penyesuaian wajib memiliki alasan dan jejak pengguna. |
| FR-09 | Stok opname | Mencatat hasil hitung fisik dan selisih terhadap stok sistem; penyesuaian dibuat setelah dikonfirmasi. |
| FR-10 | Pengeluaran | Mencatat tanggal, kategori, nominal, keterangan, dan pengguna pencatat. |
| FR-11 | Laporan | Filter periode dan menampilkan omzet, HPP, laba kotor, biaya operasional, dan laba bersih. |
| FR-12 | Ekspor | Ekspor daftar barang, supplier, pembelian, penjualan, riwayat stok, pengeluaran, dan laporan ke Excel/PDF. |
| FR-13 | Pengguna | Pemilik dapat membuat/nonaktifkan akun dan menetapkan peran. |

## 6. Aturan Bisnis dan Perhitungan

### 6.1 Status transaksi

- Transaksi dibuat dalam status draft sebelum diposting (jika alur persetujuan diperlukan).
- Perubahan stok hanya terjadi ketika transaksi berstatus posted/terposting.
- Transaksi yang sudah terposting tidak boleh dihapus langsung. Pembatalan dilakukan melalui transaksi reversal/void yang tercatat, agar audit stok tetap utuh.
- Setiap posting pembelian/penjualan harus atomik: header, detail, pergerakan stok, dan saldo stok berhasil bersama atau seluruhnya dibatalkan.

### 6.2 Metode HPP

MVP menggunakan metode **Moving Weighted Average** (rata-rata tertimbang bergerak). Setelah pembelian masuk, biaya rata-rata persediaan dihitung ulang berdasarkan nilai dan kuantitas stok sebelum pembelian ditambah pembelian baru.

**Contoh:** stok awal 10 unit dengan HPP Rp40.000/unit. Pembelian 10 unit dengan harga Rp50.000/unit. HPP rata-rata baru = (10 × 40.000 + 10 × 50.000) / 20 = **Rp45.000/unit**.

Saat penjualan diposting, sistem menyimpan snapshot HPP per baris penjualan. Dengan demikian, perubahan harga beli di masa depan tidak mengubah HPP transaksi historis.

### 6.3 Rumus laporan

| Metrik | Rumus / definisi |
|---|---|
| Omzet | Jumlah nilai penjualan bersih pada periode terpilih (setelah diskon transaksi/item, sesuai kebijakan yang ditetapkan). |
| HPP | Jumlah kuantitas terjual × snapshot HPP pada setiap detail penjualan. |
| Laba kotor | Omzet − HPP. |
| Biaya operasional | Total pengeluaran operasional yang dicatat dan masuk periode terpilih. |
| Laba bersih operasional | Laba kotor − biaya operasional yang tercatat. |

> **Penting:** laba bersih pada MVP adalah laba setelah biaya operasional yang dimasukkan pengguna, bukan laporan laba rugi akuntansi penuh. Akurasi laporan bergantung pada kelengkapan input biaya, retur, diskon, dan transaksi pembatalan.

### 6.4 Aturan stok dan integritas data

- Stok tidak boleh menjadi negatif secara default; jika bisnis mengizinkan stok negatif, keputusan ini harus dikonfirmasi dan dibatasi.
- Gunakan transaksi database dan row-level locking/locking yang sesuai saat posting agar dua pengguna tidak menjual stok yang sama secara bersamaan.
- Gunakan tipe numerik DECIMAL untuk harga dan nilai uang; hindari floating point untuk perhitungan finansial.
- Setiap perubahan stok menghasilkan stock movement dengan referensi transaksi, kuantitas masuk/keluar, saldo atau informasi yang cukup untuk merekonstruksi saldo, waktu, dan pengguna.
- Retur pembelian/penjualan, biaya tambahan pembelian, dan perlakuan diskon harus ditentukan sebelum implementasi final; MVP dapat membatasi alur tersebut atau mencatatnya sebagai penyesuaian khusus.

## 7. Data dan Rancangan Entitas

Rancangan konseptual berikut menjadi dasar ERD dan skema Prisma. Kolom final, tipe data, indeks, dan relasi akan ditentukan saat desain database.

| Entitas | Data utama / relasi |
|---|---|
| `users` | ID, nama, email, password/auth provider, role, status akun. |
| `categories` | ID, nama kategori, status. |
| `products` | ID, SKU unik, nama, category_id, satuan, harga beli terakhir, harga jual, stok, stok minimum, status. |
| `suppliers` | ID, nama, kontak, alamat, catatan, status. |
| `purchases` | ID, nomor, supplier_id, tanggal, status, subtotal, diskon/biaya, total, created_by. |
| `purchase_items` | ID, purchase_id, product_id, kuantitas, harga beli, diskon/biaya, subtotal. |
| `sales` | ID, nomor, tanggal, status, subtotal, diskon, total, created_by. |
| `sale_items` | ID, sale_id, product_id, kuantitas, harga jual, HPP snapshot, diskon, subtotal. |
| `stock_movements` | ID, product_id, tipe pergerakan, referensi transaksi, qty masuk/keluar, waktu, user, alasan. |
| `expenses` | ID, kategori, tanggal, nominal, deskripsi, created_by. |
| `expense_categories` | ID, nama kategori, status. |
| `audit_logs` (disarankan) | User, aksi, entitas, ID record, waktu, metadata perubahan penting. |

> **Catatan desain:** saldo stok pada `products` dapat disimpan sebagai cache saldo terkini untuk performa, tetapi setiap perubahan wajib direkam di `stock_movements`. Perubahan saldo dan movement harus berada dalam transaksi database yang sama.

## 8. Kebutuhan Nonfungsional

| Aspek | Kebutuhan |
|---|---|
| Keamanan | Validasi input di server, otorisasi per role, proteksi secret, HTTPS, rate limiting login, dan pembatasan akses database. |
| Konsistensi | Posting transaksi menggunakan database transaction; stok dan laporan harus dapat ditelusuri ke transaksi sumber. |
| Performa | Target awal: halaman umum tampil dalam ≤3 detik pada koneksi normal dan volume data MVP; target perlu diuji. |
| Ketersediaan | Aplikasi online melalui browser. Free tier tidak memberikan jaminan uptime setara layanan berbayar. |
| Kompatibilitas | Browser modern pada desktop dan ponsel; tampilan responsif. |
| Auditabilitas | Transaksi terposting, pembatalan, penyesuaian stok, dan perubahan master penting memiliki jejak. |
| Backup | Backup terjadwal dan prosedur restore diuji; jangan hanya mengandalkan ketersediaan platform. |

## 9. Teknologi dan Arsitektur

| Lapisan | Teknologi | Catatan implementasi |
|---|---|---|
| UI / Web | Next.js + TypeScript | Aplikasi web responsif; server-side rendering dan server components sesuai kebutuhan. |
| Styling | Tailwind CSS | Komponen antarmuka konsisten dan responsif. |
| Backend | Next.js Route Handlers / Server Actions | Business logic dan validasi sensitif wajib dijalankan di server. |
| Database | Supabase PostgreSQL | Managed PostgreSQL; bukan MySQL. Gunakan koneksi yang sesuai untuk runtime/deployment. |
| ORM | Prisma | Schema, migration, query, dan transaksi database. |
| Auth | Supabase Auth | Gunakan server-side session verification; role/permission harus divalidasi di backend. |
| Charts | Chart.js | Grafik omzet dan laba. |
| Excel | ExcelJS | File .xlsx dengan header, format mata uang, filter/periode, dan total. |
| PDF | PDFKit atau jsPDF | Laporan dengan identitas bengkel, periode, tabel, total, tanggal cetak, dan nomor halaman. |
| Deployment | Vercel + Supabase | Vercel untuk aplikasi; Supabase untuk PostgreSQL dan Auth. |
| Source control | GitHub | Simpan source code; jangan commit secret, .env, atau dump database produksi. |

### Catatan penting terkait Prisma dan Supabase

- Gunakan Prisma migration untuk perubahan skema yang terkontrol. Hindari mengubah skema produksi secara manual tanpa migration.
- Konfigurasikan koneksi database sesuai panduan Supabase: direct connection atau pooler yang tepat untuk lingkungan serverless/deployment.
- Jangan mengekspos service-role key atau kredensial database di browser. Simpan seluruh secret di environment variables server.
- Tentukan satu pola autentikasi dan otorisasi. Jika memakai Supabase Auth, jangan membuat sistem password kedua yang tidak diperlukan.

## 10. Deployment dan Operasional

### Lingkungan produksi

- Frontend/backend Next.js dideploy ke Vercel.
- Database PostgreSQL dan layanan autentikasi dikelola melalui Supabase.
- Domain/subdomain dan HTTPS dikonfigurasi untuk akses pengguna.
- Environment variables dipisahkan antara development dan production.

### Batasan free tier

- Supabase Free dapat menjeda project setelah periode tidak aktif (umumnya 7 hari); project perlu di-resume melalui dashboard. Periksa ketentuan paket terkini sebelum go-live.
- Vercel dan Supabase memiliki kuota dan batas pemakaian paket gratis. Pemakaian, ukuran database, bandwidth, dan batas fungsi harus dipantau.
- Tidak ada jaminan bahwa seluruh kebutuhan operasional bisnis akan selalu gratis atau memiliki SLA. Siapkan opsi upgrade jika aplikasi menjadi kritis.

### Backup minimum

- Jadwalkan ekspor/backup database secara berkala ke lokasi terpisah yang aksesnya dibatasi.
- Simpan backup terenkripsi jika memungkinkan dan jangan simpan data pelanggan sensitif tanpa kebutuhan.
- Lakukan uji restore secara berkala; backup yang belum pernah diuji belum dapat dianggap sebagai rencana pemulihan.

## 11. Kriteria Penerimaan MVP

| ID | Kriteria lulus |
|---|---|
| AC-01 | Pengguna yang valid dapat login dan pengguna tanpa izin tidak dapat mengakses modul terlarang. |
| AC-02 | SKU barang harus unik dan stok minimum dapat disimpan. |
| AC-03 | Pembelian terposting menambah stok dan tercatat pada kartu stok. |
| AC-04 | Penjualan terposting mengurangi stok, ditolak jika stok tidak mencukupi (kecuali kebijakan lain disepakati), dan menyimpan HPP snapshot. |
| AC-05 | Pembatalan transaksi terposting menghasilkan reversal yang dapat ditelusuri; data historis tidak hilang. |
| AC-06 | Penyesuaian stok mewajibkan alasan dan mencatat pengguna serta waktu. |
| AC-07 | Laporan periode menampilkan omzet, HPP, laba kotor, pengeluaran, dan laba bersih operasional sesuai rumus. |
| AC-08 | Filter tanggal memengaruhi data dashboard dan laporan secara konsisten. |
| AC-09 | Ekspor Excel dan PDF menghasilkan data sesuai filter, dengan format angka/mata uang dan total. |
| AC-10 | Dua pengguna yang melakukan transaksi berdekatan tidak menyebabkan stok menjadi salah atau negatif akibat race condition. |
| AC-11 | Backup database dapat dipulihkan pada lingkungan uji. |

## 12. Risiko, Asumsi, dan Keputusan Terbuka

| Topik | Asumsi / keputusan yang perlu dikonfirmasi |
|---|---|
| Identitas bengkel | Nama, logo, alamat, nomor telepon, dan format identitas pada PDF belum diberikan. |
| Peran MVP | Diasumsikan memiliki Pemilik/Admin utama dan Admin/Operator. |
| Metode HPP | Moving Weighted Average dipilih sebagai metode awal; perlu persetujuan pemilik. |
| Retur | Alur retur penjualan dan pembelian belum dirinci. |
| Diskon dan biaya | Perlu dipastikan apakah diskon dan biaya tambahan diterapkan pada tingkat transaksi atau item. |
| Stok awal | Perlu prosedur input saldo awal dan HPP awal saat sistem mulai digunakan. |
| Periode laporan | Zona waktu operasional diasumsikan Asia/Jakarta; definisi batas hari harus konsisten. |
| Free tier | Batas paket dapat berubah; kelayakan gratis perlu diverifikasi kembali saat implementasi dan sebelum produksi. |
| Keamanan dan privasi | Tentukan apakah aplikasi menyimpan data pelanggan; MVP saat ini tidak mensyaratkan data pelanggan. |

### Risiko utama

- Salah input transaksi akan memengaruhi stok dan laba; mitigasi dengan validasi, konfirmasi, dan audit trail.
- Free tier dapat pause atau mengalami batas kuota; mitigasi dengan monitoring, backup, dan rencana migrasi.
- Metode HPP dan retur yang belum disepakati dapat membuat laporan tidak akurat; selesaikan keputusan ini sebelum implementasi modul laporan.

## 13. Tahapan Implementasi

| Tahap | Hasil kerja |
|---|---|
| 1. Fondasi | Setup repository, Next.js, TypeScript, Tailwind, Supabase, Prisma, environment, dan deployment awal. |
| 2. Autentikasi & master | Login, role, pengguna, kategori, barang, dan supplier. |
| 3. Inventory core | Pembelian, penjualan, stock movement, saldo stok, penyesuaian, dan stok opname. |
| 4. Keuangan & laporan | Pengeluaran, HPP moving average, laporan harian/bulanan, laba kotor dan laba bersih operasional. |
| 5. Ekspor & hardening | Excel, PDF, pengujian otorisasi, concurrency, backup/restore, dan uji penerimaan. |

### Definisi selesai (Definition of Done)

MVP dianggap selesai ketika seluruh kriteria penerimaan terpenuhi, alur pembelian dan penjualan menjaga konsistensi stok, laporan dapat direkonsiliasi dengan transaksi sumber, ekspor Excel/PDF berfungsi, hak akses diuji, serta backup dan pemulihan database telah diuji.

---

*Akhir dokumen — PRD v1.0*
