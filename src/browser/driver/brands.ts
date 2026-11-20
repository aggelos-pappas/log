import { adsPowerBrand } from '../adsPower/types'
import { braveBrand } from '../brave/types'
import { camoufoxBrand } from '../camoufox/types'
import type { BrowserBrand, BrowserDriverName } from './types'

export const BROWSER_BRANDS: Readonly<Record<BrowserDriverName, BrowserBrand>> = {
  camoufox: camoufoxBrand,
  adsPower: adsPowerBrand,
  brave: braveBrand
}

export const BROWSER_LABELS: Readonly<Record<BrowserDriverName, string>> = Object.fromEntries(Object.entries(BROWSER_BRANDS).map(([name, brand]) => [name, brand.label])) as Record<BrowserDriverName, string>
