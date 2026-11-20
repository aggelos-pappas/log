import { modelsSummary } from '../../models/store/index'
import type { ModelFetch } from '../../models/store/index'
import { harnessesText } from '../harnesses/index'
import type { HarnessRefresh } from '../harnesses/index'
import { packageFacts } from '../version/index'
import { BLOCKING_STEPS, POST_INSTALL_STEPS } from './types'
import type { PostInstallDeps, PostInstallReport, PostInstallStep, StepReport } from './types'

export function stepsWithout(skip: readonly string[]): PostInstallStep[] {
  return POST_INSTALL_STEPS.filter((step) => !skip.includes(step))
}

export async function runPostInstall(root: string, steps: readonly PostInstallStep[], deps: PostInstallDeps, version: string = packageFacts(root).version): Promise<PostInstallReport> {
  const reports: StepReport[] = []
  let models: ModelFetch[] = []
  let harnesses: HarnessRefresh[] = []
  for (const step of POST_INSTALL_STEPS.filter((s) => steps.includes(s))) {
    deps.log(step)
    try {
      if (step === 'models') {
        models = await deps.models(root)
        reports.push({ step, ok: models.every((m) => m.ready), detail: modelsSummary(models) })
      } else if (step === 'harnesses') {
        harnesses = deps.harnesses(root)
        reports.push({ step, ok: harnesses.every((h) => h.ok), detail: harnessesText(harnesses) })
      } else {
        const done = deps[step](root)
        reports.push({ step, ok: done.ok, detail: done.ok ? 'done' : done.detail ?? 'failed' })
      }
    } catch (error) {
      reports.push({ step, ok: false, detail: error instanceof Error ? error.message : String(error) })
    }
  }
  const ok = reports.filter((r) => BLOCKING_STEPS.includes(r.step)).every((r) => r.ok)
  return { ok, version, steps: reports, models, harnesses }
}

export function postInstallText(report: PostInstallReport): string {
  return [`log ${report.version}: after-install ${report.ok ? 'done' : 'failed'}`, ...report.steps.map((s) => `  ${s.step}: ${s.ok ? 'ok' : 'needs a look'}, ${s.detail}`)].join('\n')
}

export function parsePostInstall(stdout: string): PostInstallReport | null {
  const line = stdout.trim().split('\n').filter((l) => l.trim().startsWith('{')).pop()
  if (!line) return null
  try {
    const parsed = JSON.parse(line) as PostInstallReport
    return parsed && Array.isArray(parsed.steps) ? parsed : null
  } catch {
    return null
  }
}
