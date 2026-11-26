import { streamEnded } from "./liveClaim.ts";

export const MAX_PART_BYTES = 8_000_000;

export interface CastPart {
  headers: Record<string, string>;
  data: Uint8Array;
}

function indexOf(haystack: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let at = from; at <= haystack.length - needle.length; at++) {
    for (let index = 0; index < needle.length; index++) if (haystack[at + index] !== needle[index]) continue outer;
    return at;
  }
  return -1;
}

export function partReader(boundary: string) {
  const encoder = new TextEncoder();
  const open = encoder.encode(`--${boundary}`);
  const blank = encoder.encode("\r\n\r\n");
  let buffer = new Uint8Array(0);
  const state = { ended: false };
  const push = (chunk: Uint8Array): CastPart[] => {
    const joined = new Uint8Array(buffer.length + chunk.length);
    joined.set(buffer);
    joined.set(chunk, buffer.length);
    buffer = joined;
    const parts: CastPart[] = [];
    while (!state.ended) {
      const start = indexOf(buffer, open, 0);
      if (start < 0 || buffer.length < start + open.length + 2) break;
      const after = start + open.length;
      if (buffer[after] === 45 && buffer[after + 1] === 45) {
        state.ended = true;
        buffer = new Uint8Array(0);
        break;
      }
      const end = indexOf(buffer, blank, after);
      if (end < 0) {
        if (buffer.length - start > 4096) throw new Error("browserStreamInvalid");
        break;
      }
      const lines = new TextDecoder().decode(buffer.slice(after, end)).split("\r\n").filter((line) => line.includes(":"));
      const headers = Object.fromEntries(lines.map((line) => [line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]));
      const length = Number(headers["content-length"]);
      if (!Number.isSafeInteger(length) || length < 0 || length > MAX_PART_BYTES) throw new Error("browserStreamInvalid");
      const body = end + blank.length;
      if (buffer.length < body + length) break;
      parts.push({ headers, data: buffer.slice(body, body + length) });
      buffer = buffer.slice(body + length);
    }
    if (buffer.length > MAX_PART_BYTES + 8192) throw new Error("browserStreamInvalid");
    return parts;
  };
  return {
    push,
    get ended() {
      return state.ended;
    },
  };
}

export async function readCast(url: string, signal: AbortSignal, onFrame: (blob: Blob) => Promise<void>): Promise<number> {
  const response = await fetch(url, { cache: "no-store", signal });
  const type = response.headers.get("content-type") ?? "";
  const boundary = /boundary=([A-Za-z0-9]{1,64})/.exec(type)?.[1];
  if (!response.ok || !response.body || !type.startsWith("multipart/x-mixed-replace") || !boundary) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("browserStreamUnavailable");
  }
  const reader = response.body.getReader();
  const parts = partReader(boundary);
  let latest: Blob | null = null;
  let drawing: Promise<void> | null = null;
  let failure: unknown = null;
  let frames = 0;
  const draw = async () => {
    try {
      while (latest && !signal.aborted) {
        const blob: Blob = latest;
        latest = null;
        await onFrame(blob);
        frames++;
      }
    } catch (error) {
      failure = error;
    } finally {
      drawing = null;
    }
  };
  try {
    while (!signal.aborted && !failure) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const part of parts.push(value)) {
        if (part.headers["content-type"] === "image/jpeg") latest = new Blob([part.data as BlobPart], { type: "image/jpeg" });
        else if (streamEnded(part.headers) === "replaced") failure = new Error("browserStreamReplaced");
      }
      if (latest && !drawing) drawing = draw();
      if (parts.ended) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  await drawing;
  if (failure) throw failure;
  return frames;
}

export async function drawBlob(canvas: HTMLCanvasElement, blob: Blob): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  try {
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
}

export function jpegBlob(base64: string): Blob {
  return new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)) as BlobPart], { type: "image/jpeg" });
}
