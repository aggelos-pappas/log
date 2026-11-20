#!/usr/bin/env bun
import { saveTrack, trackOf } from '../../src/release/check/index'

const track = trackOf(process.argv[2])
if (!track) {
  console.error('usage: bun scripts/update/track.ts stable|nightly')
  process.exit(1)
}
saveTrack(track)
console.log(`log: following the ${track} track (update.track in settings.json)`)
