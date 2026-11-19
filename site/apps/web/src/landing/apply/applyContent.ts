import type { FaqItem } from '../story/StorySections'
import applyShare from './applyShare.json'

export const APPLY_PATH = '/apply'
export const APPLY_TITLE = applyShare.title
export const APPLY_DESCRIPTION = applyShare.description
export const APPLY_GITHUB_URL = 'https://github.com/deepmroot/log-apply'
export const APPLY_AGENT_LINE = 'set up log apply - https://log.listeningkit.com/apply.txt'


export const APPLY_INSTALL = ['/plugin marketplace add deepmroot/log-apply', '/plugin install log-apply@log-apply', '/apply-setup']

export const APPLY_TERMINAL = ['npx github:deepmroot/log-apply setup', 'log-apply doctor']

export const APPLY_USAGE = ['/apply <posting url>', '/apply software jobs Vancouver', '/loop /apply']

export const APPLY_ASK = 'apply to every software job posted this week'
export const APPLY_DONE = '7 submitted, each with its own resume. Ready for more.'

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
    body: 'Your agent finds open postings with treg, checks they’re still live, then writes a one-page LaTeX resume and cover letter for each job, only from the facts in your profile.yaml.',
  },
  {
    number: '02',
    title: 'Fill',
    body: 'It fills Workday and Greenhouse in your own browser, and reads the verification links and security codes from your inbox.',
  },
  {
    number: '03',
    title: 'Track',
    body: 'Every application lands on your own ledger, with the exact resume and cover letter that went out.',
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
    headline: 'As many as you want in a day',
    points: ['A one-page resume and cover letter for each job', 'Workday and Greenhouse filled in your own browser', 'Codes and links read from your inbox', 'A public ledger with every resume sent'],
  },
}

export const APPLY_FAQ: FaqItem[] = [
  {
    q: 'Does it lie on my applications?',
    a: 'No. Every resume, cover letter and form answer comes only from the facts in your profile.yaml. It never invents experience, and it refuses to claim citizenship you do not have.',
  },
  {
    q: 'Where do the jobs come from?',
    a: 'treg searches company job boards (Greenhouse, Ashby, Lever, SmartRecruiters and more) and drops postings that were taken down. Or paste any posting URL yourself.',
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



export type BuiltWithItem = { name: string; role: string; href: string; logo: string | null }

export const APPLY_BUILT_WITH: BuiltWithItem[] = [
  { name: 'log', role: 'the stack it’s part of', href: 'https://log.listeningkit.com', logo: '/logo.svg' },
  { name: 'treg', role: 'finds the jobs', href: 'https://treg.to', logo: '/logos/stack/treg.svg' },
  { name: 'Aside', role: 'the browser it can drive', href: 'https://aside.com', logo: '/logos/built/aside.png' },
  { name: 'Claude Code', role: 'the agent', href: 'https://claude.com/claude-code', logo: null },
  { name: 'AutoInternship', role: 'the form-filling idea it grew from', href: 'https://github.com/pqthangv/AutoInternshipClaude', logo: '/logos/built/autoInternship.png' },
]
