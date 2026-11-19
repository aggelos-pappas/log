import type { FaqItem } from '../story/StorySections'
import applyShare from './applyShare.json'

export const APPLY_PATH = '/apply'
export const APPLY_TITLE = applyShare.title
export const APPLY_DESCRIPTION = applyShare.description
export const APPLY_GITHUB_URL = 'https://github.com/matthewdonsemail-lab/log-apply'
export const APPLY_LEDGER_URL = 'https://coop-ledger-five.vercel.app'
export const APPLY_AGENT_LINE = 'set up log apply - https://log.listeningkit.com/apply.txt'

export const APPLY_NUMBERS = { applied: 206, companies: 112, bestDay: 68 }

export const APPLY_STATS = [`${APPLY_NUMBERS.applied} applied`, `${APPLY_NUMBERS.companies} companies`, `${APPLY_NUMBERS.bestDay} in one day`, 'open source']

export const APPLY_INSTALL = ['/plugin marketplace add matthewdonsemail-lab/log-apply', '/plugin install log-apply@log-apply', '/apply-setup']

export const APPLY_TERMINAL = ['npx github:matthewdonsemail-lab/log-apply setup', 'log-apply doctor']

export const APPLY_USAGE = ['/apply <posting url>', '/apply co-op software Vancouver', '/loop /apply']

export const APPLY_ASK = 'apply to every co-op posted this week'
export const APPLY_DONE = `${APPLY_NUMBERS.bestDay} submitted today, 3 need your answer.`

export type DemoRow = { company: string; role: string; city: string; via: 'Workday' | 'Greenhouse' }

export const APPLY_DEMO_ROWS: DemoRow[] = [
  { company: 'Global Relay', role: 'Java Developer Co-op', city: 'Vancouver, BC', via: 'Greenhouse' },
  { company: 'Workday', role: 'Machine Learning Engineer Intern', city: 'Vancouver, BC', via: 'Workday' },
  { company: 'TMX Group', role: 'AI Engineering Intern', city: 'Toronto, ON', via: 'Workday' },
  { company: 'Cameco', role: 'Student, IT Security', city: 'Saskatoon, SK', via: 'Workday' },
  { company: 'Siemens Healthineers', role: 'Application Software Developer Co-op', city: 'Ottawa, ON', via: 'Workday' },
  { company: 'Amgen', role: 'Software Engineer Co-op', city: 'Burnaby, BC', via: 'Workday' },
  { company: 'Tenstorrent', role: 'AI Software Intern', city: 'Toronto, ON', via: 'Greenhouse' },
]

export const APPLY_STEPS = [
  {
    number: '01',
    title: 'Find and tailor',
    body: 'It finds the postings, then writes a one-page LaTeX resume and a cover letter for each job, only from the facts in your profile.yaml.',
  },
  {
    number: '02',
    title: 'Fill',
    body: 'It fills Workday and Greenhouse in your own browser, and reads the verification links and security codes from your inbox.',
  },
  {
    number: '03',
    title: 'Track',
    body: 'Every application lands on a public ledger, with the exact resume and cover letter that went out.',
  },
]

export const APPLY_COMPARE = {
  without: {
    label: 'By hand',
    headline: '~3 applications a night',
    points: ['One generic resume for every job', 'The same work history typed into every portal', 'Hunting your inbox for each verification code', 'No record of what you sent where'],
  },
  with: {
    label: 'With log apply',
    headline: `${APPLY_NUMBERS.bestDay} in a day`,
    points: ['A one-page resume and cover letter for each job', 'Workday and Greenhouse filled in your own browser', 'Codes and links read from your inbox', 'A public ledger with every resume sent'],
  },
}

export const APPLY_FAQ: FaqItem[] = [
  {
    q: 'Does it lie on my applications?',
    a: 'No. Every resume, cover letter and form answer comes only from the facts in your profile.yaml. It never invents experience, and it refuses to claim citizenship you do not have.',
  },
  {
    q: 'Which job sites does it work on?',
    a: 'Workday and Greenhouse today, with more coming.',
  },
  {
    q: 'Is it safe for my accounts?',
    a: 'It works in your own browser: any Chrome, Edge or Brave through a dedicated profile, or the Aside browser. It applies one job at a time, stops at CAPTCHAs, and submits only when you allow it.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. log apply is open source under the MIT license.',
  },
]

export const APPLY_LEDGER_DAYS: Record<string, number> = {
  '2026-09-15': 3,
  '2026-09-16': 9,
  '2026-09-17': 5,
  '2026-09-18': 1,
  '2026-10-09': 1,
  '2026-10-13': 2,
  '2026-10-14': 6,
  '2026-10-15': 11,
  '2026-10-20': 5,
  '2026-10-21': 10,
  '2026-10-27': 5,
  '2026-11-17': 56,
  '2026-11-18': 68,
}

export const APPLY_LEDGER_FROM = '2026-09-13'
export const APPLY_LEDGER_TO = '2026-11-21'
