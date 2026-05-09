# Product Requirements Document (PRD)
## TunneLink — SSH & Port Forward Manager
**Version:** 1.0.0  
**Date:** 2026-05-08  
**Author:** Davin Fausta  
**Status:** Active Development  

---

## 1. PRODUCT OVERVIEW

### 1.1 Vision Statement
TunneLink adalah aplikasi desktop ringan yang memungkinkan developer dan ML researcher mengelola koneksi SSH beserta port forwarding rules secara terpusat — tanpa perlu mengetik ulang command SSH yang panjang setiap kali bekerja.

### 1.2 Problem Statement
Developer dan ML researcher saat ini harus:
- Mengingat atau menyimpan command SSH panjang di notepad/bashrc
- Mengetik ulang port forwarding flags (-L, -R, -D) setiap sesi
- Tidak ada UI terpusat untuk melihat tunnel mana yang aktif
- Tool bestari seperti Termius berbayar dan berbasis Electron (berat)

### 1.3 Solution
Aplikasi desktop native berbasis Tauri v2 + Rust yang:
- Menyimpan profil SSH beserta forward rules dalam database lokal terenkripsi
- Memulai/menghentikan tunnel sekali klik
- Menampilkan status aktif semua tunnel secara real-time
- Binary kecil (<15MB), RAM idle <50MB — jauh lebih ringan dari Termius

### 1.4 Target User
- ML/AI researcher yang sering SSH ke training server (primary user)
- Backend developer yang mengelola banyak server
- DevOps engineer yang butuh SSH tunnel management sederhana

### 1.5 Platforms
- Linux (x86_64) — native build, primary development platform
- Windows 10/11 (x86_64) — via cross-compilation dari Linux

---

## 2. TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Desktop runtime | Tauri | v2.x | Native webview, no Chromium bundle |
| Backend | Rust | 1.78+ (stable) | Memory safe, high perf |
| Frontend framework | React | 18.x | TypeScript strict mode |
| Build tool | Vite | 5.x | Fast HMR |
| Styling | Tailwind CSS | v4.x | Utility-first |
| UI components | shadcn/ui | latest | Accessible, customizable |
| Icons | Lucide React | latest | MIT license |
| SSH protocol | russh | 0.44.x | Pure Rust SSH2 |
| Database | SQLite via rusqlite | 0.31.x | Bundled, embedded |
| Encryption | aes-gcm + argon2 | 0.10 / 0.5 | AES-256-GCM |
| ID generation | uuid | 1.x | v4 random |
| Datetime | chrono | 0.4.x | RFC3339 |
| Cross-compile | cargo-xwin | latest | Linux → Windows MSVC |
| CI/CD | GitHub Actions | - | Auto-build all platforms |

---

## 3. ARCHITECTURE

### 3.1 High-Level Architecture
```
┌─────────────────────────────────────────────┐
│              Tauri v2 Application            │
│                                             │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │  React Frontend  │  │   Rust Backend   │ │
│  │  (WebView)       │◄─►│   (Core Logic)   │ │
│  │                  │  │                  │ │
│  │  - Dashboard     │  │  - SSH Engine    │ │
│  │  - Profile Form  │  │  - Crypto Layer  │ │
│  │  - Status Panel  │  │  - DB Layer      │ │
│  └──────────────────┘  └────────┬─────────┘ │
│                                  │           │
│                         ┌────────▼─────────┐ │
│                         │  SQLite Database  │ │
│                         │  (AES-256 enc)    │ │
│                         └──────────────────┘ │
└─────────────────────────────────────────────┘
```

### 3.2 Data Flow
```
User Action (React)
    ↓ invoke()
Tauri Command (Rust)
    ↓
Business Logic Layer
    ├─ Crypto Layer (encrypt/decrypt credentials)
    └─ DB Layer (SQLite CRUD)
    ↓
SSH Engine (russh)
    ↓
Remote Server
```

### 3.3 Directory Structure
```
tunnelink/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainContent.tsx
│   │   ├── profile/
│   │   │   ├── ProfileList.tsx
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   └── ProfileMenu.tsx
│   │   ├── tunnel/
│   │   │   ├── TunnelControls.tsx
│   │   │   ├── TunnelStatus.tsx
│   │   │   └── ForwardRuleCard.tsx
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useProfiles.ts
│   │   └── useTunnels.ts
│   ├── lib/
│   │   ├── tauri.ts              # invoke wrappers
│   │   └── utils.ts
│   └── types/
│       └── index.ts
│
├── src-tauri/                    # Rust Backend
│   └── src/
│       ├── main.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── profile.rs        # CRUD operations
│       │   ├── tunnel.rs         # SSH tunnel management
│       │   └── crypto.rs         # Encryption helpers
│       ├── models/
│       │   ├── mod.rs
│       │   └── profile.rs        # Structs & enums
│       ├── db/
│       │   └── mod.rs            # SQLite init & helpers
│       └── ssh/
│           ├── mod.rs
│           ├── connect.rs        # SSH connection
│           └── forward.rs        # Port forwarding
│
└── .github/
    └── workflows/
        └── build.yml             # CI/CD pipeline
```

---

## 4. FEATURES & REQUIREMENTS

### 4.1 Phase 1 — Core MVP
**P0 (Must Have)**

#### F01: Connection Profile Management
- REQ-01: User dapat membuat profil SSH baru dengan field: name, host, port, username, auth method (key/password)
- REQ-02: User dapat melihat daftar semua profil di sidebar
- REQ-03: User dapat mengedit profil yang sudah ada
- REQ-04: User dapat menghapus profil (dengan konfirmasi)
- REQ-05: Profil tersimpan secara persisten di SQLite lokal

#### F02: Port Forwarding Rules
- REQ-06: Setiap profil dapat memiliki multiple forwarding rules
- REQ-07: Support tiga jenis forwarding: Local (-L), Remote (-R), Dynamic (-D)
- REQ-08: Setiap rule memiliki: label, kind, local_port, remote_host, remote_port
- REQ-09: Rule dapat ditandai auto_start (aktif otomatis saat profil connect)
- REQ-10: User dapat menambah/hapus rule tanpa membuka profil baru

#### F03: SSH Tunnel Control
- REQ-11: User dapat connect ke profil dengan satu klik
- REQ-12: User dapat disconnect tunnel yang aktif
- REQ-13: Status tunnel (Aktif/Mati/Error) tampil real-time di UI
- REQ-14: Multiple profil bisa aktif bersamaan

#### F04: Credential Security
- REQ-15: Password SSH disimpan terenkripsi AES-256-GCM
- REQ-16: SSH key path disimpan (key file tidak di-copy)
- REQ-17: Data sensitif tidak pernah muncul di log aplikasi

#### F05: Dark/Light Mode
- REQ-18: Default dark mode
- REQ-19: Toggle dark/light mode di settings

### 4.2 Phase 2 — Terminal Integration
**P1 (Should Have)**

#### F06: Embedded Terminal
- REQ-20: Buka SSH shell session dalam app window (via xterm.js)
- REQ-21: Support multiple tab terminal
- REQ-22: Resize terminal mengikuti ukuran window

#### F07: Quick Connect
- REQ-23: Shortcut Ctrl+K untuk quick-connect ke profil manapun
- REQ-24: Fuzzy search profil dari quick connect dialog

### 4.3 Phase 3 — QoL Features
**P2 (Nice to Have)**

#### F08: Import/Export
- REQ-25: Export semua profil ke file JSON (credential di-encrypt)
- REQ-26: Import profil dari file JSON
- REQ-27: Merge import (tidak overwrite profil existing)

#### F09: System Tray
- REQ-28: App tetap berjalan di background via system tray
- REQ-29: Right-click tray icon: lihat tunnel aktif, quick connect
- REQ-30: Notifikasi desktop saat tunnel connect/disconnect/error

#### F10: Auto-Reconnect
- REQ-31: Detect tunnel putus secara otomatis
- REQ-32: Auto-reconnect dengan exponential backoff (max 5 retries)
- REQ-33: Notifikasi ke user saat reconnect gagal

---

## 5. DATA MODELS

### 5.1 ConnectionProfile
```
id:           UUID (PK)
name:         String (required, max 100 chars)
host:         String (required, IP/domain)
port:         u16 (default: 22, range: 1-65535)
username:     String (required)
auth_method:  Enum { Key, Password }
key_path:     Option<String> (path to .pem/.key file)
password_enc: Option<String> (AES-256-GCM encrypted)
tags:         Vec<String> (JSON array, for grouping)
forwards:     Vec<ForwardRule> (joined)
created_at:   DateTime<RFC3339>
updated_at:   DateTime<RFC3339>
```

### 5.2 ForwardRule
```
id:           UUID (PK)
profile_id:   UUID (FK → profiles.id CASCADE DELETE)
label:        String (e.g., "Jupyter Lab", "TensorBoard")
kind:         Enum { Local, Remote, Dynamic }
local_port:   u16 (port di mesin lokal)
remote_host:  String (default: "localhost")
remote_port:  u16 (port di remote server)
auto_start:   Boolean (default: false)
```

### 5.3 TunnelState (In-Memory, tidak di DB)
```
profile_id:   UUID
status:       Enum { Connected, Connecting, Disconnected, Error }
error_msg:    Option<String>
started_at:   Option<DateTime>
active_rules: Vec<ForwardRule>
```

---

## 6. API CONTRACTS (Tauri Commands)

### Profile Commands
```
get_profiles()           → Result<Vec<ConnectionProfile>, String>
get_profile(id)          → Result<ConnectionProfile, String>
create_profile(profile)  → Result<ConnectionProfile, String>
update_profile(profile)  → Result<ConnectionProfile, String>
delete_profile(id)       → Result<(), String>
```

### Tunnel Commands
```
start_tunnel(profile_id)         → Result<TunnelStatus, String>
stop_tunnel(profile_id)          → Result<(), String>
get_tunnel_statuses()            → Result<Vec<TunnelStatus>, String>
get_tunnel_status(profile_id)    → Result<TunnelStatus, String>
```

### Crypto Commands
```
encrypt_password(plain_text)     → Result<String, String>
decrypt_password(cipher_text)    → Result<String, String>
```

### Settings Commands
```
get_setting(key)                 → Result<String, String>
set_setting(key, value)          → Result<(), String>
```

---

## 7. UI/UX SPECIFICATIONS

### 7.1 Layout
```
┌────────────────────────────────────────────────────────┐
│  TunneLink                              [_][□][x]      │
├──────────────────┬─────────────────────────────────────┤
│                  │                                      │
│  PROFILES        │  SERVER TRAINING A100               │
│  ─────────────   │  ─────────────────────────────────  │
│  🟢 Training A100│                                      │
│  🔴 Lab Server   │  192.168.1.100 : 22                  │
│  🟡 Kaggle SSH   │  user: davin  |  🔑 SSH Key          │
│                  │                                      │
│  + Add Profile   │  PORT FORWARDING RULES               │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │ 🔀 Jupyter Lab    L:8888→8888  ▶ │ │
│                  │  │ 📊 TensorBoard    L:6006→6006  ▶ │ │
│                  │  │ 🔬 MLflow         L:5000→5000  ▶ │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  [  CONNECT ALL  ]  [ ADD RULE ]     │
│                  │                                      │
├──────────────────┴─────────────────────────────────────┤
│  ⚙ Settings                    2 tunnels active        │
└────────────────────────────────────────────────────────┘
```

### 7.2 Color Tokens
```
Background:     #0f1117 (dark) / #ffffff (light)
Surface:        #1a1d2e (dark) / #f8f9fa (light)
Border:         #2d3148 (dark) / #e2e8f0 (light)
Primary:        #6366f1 (Indigo-500)
Success/Active: #22c55e (Green-500)
Error:          #ef4444 (Red-500)
Warning:        #f59e0b (Amber-500)
Text Primary:   #e2e8f0 (dark) / #1e293b (light)
Text Muted:     #64748b
```

### 7.3 Window Properties
```
Default size:   900 x 600 px
Minimum size:   720 x 480 px
Resizable:      true
Decorations:    true (native title bar)
```

---

## 8. SECURITY REQUIREMENTS

| Requirement | Implementation |
|---|---|
| Password encryption at rest | AES-256-GCM dengan random 96-bit nonce |
| Key derivation | Argon2id, 64MB memory, 3 iterations |
| SSH key storage | Path saja yang disimpan, file tidak di-copy |
| No logging sensitive data | Password/key tidak masuk ke log/console |
| DB file permissions | 600 (rw-------) — hanya owner yang baca |
| No telemetry | Zero analytics, zero network call kecuali SSH |

---

## 9. PERFORMANCE REQUIREMENTS

| Metric | Target |
|---|---|
| App startup time | < 2 detik |
| Binary size | < 15 MB |
| RAM idle usage | < 50 MB |
| RAM saat active tunnels | < 100 MB |
| Profile load time | < 100ms (100 profiles) |
| Tunnel connect time | Sesuai network latency + < 500ms overhead |

---

## 10. ERROR HANDLING

| Scenario | Behavior |
|---|---|
| SSH host unreachable | Toast error + status badge merah |
| Wrong SSH key/password | Error message spesifik di UI |
| Port sudah dipakai | Pesan error: "Port XXXX already in use" |
| DB corrupt/missing | Recreate schema, data hilang → notif user |
| App crash saat tunnel aktif | Tunnel cleanup on SIGTERM/SIGKILL |
| SSH server disconnect | Update status → trigger auto-reconnect |

---

## 11. DEVELOPMENT ROADMAP

### Sprint 1 (Minggu 1): Foundation
- [x] Project initialization (Tauri v2 + React + TypeScript)
- [x] Database schema & SQLite setup
- [x] Rust models (ConnectionProfile, ForwardRule)
- [x] CRUD commands (profile)
- [x] Enkripsi AES-256-GCM (Hari 3)
- [x] TypeScript types & Tauri invoke wrappers
- [x] Basic UI: Sidebar + ProfileList

### Sprint 2 (Minggu 2): SSH Core
- [x] Koneksi SSH dasar via russh
- [x] Local port forwarding (-L)
- [x] Remote port forwarding (-R) *(Scoped out for MVP)*
- [x] Dynamic/SOCKS forwarding (-D) *(Scoped out for MVP)*
- [x] TunnelState management di Rust
- [x] Real-time status update ke frontend

### Sprint 3 (Minggu 3): UI/UX Polish
- [x] Profile form dengan validation
- [x] Forward rule CRUD di UI
- [x] Status badges real-time
- [x] Settings page (dark/light toggle)
- [x] System tray icon
- [x] Error handling & toast notifications

### Sprint 4 (Minggu 4): Release
- [x] Import/export profil
- [ ] Cross-compile setup (cargo-xwin)
- [ ] GitHub Actions CI/CD
- [ ] Testing di Windows
- [ ] Packaging: .AppImage, .deb, .msi, .exe
- [ ] README & user documentation

---

## 12. DEFINITION OF DONE

Setiap fitur dianggap selesai jika:
1. Functional: fitur bekerja sesuai requirements
2. Error handled: semua edge case menghasilkan pesan error yang jelas
3. No memory leak: tunnel cleanup berjalan saat disconnect
4. Cross-platform: berjalan di Linux dan Windows
5. UI consistent: menggunakan design tokens yang sudah ditetapkan

---

## 13. CURRENT PROGRESS LOG

| Tanggal | Progress |
|---|---|
| 2026-05-08 | Project initialized, dependencies installed |
| 2026-05-08 | SQLite schema, Rust models, CRUD commands selesai |
| 2026-05-09 | Sprint 1 Selesai: Enkripsi AES-GCM, UI Sidebar, Profile Form, dan React/Tauri wiring selesai |
| 2026-05-09 | Sprint 3 Selesai: System Tray, Custom Toasts, Settings (Dark/Light mode), dan Mock Status UI |
| 2026-05-09 | Sprint 2 Selesai: Koneksi SSH native via `russh`, async Task Management via `tokio`, Local Port Forwarding, dan real-time UI React sync. |
| Next | Sprint 4: Release & Packaging (Cross-compile, CI/CD, Documentation) |

---

## 14. AI AGENT CONTEXT

### Project State
- Platform: CachyOS Linux (primary), Windows (cross-compile target)
- Developer: Davin Fausta (grad student, ML researcher)
- Dev skill: Advanced Python/ML, intermediate Rust (learning), familiar React
- Primary use case: Manage SSH tunnels ke GPU training server (Jupyter:8888, TensorBoard:6006)

### Coding Conventions
- Rust: snake_case, thiserror untuk error types, Result<T, String> untuk Tauri commands
- TypeScript: camelCase, strict mode, interface bukan type untuk objects
- React: functional components, custom hooks untuk state management
- CSS: Tailwind utility classes, dark: prefix untuk dark mode

### Key Dependencies
- russh 0.44 (SSH) — async, tokio runtime
- rusqlite 0.31 bundled (SQLite)
- aes-gcm 0.10 (encryption)
- Tauri v2 invoke pattern: frontend calls backend via `invoke('command_name', { args })`

### File Locations
- Database: `~/.local/share/tunnelink/tunnelink.db` (Linux)
- Database: `%APPDATA%\tunnelink\tunnelink.db` (Windows)
- SSH Keys: User-specified path, not copied

### Next Immediate Task
Implementasi enkripsi AES-256-GCM di `src-tauri/src/commands/crypto.rs`
