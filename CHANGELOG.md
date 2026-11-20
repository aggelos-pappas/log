# Changelog

Every release, newest first. release-please writes each new section from the commits; `bun run docs:releases` adds its `Models:` line from `src/models/manifest` and rebuilds the Releases table in the README.

## [0.2.1](https://github.com/matthewdonsemail-lab/log/pull/179) (2026-11-20)

Models: not pinned (fetched by name at run time)

### Features

* The relate graph, the live inbox push (messages during tool calls, burst batching, late copies dropped), inbox labels and ignoring a server or chat
* The voice gate judges public replies as replies, and Discord voice notes catch up only their own chat
* The Hermes report views drawn in Hermes Desktop, with a text swap on chats that can't draw

## [0.2.0](https://github.com/matthewdonsemail-lab/log/pull/166) (2026-11-15)

Models: not pinned (fetched by name at run time)

### Features

* The one-command Hermes pack, the catalog review, the README rewrite and the catch-up machine
* Published to npm as @listeningkit/log 0.2.0
