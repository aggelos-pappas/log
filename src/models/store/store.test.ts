import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { checkModels, fetchModels, modelLine, modelsSummary, placeOf, hfCacheDir, judgeModelDir, readyPinned } from './index'
import type { HashKind, ModelsDeps } from './index'
import type { LocalModel } from '../manifest/index'

const body = (text: string) => ({ text, size: Buffer.byteLength(text) })
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const gitSha1 = (text: string) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex')

const WEIGHTS = body('weights of the pinned revision')
const CONFIG = body('{"model":"demo"}')

const HF: LocalModel = {
  key: 'embed',
  id: 'demoOrg/demoModel',
  purpose: 'a demo',
  source: 'huggingFace',
  loader: 'transformersJs',
  revision: 'a'.repeat(40),
  process: 'the demo worker',
  files: [
    { path: 'onnx/model.onnx', size: WEIGHTS.size, sha256: sha256(WEIGHTS.text) },
    { path: 'config.json', size: CONFIG.size, gitSha1: gitSha1(CONFIG.text) },
  ],
  bytes: WEIGHTS.size + CONFIG.size,
}

const PIP: LocalModel = { key: 'mouse', id: 'demoPlanner', purpose: 'a demo', source: 'pip', loader: 'pip', revision: '5.0.0', process: 'browsers', files: [], bytes: 0 }

interface Fake {
  deps: ModelsDeps
  files: Map<string, string>
  calls: string[]
}

function fake(options: { files?: Record<string, string>; remote?: Record<string, string>; legacy?: string[]; pip?: string | null } = {}): Fake {
  const files = new Map(Object.entries(options.files ?? {}))
  const calls: string[] = []
  let pip = options.pip ?? null
  const deps: ModelsDeps = {
    place: (model) => (model.source === 'pip' ? null : join('/home', model.id, model.revision)),
    legacy: () => options.legacy ?? [],
    size: (path) => (files.has(path) ? Buffer.byteLength(files.get(path)!) : null),
    hash: async (path, kind: HashKind) => (files.has(path) ? (kind === 'sha256' ? sha256(files.get(path)!) : gitSha1(files.get(path)!)) : null),
    download: async (url, dest) => {
      calls.push(`download ${url}`)
      const text = options.remote?.[url]
      if (text === undefined) return { ok: false, detail: 'HTTP 404' }
      files.set(dest, text)
      return { ok: true }
    },
    move: (from, to) => {
      calls.push(`move ${from}`)
      files.set(to, files.get(from)!)
      files.delete(from)
      return true
    },
    remove: (path) => {
      calls.push(`remove ${path}`)
      files.delete(path)
    },
    pipVersion: () => pip,
    pipInstall: (spec) => {
      calls.push(`pip ${spec}`)
      pip = spec.split('==')[1]
      return { ok: true }
    },
    log: () => {},
  }
  return { deps, files, calls }
}

const place = join('/home', HF.id, HF.revision)
const url = (path: string) => `https://huggingface.co/${HF.id}/resolve/${HF.revision}/${path}`

describe('local models', () => {
  test('a model with every file at its pinned size is present and matches', async () => {
    const { deps } = fake({ files: { [join(place, 'onnx/model.onnx')]: WEIGHTS.text, [join(place, 'config.json')]: CONFIG.text } })
    const [check] = await checkModels([HF], deps, { verify: true })
    expect(check.status).toBe('ready')
    expect(modelLine(check)).toBe('embed: demoOrg/demoModel@aaaaaaa, 1 kB, the demo worker: present, matches')
  })

  test('missing files, a wrong file and a copy at the old cache are each said', async () => {
    const empty = await checkModels([HF], fake().deps)
    expect(empty[0].status).toBe('missing')
    const wrong = await checkModels([HF], fake({ files: { [join(place, 'onnx/model.onnx')]: 'x'.repeat(WEIGHTS.size), [join(place, 'config.json')]: CONFIG.text } }).deps, { verify: true })
    expect(wrong[0].status).toBe('mismatched')
    expect(wrong[0].problems).toEqual(['onnx/model.onnx mismatched'])
    const old = await checkModels([HF], fake({ legacy: ['/old'], files: { [join('/old', 'onnx/model.onnx')]: WEIGHTS.text, [join('/old', 'config.json')]: CONFIG.text } }).deps)
    expect(old[0].problems[0]).toStartWith('a copy sits at /old;')
  })

  test('fetch downloads each file at the pinned revision and verifies its hash', async () => {
    const { deps, calls } = fake({ remote: { [url('onnx/model.onnx')]: WEIGHTS.text, [url('config.json')]: CONFIG.text } })
    const [got] = await fetchModels([HF], deps)
    expect(got.action).toBe('downloaded')
    expect(got.ready).toBe(true)
    expect(calls).toEqual([`download ${url('onnx/model.onnx')}`, `download ${url('config.json')}`])
  })

  test('fetch moves a matching copy from the old cache instead of downloading', async () => {
    const { deps, calls } = fake({ legacy: ['/old'], files: { [join('/old', 'onnx/model.onnx')]: WEIGHTS.text, [join('/old', 'config.json')]: CONFIG.text } })
    const [got] = await fetchModels([HF], deps)
    expect(got.action).toBe('adopted')
    expect(calls).toEqual([`move ${join('/old', 'onnx/model.onnx')}`, `move ${join('/old', 'config.json')}`])
  })

  test('an old copy that does not match the pin is left and the pinned file downloaded', async () => {
    const { deps, calls } = fake({ legacy: ['/old'], files: { [join('/old', 'onnx/model.onnx')]: 'y'.repeat(WEIGHTS.size), [join(place, 'config.json')]: CONFIG.text }, remote: { [url('onnx/model.onnx')]: WEIGHTS.text } })
    const [got] = await fetchModels([HF], deps)
    expect(got.action).toBe('downloaded')
    expect(calls).toEqual([`download ${url('onnx/model.onnx')}`])
  })

  test('a download that does not match the pinned hash is removed and the fetch fails', async () => {
    const { deps, files, calls } = fake({ remote: { [url('onnx/model.onnx')]: 'z'.repeat(WEIGHTS.size) } })
    const [got] = await fetchModels([HF], deps)
    expect(got.action).toBe('failed')
    expect(got.detail).toContain("does not match the pinned revision's hash")
    expect(files.has(join(place, 'onnx/model.onnx'))).toBe(false)
    expect(calls).toContain(`remove ${join(place, 'onnx/model.onnx')}`)
  })

  test('a pip model is checked by its installed version and installed at the pinned one', async () => {
    const before = await checkModels([PIP], fake({ pip: '4.2.0' }).deps)
    expect(before[0].status).toBe('wrongVersion')
    const { deps, calls } = fake({ pip: '4.2.0' })
    const [got] = await fetchModels([PIP], deps)
    expect(got.action).toBe('installed')
    expect(calls).toEqual(['pip demoPlanner==5.0.0'])
    const again = fake({ pip: '5.0.0' })
    expect((await fetchModels([PIP], again.deps))[0].action).toBe('already')
    expect(again.calls).toEqual([])
  })

  test('the summary names the models not on their pin', async () => {
    const checks = await checkModels([HF, PIP], fake({ pip: '5.0.0' }).deps)
    expect(modelsSummary(checks)).toBe('1/2 on the pinned revision; not yet: embed')
  })

  test('a loader makes its pinned model ready first: kept when it matches, moved from the old cache, never for an unpinned id', async () => {
    const ready = fake({ files: { [join(place, 'onnx/model.onnx')]: WEIGHTS.text, [join(place, 'config.json')]: CONFIG.text } })
    expect((await readyPinned(HF.id, ready.deps, [HF]))?.status).toBe('ready')
    expect(ready.calls).toEqual([])
    const old = fake({ legacy: ['/old'], files: { [join('/old', 'onnx/model.onnx')]: WEIGHTS.text, [join('/old', 'config.json')]: CONFIG.text } })
    const moved = await readyPinned(HF.id, old.deps, [HF])
    expect(moved && 'action' in moved ? moved.action : null).toBe('adopted')
    expect(await readyPinned('someOther/model', fake().deps, [HF])).toBeNull()
  })

  test('models live under log home: the judge in its own folder, transformers.js models by revision', () => {
    const env = { LOG_HOME: '/demoHome' }
    expect(judgeModelDir(env)).toBe(join('/demoHome', 'models', 'wolfDefenderSmall'))
    expect(judgeModelDir({ ...env, LOG_JUDGE_MODEL: '/elsewhere' })).toBe('/elsewhere')
    expect(hfCacheDir(env)).toBe(join('/demoHome', 'models', 'hf'))
    expect(placeOf(HF, env)).toBe(join('/demoHome', 'models', 'hf', HF.id, HF.revision))
    expect(placeOf(PIP, env)).toBeNull()
  })
})
