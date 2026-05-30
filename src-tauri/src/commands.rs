use log::{error, info, warn};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    process::{Output, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicU32, Ordering},
        Arc,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncRead, AsyncReadExt};
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
    pub progress_percent: Option<f32>,
    pub is_finished: bool,
    pub error: Option<String>,
}

#[derive(Clone)]
struct ProgressContext {
    app: AppHandle,
    total: usize,
    current_index: usize,
    current_name: String,
    action_label: String,
}

#[derive(Clone)]
struct ProgressRuntime {
    ctx: ProgressContext,
    item_percent_tenths: Arc<AtomicU32>,
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
        progress_percent: Some(100.0),
        is_finished: true,
        error,
    }
}

fn parse_last_number(input: &str) -> Option<f32> {
    let mut last = None;
    let mut token = String::new();

    for c in input.chars() {
        if c.is_ascii_digit() || c == '.' || c == ',' {
            token.push(if c == ',' { '.' } else { c });
        } else if !token.is_empty() {
            if let Ok(value) = token.parse::<f32>() {
                last = Some(value);
            }
            token.clear();
        }
    }

    if !token.is_empty() {
        if let Ok(value) = token.parse::<f32>() {
            last = Some(value);
        }
    }

    last
}

fn parse_first_number(input: &str) -> Option<f32> {
    let mut token = String::new();

    for c in input.chars() {
        if c.is_ascii_digit() || c == '.' || c == ',' {
            token.push(if c == ',' { '.' } else { c });
        } else if !token.is_empty() {
            break;
        }
    }

    if token.is_empty() {
        return None;
    }

    token.parse::<f32>().ok()
}

fn extract_explicit_percent(input: &str) -> Option<f32> {
    let percent_pos = input.rfind('%')?;
    let before_percent = &input[..percent_pos];
    let mut digits = String::new();

    for c in before_percent.chars().rev() {
        if c.is_ascii_digit() || c == '.' || c == ',' {
            digits.push(if c == ',' { '.' } else { c });
        } else if !digits.is_empty() {
            break;
        }
    }

    if digits.is_empty() {
        return None;
    }

    let value = digits
        .chars()
        .rev()
        .collect::<String>()
        .parse::<f32>()
        .ok()?;
    Some(value.clamp(0.0, 100.0))
}

fn extract_ratio_percent(input: &str) -> Option<f32> {
    for (slash_idx, _) in input.match_indices('/') {
        if let (Some(current), Some(total)) = (
            parse_last_number(&input[..slash_idx]),
            parse_first_number(&input[slash_idx + 1..]),
        ) {
            if total > 0.0 && current >= 0.0 && current <= total * 1.2 {
                return Some(((current / total) * 100.0).clamp(0.0, 100.0));
            }
        }
    }

    None
}

fn extract_percent(input: &str) -> Option<f32> {
    extract_explicit_percent(input).or_else(|| extract_ratio_percent(input))
}

fn emit_progress(ctx: &ProgressContext, item_percent: f32, message: String, error: Option<String>) {
    let total = ctx.total.max(1);
    let completed_before = ctx.current_index.saturating_sub(1) as f32;
    let overall_percent =
        ((completed_before + item_percent.clamp(0.0, 100.0) / 100.0) / total as f32) * 100.0;

    let payload = ProgressPayload {
        current_index: ctx.current_index,
        total: ctx.total,
        current_name: ctx.current_name.clone(),
        message,
        progress_percent: Some(overall_percent.clamp(0.0, 100.0)),
        is_finished: false,
        error,
    };

    let _ = ctx.app.emit("installation-progress", &payload);
}

fn publish_progress(
    runtime: &ProgressRuntime,
    item_percent: f32,
    message: String,
    error: Option<String>,
) {
    let bounded = item_percent.clamp(0.0, 100.0);
    let next = (bounded * 10.0).round() as u32;
    let mut current = runtime.item_percent_tenths.load(Ordering::Relaxed);

    loop {
        if next <= current || (current > 0 && next < 1000 && next.saturating_sub(current) < 5) {
            return;
        }

        match runtime.item_percent_tenths.compare_exchange_weak(
            current,
            next,
            Ordering::AcqRel,
            Ordering::Relaxed,
        ) {
            Ok(_) => {
                emit_progress(&runtime.ctx, next as f32 / 10.0, message, error);
                return;
            }
            Err(actual) => current = actual,
        }
    }
}

fn start_estimated_progress(runtime: ProgressRuntime) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        publish_progress(
            &runtime,
            1.0,
            format!(
                "{} de {} en cours...",
                runtime.ctx.action_label, runtime.ctx.current_name
            ),
            None,
        );

        let mut elapsed_ms = 0u64;
        loop {
            tokio::time::sleep(Duration::from_millis(850)).await;
            elapsed_ms += 850;

            let elapsed = elapsed_ms as f32 / 1000.0;
            let estimated = if elapsed < 18.0 {
                2.0 + elapsed * 2.6
            } else if elapsed < 90.0 {
                48.0 + (elapsed - 18.0) * 0.48
            } else {
                82.0 + ((elapsed - 90.0) * 0.04).min(10.0)
            };

            publish_progress(
                &runtime,
                estimated.min(92.0),
                format!(
                    "{} de {} en cours...",
                    runtime.ctx.action_label, runtime.ctx.current_name
                ),
                None,
            );
        }
    })
}

async fn read_stream_with_progress<R>(
    mut reader: R,
    progress: Option<ProgressRuntime>,
) -> Result<Vec<u8>, std::io::Error>
where
    R: AsyncRead + Unpin,
{
    let mut collected = Vec::new();
    let mut buffer = [0u8; 1024];

    loop {
        let read = reader.read(&mut buffer).await?;
        if read == 0 {
            break;
        }

        collected.extend_from_slice(&buffer[..read]);

        if let Some(ctx) = &progress {
            let chunk = decode_command_output(&buffer[..read]);
            if let Some(percent) = extract_percent(&chunk) {
                publish_progress(
                    ctx,
                    percent,
                    format!(
                        "{} de {} : {}%",
                        ctx.ctx.action_label,
                        ctx.ctx.current_name,
                        percent.round() as u32
                    ),
                    None,
                );
            }
        }
    }

    Ok(collected)
}

async fn run_command_streaming_with_timeout(
    cmd: &mut TokioCommand,
    timeout: Duration,
    operation: &str,
    progress: Option<ProgressContext>,
) -> Result<Output, String> {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.kill_on_drop(true);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        error!("Erreur systeme pendant {}: {}", operation, e);
        format!("Erreur systeme pendant {}: {}", operation, e)
    })?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let progress_runtime = progress.map(|ctx| ProgressRuntime {
        ctx,
        item_percent_tenths: Arc::new(AtomicU32::new(0)),
    });
    let heartbeat_task = progress_runtime.clone().map(start_estimated_progress);
    let stdout_progress = progress_runtime.clone();
    let stderr_progress = progress_runtime.clone();

    let task = async move {
        let stdout_task = stdout.map(|stream| {
            tokio::spawn(async move { read_stream_with_progress(stream, stdout_progress).await })
        });
        let stderr_task = stderr.map(|stream| {
            tokio::spawn(async move { read_stream_with_progress(stream, stderr_progress).await })
        });

        let status = child.wait().await.map_err(|e| {
            error!("Erreur systeme pendant {}: {}", operation, e);
            format!("Erreur systeme pendant {}: {}", operation, e)
        })?;

        let stdout = match stdout_task {
            Some(task) => task
                .await
                .map_err(|e| format!("Erreur lecture stdout pendant {}: {}", operation, e))?
                .map_err(|e| format!("Erreur lecture stdout pendant {}: {}", operation, e))?,
            None => Vec::new(),
        };

        let stderr = match stderr_task {
            Some(task) => task
                .await
                .map_err(|e| format!("Erreur lecture stderr pendant {}: {}", operation, e))?
                .map_err(|e| format!("Erreur lecture stderr pendant {}: {}", operation, e))?,
            None => Vec::new(),
        };

        Ok(Output {
            status,
            stdout,
            stderr,
        })
    };

    let result = tokio::time::timeout(timeout, task).await;
    if let Some(task) = heartbeat_task {
        task.abort();
    }

    match result {
        Ok(result) => result,
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

fn decode_command_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes)
        .trim_start_matches('\u{feff}')
        .to_string()
}

fn powershell_command(script: &str) -> TokioCommand {
    let mut cmd = TokioCommand::new("powershell");
    let utf8_script = format!(
        "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); \
         $OutputEncoding = [Console]::OutputEncoding; {}",
        script
    );

    cmd.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &utf8_script,
    ]);
    cmd
}

fn escape_powershell_single_quoted(input: &str) -> String {
    input.replace('\'', "''")
}

async fn run_powershell_json<T>(
    script: &str,
    timeout: Duration,
    operation: &str,
) -> Result<T, String>
where
    T: DeserializeOwned,
{
    let mut cmd = powershell_command(script);
    let output = run_command_with_timeout(&mut cmd, timeout, operation).await?;
    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);

    if !output.status.success() {
        return Err(format!(
            "Echec de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
            operation,
            output.status.code().unwrap_or(-1),
            stdout,
            stderr
        ));
    }

    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Err(format!("{} n'a retourne aucune donnee JSON.", operation));
    }

    serde_json::from_str(trimmed).map_err(|e| {
        format!(
            "Erreur JSON pendant {} : {}\nSortie: {}",
            operation, e, trimmed
        )
    })
}

async fn run_powershell_action(
    script: &str,
    timeout: Duration,
    operation: &str,
) -> Result<String, String> {
    let mut cmd = powershell_command(script);
    let output = run_command_with_timeout(&mut cmd, timeout, operation).await?;
    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);

    if output.status.success() {
        let message = stdout.trim();
        if message.is_empty() {
            Ok(format!("{} termine.", operation))
        } else {
            Ok(message.to_string())
        }
    } else {
        Err(format!(
            "Echec de {} (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
            operation,
            output.status.code().unwrap_or(-1),
            stdout,
            stderr
        ))
    }
}

async fn run_winget_install(
    id: &str,
    name: &str,
    mode: Option<&str>,
    progress: Option<ProgressContext>,
) -> Result<String, String> {
    info!("Tentative d'installation de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args(["install", "--id", id, "--exact"]);
    for arg in build_winget_runtime_args(mode) {
        cmd.arg(arg);
    }
    cmd.arg("--force");

    let output = run_command_streaming_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("l'installation de {}", name),
        progress,
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);
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
pub async fn install_software(
    app: AppHandle,
    id: String,
    name: String,
    mode: Option<String>,
) -> Result<String, String> {
    let _guard = InstallingGuard::acquire()?;
    run_winget_install(
        &id,
        &name,
        mode.as_deref(),
        Some(ProgressContext {
            app,
            total: 1,
            current_index: 1,
            current_name: name.clone(),
            action_label: "Installation".to_string(),
        }),
    )
    .await
}

// Internal install function reused by the batch pipeline.
async fn install_software_internal(
    app: AppHandle,
    id: &str,
    name: &str,
    mode: Option<&str>,
    total: usize,
    current_index: usize,
) -> Result<String, String> {
    run_winget_install(
        id,
        name,
        mode,
        Some(ProgressContext {
            app,
            total,
            current_index,
            current_name: name.to_string(),
            action_label: "Installation".to_string(),
        }),
    )
    .await
}

#[tauri::command]
pub async fn install_software_batch(
    app: AppHandle,
    items: Vec<BatchItem>,
    mode: Option<String>,
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
                progress_percent: Some((index as f32 / total.max(1) as f32) * 100.0),
                is_finished: false,
                error: None,
            };

            let _ = app.emit("installation-progress", &payload);

            match install_software_internal(
                app.clone(),
                &item.id,
                &item.name,
                mode.as_deref(),
                total,
                current_index,
            )
                .await
            {
                Ok(_) => {
                    success_count += 1;
                    info!("Succes batch pour {}", item.name);
                    emit_progress(
                        &ProgressContext {
                            app: app.clone(),
                            total,
                            current_index,
                            current_name: item.name.clone(),
                            action_label: "Installation".to_string(),
                        },
                        100.0,
                        format!("{} installe ({}/{})", item.name, current_index, total),
                        None,
                    );
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
                        progress_percent: Some(
                            (current_index as f32 / total.max(1) as f32) * 100.0,
                        ),
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
        let stderr = decode_command_output(&output.stderr);
        error!("La recherche WinGet a echoue : {}", stderr.trim());
        return Err(format!("La recherche WinGet a echoue : {}", stderr.trim()));
    }

    let stdout = decode_command_output(&output.stdout);
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
    let id_idx = header
        .find("id")
        .or_else(|| header.find("identifiant"))
        .unwrap_or(30);
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
            if actual_end <= start {
                return String::new();
            }
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
    let mut cmd = powershell_command(
        "if (Get-Command winget -ErrorAction SilentlyContinue) { Write-Output 'true' } else { Write-Output 'false' }",
    );

    let output = run_command_with_timeout(
        &mut cmd,
        POWERSHELL_CHECK_TIMEOUT,
        "la verification de WinGet",
    )
    .await;

    match output {
        Ok(out) => {
            let res = decode_command_output(&out.stdout);
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

    let mut cmd = powershell_command(script);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_BOOTSTRAP_TIMEOUT,
        "l'installation de WinGet",
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
    if stdout.contains("SUCCESS") {
        info!("Installation de WinGet reussie.");
        return Ok("WinGet a ete installe avec succes a la derniere version.".to_string());
    }

    let err_str = decode_command_output(&output.stderr);
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
    let mut cmd = powershell_command(
        "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')",
    );

    let output = run_command_with_timeout(
        &mut cmd,
        POWERSHELL_CHECK_TIMEOUT,
        "la verification des droits administrateur",
    )
    .await;

    match output {
        Ok(out) => {
            let res = decode_command_output(&out.stdout);
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
    cmd.args([
        "upgrade",
        "--accept-source-agreements",
        "--include-unknown",
        "--disable-interactivity",
    ]);

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_SEARCH_TIMEOUT,
        "la recherche de mises à jour",
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
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
        if l.contains("version")
            && (l.contains(" id ")
                || l.contains("identifiant")
                || l.starts_with("nom ")
                || l.starts_with("name "))
        {
            header_idx = Some(idx);
            break;
        }
    }

    let h_idx = match header_idx {
        Some(idx) => idx,
        None => {
            info!(
                "[check_upgrades] Entête non trouvée. Premières lignes: {:?}",
                &lines[..std::cmp::min(5, lines.len())]
            );
            return Ok(results);
        }
    };

    let header_lower = lines[h_idx].to_lowercase();
    info!(
        "[check_upgrades] Header détecté à ligne {}: '{}'",
        h_idx, lines[h_idx]
    );

    // Detect column positions using word-boundary matching
    let id_idx = find_col_pos(&header_lower, &["id", "identifiant"]).unwrap_or(40);
    let version_idx = find_col_pos(&header_lower, &["version"]).unwrap_or(id_idx + 30);
    let available_idx =
        find_col_pos(&header_lower, &["disponible", "available"]).unwrap_or(version_idx + 20);
    let source_idx = find_col_pos(&header_lower, &["source"]).unwrap_or(available_idx + 15);
    info!(
        "[check_upgrades] Colonnes: name=0, id={}, version={}, available={}, source={}",
        id_idx, version_idx, available_idx, source_idx
    );

    for line in lines.iter().skip(h_idx + 2) {
        if line.trim().is_empty() || line.starts_with('-') || line.starts_with('\u{2500}') {
            continue;
        }

        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        if len < id_idx {
            continue;
        }

        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len {
                return String::new();
            }
            let actual_end = std::cmp::min(end, len);
            if actual_end <= start {
                return String::new();
            }
            chars[start..actual_end]
                .iter()
                .collect::<String>()
                .trim()
                .to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, available_idx);
        let available = safe_slice(available_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.trim().is_empty() && !id.contains("...") {
            results.push(UpgradeResult {
                name,
                id,
                version,
                available,
                source,
            });
        }
    }

    info!("{} mises à jour trouvées.", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn upgrade_software(
    app: AppHandle,
    id: String,
    name: String,
    mode: Option<String>,
) -> Result<String, String> {
    info!("Tentative de mise à jour de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args(["upgrade", "--id", &id, "--exact"]);
    for arg in build_winget_runtime_args(mode.as_deref()) {
        cmd.arg(arg);
    }
    cmd.arg("--force");

    let output = run_command_streaming_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("la mise à jour de {}", name),
        Some(ProgressContext {
            app,
            total: 1,
            current_index: 1,
            current_name: name.clone(),
            action_label: "Mise à jour".to_string(),
        }),
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);
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

    let output = run_command_with_timeout(
        &mut cmd,
        WINGET_SEARCH_TIMEOUT,
        "la récupération de la liste des logiciels",
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
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
        if l.contains("version")
            && (l.contains(" id ")
                || l.contains("identifiant")
                || l.starts_with("nom ")
                || l.starts_with("name "))
        {
            header_idx = Some(idx);
            break;
        }
    }

    let h_idx = match header_idx {
        Some(idx) => idx,
        None => {
            info!(
                "[get_installed] Entête non trouvée. Premières lignes: {:?}",
                &lines[..std::cmp::min(5, lines.len())]
            );
            return Ok(results);
        }
    };

    let header_lower = lines[h_idx].to_lowercase();
    info!(
        "[get_installed] Header détecté à ligne {}: '{}'",
        h_idx, lines[h_idx]
    );

    // Use word-boundary column detection
    let id_idx = find_col_pos(&header_lower, &["id", "identifiant"]).unwrap_or(40);
    let version_idx = find_col_pos(&header_lower, &["version"]).unwrap_or(id_idx + 30);
    let available_idx =
        find_col_pos(&header_lower, &["disponible", "available"]).unwrap_or(version_idx + 20);
    let source_idx = find_col_pos(&header_lower, &["source"]).unwrap_or(available_idx + 15);
    info!(
        "[get_installed] Colonnes: name=0, id={}, version={}, available={}, source={}",
        id_idx, version_idx, available_idx, source_idx
    );

    for line in lines.iter().skip(h_idx + 2) {
        if line.trim().is_empty() || line.starts_with('-') || line.starts_with('\u{2500}') {
            continue;
        }

        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        if len < id_idx {
            continue;
        }

        let safe_slice = |start: usize, end: usize| -> String {
            if start >= len {
                return String::new();
            }
            let actual_end = std::cmp::min(end, len);
            if actual_end <= start {
                return String::new();
            }
            chars[start..actual_end]
                .iter()
                .collect::<String>()
                .trim()
                .to_string()
        };

        let name = safe_slice(0, id_idx);
        let id = safe_slice(id_idx, version_idx);
        let version = safe_slice(version_idx, available_idx);
        let available = safe_slice(available_idx, source_idx);
        let source = safe_slice(source_idx, len);

        if !id.trim().is_empty() && !id.contains("...") {
            results.push(InstalledResult {
                name,
                id,
                version,
                available,
                source,
            });
        }
    }

    info!("{} logiciels installés trouvés.", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn uninstall_software(
    app: AppHandle,
    id: String,
    name: String,
    mode: Option<String>,
) -> Result<String, String> {
    info!("Tentative de désinstallation de {} (ID: {})", name, id);

    let mut cmd = TokioCommand::new("winget");
    cmd.args(["uninstall", "--id", &id, "--exact", "--accept-source-agreements"]);
    if mode.unwrap_or_else(|| "silent".to_string()) == "silent" {
        cmd.args(["--disable-interactivity", "--silent"]);
    }

    let output = run_command_streaming_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        &format!("la désinstallation de {}", name),
        Some(ProgressContext {
            app,
            total: 1,
            current_index: 1,
            current_name: name.clone(),
            action_label: "Désinstallation".to_string(),
        }),
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);
    let normalized_output = normalize_for_match(&format!("{}\n{}", stdout, stderr));

    if output.status.success() {
        info!("Désinstallation réussie : {}", name);
        return Ok(format!("{} a été désinstallé avec succès.", name));
    }

    if privilege_error_output(&normalized_output) {
        error!(
            "Erreur de privilèges lors de la désinstallation de {}",
            name
        );
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

    let mut cmd = powershell_command(&script);

    let output = run_command_with_timeout(
        &mut cmd,
        Duration::from_secs(60),
        "l'export de configuration",
    )
    .await?;
    let stdout = decode_command_output(&output.stdout);

    if stdout.contains("SUCCESS:") {
        let path = stdout
            .split("SUCCESS:")
            .nth(1)
            .unwrap_or("")
            .trim()
            .to_string();
        Ok(format!(
            "Configuration exportée avec succès dans : {}",
            path
        ))
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

    let mut cmd = powershell_command(script);

    let output = run_command_with_timeout(
        &mut cmd,
        Duration::from_secs(60),
        "l'import de configuration",
    )
    .await?;
    let stdout = decode_command_output(&output.stdout);

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WingetActionResult {
    pub command: String,
    pub message: String,
}

fn build_winget_runtime_args(mode: Option<&str>) -> Vec<&'static str> {
    let mut args = vec!["--accept-package-agreements", "--accept-source-agreements"];
    if mode.unwrap_or("silent") == "silent" {
        args.push("--disable-interactivity");
        args.push("--silent");
    }
    args
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

    let mut cmd = powershell_command(script);

    let output = run_command_with_timeout(
        &mut cmd,
        POWERSHELL_CHECK_TIMEOUT,
        "la récupération du diagnostic",
    )
    .await?;
    let stdout = decode_command_output(&output.stdout);

    let diag: SystemDiagnostic = serde_json::from_str(&stdout)
        .map_err(|e| format!("Erreur lors de l'analyse du rapport de diagnostic : {}", e))?;

    Ok(diag)
}

#[tauri::command]
pub async fn reset_winget_sources() -> Result<String, String> {
    info!("Réinitialisation forcée des sources WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "reset", "--force"]);

    let output = run_command_with_timeout(
        &mut cmd,
        Duration::from_secs(90),
        "la réinitialisation des sources",
    )
    .await?;
    if output.status.success() {
        Ok("Les sources WinGet ont été réinitialisées avec succès.".to_string())
    } else {
        let stderr = decode_command_output(&output.stderr);
        Err(format!("Échec de la réinitialisation : {}", stderr))
    }
}

#[tauri::command]
pub async fn update_winget_sources() -> Result<String, String> {
    info!("Mise à jour des sources WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "update"]);

    let output =
        run_command_with_timeout(&mut cmd, Duration::from_secs(90), "la mise à jour des sources")
            .await?;
    if output.status.success() {
        Ok("Les sources WinGet ont été mises à jour.".to_string())
    } else {
        let stderr = decode_command_output(&output.stderr);
        Err(format!("Échec de la mise à jour des sources : {}", stderr))
    }
}

#[tauri::command]
pub async fn remove_winget_source(name: String) -> Result<String, String> {
    info!("Suppression de la source WinGet: {}", name);
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "remove", &name]);

    let output = run_command_with_timeout(
        &mut cmd,
        Duration::from_secs(90),
        "la suppression de la source WinGet",
    )
    .await?;
    if output.status.success() {
        Ok(format!("Source '{}' supprimée.", name))
    } else {
        let stderr = decode_command_output(&output.stderr);
        Err(format!("Échec suppression de la source '{}': {}", name, stderr))
    }
}

#[tauri::command]
pub async fn winget_upgrade_all(
    app: AppHandle,
    include_unknown: bool,
    force: bool,
    mode: Option<String>,
) -> Result<String, String> {
    info!("Mise à jour globale WinGet démarrée...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["upgrade", "--all"]);
    for arg in build_winget_runtime_args(mode.as_deref()) {
        cmd.arg(arg);
    }
    if include_unknown {
        cmd.arg("--include-unknown");
    }
    if force {
        cmd.arg("--force");
    }

    let output = run_command_streaming_with_timeout(
        &mut cmd,
        WINGET_INSTALL_TIMEOUT,
        "la mise à jour globale WinGet",
        Some(ProgressContext {
            app,
            total: 1,
            current_index: 1,
            current_name: "Tous les paquets".to_string(),
            action_label: "Mise à jour globale".to_string(),
        }),
    )
    .await?;

    let stdout = decode_command_output(&output.stdout);
    let stderr = decode_command_output(&output.stderr);
    if output.status.success() {
        Ok("Mise à jour globale terminée.".to_string())
    } else {
        Err(format!(
            "Échec de la mise à jour globale (Code: {}).\nSTDOUT: {}\nSTDERR: {}",
            output.status.code().unwrap_or(-1),
            stdout,
            stderr
        ))
    }
}

#[tauri::command]
pub async fn cleanup_winget_download_cache() -> Result<String, String> {
    let script = r#"
Remove-Item "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\DiagOutputDir\*" -Force -ErrorAction SilentlyContinue
Write-Output "Cache winget nettoye."
"#;
    run_powershell_action(script, Duration::from_secs(45), "le nettoyage du cache winget").await
}

#[tauri::command]
pub async fn open_delivery_optimization_settings() -> Result<String, String> {
    let script = r#"
Start-Process "ms-settings:delivery-optimization-advanced"
Write-Output "Parametres Delivery Optimization ouverts."
"#;
    run_powershell_action(
        script,
        Duration::from_secs(20),
        "l'ouverture des parametres Delivery Optimization",
    )
    .await
}

#[tauri::command]
pub async fn run_winget_maintenance_profile(
    app: AppHandle,
    profile: String,
    mode: Option<String>,
) -> Result<Vec<WingetActionResult>, String> {
    let normalized = profile.trim().to_lowercase();
    let mut actions: Vec<Vec<String>> = Vec::new();

    match normalized.as_str() {
        "fast-upgrade" => {
            actions.push(vec!["source".into(), "update".into()]);
            let mut upgrade = vec!["upgrade".into(), "--all".into()];
            for arg in build_winget_runtime_args(mode.as_deref()) {
                upgrade.push(arg.to_string());
            }
            upgrade.push("--include-unknown".into());
            actions.push(upgrade);
        }
        "full-maintenance" => {
            actions.push(vec!["source".into(), "update".into()]);
            let mut upgrade = vec!["upgrade".into(), "--all".into()];
            for arg in build_winget_runtime_args(mode.as_deref()) {
                upgrade.push(arg.to_string());
            }
            upgrade.push("--include-unknown".into());
            upgrade.push("--force".into());
            actions.push(upgrade);
        }
        "repair-sources" => {
            actions.push(vec!["source".into(), "reset".into(), "--force".into()]);
            actions.push(vec!["source".into(), "update".into()]);
        }
        _ => {
            return Err(format!(
                "Profil '{}' inconnu. Utilisez: fast-upgrade, full-maintenance, repair-sources.",
                profile
            ));
        }
    }

    let mut results = Vec::new();
    for step in actions {
        let mut cmd = TokioCommand::new("winget");
        for arg in &step {
            cmd.arg(arg);
        }
        let label = format!("winget {}", step.join(" "));
        let output = run_command_streaming_with_timeout(
            &mut cmd,
            WINGET_INSTALL_TIMEOUT,
            &label,
            Some(ProgressContext {
                app: app.clone(),
                total: 1,
                current_index: 1,
                current_name: "Maintenance WinGet".to_string(),
                action_label: "Maintenance".to_string(),
            }),
        )
        .await?;
        let stderr = decode_command_output(&output.stderr);
        if !output.status.success() {
            return Err(format!(
                "Échec de '{}' (Code: {}). {}",
                label,
                output.status.code().unwrap_or(-1),
                stderr
            ));
        }
        results.push(WingetActionResult {
            command: label,
            message: "OK".to_string(),
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn list_winget_sources() -> Result<Vec<WinGetSource>, String> {
    info!("Récupération des sources WinGet...");
    let mut cmd = TokioCommand::new("winget");
    cmd.args(["source", "list"]);

    let output =
        run_command_with_timeout(&mut cmd, POWERSHELL_CHECK_TIMEOUT, "le listing des sources")
            .await?;
    let stdout = decode_command_output(&output.stdout);
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowsTweak {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub risk: String,
    pub enabled: bool,
    pub requires_admin: bool,
    pub restart_required: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
    pub item_count: u64,
    pub requires_admin: bool,
    pub selected: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowsAppPackage {
    pub name: String,
    pub package_full_name: String,
    pub publisher: String,
    pub version: String,
    pub install_location: String,
    pub is_framework: bool,
    pub removable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartupEntry {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub scope: String,
    pub kind: String,
    pub value_name: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTaskEntry {
    pub id: String,
    pub task_name: String,
    pub task_path: String,
    pub state: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn get_windows_tweaks() -> Result<Vec<WindowsTweak>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

function Get-DwordValue {
    param([string]$Path, [string]$Name, [int]$Default)
    try {
        $value = (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
        if ($null -eq $value) { return $Default }
        return [int]$value
    } catch {
        return $Default
    }
}

function Test-Key {
    param([string]$Path)
    try { return (Test-Path -Path $Path) } catch { return $false }
}

$advanced = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
$contentDelivery = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
$advertising = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo'
$copilot = 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot'
$classicMenu = 'HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32'
$hibernate = Get-DwordValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' 'HibernateEnabled' 1

$items = @(
    [pscustomobject]@{
        id = 'show_file_extensions'
        name = 'Afficher les extensions'
        description = 'Rend visibles les extensions de fichiers dans l Explorateur.'
        category = 'Explorateur'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advanced 'HideFileExt' 1) -eq 0)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'show_hidden_files'
        name = 'Afficher les fichiers caches'
        description = 'Affiche les fichiers et dossiers caches pour faciliter le diagnostic.'
        category = 'Explorateur'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advanced 'Hidden' 2) -eq 1)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'compact_explorer'
        name = 'Vue compacte Explorer'
        description = 'Reduit l espacement vertical dans les listes de fichiers.'
        category = 'Explorateur'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advanced 'UseCompactMode' 0) -eq 1)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'classic_context_menu'
        name = 'Menu contextuel classique'
        description = 'Restaure le menu clic droit complet de Windows 10 sur Windows 11.'
        category = 'Explorateur'
        risk = 'Modere'
        enabled = (Test-Key $classicMenu)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'taskbar_seconds'
        name = 'Secondes dans l horloge'
        description = 'Affiche les secondes dans l horloge de la barre des taches.'
        category = 'Interface'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advanced 'ShowSecondsInSystemClock' 0) -eq 1)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'hide_widgets'
        name = 'Masquer les widgets'
        description = 'Retire le bouton Widgets de la barre des taches.'
        category = 'Interface'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advanced 'TaskbarDa' 1) -eq 0)
        requires_admin = $false
        restart_required = 'Explorateur'
    },
    [pscustomobject]@{
        id = 'disable_game_dvr'
        name = 'Desactiver Game DVR'
        description = 'Coupe l enregistrement en arriere-plan Xbox Game Bar.'
        category = 'Gaming'
        risk = 'Faible'
        enabled = ((Get-DwordValue 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 1) -eq 0)
        requires_admin = $false
        restart_required = $null
    },
    [pscustomobject]@{
        id = 'reduce_suggestions'
        name = 'Reduire les suggestions'
        description = 'Desactive plusieurs recommandations, publicites et contenus suggeres.'
        category = 'Confidentialite'
        risk = 'Faible'
        enabled = ((Get-DwordValue $advertising 'Enabled' 1) -eq 0)
        requires_admin = $false
        restart_required = $null
    },
    [pscustomobject]@{
        id = 'disable_copilot'
        name = 'Desactiver Copilot'
        description = 'Applique la strategie utilisateur qui masque Windows Copilot.'
        category = 'Confidentialite'
        risk = 'Faible'
        enabled = ((Get-DwordValue $copilot 'TurnOffWindowsCopilot' 0) -eq 1)
        requires_admin = $false
        restart_required = 'Session'
    },
    [pscustomobject]@{
        id = 'disable_hibernation'
        name = 'Desactiver l hibernation'
        description = 'Desactive hiberfil.sys et libere l espace disque associe.'
        category = 'Energie'
        risk = 'Modere'
        enabled = ($hibernate -eq 0)
        requires_admin = $true
        restart_required = $null
    }
)

ConvertTo-Json -InputObject @($items) -Depth 5 -Compress
"#;

    run_powershell_json(
        script,
        POWERSHELL_CHECK_TIMEOUT,
        "la lecture des optimisations Windows",
    )
    .await
}

#[tauri::command]
pub async fn apply_windows_tweak(id: String, enabled: bool) -> Result<String, String> {
    let ps_enabled = if enabled { "$true" } else { "$false" };
    let script_template = match id.as_str() {
        "show_file_extensions" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name HideFileExt -PropertyType DWord -Value $(if ($enable) { 0 } else { 1 }) -Force | Out-Null
Write-Output 'Extensions de fichiers mises a jour.'
"#
        }
        "show_hidden_files" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name Hidden -PropertyType DWord -Value $(if ($enable) { 1 } else { 2 }) -Force | Out-Null
Write-Output 'Affichage des fichiers caches mis a jour.'
"#
        }
        "compact_explorer" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name UseCompactMode -PropertyType DWord -Value $(if ($enable) { 1 } else { 0 }) -Force | Out-Null
Write-Output 'Vue compacte de l Explorateur mise a jour.'
"#
        }
        "classic_context_menu" => {
            r#"
$enable = __ENABLED__
$key = 'HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}'
if ($enable) {
    reg.exe add "$key\InprocServer32" /ve /f | Out-Null
} else {
    reg.exe delete $key /f 2>$null | Out-Null
}
Write-Output 'Menu contextuel classique mis a jour.'
"#
        }
        "taskbar_seconds" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name ShowSecondsInSystemClock -PropertyType DWord -Value $(if ($enable) { 1 } else { 0 }) -Force | Out-Null
Write-Output 'Horloge de la barre des taches mise a jour.'
"#
        }
        "hide_widgets" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name TaskbarDa -PropertyType DWord -Value $(if ($enable) { 0 } else { 1 }) -Force | Out-Null
Write-Output 'Bouton Widgets mis a jour.'
"#
        }
        "disable_game_dvr" => {
            r#"
$enable = __ENABLED__
$capture = if ($enable) { 0 } else { 1 }
New-Item -Path 'HKCU:\System\GameConfigStore' -Force | Out-Null
New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Force | Out-Null
New-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name GameDVR_Enabled -PropertyType DWord -Value $capture -Force | Out-Null
New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name AppCaptureEnabled -PropertyType DWord -Value $capture -Force | Out-Null
Write-Output 'Xbox Game DVR mis a jour.'
"#
        }
        "reduce_suggestions" => {
            r#"
$enable = __ENABLED__
$value = if ($enable) { 0 } else { 1 }
$paths = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
)
foreach ($path in $paths) { New-Item -Path $path -Force | Out-Null }
New-ItemProperty -Path $paths[0] -Name Enabled -PropertyType DWord -Value $value -Force | Out-Null
$names = @(
    'ContentDeliveryAllowed',
    'OemPreInstalledAppsEnabled',
    'PreInstalledAppsEnabled',
    'SilentInstalledAppsEnabled',
    'SubscribedContent-338387Enabled',
    'SubscribedContent-338388Enabled',
    'SubscribedContent-338389Enabled',
    'SubscribedContent-353694Enabled',
    'SubscribedContent-353696Enabled',
    'SystemPaneSuggestionsEnabled'
)
foreach ($name in $names) {
    New-ItemProperty -Path $paths[1] -Name $name -PropertyType DWord -Value $value -Force | Out-Null
}
Write-Output 'Suggestions et contenus sponsorises mis a jour.'
"#
        }
        "disable_copilot" => {
            r#"
$enable = __ENABLED__
$path = 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name TurnOffWindowsCopilot -PropertyType DWord -Value $(if ($enable) { 1 } else { 0 }) -Force | Out-Null
Write-Output 'Strategie Copilot mise a jour.'
"#
        }
        "disable_hibernation" => {
            r#"
$enable = __ENABLED__
if ($enable) {
    powercfg.exe /hibernate off
} else {
    powercfg.exe /hibernate on
}
if ($LASTEXITCODE -ne 0) { throw 'powercfg a retourne une erreur. Relancez NeoGet en administrateur.' }
Write-Output 'Etat de l hibernation mis a jour.'
"#
        }
        _ => return Err(format!("Optimisation inconnue : {}", id)),
    };

    let script = script_template.replace("__ENABLED__", ps_enabled);
    run_powershell_action(
        &script,
        Duration::from_secs(60),
        "l'application de l'optimisation Windows",
    )
    .await
}

#[tauri::command]
pub async fn restart_explorer_shell() -> Result<String, String> {
    let script = r#"
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 900
Start-Process explorer.exe
Write-Output 'Explorateur Windows redemarre.'
"#;

    run_powershell_action(
        script,
        Duration::from_secs(30),
        "le redemarrage de l'Explorateur",
    )
    .await
}

#[tauri::command]
pub async fn scan_cleanup_items() -> Result<Vec<CleanupItem>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

function Measure-CleanupPath {
    param([string[]]$Paths, [string]$Filter = '*')
    $bytes = [int64]0
    $count = [int64]0
    foreach ($path in $Paths) {
        if (-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path -LiteralPath $path)) {
            try {
                Get-ChildItem -LiteralPath $path -Filter $Filter -Force -Recurse -ErrorAction SilentlyContinue |
                    Where-Object { -not $_.PSIsContainer } |
                    ForEach-Object {
                        $bytes += [int64]$_.Length
                        $count += 1
                    }
            } catch {}
        }
    }
    [pscustomobject]@{ bytes = $bytes; count = $count }
}

$defs = @(
    [pscustomobject]@{
        id = 'user_temp'
        name = 'Temporaires utilisateur'
        description = 'Caches et fichiers temporaires du profil courant.'
        paths = @($env:TEMP, $env:TMP)
        filter = '*'
        requires_admin = $false
        selected = $true
    },
    [pscustomobject]@{
        id = 'system_temp'
        name = 'Temporaires Windows'
        description = 'Fichiers temporaires systeme dans Windows\Temp.'
        paths = @((Join-Path $env:WINDIR 'Temp'))
        filter = '*'
        requires_admin = $true
        selected = $false
    },
    [pscustomobject]@{
        id = 'prefetch'
        name = 'Prefetch'
        description = 'Cache de lancement Windows, reconstruit automatiquement.'
        paths = @((Join-Path $env:WINDIR 'Prefetch'))
        filter = '*'
        requires_admin = $true
        selected = $false
    },
    [pscustomobject]@{
        id = 'thumbnail_cache'
        name = 'Miniatures Explorer'
        description = 'Base locale des miniatures d images et videos.'
        paths = @((Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer'))
        filter = 'thumbcache*.db'
        requires_admin = $false
        selected = $true
    },
    [pscustomobject]@{
        id = 'windows_update_cache'
        name = 'Cache Windows Update'
        description = 'Paquets telecharges par Windows Update.'
        paths = @((Join-Path $env:WINDIR 'SoftwareDistribution\Download'))
        filter = '*'
        requires_admin = $true
        selected = $false
    },
    [pscustomobject]@{
        id = 'recycle_bin'
        name = 'Corbeille'
        description = 'Elements supprimes conserves sur les lecteurs locaux.'
        paths = @('C:\$Recycle.Bin')
        filter = '*'
        requires_admin = $false
        selected = $false
    }
)

$items = foreach ($def in $defs) {
    $measure = Measure-CleanupPath -Paths $def.paths -Filter $def.filter
    [pscustomobject]@{
        id = $def.id
        name = $def.name
        description = $def.description
        size_bytes = [int64]$measure.bytes
        item_count = [int64]$measure.count
        requires_admin = [bool]$def.requires_admin
        selected = [bool]$def.selected
    }
}

ConvertTo-Json -InputObject @($items) -Depth 5 -Compress
"#;

    run_powershell_json(script, Duration::from_secs(120), "le scan de nettoyage").await
}

#[tauri::command]
pub async fn clean_windows_items(ids: Vec<String>) -> Result<String, String> {
    if ids.is_empty() {
        return Err("Aucun element de nettoyage selectionne.".to_string());
    }

    let ids_json = serde_json::to_string(&ids)
        .map_err(|e| format!("Erreur de preparation du nettoyage : {}", e))?;
    let escaped_ids = escape_powershell_single_quoted(&ids_json);
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$ids = '__IDS_JSON__' | ConvertFrom-Json
$processed = 0

function Clear-Children {
    param([string[]]$Paths, [string]$Filter = '*')
    foreach ($path in $Paths) {
        if (-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path -LiteralPath $path)) {
            try {
                Get-ChildItem -LiteralPath $path -Filter $Filter -Force -ErrorAction SilentlyContinue |
                    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
}

foreach ($id in @($ids)) {
    switch ($id) {
        'user_temp' {
            Clear-Children -Paths @($env:TEMP, $env:TMP)
            $processed++
        }
        'system_temp' {
            Clear-Children -Paths @((Join-Path $env:WINDIR 'Temp'))
            $processed++
        }
        'prefetch' {
            Clear-Children -Paths @((Join-Path $env:WINDIR 'Prefetch'))
            $processed++
        }
        'thumbnail_cache' {
            Clear-Children -Paths @((Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer')) -Filter 'thumbcache*.db'
            $processed++
        }
        'windows_update_cache' {
            Clear-Children -Paths @((Join-Path $env:WINDIR 'SoftwareDistribution\Download'))
            $processed++
        }
        'recycle_bin' {
            try { Clear-RecycleBin -Force -ErrorAction SilentlyContinue } catch {}
            $processed++
        }
    }
}

Write-Output ("Nettoyage termine : {0} zone(s) traitee(s)." -f $processed)
"#
    .replace("__IDS_JSON__", &escaped_ids);

    run_powershell_action(&script, Duration::from_secs(180), "le nettoyage Windows").await
}

#[tauri::command]
pub async fn list_windows_app_packages() -> Result<Vec<WindowsAppPackage>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

$items = Get-AppxPackage -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -and -not $_.IsFramework } |
    Sort-Object Name |
    Select-Object -First 500 |
    ForEach-Object {
        $nonRemovable = $false
        try { $nonRemovable = [bool]$_.NonRemovable } catch {}
        [pscustomobject]@{
            name = [string]$_.Name
            package_full_name = [string]$_.PackageFullName
            publisher = [string]$_.Publisher
            version = [string]$_.Version
            install_location = [string]$_.InstallLocation
            is_framework = [bool]$_.IsFramework
            removable = (-not $nonRemovable)
        }
    }

ConvertTo-Json -InputObject @($items) -Depth 5 -Compress
"#;

    run_powershell_json(
        script,
        Duration::from_secs(90),
        "le listing des applications Windows",
    )
    .await
}

#[tauri::command]
pub async fn remove_windows_app_package(package: String) -> Result<String, String> {
    if package.trim().is_empty() {
        return Err("Package AppX manquant.".to_string());
    }

    let escaped_package = escape_powershell_single_quoted(&package);
    let script = r#"
$package = '__PACKAGE__'
Remove-AppxPackage -Package $package -ErrorAction Stop
Write-Output ("Application Windows supprimee : {0}" -f $package)
"#
    .replace("__PACKAGE__", &escaped_package);

    run_powershell_action(
        &script,
        Duration::from_secs(120),
        "la suppression de l'application Windows",
    )
    .await
}

#[tauri::command]
pub async fn list_startup_entries() -> Result<Vec<StartupEntry>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

function Get-StartupApprovedEnabled {
    param([string]$Root, [string]$Kind, [string]$ValueName)
    $approvedPath = if ($Kind -eq 'RunOnce') {
        'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\RunOnce'
    } elseif ($Kind -eq 'StartupFolder') {
        'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder'
    } else {
        'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
    }

    try {
        $data = (Get-ItemProperty -Path "$Root\$approvedPath" -Name $ValueName -ErrorAction Stop).$ValueName
        if ($data -is [byte[]] -and $data.Length -gt 0) {
            return ($data[0] -ne 3)
        }
    } catch {}
    return $true
}

function Add-RunEntries {
    param([System.Collections.ArrayList]$Items, [string]$Root, [string]$Scope, [string]$Path, [string]$Kind)
    $fullPath = "$Root\$Path"
    try {
        $props = Get-ItemProperty -Path $fullPath -ErrorAction Stop
        foreach ($prop in $props.PSObject.Properties) {
            if ($prop.Name -like 'PS*') { continue }
            $enabled = Get-StartupApprovedEnabled -Root $Root -Kind $Kind -ValueName $prop.Name
            [void]$Items.Add([pscustomobject]@{
                id = "$Scope|$Kind|$($prop.Name)"
                name = [string]$prop.Name
                command = [string]$prop.Value
                location = $fullPath
                scope = $Scope
                kind = $Kind
                value_name = [string]$prop.Name
                enabled = [bool]$enabled
            })
        }
    } catch {}
}

function Add-StartupFolderEntries {
    param([System.Collections.ArrayList]$Items, [string]$Path, [string]$Scope)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    try {
        Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue |
            Where-Object { -not $_.PSIsContainer } |
            ForEach-Object {
                $root = if ($Scope -eq 'HKLM') { 'HKLM:' } else { 'HKCU:' }
                $enabled = Get-StartupApprovedEnabled -Root $root -Kind 'StartupFolder' -ValueName $_.Name
                [void]$Items.Add([pscustomobject]@{
                    id = "$Scope|StartupFolder|$($_.Name)"
                    name = [string]$_.BaseName
                    command = [string]$_.FullName
                    location = [string]$Path
                    scope = $Scope
                    kind = 'StartupFolder'
                    value_name = [string]$_.Name
                    enabled = [bool]$enabled
                })
            }
    } catch {}
}

$items = New-Object System.Collections.ArrayList
Add-RunEntries -Items $items -Root 'HKCU:' -Scope 'HKCU' -Path 'Software\Microsoft\Windows\CurrentVersion\Run' -Kind 'Run'
Add-RunEntries -Items $items -Root 'HKCU:' -Scope 'HKCU' -Path 'Software\Microsoft\Windows\CurrentVersion\RunOnce' -Kind 'RunOnce'
Add-RunEntries -Items $items -Root 'HKLM:' -Scope 'HKLM' -Path 'Software\Microsoft\Windows\CurrentVersion\Run' -Kind 'Run'
Add-RunEntries -Items $items -Root 'HKLM:' -Scope 'HKLM' -Path 'Software\Microsoft\Windows\CurrentVersion\RunOnce' -Kind 'RunOnce'
Add-StartupFolderEntries -Items $items -Path ([Environment]::GetFolderPath('Startup')) -Scope 'HKCU'
Add-StartupFolderEntries -Items $items -Path ([Environment]::GetFolderPath('CommonStartup')) -Scope 'HKLM'

ConvertTo-Json -InputObject @($items) -Depth 5 -Compress
"#;

    run_powershell_json(script, Duration::from_secs(60), "le listing du demarrage").await
}

#[tauri::command]
pub async fn set_startup_entry_enabled(
    entry: StartupEntry,
    enabled: bool,
) -> Result<String, String> {
    let entry_json = serde_json::to_string(&entry)
        .map_err(|e| format!("Erreur de preparation du demarrage : {}", e))?;
    let escaped_entry = escape_powershell_single_quoted(&entry_json);
    let ps_enabled = if enabled { "$true" } else { "$false" };
    let script = r#"
$entry = '__ENTRY_JSON__' | ConvertFrom-Json
$enable = __ENABLED__
$bytes = if ($enable) {
    [byte[]](2,0,0,0,0,0,0,0,0,0,0,0)
} else {
    [byte[]](3,0,0,0,0,0,0,0,0,0,0,0)
}

$root = if ($entry.scope -eq 'HKLM') { 'HKLM:' } else { 'HKCU:' }
$approvedPath = if ($entry.kind -eq 'RunOnce') {
    'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\RunOnce'
} elseif ($entry.kind -eq 'StartupFolder') {
    'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder'
} else {
    'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
}

$fullPath = "$root\$approvedPath"
New-Item -Path $fullPath -Force | Out-Null
New-ItemProperty -Path $fullPath -Name $entry.value_name -Value $bytes -PropertyType Binary -Force | Out-Null
Write-Output ("Demarrage mis a jour : {0}" -f $entry.name)
"#
    .replace("__ENTRY_JSON__", &escaped_entry)
    .replace("__ENABLED__", ps_enabled);

    run_powershell_action(
        &script,
        Duration::from_secs(45),
        "la mise a jour du demarrage",
    )
    .await
}

#[tauri::command]
pub async fn list_scheduled_tasks() -> Result<Vec<ScheduledTaskEntry>, String> {
    let script = r#"
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'

$items = Get-ScheduledTask -ErrorAction SilentlyContinue |
    Where-Object { $_.TaskPath -notlike '\Microsoft\Windows\*' } |
    Sort-Object TaskPath, TaskName |
    Select-Object -First 300 |
    ForEach-Object {
        [pscustomobject]@{
            id = "$($_.TaskPath)|$($_.TaskName)"
            task_name = [string]$_.TaskName
            task_path = [string]$_.TaskPath
            state = [string]$_.State
            enabled = ($_.State -ne 'Disabled')
        }
    }

ConvertTo-Json -InputObject @($items) -Depth 5 -Compress
"#;

    run_powershell_json(
        script,
        Duration::from_secs(60),
        "le listing des taches planifiees",
    )
    .await
}

#[tauri::command]
pub async fn set_scheduled_task_enabled(
    task_name: String,
    task_path: String,
    enabled: bool,
) -> Result<String, String> {
    if task_name.trim().is_empty() {
        return Err("Nom de tache manquant.".to_string());
    }

    let escaped_name = escape_powershell_single_quoted(&task_name);
    let escaped_path = escape_powershell_single_quoted(&task_path);
    let ps_enabled = if enabled { "$true" } else { "$false" };
    let script = r#"
$taskName = '__TASK_NAME__'
$taskPath = '__TASK_PATH__'
$enable = __ENABLED__
if ($enable) {
    Enable-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop | Out-Null
} else {
    Disable-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop | Out-Null
}
Write-Output ("Tache planifiee mise a jour : {0}{1}" -f $taskPath, $taskName)
"#
    .replace("__TASK_NAME__", &escaped_name)
    .replace("__TASK_PATH__", &escaped_path)
    .replace("__ENABLED__", ps_enabled);

    run_powershell_action(
        &script,
        Duration::from_secs(45),
        "la mise a jour de la tache planifiee",
    )
    .await
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
    fn extract_percent_reads_explicit_percent_and_transfer_ratio() {
        assert_eq!(extract_percent("Downloading package 42%"), Some(42.0));
        assert_eq!(extract_percent("  25.0 MB / 100.0 MB"), Some(25.0));
        assert_eq!(extract_percent("  12,5 MB / 50 MB"), Some(25.0));
        assert_eq!(extract_percent("no progress here"), None);
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
        let mut cmd = powershell_command("Start-Sleep -Seconds 2; Write-Output 'done'");

        let result = run_command_with_timeout(&mut cmd, Duration::from_millis(100), "test");
        let error = result.await.expect_err("command should timeout");
        assert!(error.contains("Timeout"));
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn run_command_with_timeout_allows_fast_command() {
        let mut cmd = powershell_command("Write-Output 'ok'");

        let output = run_command_with_timeout(&mut cmd, Duration::from_secs(5), "test")
            .await
            .expect("command should complete");
        let stdout = decode_command_output(&output.stdout);
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
                    println!(
                        "  - {} ({}) [{} -> {}]",
                        up.name, up.id, up.version, up.available
                    );
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
