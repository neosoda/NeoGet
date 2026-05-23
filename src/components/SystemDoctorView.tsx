import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, Cpu, HardDrive, RefreshCw, Shield, Wrench } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { SystemDiagnostic } from '../types'
import { showToast } from './ToastContainer'

function MetricRing({
  label,
  value,
  detail,
  percent,
  tone
}: {
  label: string
  value: string
  detail: string
  percent: number
  tone: 'primary' | 'accent'
}) {
  const colorClass = tone === 'primary' ? 'text-primary' : 'text-accent'

  return (
    <div className="surface-strong p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-extrabold text-slate-950 dark:text-white">{label}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-black ${
          tone === 'primary' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-accent/20 bg-accent/10 text-accent'
        }`}>
          {percent}% utilisé
        </span>
      </div>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="h-full w-full -rotate-90">
            <circle cx="72" cy="72" r="58" className="text-slate-200 dark:text-white/10" strokeWidth="10" stroke="currentColor" fill="transparent" />
            <motion.circle
              cx="72"
              cy="72"
              r="58"
              className={colorClass}
              strokeWidth="10"
              strokeDasharray={364}
              initial={{ strokeDashoffset: 364 }}
              animate={{ strokeDashoffset: 364 - (364 * percent) / 100 }}
              transition={{ duration: 0.9 }}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white">{value}</span>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Go libres</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SystemDoctorView() {
  const [diag, setDiag] = useState<SystemDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    try {
      const result = await invoke<SystemDiagnostic>('get_system_diagnostic')
      setDiag(result)
      showToast('Diagnostic système complété.', 'success')
    } catch (e) {
      console.error(e)
      showToast(`Échec du diagnostic : ${e}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFixWinGet = useCallback(async () => {
    setFixing(true)
    try {
      const msg = await invoke<string>('reset_winget_sources')
      showToast(msg, 'success')
      await runDiagnostic()
    } catch (e) {
      console.error(e)
      showToast(`Échec de la réparation : ${e}`, 'error')
    } finally {
      setFixing(false)
    }
  }, [runDiagnostic])

  useEffect(() => {
    runDiagnostic()
  }, [runDiagnostic])

  useEffect(() => {
    window.addEventListener('trigger-winget-fix', handleFixWinGet)
    return () => window.removeEventListener('trigger-winget-fix', handleFixWinGet)
  }, [handleFixWinGet])

  const metrics = useMemo(() => {
    if (!diag) return { ramPercent: 0, diskPercent: 0 }
    return {
      ramPercent: diag.ram_total > 0 ? Math.round((diag.ram_used / diag.ram_total) * 100) : 0,
      diskPercent: diag.disk_total > 0 ? Math.round((diag.disk_used / diag.disk_total) * 100) : 0
    }
  }, [diag])

  if (!diag && loading) {
    return (
      <div className="surface-soft flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <div className="h-14 w-14 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
        <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Diagnostic en cours</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">Lecture des ressources et de l’état WinGet.</p>
      </div>
    )
  }

  if (!diag) return null

  return (
    <div className="space-y-5 pb-24">
      <div className="surface-strong p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="page-title">System Doctor</h2>
            <p className="page-copy mt-2">
              Une vue claire de l’état machine, des ressources critiques et du moteur de paquets WinGet.
            </p>
          </div>
          <button onClick={runDiagnostic} disabled={loading} className="btn-secondary self-start" type="button">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Consultation...' : 'Actualiser'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <MetricRing
              label="Disque local"
              value={String(diag.disk_free)}
              detail={`${diag.disk_used} Go utilisés sur ${diag.disk_total} Go`}
              percent={metrics.diskPercent}
              tone="primary"
            />
            <MetricRing
              label="Mémoire RAM"
              value={String(diag.ram_free)}
              detail={`${diag.ram_used} Go utilisés sur ${diag.ram_total} Go`}
              percent={metrics.ramPercent}
              tone="accent"
            />
          </div>

          <div className="surface-strong p-5">
            <div className="flex items-center gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Spécifications OS</h3>
                <p className="text-sm font-medium text-slate-500">Informations utiles pour diagnostiquer une installation.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                ['Nom du système', diag.os_name],
                ['Version du noyau', diag.os_version],
                ['Moteur WinGet', `v${diag.winget_version}`],
                ['Mode développeur', diag.dev_mode ? 'Activé' : 'Désactivé']
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-extrabold text-slate-950 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="surface-strong p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Doctor WinGet</h3>
                <p className="text-sm font-medium text-slate-500">Réparer les sources locales.</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Si la recherche ne retourne plus rien ou qu’un paquet refuse de s’installer, NeoGet peut réinitialiser les index WinGet puis relancer un diagnostic.
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Vérifie les référentiels officiels',
                'Force la mise à jour des index',
                'Résout les conflits de signatures'
              ].map(item => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50 p-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {item}
                </div>
              ))}
            </div>

            <button onClick={handleFixWinGet} disabled={fixing} className="btn-accent mt-5 w-full py-3" type="button">
              {fixing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {fixing ? 'Réparation...' : 'Réparer WinGet'}
            </button>
          </div>

          <div className="surface-soft p-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-extrabold text-slate-950 dark:text-white">Capteurs synchronisés</p>
                <p className="text-xs font-medium text-slate-500">RAM et stockage suivis localement.</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-extrabold text-slate-950 dark:text-white">Poste prêt</p>
                <p className="text-xs font-medium text-slate-500">Diagnostic compatible avec les actions rapides.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
