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
            commands::upgrade_software_batch,
            commands::relaunch_as_admin,
            commands::check_upgrades,
            commands::upgrade_software,
            commands::get_installed_software,
            commands::uninstall_software,
            commands::export_configuration,
            commands::import_configuration,
            commands::get_system_diagnostic,
            commands::reset_winget_sources,
            commands::update_winget_sources,
            commands::remove_winget_source,
            commands::list_winget_sources,
            commands::winget_upgrade_all,
            commands::run_winget_maintenance_profile,
            commands::cleanup_winget_download_cache,
            commands::open_delivery_optimization_settings,
            commands::get_windows_tweaks,
            commands::apply_windows_tweak,
            commands::restart_explorer_shell,
            commands::scan_cleanup_items,
            commands::clean_windows_items,
            commands::list_windows_app_packages,
            commands::remove_windows_app_package,
            commands::list_startup_entries,
            commands::set_startup_entry_enabled,
            commands::list_scheduled_tasks,
            commands::set_scheduled_task_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
