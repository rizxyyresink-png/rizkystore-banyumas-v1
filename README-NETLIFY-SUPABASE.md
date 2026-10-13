# RIZKY STORE — Netlify + Supabase

Paket versi merah-hitam untuk deployment ke `*.netlify.app` dengan Supabase sebagai database, authentication, dan storage.

## Fitur utama
- Tema baru merah/hitam berdasarkan artwork RIZKY STORE terbaru.
- Musik pembuka dari file audio yang diberikan pemilik paket, diputar setelah tombol **MASUK KE STORE** ditekan.
- Produk online dari Supabase.
- Panel admin khusus untuk tambah/edit/hapus produk.
- **Foto produk wajib saat membuat produk baru.**
- Foto produk: JPG/PNG/WebP, maksimal **10 MB**.
- Foto produk disimpan di Supabase Storage.
- Testimoni dapat menyertakan foto.
- Foto testimoni: JPG/PNG/WebP, maksimal **10 MB**.
- Admin dapat menampilkan/menyembunyikan/menghapus testimoni.
- QRIS All Payment + DANA `085797103586` atas nama `AN/RA**I`, Region Banyumas.
- Checkout dan konfirmasi WhatsApp.

## File
- `index.html` — halaman utama
- `style.css` — tema merah/hitam
- `script.js` — katalog, checkout, admin, upload gambar, testimoni, musik
- `config.js` — URL dan publishable key Supabase
- `supabase.sql` — tabel, RLS, dan Storage buckets
- `netlify.toml` — konfigurasi Netlify
- `assets/profile.webp` — artwork RIZKY STORE terbaru
- `assets/qris-rizky-store.jpg` — QRIS
- `assets/music/rizky-store-music.mp3` — audio yang diberikan pengguna

## Setup Supabase
1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase.sql`.
4. Buat akun admin di **Authentication → Users**.
5. Salin UUID user admin.
6. Jalankan SQL berikut dengan UUID admin:

```sql
insert into public.admin_users (user_id)
values ('UUID-ADMIN-KAMU');
```

7. Buka `config.js` dan isi:

```js
window.RIZKY_CONFIG = {
  SUPABASE_URL: "https://PROJECT-REF.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "PUBLISHABLE-KEY-KAMU"
};
```

Gunakan **publishable/anon key**, bukan `service_role` atau secret key di website.

## Deploy Netlify
1. Extract ZIP.
2. Buka Netlify.
3. Pilih **Add new site → Deploy manually**.
4. Upload folder yang berisi `index.html`, `style.css`, `script.js`, `config.js`, `netlify.toml`, dan folder `assets`.
5. Setelah selesai, website akan mendapat alamat `*.netlify.app`.

## Catatan audio
File MP3 di paket berasal dari file yang diberikan oleh pengguna. Pastikan kamu memiliki hak/izin yang diperlukan untuk menggunakan audio tersebut pada website yang dipublikasikan.
