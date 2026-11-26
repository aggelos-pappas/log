const CI_TEST_TIMEOUT_MS = 20_000

const timeout = process.env.CI ? ['--timeout', String(CI_TEST_TIMEOUT_MS)] : []
const run = Bun.spawn(['bun', 'test', ...timeout, ...process.argv.slice(2)], { stdio: ['inherit', 'inherit', 'inherit'], windowsHide: true })
process.exit(await run.exited)
