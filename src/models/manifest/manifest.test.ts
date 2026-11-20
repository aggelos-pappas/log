import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOCAL_MODELS, MODEL_KEYS, modelByKey, pipSpecs, revisionOf } from './index'
import { MODEL_NAME } from '../../inbox/judgeModel/types'
import { EMBED_MODEL } from '../../search/conversations/types'
import { VISION_MODEL } from '../../media/describer/types'
import { PYTHON_VENDORS } from '../../release/postInstall/index'

const root = join(import.meta.dir, '..', '..', '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('the models manifest', () => {
  test('lists every local model once, each pinned to an exact revision with its files', () => {
    expect(LOCAL_MODELS.map((m) => m.key)).toEqual([...MODEL_KEYS])
    for (const model of LOCAL_MODELS) {
      if (model.source === 'huggingFace') {
        expect(model.revision).toMatch(/^[0-9a-f]{40}$/)
        expect(model.files.length).toBeGreaterThan(0)
        expect(model.files.every((f) => Boolean(f.sha256 || f.gitSha1))).toBe(true)
        expect(model.bytes).toBe(model.files.reduce((sum, f) => sum + f.size, 0))
      } else expect(model.revision).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  test('the loaders name the same models the manifest pins', () => {
    expect(modelByKey('judge').id).toBe(MODEL_NAME)
    expect(modelByKey('embed').id).toBe(EMBED_MODEL)
    expect(modelByKey('vision').id).toBe(VISION_MODEL)
    expect(revisionOf(EMBED_MODEL)).toBe(modelByKey('embed').revision)
    expect(revisionOf('someOther/model')).toBe('main')
  })

  test('the transformers.js loaders pass the pinned revision and keep models under log home', () => {
    for (const rel of ['src/search/conversations/helpers/embedWorker.ts', 'src/media/describer/helpers/model.ts']) {
      const text = read(rel)
      expect(text).toContain('revisionOf(model)')
      expect(text).toContain('env.cacheDir = hfCacheDir()')
    }
  })

  test('the Python judge downloads exactly the pinned revision and files', () => {
    const server = read('python/judge/server.py')
    const judge = modelByKey('judge')
    expect(server).toContain(`MODEL_REPO = "${judge.id}"`)
    expect(server).toContain(`MODEL_REVISION = "${judge.revision}"`)
    expect(server).toContain('revision=MODEL_REVISION')
    const patterns = [...server.matchAll(/MODEL_FILES = \[([^\]]*)\]/g)][0][1].split(',').map((p) => p.trim().replace(/^"|"$/g, ''))
    const covered = (path: string) => patterns.some((p) => (p.endsWith('/*') ? path.startsWith(p.slice(0, -1)) : p === path))
    expect(judge.files.every((f) => covered(f.path))).toBe(true)
  })

  test('the pip-pinned model is installed at its exact version by update, install and CI alike', () => {
    expect(pipSpecs()).toEqual(['myuri==5.0.0'])
    expect(PYTHON_VENDORS).toContain('myuri==5.0.0')
    expect(read('.github/workflows/check.yml')).toContain('"myuri==5.0.0"')
  })
})
