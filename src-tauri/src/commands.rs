use serde::{Deserialize, Serialize};
use tokio::process::Command as TokioCommand;
use tauri::{AppHandle, Emitter};
use log::{info, error, warn};
use std::sync::atomic::{AtomicBool, Ordering};

// Flag Windows pour ne pas créer de fenêtre de console
const CREATE_NO_WINDOW: u32 = 0x08000000;

static IS_INSTALLING: AtomicBool = AtomicBool::new(false);

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

#[tauri::command]
pub async fn get_software_list() -> Result<Vec<Software>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn install_software(id: String, name: String) -> Result<String, String> {
    // Si appelé individuellement, on prend le lock temporairement
    let was_installing = IS_INSTALLING.swap(true, Ordering::SeqCst);
    if was_installing {
        return Err("Une installation est déjà en cours. Veuillez patienter.".to_string());
    }

    info!("Tentative d'installation de {} (ID: {})", name, id);
    
    let mut cmd = TokioCommand::new("winget");
    cmd.args(&[
            "install",
            "--id",
            &id,
            "--exact",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--silent",
            "--force",
        ]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await;
    
    IS_INSTALLING.store(false, Ordering::SeqCst);

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                info!("Installation réussie : {}", name);
                Ok(format!("{} a été installé avec succès.", name))
            } else {
                if stdout.contains("Un package existant a déjà été installé") || 
                   stdout.contains("Mise à niveau disponible introuvable") {
                    warn!("{} est déjà installé et à jour.", name);
                    return Ok(format!("{} est déjà installé et à jour.", name));
                }

                if stdout.contains("0x80070005") || stderr.contains("0x80070005") || 
                   stdout.contains("administrateur") || stderr.contains("administrateur") {
                    error!("Erreur de privilèges lors de l'installation de {}", name);
                    return Err(format!("Erreur de privilèges : Veuillez relancer NeoGet en tant qu'administrateur pour installer {}.", name));
                }

                error!("Échec de l'installation de {} (Code: {})", name, out.status.code().unwrap_or(-1));
                Err(format!(
                    "Échec de l'installation de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
                    name,
                    out.status.code().unwrap_or(-1),
                    stdout,
                    stderr
                ))
            }
        }
        Err(e) => {
            error!("Erreur système WinGet pour {} : {}", name, e);
            Err(format!("Erreur système lors de l'appel à WinGet : {}", e))
        }
    }
}

// Fonction interne sans lock pour le batch
async fn install_software_internal(id: &str, name: &str) -> Result<String, String> {
    info!("Tentative d'installation de {} (ID: {})", name, id);
    
    let mut cmd = TokioCommand::new("winget");
    cmd.args(&[
            "install",
            "--id",
            id,
            "--exact",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--silent",
            "--force",
        ]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                info!("Installation réussie : {}", name);
                Ok(format!("{} a été installé avec succès.", name))
            } else {
                if stdout.contains("Un package existant a déjà été installé") || 
                   stdout.contains("Mise à niveau disponible introuvable") {
                    warn!("{} est déjà installé et à jour.", name);
                    return Ok(format!("{} est déjà installé et à jour.", name));
                }

                if stdout.contains("0x80070005") || stderr.contains("0x80070005") || 
                   stdout.contains("administrateur") || stderr.contains("administrateur") {
                    error!("Erreur de privilèges lors de l'installation de {}", name);
                    return Err(format!("Erreur de privilèges : Veuillez relancer NeoGet en tant qu'administrateur pour installer {}.", name));
                }

                error!("Échec de l'installation de {} (Code: {})", name, out.status.code().unwrap_or(-1));
                Err(format!(
                    "Échec de l'installation de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
                    name,
                    out.status.code().unwrap_or(-1),
                    stdout,
                    stderr
                ))
            }
        }
        Err(e) => {
            error!("Erreur système WinGet pour {} : {}", name, e);
            Err(format!("Erreur système lors de l'appel à WinGet : {}", e))
        }
    }
}

#[tauri::command]
pub async fn install_software_batch(app: AppHandle, items: Vec<BatchItem>) -> Result<String, String> {
    let was_installing = IS_INSTALLING.swap(true, Ordering::SeqCst);
    if was_installing {
        return Err("Une installation est déjà en cours. Veuillez patienter.".to_string());
    }

    info!("Lancement d'une installation groupée (batch) pour {} logiciels", items.len());
    
    tauri::async_runtime::spawn(async move {
        let total = items.len();
        
        // Délai pour s'assurer que le frontend a ouvert l'overlay et est prêt à écouter
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        for (index, item) in items.iter().enumerate() {
            let current_index = index + 1;
            info!("Traitement batch {}/{} : {}", current_index, total, item.name);
            
            let payload = ProgressPayload {
                current_index,
                total,
                current_name: item.name.clone(),
                message: format!("Installation de {} ({}/{})", item.name, current_index, total),
                is_finished: false,
                error: None,
            };
            
            // Émettre le début de l'installation pour ce logiciel
            let _ = app.emit("installation-progress", &payload);
            
            // Exécution réelle via la fonction interne
            let result = install_software_internal(&item.id, &item.name).await;
            
            if let Err(e) = result {
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
                // Pause pour laisser l'utilisateur lire l'erreur
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
            } else {
                info!("Succès batch pour {}", item.name);
                // Pause pour la fluidité visuelle
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }
        
        info!("Toutes les installations groupées sont terminées.");
        let final_payload = ProgressPayload {
            current_index: total,
            total,
            current_name: "Terminé".to_string(),
            message: "Toutes les installations sont terminées !".to_string(),
            is_finished: true,
            error: None,
        };
        let _ = app.emit("installation-progress", &final_payload);
        
        // Libérer le lock
        IS_INSTALLING.store(false, Ordering::SeqCst);
    });
    
    Ok("Batch lancé en arrière-plan".to_string())
}

#[tauri::command]
pub async fn search_winget(query: String) -> Result<Vec<WinGetResult>, String> {
    info!("Recherche WinGet pour : '{}'", query);
    let mut cmd = TokioCommand::new("winget");
    cmd.args(&["search", &query, "--accept-source-agreements"]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await.map_err(|e| {
        error!("Erreur lors de l'exécution de la recherche WinGet : {}", e);
        e.to_string()
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();
    let lines: Vec<&str> = stdout.lines().collect();

    if lines.len() < 3 {
        info!("Aucun résultat trouvé pour '{}'", query);
        return Ok(results);
    }

    // Dynamic column parsing to avoid breaking on localized Windows versions
    let header = lines[0].to_lowercase();
    let id_idx = header.find("id").unwrap_or(30);
    let version_idx = header.find("version").unwrap_or(60);
    let source_idx = header.find("source").unwrap_or(80);

    for line in lines.iter().skip(2) {
        if line.trim().is_empty() || line.starts_with('-') { continue; }
        
        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        
        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len { return String::new(); }
            let actual_end = std::cmp::min(end, len);
            chars[start..actual_end].iter().collect::<String>().trim().to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.is_empty() && !id.contains("...") {
            results.push(WinGetResult { name, id, version, source });
        }
    }

    info!("{} résultats trouvés pour '{}'", results.len(), query);
    Ok(results)
}

#[tauri::command]
pub async fn check_winget() -> Result<bool, String> {
    info!("Vérification de la présence de WinGet...");
    let mut cmd = TokioCommand::new("powershell");
    cmd.args(&[
            "-NoProfile",
            "-Command",
            "if (Get-Command winget -ErrorAction SilentlyContinue) { Write-Output 'true' } else { Write-Output 'false' }",
        ]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await;

    match output {
        Ok(out) => {
            let res = String::from_utf8_lossy(&out.stdout);
            let is_present = res.trim().eq_ignore_ascii_case("true");
            if is_present {
                info!("WinGet est présent sur le système.");
            } else {
                warn!("WinGet n'a pas été trouvé.");
            }
            Ok(is_present)
        }
        Err(e) => {
            error!("Erreur lors de la vérification de WinGet : {}", e);
            Ok(false)
        },
    }
}

#[tauri::command]
pub async fn install_winget() -> Result<String, String> {
    info!("Début de l'installation automatique de WinGet via GitHub API...");
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/winget-cli/releases/latest"
    $msixUrl = ($response.assets | Where-Object { $_.name -like "*.msixbundle" })[0].browser_download_url
    if (-not $msixUrl) { throw "Impossible de trouver l'URL de téléchargement" }
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
    cmd.args(&["-NoProfile", "-Command", script]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if stdout.contains("SUCCESS") {
                info!("Installation de WinGet réussie.");
                Ok("WinGet a été installé avec succès à la dernière version.".to_string())
            } else {
                let err_str = String::from_utf8_lossy(&out.stderr);
                error!("Échec de l'installation de WinGet : {}", err_str);
                Err(format!("Erreur d'installation : {}", err_str))
            }
        }
        Err(e) => {
            error!("Erreur système lors de l'installation de WinGet : {}", e);
            Err(format!("Erreur système : {}", e))
        },
    }
}

#[tauri::command]
pub async fn get_installation_status(id: String) -> Result<InstallationStatus, String> {
    Ok(InstallationStatus {
        id,
        name: "Status".to_string(),
        status: "completed".to_string(),
        progress: 100.0,
        message: "Opération terminée".to_string(),
    })
}

#[tauri::command]
pub async fn is_admin() -> Result<bool, String> {
    info!("Vérification des droits Administrateur...");
    let mut cmd = TokioCommand::new("powershell");
    cmd.args(&[
            "-NoProfile",
            "-Command",
            "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')",
        ]);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await;

    match output {
        Ok(out) => {
            let res = String::from_utf8_lossy(&out.stdout);
            let admin = res.trim() == "True";
            info!("Droits Administrateur : {}", admin);
            Ok(admin)
        }
        Err(e) => {
            error!("Erreur lors de la vérification des droits Admin : {}", e);
            Ok(false)
        },
    }
}
