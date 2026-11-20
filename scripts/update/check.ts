#!/usr/bin/env bun
import { checkForUpdate } from '../../src/release/check/index'

await checkForUpdate().catch(() => null)
