export const CLAIM_CHANNEL = "logBrowserLive";

export interface Claim {
  account: string;
  id: string;
  born: number;
}

export interface ClaimLink {
  post(message: Claim): void;
  listen(handler: (message: unknown) => void): () => void;
}

export interface LiveClaim {
  readonly moved: boolean;
  reclaim(born: number): void;
  close(): void;
}

export function streamEnded(headers: Record<string, string>): string | null {
  const reason = headers["x-log-stream-ended"];
  return headers["content-type"] === "image/jpeg" || !reason ? null : reason;
}

export function newerClaim(a: Claim, b: Claim): boolean {
  return a.born > b.born || (a.born === b.born && a.id > b.id);
}

function claimOf(value: unknown): Claim | null {
  const row = value as Partial<Claim> | null;
  if (!row || typeof row !== "object" || typeof row.account !== "string" || typeof row.id !== "string" || typeof row.born !== "number" || !Number.isFinite(row.born)) return null;
  return { account: row.account, id: row.id, born: row.born };
}

export function liveClaim(own: Claim, link: ClaimLink, onMoved: (moved: boolean) => void): LiveClaim {
  let current = { ...own };
  let moved = false;
  const set = (next: boolean) => {
    if (next === moved) return;
    moved = next;
    onMoved(next);
  };
  const stop = link.listen((message) => {
    const other = claimOf(message);
    if (!other || other.account !== current.account || other.id === current.id) return;
    if (newerClaim(other, current)) set(true);
    else if (!moved) link.post(current);
  });
  link.post(current);
  return {
    get moved() {
      return moved;
    },
    reclaim(born) {
      current = { ...current, born };
      set(false);
      link.post(current);
    },
    close: stop,
  };
}

export function broadcastLink(name: string = CLAIM_CHANNEL): ClaimLink | null {
  if (typeof BroadcastChannel !== "function") return null;
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(name);
  } catch {
    return null;
  }
  return {
    post: (message) => {
      try {
        channel.postMessage(message);
      } catch {
      }
    },
    listen: (handler) => {
      const onMessage = (event: Event) => handler((event as Event & { data?: unknown }).data);
      channel.addEventListener("message", onMessage);
      return () => {
        channel.removeEventListener("message", onMessage);
        channel.close();
      };
    },
  };
}
