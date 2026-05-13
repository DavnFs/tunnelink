# TunneLink

TunneLink is a lightweight Tauri desktop app for managing SSH connection profiles and local port forwarding rules. It is built for developer and ML workflows where Jupyter, TensorBoard, MLflow, or other services need repeatable SSH tunnels without retyping long `ssh -L ...` commands.

## Current Scope

Implemented:

- Create, edit, delete, import, and export SSH profiles.
- Store profiles and forwarding rules in a local SQLite database.
- Encrypt stored SSH passwords with AES-256-GCM.
- Use SSH key paths without copying key files.
- Start and stop SSH sessions through the Rust backend.
- Auto-start Local (`-L`) forwarding rules for a connected profile.
- Show tunnel status changes in the React UI through Tauri events.
- Dark, light, and system theme selection.
- System tray show/quit behavior.

MVP limitation:

- Remote (`-R`) and Dynamic/SOCKS (`-D`) forwarding are intentionally not exposed for new rules yet because the backend only implements Local forwarding.
- SSH private keys with passphrases are not supported yet.
- Windows packages are built in CI, but must still be smoke-tested on a Windows machine before release.

## Tech Stack

- Tauri v2
- Rust backend
- React 19 and TypeScript frontend
- Vite 8
- SQLite through `rusqlite`
- SSH through `russh`
- AES-GCM password encryption

## Prerequisites

Install Node.js, Rust, and the Tauri CLI:

```bash
npm ci
cargo install tauri-cli --version "^2" --locked
```

Linux development also needs WebKit and app indicator packages. On Ubuntu:

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Development

Run the frontend only:

```bash
npm run dev
```

Run the full Tauri app:

```bash
npm run tauri:dev
```

## Verification

Frontend lint:

```bash
npm run lint
```

Frontend production build:

```bash
npm run build
```

Rust checks and tests:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

Tauri release build without bundling:

```bash
npm run tauri:build:no-bundle
```

Tauri release build with platform bundles:

```bash
npm run tauri:build
```

## Data and Security

Linux data path:

```text
~/.local/share/tunnelink/tunnelink.db
~/.local/share/tunnelink/tunnelink.key
```

Windows data path:

```text
%APPDATA%\tunnelink\tunnelink.db
%APPDATA%\tunnelink\tunnelink.key
```

Passwords are encrypted before they are stored. Exports intentionally remove encrypted passwords, so imported password profiles need the password entered again.

SSH key authentication stores only the key path. The key file itself is not copied into the app database.

## Release

The GitHub Actions workflow in `.github/workflows/release.yml` runs checks on pull requests and pushes to `main`. It builds Linux and Windows bundles on version tags such as:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Artifacts are uploaded from:

```text
src-tauri/target/release/bundle/
```

For a Linux-to-Windows Rust cross-check with `cargo-xwin`:

```bash
cargo install cargo-xwin
rustup target add x86_64-pc-windows-msvc
cargo xwin check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-msvc
```

Use a Windows runner or Windows machine for final `.msi` and `.exe` packaging validation.
