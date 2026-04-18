mod commands;

pub use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Déterminer le chemin du dossier des logs (à côté de l'exécutable)
    let mut log_path = std::env::current_exe().unwrap_or_default();
    log_path.pop(); // Retire le nom de l'exécutable
    log_path.push("logs"); // Ajoute le dossier 'logs'

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                        path: log_path,
                        file_name: None,
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::get_software_list,
            commands::install_software,
            commands::check_winget,
            commands::install_winget,
            commands::get_installation_status,
            commands::is_admin,
            commands::search_winget,
            commands::install_software_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
