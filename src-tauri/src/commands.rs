use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::{
    process::Output,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{AppHandle, Emitter};
use tokio::process::Command as TokioCommand;

// Windows flag to avoid opening a visible console for child processes.
const CREATE_NO_WINDOW: u32 = 0x08000000;
const WINGET_INSTALL_TIMEOUT: Duration = Duration::from_secs(20 * 60);
const WINGET_SEARCH_TIMEOUT: Duration = Duration::from_secs(45);
const POWERSHELL_CHECK_TIMEOUT: Duration = Duration::from_secs(20);
const WINGET_BOOTSTRAP_TIMEOUT: Duration = Duration::from_secs(10 * 60);

static IS_INSTALLING: AtomicBool = AtomicBool::new(false);

struct InstallingGuard;

impl InstallingGuard {
    fn acquire() -> Result<Self, String> {
        let was_installing = IS_INSTALLING.swap(true, Ordering::SeqCst);
        if was_installing {
            return Err("Une installation est deja en cours. Veuillez patienter.".to_string());
        }
        Ok(Self)
    }
}

impl Drop for InstallingGuard {
    fn drop(&mut self) {
        IS_INSTALLING.store(false, Ordering::SeqCst);
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Software {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallationStatus {
    pub id: String,
    pub name: String,
    pub status: String,
    pub progress: f32,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WinGetResult {
    pub name: String,
    pub id: String,
    pub version: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BatchItem {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressPayload {
    pub current_index: usize,
    pub total: usize,
    pub current_name: String,
    pub message: String,
    pub is_finished: bool,
    pub error: Option<String>,
}

fn already_installed_output(output: &str) -> bool {
    output.contains("un package existant a deja ete installe")
        || output.contains("un package existant a déjà été installé")
        || output.contains("mise a niveau disponible introuvable")
        || output.contains("mise à niveau disponible introuvable")
        || output.contains("found an existing package already installed")
        || output.contains("no applicable upgrade found")
        || output.contains("no newer package versions are available")
}

fn privilege_error_output(output: &str) -> bool {
    output.contains("0x80070005")
        || output.contains("administrateur")
        || output.contains("administrator")
        || output.contains("access is denied")
}

async fn run_command_with_timeout(
    cmd: &mut TokioCommand,
    timeout: Duration,
    operation: &str,
) -> Result<Output, String> {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.kill_on_drop(true);

    match tokio::time::timeout(timeout, cmd.output()).await {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(e)) => {
            error!("Erreur systeme pendant {}: {}", operation, e);
            Err(format!("Erreur systeme pendant {}: {}", operation, e))
        }
        Err(_) => {
            error!(
                "Timeout de {} secondes atteint pendant {}",
                timeout.as_secs(),
                operation
            );
            Err(format!(
                "Timeout de {} secondes atteint pendant {}.",
                timeout.as_secs(),
                operation
            ))
        }
    }
}

async fn run_winget_install(id: &str, name: &str) -> Result<String, String> {
    info!("Tentative d'installation de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args([
        "install",
        "--id",
        id,
        "--exact",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--silent",
        "--force",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("l'installation de {}", name),
    )
    .await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let merged_lower = format!("{}\n{}", stdout, stderr).to_lowercase();

    if output.status.success() {
        info!("Installation reussie : {}", name);
        return Ok(format!("{} a ete installe avec succes.", name));
    }

    if already_installed_output(&merged_lower) {
        warn!("{} est deja installe et a jour.", name);
        return Ok(format!("{} est deja installe et a jour.", name));
    }

    if privilege_error_output(&merged_lower) {
        error!("Erreur de privileges lors de l'installation de {}", name);
        return Err(format!(
            "Erreur de privileges : relancez NeoGet en tant qu'administrateur pour installer {}.",
            name
        ));
    }

    error!(
        "Echec de l'installation de {} (Code: {})",
        name,
        output.status.code().unwrap_or(-1)
    );
    Err(format!(
        "Echec de l'installation de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
        name,
        output.status.code().unwrap_or(-1),
        stdout,
        stderr
    ))
}

#[tauri::command]
pub async fn get_software_list() -> Result<Vec<Software>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn install_software(id: String, name: String) -> Result<String, String> {
    let _guard = InstallingGuard::acquire()?;
    run_winget_install(&id, &name).await
}

// Internal install function reused by the batch pipeline.
async fn install_software_internal(id: &str, name: &str) -> Result<String, String> {
    run_winget_install(id, name).await
}

#[tauri::command]
pub async fn install_software_batch(
    app: AppHandle,
    items: Vec<BatchItem>,
) -> Result<String, String> {
    if items.is_empty() {
        warn!("Batch annule: aucun element fourni.");
        return Err("Aucun logiciel selectionne pour l'installation groupee.".to_string());
    }

    let guard = InstallingGuard::acquire()?;
    info!(
        "Lancement d'une installation groupee (batch) pour {} logiciels",
        items.len()
    );

    tauri::async_runtime::spawn(async move {
        let _guard = guard;
        let total = items.len();
        let mut success_count = 0usize;
        let mut failed_names: Vec<String> = Vec::new();

        // Delay so the frontend overlay is mounted and listening.
        tokio::time::sleep(Duration::from_millis(500)).await;

        for (index, item) in items.iter().enumerate() {
            let current_index = index + 1;
            info!(
                "Traitement batch {}/{} : {}",
                current_index, total, item.name
            );

            let payload = ProgressPayload {
                current_index,
                total,
                current_name: item.name.clone(),
                message: format!(
                    "Installation de {} ({}/{})",
                    item.name, current_index, total
                ),
                is_finished: false,
                error: None,
            };

            let _ = app.emit("installation-progress", &payload);

            match install_software_internal(&item.id, &item.name).await {
                Ok(_) => {
                    success_count += 1;
                    info!("Succes batch pour {}", item.name);
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                Err(e) => {
                    failed_names.push(item.name.clone());
                    error!("Erreur lors du traitement batch de {} : {}", item.name, e);

                    let error_payload = ProgressPayload {
                        current_index,
                        total,
                        current_name: item.name.clone(),
                        message: format!("Erreur lors de l'installation de {}", item.name),
                        is_finished: false,
                        error: Some(e),
                    };

                    let _ = app.emit("installation-progress", &error_payload);
                    tokio::time::sleep(Duration::from_secs(3)).await;
                }
            }
        }

        let failure_count = failed_names.len();
        let (current_name, message, error) = if failure_count == 0 {
            (
                "Termine".to_string(),
                "Toutes les installations sont terminees !".to_string(),
                None,
            )
        } else {
            let listed = failed_names
                .iter()
                .take(5)
                .cloned()
                .collect::<Vec<_>>()
                .join(", ");
            let remaining = failure_count.saturating_sub(5);
            let suffix = if remaining > 0 {
                format!(" (+{} autre(s))", remaining)
            } else {
                String::new()
            };

            (
                "Termine avec erreurs".to_string(),
                format!(
                    "Installations terminees: {} succes, {} echec(s).",
                    success_count, failure_count
                ),
                Some(format!("Echecs: {}{}", listed, suffix)),
            )
        };

        info!(
            "Fin du batch: {} succes, {} echec(s)",
            success_count, failure_count
        );
        let final_payload = ProgressPayload {
            current_index: total,
            total,
            current_name,
            message,
            is_finished: true,
            error,
        };
        let _ = app.emit("installation-progress", &final_payload);
    });

    Ok("Batch lance en arriere-plan".to_string())
}

#[tauri::command]
pub async fn search_winget(query: String) -> Result<Vec<WinGetResult>, String> {
    let query = query.trim().to_string();
    if query.len() < 2 {
        return Ok(vec![]);
    }

    info!("Recherche WinGet pour : '{}'", query);
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["search", &query, "--accept-source-agreements"]);

    let output =
        run_command_with_timeout(&mut cmd, WINGET_SEARCH_TIMEOUT, "la recherche WinGet").await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("La recherche WinGet a echoue : {}", stderr.trim());
        return Err(format!("La recherche WinGet a echoue : {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();
    let lines: Vec<&str> = stdout.lines().collect();

    if lines.len() < 3 {
        info!("Aucun resultat trouve pour '{}'", query);
        return Ok(results);
    }

    // Dynamic column parsing to limit parsing breakage on localized environments.
    let header = lines[0].to_lowercase();
    let id_idx = header.find("id").unwrap_or(30);
    let version_idx = header.find("version").unwrap_or(60);
    let source_idx = header.find("source").unwrap_or(80);

    for line in lines.iter().skip(2) {
        if line.trim().is_empty() || line.starts_with('-') {
            continue;
        }

        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();

        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len {
                return String::new();
            }
            let actual_end = std::cmp::min(end, len);
            chars[start..actual_end]
                .iter()
                .collect::<String>()
                .trim()
                .to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.is_empty() && !id.contains("...") {
            results.push(WinGetResult {
                name,
                id,
                version,
                source,
            });
        }
    }

    info!("{} resultats trouves pour '{}'", results.len(), query);
    Ok(results)
}

#[tauri::command]
pub async fn check_winget() -> Result<bool, String> {
    info!("Verification de la presence de WinGet...");
    let mut cmd = TokioCommand::new("powershell");
    cmd.args([
        "-NoProfile",
        "-Command",
        "if (Get-Command winget -ErrorAction SilentlyContinue) { Write-Output 'true' } else { Write-Output 'false' }",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        POWERSHELL_CHECK_TIMEOUT,
        "la verification de WinGet",
    )
    .await;

    match output {
        Ok(out) => {
            let res = String::from_utf8_lossy(&out.stdout);
            let is_present = res.trim().eq_ignore_ascii_case("true");
            if is_present {
                info!("WinGet est present sur le systeme.");
            } else {
                warn!("WinGet n'a pas ete trouve.");
            }
            Ok(is_present)
        }
        Err(e) => {
            error!("Erreur lors de la verification de WinGet : {}", e);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn install_winget() -> Result<String, String> {
    info!("Debut de l'installation automatique de WinGet via GitHub API...");
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/winget-cli/releases/latest"
    $msixUrl = ($response.assets | Where-Object { $_.name -like "*.msixbundle" })[0].browser_download_url
    if (-not $msixUrl) { throw "Impossible de trouver l'URL de telechargement" }
    $tempFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'winget.msixbundle')
    Invoke-WebRequest -Uri $msixUrl -OutFile $tempFile
    Add-AppxPackage -Path $tempFile -ForceApplicationShutdown
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
}
"#;

    let mut cmd = TokioCommand::new("powershell");
    cmd.args(["-NoProfile", "-Command", script]);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_BOOTSTRAP_TIMEOUT,
        "l'installation de WinGet",
    )
    .await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.contains("SUCCESS") {
        info!("Installation de WinGet reussie.");
        return Ok("WinGet a ete installe avec succes a la derniere version.".to_string());
    }

    let err_str = String::from_utf8_lossy(&output.stderr);
    error!("Echec de l'installation de WinGet : {}", err_str);
    Err(format!("Erreur d'installation : {}", err_str))
}

#[tauri::command]
pub async fn get_installation_status(id: String) -> Result<InstallationStatus, String> {
    Ok(InstallationStatus {
        id,
        name: "Status".to_string(),
        status: "completed".to_string(),
        progress: 100.0,
        message: "Operation terminee".to_string(),
    })
}

#[tauri::command]
pub async fn is_admin() -> Result<bool, String> {
    info!("Verification des droits Administrateur...");
    let mut cmd = TokioCommand::new("powershell");
    cmd.args([
        "-NoProfile",
        "-Command",
        "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        POWERSHELL_CHECK_TIMEOUT,
        "la verification des droits administrateur",
    )
    .await;

    match output {
        Ok(out) => {
            let res = String::from_utf8_lossy(&out.stdout);
            let admin = res.trim() == "True";
            info!("Droits Administrateur : {}", admin);
            Ok(admin)
        }
        Err(e) => {
            error!("Erreur lors de la verification des droits Admin : {}", e);
            Ok(false)
        }
    }
}
