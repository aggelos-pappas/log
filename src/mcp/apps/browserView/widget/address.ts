export const ADDRESS_WAITING = "Waiting for page\u2026";
export const ADDRESS_NONE = "This page has no web address";

export function addressText(view: { address: string | null; generation: string | null } | null, live: boolean): string {
  if (view?.address) return view.address;
  return live || view?.generation ? ADDRESS_NONE : ADDRESS_WAITING;
}
