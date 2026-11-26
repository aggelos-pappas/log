const holder = globalThis as { __zod_globalConfig?: Record<string, unknown> };
holder.__zod_globalConfig = { ...(holder.__zod_globalConfig ?? {}), jitless: true };
