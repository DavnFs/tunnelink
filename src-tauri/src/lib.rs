mod commands;
mod db;
mod models;
pub mod ssh;

use commands::crypto::CryptoKey;
use commands::profile::AppState;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

use crate::ssh::manager::TunnelManager;
use crate::ssh::sftp_pool::SftpManager;
use crate::ssh::shell::ShellManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let conn = db::init_db().expect("Failed to initialize database");

    // Load or generate encryption key
    let crypto = CryptoKey::load_or_generate().expect("Failed to initialize encryption key");

    // Build managed state
    let state = AppState {
        db: std::sync::Mutex::new(conn),
        crypto,
    };

    let tunnel_manager = TunnelManager::new();
    let shell_manager = ShellManager::new();
    let sftp_manager = SftpManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state)
        .manage(tunnel_manager)
        .manage(shell_manager)
        .manage(sftp_manager)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System Tray setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show TunneLink", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                // Prevent the default close behavior
                api.prevent_close();
                // Hide the window instead
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_profiles,
            commands::get_profile,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::add_forward_rule,
            commands::remove_forward_rule,
            commands::get_tunnel_statuses,
            commands::start_tunnel,
            commands::stop_tunnel,
            commands::open_terminal,
            commands::send_terminal_input,
            commands::resize_terminal,
            commands::close_terminal,
            commands::sftp_list_dir,
            commands::sftp_upload,
            commands::sftp_download,
            commands::sftp_delete,
            commands::sftp_rename,
            commands::sftp_mkdir,
            commands::export_profiles_json,
            commands::import_profiles_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
