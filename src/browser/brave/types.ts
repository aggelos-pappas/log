import type { BrowserBrand, BrowserCapabilities } from '../driver/types'

export const BRAVE_PATH_ENV = 'LOG_BRAVE_PATH'

export const BRAVE_INSTALL_PATHS: Readonly<Record<'win32' | 'darwin' | 'linux', readonly string[]>> = {
  win32: ['%PROGRAMFILES%/BraveSoftware/Brave-Browser/Application/brave.exe', '%PROGRAMFILES(X86)%/BraveSoftware/Brave-Browser/Application/brave.exe', '%LOCALAPPDATA%/BraveSoftware/Brave-Browser/Application/brave.exe'],
  darwin: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '~/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
  linux: ['/usr/bin/brave-browser', '/usr/bin/brave', '/opt/brave.com/brave/brave', '/snap/bin/brave']
}

export const braveBrand = { label: 'Brave', logo: '/logos/brave.svg' } as const satisfies BrowserBrand

export const braveCapabilities = {
  headedWindow: { status: 'built', how: 'launch_persistent_context with headless False; proxyGate refuses any other launch' },
  proxyGate: { status: 'built', how: "proxyGate.chromium_launch(): gate_attached() checks the exit, then builds the only launch options (the account's proxy)" },
  selfCheck: { status: 'built', how: "the gate's launch_persistent_context guard runs _self_check before the caller gets the context" },
  sessionHar: { status: 'built', how: "Playwright's record_har_path, forced on the persistent context by the gate" },
  stepHar: { status: 'built', how: "harRecorder.Recorder, the inspect session's per-step HAR" },
  humanMouse: { status: 'built', how: 'HumanMouse on the Playwright page (no cursor is drawn: nothing is injected)' },
  scrollMotion: { status: 'built', how: 'scrollMotion wheel trajectories on the Playwright page' },
  devicePinned: { status: 'notBuilt', how: "Brave farbles canvas, WebGL, audio and fonts with a new seed every launch by design. Pinned: the account's own profile folder under log's home, the real Windows/GPU user agent, timezone and locale; deviceProfile.py's fixed identity is Camoufox's only" },
  localePinned: { status: 'built', how: "HOME_COUNTRIES locale through --lang and the context locale; navigator.languages is that one locale, as Brave reduces it; the self-check checks it" },
  sessionCarried: { status: 'built', how: "the account's own Brave profile folder keeps its cookies; Twenty's session is carried in once when it has none" },
  sessionSaved: { status: 'built', how: 'saveState writes the context storage state, saved to Twenty' },
  inspectSession: { status: 'built', how: 'python/browser/browserDriver.py open_brave' },
  syncSessions: { status: 'notBuilt', how: 'publishSession, connectSession and profileSession still launch Camoufox (sync API)' },
  oneMachineAtATime: { status: 'notApplicable', how: 'the profile folder lives only where log-cli runs; there is no shared profile to open twice' },
  liveView: { status: 'built', how: "browserViewer.PageCast: Playwright's page screencast over Chromium CDP (Page.startScreencast)" }
} as const satisfies BrowserCapabilities
