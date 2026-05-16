# TunneLink

TunneLink is a lightweight, resource-friendly Tauri desktop app for managing SSH connection profiles and local port forwarding rules.

It is designed for developers, students, and machine learning workflows where services such as Jupyter Notebook, TensorBoard, MLflow, database dashboards, or development servers need repeatable SSH tunnels without retyping long `ssh -L ...` commands.

TunneLink is inspired by SSH profile managers such as Termius, but it does not try to become a full terminal-heavy SSH client. The main goal is to provide a simple, lightweight, and practical tunnel manager for daily development workflows.

## Overview

TunneLink helps users:

- Save SSH connection profiles.
- Manage local port forwarding rules.
- Start and stop SSH tunnel sessions from a desktop UI.
- Reuse common tunnel configurations for development and ML tools.
- Avoid repeatedly typing long SSH forwarding commands.

Example use case:

```bash
ssh -L 8888:localhost:8888 user@your-vps
````

Instead of typing the command manually every time, TunneLink lets you save the SSH profile and forwarding rule, then start the tunnel from the app.

## Current Scope

### Implemented

* Create, edit, delete, import, and export SSH profiles.
* Store SSH profiles and forwarding rules in a local SQLite database.
* Encrypt stored SSH passwords with AES-256-GCM.
* Use SSH key paths without copying private key files into the database.
* Start and stop SSH sessions through the Rust backend.
* Auto-start Local (`-L`) forwarding rules for a connected profile.
* Show tunnel status changes in the React UI through Tauri events.
* Dark, light, and system theme selection.
* System tray show/quit behavior.
* Linux and Windows build workflow through GitHub Actions.

### MVP Limitations

* Remote forwarding (`-R`) is intentionally not exposed yet.
* Dynamic/SOCKS forwarding (`-D`) is intentionally not exposed yet.
* The backend currently focuses on Local forwarding (`-L`).
* SSH private keys with passphrases are not supported yet.
* Windows packages are built in CI, but must still be smoke-tested on a real Windows machine before release.
* TunneLink is currently a local desktop SSH client, not a public SSH server or public tunneling platform.

## Tech Stack

* Tauri v2
* Rust backend
* React 19
* TypeScript
* Vite 8
* SQLite through `rusqlite`
* SSH through `russh`
* AES-GCM password encryption

## Project Positioning

TunneLink is not intended to fully replace advanced SSH clients or terminal applications.

Its focus is narrower:

| Area                          | TunneLink Focus    |
| ----------------------------- | ------------------ |
| SSH profile management        | Yes                |
| Local port forwarding         | Yes                |
| Lightweight desktop usage     | Yes                |
| ML/developer workflow         | Yes                |
| Full terminal emulator        | Not the main focus |
| Public reverse tunnel service | Not in MVP         |
| Cloud sync                    | Not in MVP         |

TunneLink is best suited for users who often access remote services through SSH tunnels, such as:

* Jupyter Notebook
* JupyterLab
* TensorBoard
* MLflow
* Remote database dashboards
* Local development servers on VPS or lab machines
* Internal web services available only through SSH

## How TunneLink Works

TunneLink runs locally on the user's computer as a desktop application.

Typical connection flow:

```text
Local computer / TunneLink  --->  SSH server / VPS
        SSH client                  SSH server
```

TunneLink connects outbound to an SSH server such as a VPS, development server, or lab machine. TunneLink itself does not expose an SSH server or public network service.

For Local forwarding (`-L`), the flow is usually:

```text
localhost:LOCAL_PORT  --->  SSH tunnel  --->  remote target host:target port
```

Example:

```bash
ssh -L 8888:localhost:8888 user@your-vps
```

This allows the user to open:

```text
http://localhost:8888
```

on their own computer and access a service running on the remote machine.

## Prerequisites

Install Node.js, Rust, and the Tauri CLI.

```bash
npm ci
cargo install tauri-cli --version "^2" --locked
```

Linux development also needs WebKit and app indicator packages.

On Ubuntu or Debian-based systems:

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

Rust checks:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Rust tests:

```bash
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

## Data Storage

TunneLink stores its local application data in the user application data directory.

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

### Stored Files

| File            | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `tunnelink.db`  | Local SQLite database for SSH profiles and forwarding rules |
| `tunnelink.key` | Local encryption key used for encrypted password storage    |

## Security Notes

TunneLink is a local desktop SSH client. It connects outbound to SSH servers such as VPS instances, development servers, or lab machines. It does not run a public SSH server.

### Password Storage

SSH passwords are encrypted before they are stored in the local SQLite database using AES-256-GCM.

Exports intentionally remove encrypted passwords. Imported password-based profiles require the password to be entered again.

Current limitation:

```text
The local database and the local encryption key are stored in the application data directory.
```

This protects against casual inspection of the database file, but it does not protect against malware, a compromised operating system account, or an attacker who can read both the database and the local encryption key.

Future versions should consider OS-native secret storage:

| Platform | Possible Secret Storage                   |
| -------- | ----------------------------------------- |
| Linux    | Secret Service, GNOME Keyring, KDE Wallet |
| Windows  | DPAPI or Windows Credential Manager       |
| macOS    | Keychain                                  |

### SSH Key Handling

For SSH key authentication, TunneLink stores only the path to the SSH private key.

The private key file itself is not copied into the TunneLink database.

Example:

```text
/home/user/.ssh/id_ed25519
```

Current limitation:

```text
SSH private keys with passphrases are not supported yet.
```

### Recommended SSH Key Type

TunneLink recommends Ed25519 SSH keys where possible.

Example:

```bash
ssh-keygen -t ed25519 -C "tunnelink"
```

RSA keys may still work depending on the current SSH dependency behavior, but Ed25519 is recommended for better modern SSH usage and to reduce dependency risk related to RSA advisory reports.

### Port Forwarding Scope

The MVP currently supports only Local forwarding (`-L`).

Remote forwarding (`-R`) and Dynamic/SOCKS forwarding (`-D`) are intentionally not exposed yet.

This is a security-conscious MVP decision because:

* Local forwarding is easier to reason about.
* Remote forwarding can expose local services through a remote server.
* Dynamic/SOCKS forwarding can create a proxy that may be misused if bound incorrectly.
* Additional validation and user warnings should be implemented before exposing those features.

Current supported model:

```text
Local computer -> SSH server -> target service
```

Not currently supported:

```text
Internet -> VPS -> local computer service
```

## Security Audit Notes

Current Rust security audits may report one known transitive vulnerability from the Rust SSH dependency stack:

```text
RUSTSEC-2023-0071
```

This advisory is related to the `rsa` crate and may appear through the `russh` / `russh-keys` dependency path.

At the time of this MVP, there may be no fully clean upstream fix available for the dependency path used by TunneLink.

TunneLink mitigates this risk by:

* Recommending Ed25519 SSH keys instead of RSA keys.
* Avoiding RSA usage where possible.
* Acting as a local SSH client rather than a public SSH server.
* Limiting the MVP to Local forwarding (`-L`).
* Keeping SSH sessions initiated from the local desktop application.
* Tracking upstream updates from the Rust SSH dependency ecosystem.

### Linux GTK/WebKit Audit Warnings

On Linux, audit tools may also report several unmaintained GTK3-related crates from the Tauri/Wry/WebKitGTK runtime stack.

These warnings may include crates such as:

* `gtk`
* `gtk-sys`
* `gtk3-macros`
* `glib`
* `gdk`
* `atk`
* related GTK3/WebKitGTK bindings

These are transitive dependencies from the Tauri Linux desktop runtime stack, not direct TunneLink application dependencies.

They are tracked as accepted transitive runtime risk until the upstream Tauri/Wry/WebKitGTK ecosystem provides a cleaner migration path.

## Cargo Audit

To run a Rust dependency audit:

```bash
cargo install cargo-audit
cargo audit --manifest-path src-tauri/Cargo.toml
```

To inspect why a dependency is included:

```bash
cargo tree --manifest-path src-tauri/Cargo.toml -i rsa
cargo tree --manifest-path src-tauri/Cargo.toml -i russh
cargo tree --manifest-path src-tauri/Cargo.toml -i russh-keys
```

For general dependency updates:

```bash
cargo update --manifest-path src-tauri/Cargo.toml
```

If an audit ignore policy is used, it should be documented clearly and reviewed regularly. Known advisories should not be ignored silently.

Example `.cargo/audit.toml` policy:

```toml
[advisories]
ignore = [
  # RUSTSEC-2023-0071: rsa Marvin Attack via russh/russh-keys.
  # No clean upstream fix is currently available in the TunneLink dependency path.
  # Mitigation: recommend Ed25519 keys, avoid RSA where possible,
  # keep TunneLink as a local SSH client, and monitor upstream fixes.
  "RUSTSEC-2023-0071",

  # GTK3/WebKitGTK transitive warnings from the Tauri/Wry Linux runtime stack.
  # These are not direct TunneLink dependencies and are tracked as accepted
  # transitive runtime risk.
  "RUSTSEC-2024-0419",
  "RUSTSEC-2024-0420",
  "RUSTSEC-2024-0370",
  "RUSTSEC-2025-0081",
  "RUSTSEC-2025-0075",
  "RUSTSEC-2025-0080",
  "RUSTSEC-2025-0100",
  "RUSTSEC-2025-0098"
]
```

## Import and Export Behavior

TunneLink supports importing and exporting SSH profiles.

For security reasons:

```text
Encrypted passwords are intentionally removed from exported profile data.
```

This means imported password-based profiles require the user to enter the password again.

SSH key-based profiles export only the configured key path, not the private key file.

## Release

The GitHub Actions workflow in:

```text
.github/workflows/release.yml
```

runs checks on pull requests and pushes to `main`.

It builds Linux and Windows bundles on version tags such as:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Manual `workflow_dispatch` runs upload installers as GitHub Actions artifacts only.

Tag runs also publish installers to the GitHub Release for the tag.

Artifacts are uploaded from:

```text
src-tauri/target/release/bundle/
```

Expected release assets:

| Platform | Expected Assets           |
| -------- | ------------------------- |
| Linux    | `.deb`                    |
| Windows  | `.msi`, NSIS setup `.exe` |

## Windows Cross-Check from Linux

For a Linux-to-Windows Rust cross-check with `cargo-xwin`:

```bash
cargo install cargo-xwin
rustup target add x86_64-pc-windows-msvc
cargo xwin check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-msvc
```

Use a Windows runner or Windows machine for final `.msi` and `.exe` packaging validation.

## Suggested Roadmap

Planned or possible future improvements:

* SSH private key passphrase support.
* OS-native secret storage.
* Better port conflict detection.
* One-click open local URL for active tunnels.
* Tunnel health check.
* Profile grouping.
* Quick connect/disconnect from system tray.
* Optional terminal integration.
* Better Windows smoke testing.
* Remote forwarding (`-R`) with clear warnings and validation.
* Dynamic/SOCKS forwarding (`-D`) with safe binding controls.
* Import/export schema versioning.

## Non-Goals for the MVP

The MVP does not aim to provide:

* A full terminal emulator.
* A public reverse tunneling platform.
* Cloud profile sync.
* Shared team vaults.
* Browser-based remote shell access.
* Automatic public domain generation.
* Public exposure of local services.

These may be considered in the future only if they fit the lightweight and security-conscious direction of the project.

## Development Philosophy

TunneLink prioritizes:

* Lightweight resource usage.
* Simple SSH tunnel workflows.
* Local-first profile storage.
* Clear security boundaries.
* Practical developer and ML workflows.
* Avoiding unnecessary background services.
* Avoiding public exposure by default.

## License

MIT License

## Maintainer

Created and maintained by Davin Supriyadi.
