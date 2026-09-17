use crate::commands::{self, BatchItem};
use log::{error, info, warn};
use serde::Serialize;
use std::future::Future;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Semaphore;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationStatus {
    Queued,
    Running,
    Success,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationRecord {
    pub id: String,
    pub kind: String,
    pub package_id: String,
    pub package_name: String,
    pub status: OperationStatus,
    pub queued_at: u64,
    pub started_at: Option<u64>,
    pub finished_at: Option<u64>,
    pub result: Option<String>,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct OperationManager {
    records: Arc<Mutex<Vec<OperationRecord>>>,
    serial: Arc<Semaphore>,
    admission: Arc<Mutex<()>>,
    tail: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    next_id: Arc<AtomicU64>,
}

fn notify(app: AppHandle) -> impl Fn(OperationRecord) + Clone {
    move |record| {
        if let Err(err) = app.emit("operation-changed", &record) {
            warn!("operation_id={} event delivery failed: {}", record.id, err);
        }
    }
}

#[tauri::command]
pub fn list_operations(manager: State<'_, OperationManager>) -> Vec<OperationRecord> {
    manager.list()
}

#[tauri::command]
pub fn queue_install(
    app: AppHandle,
    manager: State<'_, OperationManager>,
    id: String,
    name: String,
    mode: Option<String>,
) -> Result<OperationRecord, String> {
    let item = BatchItem { id, name };
    enqueue_install(&manager, &app, item, mode)
}

fn enqueue_install(
    manager: &OperationManager,
    app: &AppHandle,
    item: BatchItem,
    mode: Option<String>,
) -> Result<OperationRecord, String> {
    let execute_app = app.clone();
    manager.enqueue("install", item.id.clone(), item.name.clone(), notify(app.clone()), move || async move {
        commands::install_software(execute_app, item.id, item.name, mode).await
    })
}

#[tauri::command]
pub fn queue_upgrade(
    app: AppHandle,
    manager: State<'_, OperationManager>,
    id: String,
    name: String,
    mode: Option<String>,
    force: Option<bool>,
) -> Result<OperationRecord, String> {
    let item = BatchItem { id, name };
    enqueue_upgrade(&manager, &app, item, mode, force.unwrap_or(true))
}

fn enqueue_upgrade(
    manager: &OperationManager,
    app: &AppHandle,
    item: BatchItem,
    mode: Option<String>,
    force: bool,
) -> Result<OperationRecord, String> {
    let execute_app = app.clone();
    manager.enqueue(
        "upgrade",
        item.id.clone(),
        item.name.clone(),
        notify(app.clone()),
        move || async move {
            commands::upgrade_software(execute_app, item.id, item.name, mode, Some(force)).await
        },
    )
}

#[tauri::command]
pub fn queue_uninstall(
    app: AppHandle,
    manager: State<'_, OperationManager>,
    id: String,
    name: String,
    mode: Option<String>,
) -> Result<OperationRecord, String> {
    let execute_app = app.clone();
    manager.enqueue(
        "uninstall",
        id.clone(),
        name.clone(),
        notify(app),
        move || async move { commands::uninstall_software(execute_app, id, name, mode).await },
    )
}

#[tauri::command]
pub fn queue_install_batch(
    app: AppHandle,
    manager: State<'_, OperationManager>,
    items: Vec<BatchItem>,
    mode: Option<String>,
) -> Result<Vec<OperationRecord>, String> {
    if items.is_empty() {
        return Err("Aucun logiciel sélectionné.".into());
    }
    validate_batch(&items)?;
    items
        .into_iter()
        .map(|item| enqueue_install(&manager, &app, item, mode.clone()))
        .collect()
}

#[tauri::command]
pub fn queue_upgrade_batch(
    app: AppHandle,
    manager: State<'_, OperationManager>,
    items: Vec<BatchItem>,
    mode: Option<String>,
    force: Option<bool>,
) -> Result<Vec<OperationRecord>, String> {
    if items.is_empty() {
        return Err("Aucun logiciel sélectionné.".into());
    }
    validate_batch(&items)?;
    items
        .into_iter()
        .map(|item| enqueue_upgrade(&manager, &app, item, mode.clone(), force.unwrap_or(true)))
        .collect()
}

pub(crate) fn validate_batch(items: &[BatchItem]) -> Result<(), String> {
    if items.len() > 500 {
        return Err("Le lot dépasse la limite de 500 logiciels.".into());
    }
    if items
        .iter()
        .any(|item| item.id.trim().is_empty() || item.name.trim().is_empty())
    {
        return Err("Tous les logiciels du lot doivent avoir un nom et un identifiant.".into());
    }
    Ok(())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

impl OperationManager {
    pub fn new() -> Self {
        Self {
            records: Arc::new(Mutex::new(Vec::new())),
            serial: Arc::new(Semaphore::new(1)),
            admission: Arc::new(Mutex::new(())),
            tail: Arc::new(Mutex::new(None)),
            next_id: Arc::new(AtomicU64::new(1)),
        }
    }

    pub fn try_exclusive(&self) -> Result<tokio::sync::OwnedSemaphorePermit, String> {
        if self.has_active() {
            return Err("Une opération système est déjà en attente ou en cours.".into());
        }
        self.serial
            .clone()
            .try_acquire_owned()
            .map_err(|_| "Une opération système est déjà en cours.".into())
    }

    pub fn has_active(&self) -> bool {
        self.list().iter().any(|item| {
            matches!(
                item.status,
                OperationStatus::Queued | OperationStatus::Running
            )
        }) || self.serial.available_permits() == 0
    }

    pub fn list(&self) -> Vec<OperationRecord> {
        self.records
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .clone()
    }

    pub fn enqueue<F, Fut, E>(
        &self,
        kind: &str,
        package_id: String,
        package_name: String,
        emit: E,
        execute: F,
    ) -> Result<OperationRecord, String>
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: Future<Output = Result<String, String>> + Send + 'static,
        E: Fn(OperationRecord) + Send + Sync + Clone + 'static,
    {
        let package_id = package_id.trim().to_string();
        if package_id.is_empty() || package_name.trim().is_empty() {
            return Err("Le nom et l'identifiant du package sont requis.".into());
        }
        let key = package_id.to_lowercase();
        let _admission = self
            .admission
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let record = {
            let mut records = self
                .records
                .lock()
                .unwrap_or_else(|poison| poison.into_inner());
            if let Some(existing) = records.iter().find(|record| {
                record.kind == kind
                    && record.package_id.to_lowercase() == key
                    && matches!(
                        record.status,
                        OperationStatus::Queued | OperationStatus::Running
                    )
            }) {
                info!("operation_id={} duplicate request attached", existing.id);
                return Ok(existing.clone());
            }
            let record = OperationRecord {
                id: format!(
                    "{}-{}",
                    now_ms(),
                    self.next_id.fetch_add(1, Ordering::Relaxed)
                ),
                kind: kind.to_string(),
                package_id,
                package_name,
                status: OperationStatus::Queued,
                queued_at: now_ms(),
                started_at: None,
                finished_at: None,
                result: None,
                error: None,
            };
            records.push(record.clone());
            if records.len() > 500 {
                if let Some(index) = records.iter().position(|item| {
                    matches!(
                        item.status,
                        OperationStatus::Success | OperationStatus::Failed
                    )
                }) {
                    records.remove(index);
                }
            }
            record
        };
        info!(
            "operation_id={} type={} package={} queued",
            record.id, record.kind, record.package_id
        );
        emit(record.clone());
        let manager = self.clone();
        let operation_id = record.id.clone();
        let previous = self
            .tail
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .take();
        let task = tokio::spawn(async move {
            if let Some(previous) = previous {
                if let Err(err) = previous.await {
                    error!("previous operation task failed: {}", err);
                }
            }
            let _permit = match manager.serial.acquire().await {
                Ok(permit) => permit,
                Err(err) => {
                    manager.transition(
                        &operation_id,
                        OperationStatus::Failed,
                        None,
                        Some(err.to_string()),
                        &emit,
                    );
                    return;
                }
            };
            manager.transition(&operation_id, OperationStatus::Running, None, None, &emit);
            let result = match tokio::spawn(execute()).await {
                Ok(result) => result,
                Err(error) => Err(format!("Erreur interne pendant l'opération : {}", error)),
            };
            match result {
                Ok(message) => manager.transition(
                    &operation_id,
                    OperationStatus::Success,
                    Some(message),
                    None,
                    &emit,
                ),
                Err(message) => manager.transition(
                    &operation_id,
                    OperationStatus::Failed,
                    None,
                    Some(message),
                    &emit,
                ),
            }
        });
        *self
            .tail
            .lock()
            .unwrap_or_else(|poison| poison.into_inner()) = Some(task);
        Ok(record)
    }

    fn transition<E: Fn(OperationRecord)>(
        &self,
        id: &str,
        status: OperationStatus,
        result: Option<String>,
        error_message: Option<String>,
        emit: &E,
    ) {
        let updated = {
            let mut records = self
                .records
                .lock()
                .unwrap_or_else(|poison| poison.into_inner());
            let Some(record) = records.iter_mut().find(|record| record.id == id) else {
                return;
            };
            record.status = status.clone();
            if status == OperationStatus::Running {
                record.started_at = Some(now_ms());
            }
            if matches!(status, OperationStatus::Success | OperationStatus::Failed) {
                record.finished_at = Some(now_ms());
            }
            record.result = result;
            record.error = error_message;
            record.clone()
        };
        match status {
            OperationStatus::Failed => error!(
                "operation_id={} type={} package={} failed duration_ms={} error={}",
                id,
                updated.kind,
                updated.package_id,
                updated
                    .finished_at
                    .unwrap_or(0)
                    .saturating_sub(updated.started_at.unwrap_or(updated.queued_at)),
                updated.error.as_deref().unwrap_or("")
            ),
            OperationStatus::Success => info!(
                "operation_id={} type={} package={} completed duration_ms={}",
                id,
                updated.kind,
                updated.package_id,
                updated
                    .finished_at
                    .unwrap_or(0)
                    .saturating_sub(updated.started_at.unwrap_or(updated.queued_at))
            ),
            OperationStatus::Running => info!(
                "operation_id={} type={} package={} command=winget {} --id {} --exact started",
                id, updated.kind, updated.package_id, updated.kind, updated.package_id
            ),
            OperationStatus::Queued => warn!("operation_id={} queued again", id),
        }
        emit(updated);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    #[tokio::test]
    async fn rapid_duplicate_requests_execute_once_and_recover_after_error() {
        let manager = OperationManager::new();
        let runs = Arc::new(AtomicUsize::new(0));
        let mut ids = Vec::new();
        for _ in 0..20 {
            let runs = runs.clone();
            let record = manager
                .enqueue(
                    "upgrade",
                    "Firefox".into(),
                    "Firefox".into(),
                    |_| {},
                    move || async move {
                        runs.fetch_add(1, Ordering::SeqCst);
                        Err("not found".into())
                    },
                )
                .unwrap();
            ids.push(record.id);
        }
        assert!(ids.iter().all(|id| id == &ids[0]));
        wait_for(&manager, 1).await;
        assert_eq!(runs.load(Ordering::SeqCst), 1);
        assert_eq!(manager.list()[0].status, OperationStatus::Failed);
        let next = manager
            .enqueue(
                "upgrade",
                "Firefox".into(),
                "Firefox".into(),
                |_| {},
                || async { Ok("done".into()) },
            )
            .unwrap();
        assert_ne!(next.id, ids[0]);
        wait_for(&manager, 2).await;
        assert_eq!(manager.list()[1].status, OperationStatus::Success);
    }

    #[tokio::test]
    async fn different_packages_run_serially_once_each() {
        let manager = OperationManager::new();
        let concurrent = Arc::new(AtomicUsize::new(0));
        let runs = Arc::new(AtomicUsize::new(0));
        let order = Arc::new(Mutex::new(Vec::new()));
        for package in ["Firefox", "VLC", "7zip"] {
            let concurrent = concurrent.clone();
            let runs = runs.clone();
            let order = order.clone();
            manager
                .enqueue(
                    "upgrade",
                    package.into(),
                    package.into(),
                    |_| {},
                    move || async move {
                        assert_eq!(concurrent.fetch_add(1, Ordering::SeqCst), 0);
                        runs.fetch_add(1, Ordering::SeqCst);
                        order.lock().unwrap().push(package);
                        tokio::task::yield_now().await;
                        concurrent.fetch_sub(1, Ordering::SeqCst);
                        Ok("done".into())
                    },
                )
                .unwrap();
        }
        wait_for(&manager, 3).await;
        assert_eq!(runs.load(Ordering::SeqCst), 3);
        assert_eq!(*order.lock().unwrap(), ["Firefox", "VLC", "7zip"]);
    }

    #[tokio::test]
    async fn panic_marks_operation_failed_and_does_not_block_queue() {
        let manager = OperationManager::new();
        manager
            .enqueue(
                "upgrade",
                "broken".into(),
                "broken".into(),
                |_| {},
                || async {
                    panic!("simulated executor failure");
                    #[allow(unreachable_code)]
                    Ok("never".into())
                },
            )
            .unwrap();
        manager
            .enqueue(
                "upgrade",
                "next".into(),
                "next".into(),
                |_| {},
                || async { Ok("done".into()) },
            )
            .unwrap();
        wait_for(&manager, 2).await;
        assert_eq!(manager.list()[0].status, OperationStatus::Failed);
        assert_eq!(manager.list()[1].status, OperationStatus::Success);
    }

    async fn wait_for(manager: &OperationManager, count: usize) {
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                if manager
                    .list()
                    .iter()
                    .filter(|record| {
                        matches!(
                            record.status,
                            OperationStatus::Success | OperationStatus::Failed
                        )
                    })
                    .count()
                    == count
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
    }
}
