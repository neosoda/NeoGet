import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Shield, HardDrive, Cpu, RefreshCw, Wrench, CheckCircle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { SystemDiagnostic } from '../types'
import { showToast } from './ToastContainer'

export default function SystemDoctorView() {
  const [diag, setDiag] = useState<SystemDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const result = await invoke<SystemDiagnostic>('get_system_diagnostic')
      setDiag(result)
      showToast("Diagnostic système complété !", "success")
    } catch (e) {
      console.error(e)
      showToast(`Échec du diagnostic : ${e}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleFixWinGet = async () => {
    setFixing(true)
    try {
      const msg = await invoke<string>('reset_winget_sources')
      showToast(msg, "success")
      await runDiagnostic()
    } catch (e) {
      console.error(e)
      showToast(`Échec de la réparation : ${e}`, "error")
    } finally {
      setFixing(false)
    }
  }

  useEffect(() => {
    runDiagnostic()
  }, [])

  if (!diag && loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
        <p className="text-gray-600 dark:text-gray-400 font-semibold animate-pulse">
          Consultation des capteurs matériels et des statuts logiciels...
        </p>
      </div>
    )
  }

  if (!diag) return null

  // Calculate percentages
  const ramPercent = diag.ram_total > 0 ? Math.round((diag.ram_used / diag.ram_total) * 100) : 0
  const diskPercent = diag.disk_total > 0 ? Math.round((diag.disk_used / diag.disk_total) * 100) : 0

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-gray-900 dark:text-white mb-2">
            System Doctor
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Analysez l'intégrité de vos ressources système et réparez le moteur de paquets Microsoft WinGet
          </p>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Consultation...' : 'Actualiser le diagnostic'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Diagnostics Material */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Disk Health Jauge */}
            <div className="card flex flex-col p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Disque Local (C:)</h3>
                </div>
                <span className="text-sm font-semibold text-primary">{diskPercent}% utilisé</span>
              </div>
              <div className="flex items-center justify-center py-6">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG circular progress */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-gray-200 dark:text-gray-700"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-primary"
                      strokeWidth="10"
                      strokeDasharray={377}
                      initial={{ strokeDashoffset: 377 }}
                      animate={{ strokeDashoffset: 377 - (377 * diskPercent) / 100 }}
                      transition={{ duration: 1 }}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{diag.disk_free}</span>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">Go Libres</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <span>Total : {diag.disk_total} Go</span>
                <span>Utilisé : {diag.disk_used} Go</span>
              </div>
            </div>

            {/* Memory Health Jauge */}
            <div className="card flex flex-col p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Mémoire RAM</h3>
                </div>
                <span className="text-sm font-semibold text-accent">{ramPercent}% utilisé</span>
              </div>
              <div className="flex items-center justify-center py-6">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-gray-200 dark:text-gray-700"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-accent"
                      strokeWidth="10"
                      strokeDasharray={377}
                      initial={{ strokeDashoffset: 377 }}
                      animate={{ strokeDashoffset: 377 - (377 * ramPercent) / 100 }}
                      transition={{ duration: 1 }}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{diag.ram_free}</span>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">Go Libres</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <span>Total : {diag.ram_total} Go</span>
                <span>Utilisé : {diag.ram_used} Go</span>
              </div>
            </div>
          </div>

          {/* OS Details Information card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <Activity className="w-5 h-5 text-success" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Spécifications OS</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex justify-between border-b border-gray-150 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Nom du Système</span>
                <span className="font-semibold text-gray-900 dark:text-white">{diag.os_name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Version du Noyau</span>
                <span className="font-mono text-gray-900 dark:text-white">{diag.os_version}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Moteur WinGet</span>
                <span className="font-semibold text-primary">v{diag.winget_version}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Mode Développeur</span>
                <span className={`font-semibold flex items-center gap-1 ${diag.dev_mode ? 'text-success' : 'text-amber-500'}`}>
                  {diag.dev_mode ? 'Activé' : 'Désactivé'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: WinGet Source Reset / Doctor Fix panel */}
        <div className="space-y-6">
          <div className="card p-6 border-accent/20 bg-gradient-to-b from-transparent to-accent/5">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-accent" />
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Doctor WinGet</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Si des paquets refusent de s'installer, ou que la recherche globale ne remonte aucun résultat, les bases de données locales de WinGet sont peut-être corrompues.
            </p>
            <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-4 rounded-xl text-xs space-y-2 mb-6">
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Vérifie l'intégrité des référentiels officiels.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Force la mise à jour des index de recherche.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Résout les conflits de clés de signature locales.</span>
              </div>
            </div>

            <button
              onClick={handleFixWinGet}
              disabled={fixing}
              className="w-full btn-accent py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm"
            >
              {fixing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Réparation en cours...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  Réparer WinGet (Doctor Fix)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
