# 🎮 YT Music Gaming Overlay & Mini Player (Always-on-Top)

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome 116+](https://img.shields.io/badge/Chrome_Required-v116%2B_(Document_PiP)-34A853?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/)
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-blue)](#-cara-menggunakan-saat-bermain-game)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Ekstensi Google Chrome (Manifest V3) yang menghadirkan **Floating Mini Player Always-on-Top** khusus untuk **YouTube Music**. Dirancang untuk para gamer agar dapat mengontrol musik dan **mencari serta memutar lagu baru secara instan saat sedang bermain game di Windows** tanpa perlu repot berpindah jendela (<kbd>Alt</kbd>+<kbd>Tab</kbd>).

---

> [!WARNING]
> ### ⚠️ PENTING / AD-BLOCKER WARNING
> **"Some adblock extensions will make this extension not work"**
> 
> Beberapa ekstensi pemblokir iklan (*Adblockers* seperti **uBlock Origin, AdGuard, Brave Shields, atau ekstensi YouTube Adblocker pihak ketiga yang agresif**) dapat menyebabkan ekstensi ini tidak berfungsi optimal atau tombol overlay tidak muncul.
> 
> **Penyebab:**
> - Fitur *Cosmetic Filtering* / *Element Hiding* pada adblocker dapat memblokir elemen tombol melayang `[🎮 Game Overlay]` yang disuntikkan ke halaman YouTube Music.
> - Pemblokiran request jaringan internal dapat membatasi fungsi pencarian lagu instan (`/youtubei/v1/search`).
> - Script adblock tertentu dapat mengganggu hook player YouTube Music.
> 
> **Solusi:**
> 1. Buka tab [music.youtube.com](https://music.youtube.com/).
> 2. Klik ikon adblocker Anda di toolbar browser.
> 3. **Nonaktifkan adblocker / masukkan ke Whitelist** khusus untuk situs `music.youtube.com`.
> 4. Muat ulang halaman (*Refresh* / <kbd>F5</kbd>).

---

## ✨ Fitur Utama

1. **🪟 Always-on-Top Floating Mini Player (Document Picture-in-Picture)**
   - Jendela mini melayang di atas semua aplikasi & game (selama game berjalan pada mode *Borderless Windowed* atau *Windowed*).
   - Tampilan cover album dinamis dengan efek *ambient glow*, judul lagu, nama artis, dan status playback.
   - Sinkronisasi status *real-time* dua arah dengan tab YouTube Music di latar belakang.

2. **🔍 Pencarian Lagu & Putar Otomatis (In-Overlay Search & Play)**
   - Kolom pencarian musik langsung di dalam jendela overlay mini.
   - Hasil pencarian menampilkan thumbnail, judul lagu, artis, dan durasi secara *real-time*.
   - **Klik hasil pencarian $\rightarrow$ musik langsung berputar** tanpa memuat ulang halaman (*zero page reload*).

3. **🕹️ Mode Mini Gaming (Ultra-Compact View)**
   - Tombol perkecil (titik kuning pada jendela overlay) untuk menciutkan jendela menjadi bar ramping.
   - Menghemat ruang layar dan meminimalisir distraksi saat sesi permainan game yang intens.

4. **⚡ Global Hotkeys (Shortcut Keyboard di Luar Browser)**
   - Tetap berfungsi meskipun browser Chrome sedang diminimalkan atau Anda sedang fokus di dalam game.

| Shortcut Default | Fungsi |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Play / Pause Lagu |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>→</kbd> | Lagu Berikutnya (*Next Track*) |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd> | Lagu Sebelumnya (*Previous Track*) |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Buka / Sorot Tombol Overlay |

> [!TIP]
> Anda dapat mengganti kombinasi shortcut kapan saja melalui URL: `chrome://extensions/shortcuts` di browser Chrome Anda.

5. **🛡️ Arsitektur Bersih & Aman (Trusted Types Safe)**
   - Menggunakan eksekusi **MAIN World Scripting** — 100% bebas dari risiko *Extension Context Invalidation* saat ekstensi diperbarui di latar belakang.
   - **Zero `innerHTML` Sinks**: Seluruh manipulasi antarmuka Document PiP dibangun secara murni dengan DOM API (`createElement`, `textContent`, `setAttribute`), mematuhi kebijakan keamanan TrustedHTML YouTube Music.

---

## 🚀 Cara Pemasangan (Installation)

1. **Unduh / Clone Repositori Ini**:
   ```bash
   git clone https://github.com/USERNAME/overlay_YtMusic_extension.git
   ```
   *(Atau unduh file ZIP dari GitHub dan ekstrak ke folder di komputer Anda)*.

2. **Buka Halaman Ekstensi Chrome**:
   - Ketik `chrome://extensions/` di bilah alamat (*address bar*) Chrome dan tekan <kbd>Enter</kbd>.

3. **Aktifkan Developer Mode**:
   - Aktifkan toggle **"Developer mode"** di pojok kanan atas layar.

4. **Muat Ekstensi**:
   - Klik tombol **"Load unpacked"** (*Muat yang belum dibongkar*) di pojok kiri atas.
   - Pilih folder tempat Anda mengekstrak/cloning repositori ini.

5. Ekstensi **YT Music Gaming Overlay & Mini Player** siap digunakan!

---

## 🎮 Cara Menggunakan Saat Bermain Game

1. **Buka YouTube Music**:
   - Buka tab [music.youtube.com](https://music.youtube.com/) di Chrome Anda dan putar lagu favorit Anda.
2. **Luncurkan Overlay**:
   - Klik tombol merah melayang di pojok kanan bawah halaman YouTube Music: **[ 🎮 Game Overlay (PiP) ]**.
   - *(Atau klik ikon ekstensi di toolbar Chrome $\rightarrow$ pilih **"Luncurkan Game Overlay"**)*.
3. **Posisikan Jendela**:
   - Geser jendela mini Always-on-Top tersebut ke sudut monitor pilihan Anda (misalnya pojok kanan atas atau layar sekunder).
4. **Mulai Main Game**:
   - Buka game Anda.
   - **Penting:** Pastikan pengaturan tampilan grafis di dalam game diatur ke mode **Borderless Windowed** atau **Windowed Fullscreen** agar jendela overlay Always-on-Top dapat melayang di atas game.
5. **Cari & Ganti Lagu Kapan Saja**:
   - Ketik judul lagu pada kolom search di overlay dan klik untuk langsung memutar tanpa keluar dari game!

---

## 📁 Struktur Berkas (Project Structure)

```text
overlay_YtMusic_extension/
├── .gitignore               # Konfigurasi ignore file Git
├── manifest.json            # Manifest V3 konfigurasi ekstensi
├── background.js            # Service worker & global keyboard shortcuts handler
├── README.md                # Dokumentasi proyek
├── content/
│   ├── ytm_bridge.js        # Script jembatan MAIN world (PiP builder & YouTube API hook)
│   └── ytm_inject.css       # Styling untuk floating launcher pill pada halaman YouTube Music
├── icons/
│   ├── icon16.png           # Ikon toolbar Chrome (16x16)
│   ├── icon48.png           # Ikon manajemen ekstensi (48x48)
│   └── icon128.png          # Ikon Chrome Web Store & instalasi (128x128)
└── popup/
    ├── popup.html           # Tampilan popup controller
    ├── popup.css            # Styling popup dark zinc theme
    └── popup.js             # Logika interaktif popup controller
```

---

## 🛠️ Penyelesaian Masalah (Troubleshooting)

| Masalah | Kemungkinan Penyebab | Solusi |
| :--- | :--- | :--- |
| **Tombol overlay tidak muncul di YouTube Music** | Ekstensi adblocker menyembunyikan tombol dengan filter kosmetik. | Whitelist `music.youtube.com` pada adblocker Anda atau matikan adblocker sementara, lalu refresh halaman. |
| **Pencarian lagu di overlay tidak mengeluarkan hasil** | Request internal ke endpoint YouTube Music API diblokir oleh adblock atau koneksi terputus. | Pastikan adblock dinonaktifkan di `music.youtube.com` dan pastikan Anda login atau membuka tab YouTube Music aktif. |
| **Jendela overlay tertutup oleh game saat bermain** | Game berjalan pada mode *Exclusive Fullscreen*. | Ubah pengaturan grafis game Anda dari *Exclusive Fullscreen* menjadi **Borderless Windowed** atau **Windowed**. |
| **Fitur Document PiP tidak terbuka** | Versi Google Chrome belum mendukung Document Picture-in-Picture API. | Perbarui Google Chrome Anda ke versi terbaru (minimal Chrome 116+). |
| **Shortcut global tidak merespon di dalam game** | Hak akses shortcut atau game berjalan dengan privilege administrator khusus. | Buka `chrome://extensions/shortcuts` dan pastikan status shortcut disetel ke **Global** (bukan *In Chrome*). Jalankan browser dengan privilege yang setara jika game berjalan sebagai Admin. |

---

## 📄 Lisensi (License)

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan.
