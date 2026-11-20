#!/usr/bin/env bun
import { join } from 'node:path'
import { refreshHarnesses } from '../../src/release/harnesses/index'

process.stdout.write(JSON.stringify(refreshHarnesses(join(import.meta.dir, '..', '..'))))
