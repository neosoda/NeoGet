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

fn normalize_for_match(input: &str) -> String {
    input
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'à' | 'â' | 'ä' | 'á' | 'ã' => 'a',
            'ç' => 'c',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'î' | 'ï' | 'ì' | 'í' => 'i',
            'ô' | 'ö' | 'ò' | 'ó' => 'o',
            'ù' | 'û' | 'ü' | 'ú' => 'u',
            _ => c,
        })
        .collect()
}

fn already_installed_output(normalized_output: &str) -> bool {
    normalized_output.contains("un package existant a deja ete installe")
        || normalized_output.contains("mise a niveau disponible introuvable")
        || normalized_output.contains("found an existing package already installed")
        || normalized_output.contains("no applicable upgrade found")
        || normalized_output.contains("no newer package versions are available")
}

fn privilege_error_output(normalized_output: &str) -> bool {
    normalized_output.contains("0x80070005")
        || normalized_output.contains("administrateur")
        || normalized_output.contains("administrator")
        || normalized_output.contains("access is denied")
}

fn build_batch_final_payload(
    total: usize,
    success_count: usize,
    failed_names: &[String],
) -> ProgressPayload {
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

    ProgressPayload {
        current_index: total,
        total,
        current_name,
        message,
        is_finished: true,
        error,
    }
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
    let normalized_output = normalize_for_match(&format!("{}\n{}", stdout, stderr));

    if output.status.success() {
        info!("Installation reussie : {}", name);
        return Ok(format!("{} a ete installe avec succes.", name));
    }

    if already_installed_output(&normalized_output) {
        warn!("{} est deja installe et a jour.", name);
        return Ok(format!("{} est deja installe et a jour.", name));
    }

    if privilege_error_output(&normalized_output) {
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
        info!(
            "Fin du batch: {} succes, {} echec(s)",
            success_count, failure_count
        );

        let final_payload = build_batch_final_payload(total, success_count, &failed_names);
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
    let clean_stdout = stdout.replace("\r\n", "\n").replace('\r', "\n");
    let mut results = Vec::new();
    let lines: Vec<&str> = clean_stdout.lines().collect();

    if lines.len() < 2 {
        info!("Aucun resultat trouve pour '{}'", query);
        return Ok(results);
    }

    // Dynamic column parsing to limit parsing breakage on localized environments.
    let mut header_idx = None;
    for (idx, line) in lines.iter().enumerate().take(30) {
        let l = line.to_lowercase();
        if (l.contains("id") || l.contains("identifiant")) && l.contains("version") {
            header_idx = Some(idx);
            break;
        }
    }

    let h_idx = match header_idx {
        Some(idx) => idx,
        None => {
            info!("Entête non trouvée pour la recherche '{}'", query);
            return Ok(results);
        }
    };

    let header = lines[h_idx].to_lowercase();
    let id_idx = header.find("id").or_else(|| header.find("identifiant")).unwrap_or(30);
    let version_idx = header.find("version").unwrap_or(60);
    let source_idx = header.find("source").unwrap_or(80);

    for line in lines.iter().skip(h_idx + 2) {
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpgradeResult {
    pub name: String,
    pub id: String,
    pub version: String,
    pub available: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledResult {
    pub name: String,
    pub id: String,
    pub version: String,
    pub available: String,
    pub source: String,
}

/// Find the character position of a column header word in the WinGet header line.
/// Uses word-boundary detection to avoid matching substrings (e.g. "id" in "disponible").
fn find_col_pos(header: &str, candidates: &[&str]) -> Option<usize> {
    let chars: Vec<char> = header.chars().collect();
    let len = chars.len();
    for candidate in candidates {
        let candidate_chars: Vec<char> = candidate.chars().collect();
        let cand_len = candidate_chars.len();
        'outer: for start in 0..len.saturating_sub(cand_len - 1) {
            // Check that this position matches the candidate
            for (i, &c) in candidate_chars.iter().enumerate() {
                if start + i >= len || chars[start + i] != c {
                    continue 'outer;
                }
            }
            // Check word boundaries: char before must be space/start, char after must be space/end
            let before_ok = start == 0 || chars[start - 1] == ' ';
            let after_pos = start + cand_len;
            let after_ok = after_pos >= len || chars[after_pos] == ' ';
            if before_ok && after_ok {
                return Some(start);
            }
        }
    }
    None
}

#[tauri::command]
pub async fn check_upgrades() -> Result<Vec<UpgradeResult>, String> {
    info!("Recherche des mises à jour disponibles via WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["upgrade", "--accept-source-agreements"]);

    let output = run_command_with_timeout(&mut cmd, WINGET_SEARCH_TIMEOUT, "la recherche de mises à jour").await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let clean_stdout = stdout.replace("\r\n", "\n").replace('\r', "\n");
    let mut results = Vec::new();
    let lines: Vec<&str> = clean_stdout.lines().collect();
    info!("[check_upgrades] {} lignes de sortie WinGet", lines.len());

    if lines.len() < 2 {
        info!("Aucune mise à jour disponible.");
        return Ok(results);
    }

    // Find the header line dynamically: must contain "version" AND one of our ID keywords
    let mut header_idx = None;
    for (idx, line) in lines.iter().enumerate().take(30) {
        let l = line.to_lowercase();
        if l.contains("version") && (l.contains(" id ") || l.contains("identifiant") || l.starts_with("nom ") || l.starts_with("name ")) {
            header_idx = Some(idx);
            break;
        }
    }

    let h_idx = match header_idx {
        Some(idx) => idx,
        None => {
            info!("[check_upgrades] Entête non trouvée. Premières lignes: {:?}", &lines[..std::cmp::min(5, lines.len())]);
            return Ok(results);
        }
    };

    let header_lower = lines[h_idx].to_lowercase();
    info!("[check_upgrades] Header détecté à ligne {}: '{}'", h_idx, lines[h_idx]);

    // Detect column positions using word-boundary matching
    let id_idx = find_col_pos(&header_lower, &["id", "identifiant"]).unwrap_or(40);
    let version_idx = find_col_pos(&header_lower, &["version"]).unwrap_or(id_idx + 30);
    let available_idx = find_col_pos(&header_lower, &["disponible", "available"]).unwrap_or(version_idx + 20);
    let source_idx = find_col_pos(&header_lower, &["source"]).unwrap_or(available_idx + 15);
    info!("[check_upgrades] Colonnes: name=0, id={}, version={}, available={}, source={}", id_idx, version_idx, available_idx, source_idx);

    for line in lines.iter().skip(h_idx + 2) {
        if line.trim().is_empty() || line.starts_with('-') || line.starts_with('\u{2500}') {
            continue;
        }

        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        if len < id_idx { continue; }

        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len { return String::new(); }
            let actual_end = std::cmp::min(end, len);
            chars[start..actual_end].iter().collect::<String>().trim().to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, available_idx);
        let available = safe_slice(available_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.trim().is_empty() && !id.contains("...") {
            results.push(UpgradeResult { name, id, version, available, source });
        }
    }

    info!("{} mises à jour trouvées.", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn upgrade_software(id: String, name: String) -> Result<String, String> {
    info!("Tentative de mise à jour de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args([
        "upgrade",
        "--id",
        &id,
        "--exact",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--silent",
        "--force",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("la mise à jour de {}", name),
    )
    .await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let normalized_output = normalize_for_match(&format!("{}\n{}", stdout, stderr));

    if output.status.success() {
        info!("Mise à jour réussie : {}", name);
        return Ok(format!("{} a été mis à jour avec succès.", name));
    }

    if privilege_error_output(&normalized_output) {
        error!("Erreur de privilèges lors de la mise à jour de {}", name);
        return Err(format!(
            "Erreur de privilèges : relancez NeoGet en tant qu'administrateur pour mettre à jour {}.",
            name
        ));
    }

    error!(
        "Échec de la mise à jour de {} (Code: {})",
        name,
        output.status.code().unwrap_or(-1)
    );
    Err(format!(
        "Échec de la mise à jour de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
        name,
        output.status.code().unwrap_or(-1),
        stdout,
        stderr
    ))
}

#[tauri::command]
pub async fn get_installed_software() -> Result<Vec<InstalledResult>, String> {
    info!("Récupération de la liste des logiciels installés via WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["list", "--accept-source-agreements"]);

    let output = run_command_with_timeout(&mut cmd, WINGET_SEARCH_TIMEOUT, "la récupération de la liste des logiciels").await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let clean_stdout = stdout.replace("\r\n", "\n").replace('\r', "\n");
    let mut results = Vec::new();
    let lines: Vec<&str> = clean_stdout.lines().collect();
    info!("[get_installed] {} lignes de sortie WinGet", lines.len());

    if lines.len() < 2 {
        return Ok(results);
    }

    // Find the header line: must contain "version" AND " id " or "identifiant"
    let mut header_idx = None;
    for (idx, line) in lines.iter().enumerate().take(30) {
        let l = line.to_lowercase();
        if l.contains("version") && (l.contains(" id ") || l.contains("identifiant") || l.starts_with("nom ") || l.starts_with("name ")) {
            header_idx = Some(idx);
            break;
        }
    }

    let h_idx = match header_idx {
        Some(idx) => idx,
        None => {
            info!("[get_installed] Entête non trouvée. Premières lignes: {:?}", &lines[..std::cmp::min(5, lines.len())]);
            return Ok(results);
        }
    };

    let header_lower = lines[h_idx].to_lowercase();
    info!("[get_installed] Header détecté à ligne {}: '{}'", h_idx, lines[h_idx]);

    // Use word-boundary column detection
    let id_idx = find_col_pos(&header_lower, &["id", "identifiant"]).unwrap_or(40);
    let version_idx = find_col_pos(&header_lower, &["version"]).unwrap_or(id_idx + 30);
    let available_idx = find_col_pos(&header_lower, &["disponible", "available"]).unwrap_or(version_idx + 20);
    let source_idx = find_col_pos(&header_lower, &["source"]).unwrap_or(available_idx + 15);
    info!("[get_installed] Colonnes: name=0, id={}, version={}, available={}, source={}", id_idx, version_idx, available_idx, source_idx);

    for line in lines.iter().skip(h_idx + 2) {
        if line.trim().is_empty() || line.starts_with('-') || line.starts_with('\u{2500}') {
            continue;
        }

        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        if len < id_idx { continue; }

        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len { return String::new(); }
            let actual_end = std::cmp::min(end, len);
            chars[start..actual_end].iter().collect::<String>().trim().to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, available_idx);
        let available = safe_slice(available_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.trim().is_empty() && !id.contains("...") {
            results.push(InstalledResult { name, id, version, available, source });
        }
    }

    info!("{} logiciels installés trouvés.", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn uninstall_software(id: String, name: String) -> Result<String, String> {
    info!("Tentative de désinstallation de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args([
        "uninstall",
        "--id",
        &id,
        "--exact",
        "--accept-source-agreements",
        "--silent",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("la désinstallation de {}", name),
    )
    .await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let normalized_output = normalize_for_match(&format!("{}\n{}", stdout, stderr));

    if output.status.success() {
        info!("Désinstallation réussie : {}", name);
        return Ok(format!("{} a été désinstallé avec succès.", name));
    }

    if privilege_error_output(&normalized_output) {
        error!("Erreur de privilèges lors de la désinstallation de {}", name);
        return Err(format!(
            "Erreur de privilèges : relancez NeoGet en tant qu'administrateur pour désinstaller {}.",
            name
        ));
    }

    error!(
        "Échec de la désinstallation de {} (Code: {})",
        name,
        output.status.code().unwrap_or(-1)
    );
    Err(format!(
        "Échec de la désinstallation de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
        name,
        output.status.code().unwrap_or(-1),
        stdout,
        stderr
    ))
}

#[tauri::command]
pub async fn export_configuration(items: Vec<BatchItem>) -> Result<String, String> {
    let json_content = serde_json::to_string_pretty(&items)
        .map_err(|e| format!("Erreur sérialisation : {}", e))?;

    let escaped_json = json_content.replace("'", "''");

    let script = format!(
        r#"
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
$FileBrowser = New-Object System.Windows.Forms.SaveFileDialog
$FileBrowser.Filter = "Configuration NeoGet (*.json)|*.json"
$FileBrowser.Title = "Exporter votre configuration"
$FileBrowser.FileName = "neoget-config.json"
$Show = $FileBrowser.ShowDialog()
if ($Show -eq "OK") {{
    [System.IO.File]::WriteAllText($FileBrowser.FileName, '{}')
    Write-Output "SUCCESS:$($FileBrowser.FileName)"
}} else {{
    Write-Output "CANCELLED"
}}
"#,
        escaped_json
    );

    let mut cmd = TokioCommand::new("powershell");
    cmd.args(["-NoProfile", "-Command", &script]);

    let output = run_command_with_timeout(&mut cmd, Duration::from_secs(60), "l'export de configuration").await?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.contains("SUCCESS:") {
        let path = stdout.split("SUCCESS:").nth(1).unwrap_or("").trim().to_string();
        Ok(format!("Configuration exportée avec succès dans : {}", path))
    } else {
        Err("Export annulé".to_string())
    }
}

#[tauri::command]
pub async fn import_configuration() -> Result<Vec<BatchItem>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
$FileBrowser = New-Object System.Windows.Forms.OpenFileDialog
$FileBrowser.Filter = "Configuration NeoGet (*.json)|*.json"
$FileBrowser.Title = "Importer une configuration"
$Show = $FileBrowser.ShowDialog()
if ($Show -eq "OK") {
    $content = [System.IO.File]::ReadAllText($FileBrowser.FileName)
    Write-Output "SUCCESS:$content"
} else {
    Write-Output "CANCELLED"
}
"#;

    let mut cmd = TokioCommand::new("powershell");
    cmd.args(["-NoProfile", "-Command", script]);

    let output = run_command_with_timeout(&mut cmd, Duration::from_secs(60), "l'import de configuration").await?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.contains("SUCCESS:") {
        let json_str = stdout.split("SUCCESS:").nth(1).unwrap_or("").trim();
        let items: Vec<BatchItem> = serde_json::from_str(json_str)
            .map_err(|e| format!("Erreur lors de la lecture du fichier JSON : {}", e))?;
        Ok(items)
    } else {
        Err("Import annulé".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemDiagnostic {
    pub os_name: String,
    pub os_version: String,
    pub ram_total: f32,
    pub ram_used: f32,
    pub ram_free: f32,
    pub disk_total: f32,
    pub disk_used: f32,
    pub disk_free: f32,
    pub dev_mode: bool,
    pub winget_version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WinGetSource {
    pub name: String,
    pub argument: String,
}

#[tauri::command]
pub async fn get_system_diagnostic() -> Result<SystemDiagnostic, String> {
    info!("Récupération du diagnostic système via PowerShell...");
    let script = r#"
$OS = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
if (-not $OS) {
    $OS = [PSCustomObject]@{ Caption = "Windows 10/11"; Version = "Unknown" }
}
$TotalRAM = 16.0
$FreeRAM = 8.0
try {
    $TotalRAM = [Math]::Round(($OS.TotalVisibleMemorySize / 1024 / 1024), 2)
    $FreeRAM = [Math]::Round(($OS.FreePhysicalMemory / 1024 / 1024), 2)
} catch {}
$UsedRAM = [Math]::Round(($TotalRAM - $FreeRAM), 2)

$TotalDisk = 250.0
$FreeDisk = 100.0
$UsedDisk = 150.0
try {
    $Drive = Get-PSDrive C -ErrorAction SilentlyContinue
    $TotalDisk = [Math]::Round(($Drive.Used + $Drive.Free) / 1GB, 2)
    $FreeDisk = [Math]::Round($Drive.Free / 1GB, 2)
    $UsedDisk = [Math]::Round($Drive.Used / 1GB, 2)
} catch {}

$DevMode = $false
try {
    $DevMode = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction SilentlyContinue).AllowDevelopmentWithoutDevLicense -eq 1
} catch {}

$WingetVersion = "Non installé"
try {
    $raw = & winget --version
    $WingetVersion = $raw.Trim()
} catch {}

$Diagnostic = @{
    os_name = $OS.Caption
    os_version = $OS.Version
    ram_total = $TotalRAM
    ram_used = $UsedRAM
    ram_free = $FreeRAM
    disk_total = $TotalDisk
    disk_used = $UsedDisk
    disk_free = $FreeDisk
    dev_mode = $DevMode
    winget_version = $WingetVersion
}

Write-Output (ConvertTo-Json $Diagnostic)
"#;

    let mut cmd = TokioCommand::new("powershell");
    cmd.args(["-NoProfile", "-Command", script]);

    let output = run_command_with_timeout(&mut cmd, POWERSHELL_CHECK_TIMEOUT, "la récupération du diagnostic").await?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    let diag: SystemDiagnostic = serde_json::from_str(&stdout)
        .map_err(|e| format!("Erreur lors de l'analyse du rapport de diagnostic : {}", e))?;

    Ok(diag)
}

#[tauri::command]
pub async fn reset_winget_sources() -> Result<String, String> {
    info!("Réinitialisation forcée des sources WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "reset", "--force"]);

    let output = run_command_with_timeout(&mut cmd, Duration::from_secs(90), "la réinitialisation des sources").await?;
    if output.status.success() {
        Ok("Les sources WinGet ont été réinitialisées avec succès.".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Échec de la réinitialisation : {}", stderr))
    }
}

#[tauri::command]
pub async fn list_winget_sources() -> Result<Vec<WinGetSource>, String> {
    info!("Récupération des sources WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "list"]);

    let output = run_command_with_timeout(&mut cmd, POWERSHELL_CHECK_TIMEOUT, "le listing des sources").await?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let clean_stdout = stdout.replace("\r\n", "\n").replace('\r', "\n");
    let mut results = Vec::new();

    let lines: Vec<&str> = clean_stdout.lines().collect();
    if lines.len() < 3 {
        return Ok(results);
    }

    for line in lines.iter().skip(2) {
        if line.trim().is_empty() || line.starts_with('-') {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            results.push(WinGetSource {
                name: parts[0].to_string(),
                argument: parts[1..].join(" "),
            });
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_for_match_removes_common_accents() {
        let normalized =
            normalize_for_match("d\u{00E9}j\u{00E0} install\u{00E9}, acc\u{00E8}s refus\u{00E9}");
        assert_eq!(normalized, "deja installe, acces refuse");
    }

    #[test]
    fn already_installed_output_matches_known_signatures() {
        assert!(already_installed_output(
            "un package existant a deja ete installe"
        ));
        assert!(already_installed_output(
            "found an existing package already installed"
        ));
        assert!(!already_installed_output(
            "installation started successfully"
        ));
    }

    #[test]
    fn privilege_error_output_matches_known_signatures() {
        assert!(privilege_error_output("0x80070005"));
        assert!(privilege_error_output("access is denied"));
        assert!(privilege_error_output("droits administrateur requis"));
        assert!(!privilege_error_output("operation completed"));
    }

    #[test]
    fn installing_guard_blocks_parallel_and_releases() {
        IS_INSTALLING.store(false, Ordering::SeqCst);
        let first = InstallingGuard::acquire().expect("first lock should succeed");
        assert!(InstallingGuard::acquire().is_err());
        drop(first);
        assert!(InstallingGuard::acquire().is_ok());
        IS_INSTALLING.store(false, Ordering::SeqCst);
    }

    #[test]
    fn build_batch_final_payload_success_path() {
        let failed: Vec<String> = vec![];
        let payload = build_batch_final_payload(3, 3, &failed);
        assert_eq!(payload.current_index, 3);
        assert_eq!(payload.total, 3);
        assert!(payload.is_finished);
        assert!(payload.error.is_none());
        assert_eq!(payload.current_name, "Termine");
    }

    #[test]
    fn build_batch_final_payload_failure_path() {
        let failed = vec!["PkgA".to_string(), "PkgB".to_string()];
        let payload = build_batch_final_payload(4, 2, &failed);
        assert_eq!(payload.current_index, 4);
        assert_eq!(payload.total, 4);
        assert!(payload.is_finished);
        assert!(payload.error.is_some());
        assert_eq!(payload.current_name, "Termine avec erreurs");
        assert!(payload.message.contains("2 succes, 2 echec(s)"));
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn run_command_with_timeout_reports_timeout() {
        let mut cmd = TokioCommand::new("powershell");
        cmd.args([
            "-NoProfile",
            "-Command",
            "Start-Sleep -Seconds 2; Write-Output 'done'",
        ]);

        let result = run_command_with_timeout(&mut cmd, Duration::from_millis(100), "test");
        let error = result.await.expect_err("command should timeout");
        assert!(error.contains("Timeout"));
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn run_command_with_timeout_allows_fast_command() {
        let mut cmd = TokioCommand::new("powershell");
        cmd.args(["-NoProfile", "-Command", "Write-Output 'ok'"]);

        let output = run_command_with_timeout(&mut cmd, Duration::from_secs(5), "test")
            .await
            .expect("command should complete");
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.to_lowercase().contains("ok"));
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn test_all_winget_commands() {
        println!("=== DIAGNOSTIC: get_installed_software ===");
        match get_installed_software().await {
            Ok(apps) => {
                println!("SUCCESS: Found {} installed apps", apps.len());
                for app in apps.iter().take(5) {
                    println!("  - {} ({}) [{}]", app.name, app.id, app.version);
                }
            }
            Err(e) => println!("ERROR in get_installed_software: {}", e),
        }

        println!("=== DIAGNOSTIC: check_upgrades ===");
        match check_upgrades().await {
            Ok(ups) => {
                println!("SUCCESS: Found {} upgrades", ups.len());
                for up in ups.iter().take(5) {
                    println!("  - {} ({}) [{} -> {}]", up.name, up.id, up.version, up.available);
                }
            }
            Err(e) => println!("ERROR in check_upgrades: {}", e),
        }

        println!("=== DIAGNOSTIC: search_winget(\"git\") ===");
        match search_winget("git".to_string()).await {
            Ok(res) => {
                println!("SUCCESS: Found {} search results for 'git'", res.len());
                for item in res.iter().take(5) {
                    println!("  - {} ({}) [{}]", item.name, item.id, item.version);
                }
            }
            Err(e) => println!("ERROR in search_winget: {}", e),
        }

        println!("=== DIAGNOSTIC: list_winget_sources ===");
        match list_winget_sources().await {
            Ok(srcs) => {
                println!("SUCCESS: Found {} sources", srcs.len());
                for src in srcs.iter() {
                    println!("  - {}: {}", src.name, src.argument);
                }
            }
            Err(e) => println!("ERROR in list_winget_sources: {}", e),
        }
    }
}
