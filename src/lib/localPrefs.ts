/**
 * localStorage that can't take a page down.
 *
 * Storage can be missing or throw — blocked site data, some in-app browsers,
 * older Safari private windows. What it holds here is only a convenience (the
 * name and email a guest typed last time), so a failure reads as "nothing
 * remembered" and a write that fails is simply skipped. Before this, a throw in
 * a `useState` initialiser blanked the join and register pages, and a throw
 * after a successful join left the guest on the form instead of in the room.
 */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // A convenience only — see above.
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // A convenience only — see above.
  }
}
