import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, WheelEvent } from "react";
import { mapCss } from "../../../../relate/map/mapCss.ts";
import { PLATFORM_MARKS } from "../../../../relate/machine/types.ts";
import type { MapEdge, MapNode, MapRoom, NetworkMapBlock } from "../../../../relate/map/types.ts";
import { StateMachine } from "./machine.tsx";

const W = 232;
const H = 340;
const RING_X: Record<number, number> = { 1: 40, 2: 360, 3: 1120, 4: 1440 };
const RING_NAME: Record<number, string> = { 1: 'Engaged with you', 2: 'Talks to your people', 3: 'Follows you', 4: 'Known' };
const RING_TONE: Record<number, string> = { 1: 'orange', 2: 'teal', 3: 'blue', 4: 'gray' };
const PLATFORM_MARKS_LOCAL: Record<string, string> = { twitter: 'X', x: 'X', discord: 'DC', instagram: 'IG', slack: 'SL', reddit: 'RD', facebook: 'FB', linkedin: 'IN' };

type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const dateOf = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

function Mark({ platform }: { platform: string }) {
  return <span className="rmPlatformChip" data-platform={platform} data-user={`@${platform}`} title={platform}>{PLATFORM_MARKS_LOCAL[platform] ?? PLATFORM_MARKS[platform] ?? platform.slice(0, 2).toUpperCase()}</span>;
}

function AvatarText({ text, cls = 'rmAvatar', src }: { text: string; cls?: string; src?: string | null }) {
  if (src) return <img className={cls} src={src} alt="" />;
  return <span className={cls} aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{text.slice(0, 2).toUpperCase()}</span>;
}

function Room({ room }: { room: MapRoom }) {
  const kind = room.kind === 'direct' ? 'direct' : room.kind === 'channel' ? 'channel' : 'group';
  return (
    <div className="rmRoomBox">
      <div className="rmRoomHead">
        <b>{room.name}</b>
        {kind === 'channel' ? <span className="rmHash">#</span> : null}
      </div>
      <div className="rmRoomInner">
        <span className="rmStack">
          {room.members.slice(0, 3).map((m, i) => <AvatarText key={`${m}-${i}`} text={m} cls="rmMiniAvatar" />)}
          {!room.members.length ? <AvatarText text="?" cls="rmMiniAvatar" /> : null}
        </span>
        <span className="rmRoomText">
          <small>{room.meaning}</small>
          {dateOf(room.at) ? <small>{dateOf(room.at)}</small> : null}
        </span>
      </div>
    </div>
  );
}

function Fact({ text, quote, at, slot }: { text: string; quote: string; at: string; slot: string }) {
  const verbs: Record<string, string> = { asked: 'asked for', posted: 'posted', open: 'wanted to', said: 'said', works: 'works on', role: 'is', can: 'can' };
  const lead = slot === 'said' ? `They said “${text}”.` : `They ${verbs[slot] ?? `${slot}:`} ${text}.`;
  return <div className="rmFactProse">{lead}<small>“{quote}” · {dateOf(at)}</small></div>;
}

function Card({ node, pos, dim, selected, pathKeys, onOpen, onDrag }: { node: MapNode; pos: Pos; dim: boolean; selected: boolean; pathKeys: Set<string>; onOpen: (key: string) => void; onDrag: (e: MouseEvent<HTMLDivElement>, key: string) => void }) {
  const banner = node.ring === 4 ? 'var(--rm-fg-muted)' : `var(--rm-${RING_TONE[node.ring]}-dot)`;
  return (
    <div
      className={`rmNode${dim ? ' dim' : ''}${selected || pathKeys.has(node.key) ? ' selected' : ''}`}
      data-id={node.key}
      style={{ left: pos.x, top: pos.y }}
      role="button"
      tabIndex={0}
      aria-label={`${node.handle}, ring ${node.ring}, ${node.why}`}
      onClick={() => onOpen(node.key)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(node.key); } }}
    >
      <div className="rmLip" style={{ ['--tone' as string]: banner }} />
      <div className="rmRingBanner" style={{ ['--tone' as string]: banner }}>Ring {node.ring} · {RING_NAME[node.ring]}</div>
      {node.talk ? <div className="rmTalkStrip"><b>TALK NEXT</b><span>{node.next?.text ?? 'reach out'}</span></div> : null}
      <div className="rmNodeHeader" onMouseDown={(e) => onDrag(e, node.key)}>
        <AvatarText text={node.initials || node.handle.replace(/^@/, '').slice(0, 2)} src={node.avatar} />
        <span className="rmNodeName">@{node.handle.replace(/^@/, '')}</span>
        <span className="rmPlatformGallery">{node.platforms.map((p) => <Mark key={p} platform={p} />)}</span>
      </div>
      <div className="rmNodeBody">
        <div className="rmSection"><div className="rmSectionHead"><span className="rmCaret">▾</span>Why</div><div className="rmSectionBody"><div className="rmDesc">{node.why}</div>{node.lanes.length ? <div className="rmMeta">{node.lanes.map((l) => `${l.platform}: ${l.state}`).join(' · ')}</div> : null}{node.quiet ? <div className="rmMeta">quiet 14 days or more</div> : null}</div></div>
        <div className="rmSection"><div className="rmSectionHead"><span className="rmCaret">▾</span>Rooms</div><div className="rmSectionBody"><div className="rmRooms">{node.rooms.length ? node.rooms.map((r, i) => <Room key={`${r.key}-${i}`} room={r} />) : <span className="rmTag">no shared room yet</span>}</div></div></div>
        <div className="rmSection"><div className="rmSectionHead"><span className="rmCaret">▾</span>Durable facts</div><div className="rmSectionBody">{node.facts.length ? node.facts.map((f, i) => <Fact key={i} {...f} />) : <span className="rmNone">none recorded yet</span>}</div></div>
        <div className="rmSection"><div className="rmSectionHead"><span className="rmCaret">▾</span>Next move</div><div className="rmSectionBody">{node.next ? <div className="rmAction">{node.next.text} · {node.next.tool}</div> : <span className="rmNone">no move yet</span>}</div></div>
      </div>
    </div>
  );
}

export function NetworkMap({ block, theme: givenTheme }: { block: NetworkMapBlock; theme?: 'light' | 'dark' }) {
  const [dark, setDark] = useState<boolean>(() => {
    if (givenTheme) return givenTheme === 'dark';
    if (typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark')) return true;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
  });
  const [platform, setPlatform] = useState('all');
  const [ring, setRing] = useState<number | null>(null);
  const [talk, setTalk] = useState(false);
  const [zoom, setZoom] = useState(0.62);
  const [opened, setOpened] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [pan, setPan] = useState<Pos>({ x: 0, y: 0 });
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: string; sx: number; sy: number; ox: number; oy: number; z: number } | null>(null);
  const ringDrag = useRef<{ id: number; sx: number; sy: number; start: { key: string; x: number; y: number }[]; z: number } | null>(null);
  const panDrag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const organize = () => {
    const next: Record<string, Pos> = { owner: { x: 760, y: 560 } };
    for (let r = 1; r <= 4; r++) {
      const list = block.nodes.filter((n) => n.ring === r);
      let y = 70;
      for (const n of list) { next[n.key] = { x: RING_X[r], y }; y += H + 24; }
    }
    setPositions(next);
  };
  useEffect(() => { organize(); }, [block]);

  const byKey = useMemo(() => new Map(block.nodes.map((n) => [n.key, n])), [block.nodes]);
  const visible = (n: MapNode) => {
    if (platform !== 'all' && !n.platforms.includes(platform) && n.platform !== platform) return false;
    if (ring !== null && n.ring !== ring) return false;
    if (talk && !n.talk) return false;
    return true;
  };
  const pathKeys = useMemo(() => new Set((block.path ?? []).map((h) => h.key)), [block.path]);
  const pathEdges = useMemo(() => new Set((block.path ?? []).map((h) => h.room).filter(Boolean)), [block.path]);

  const center = (key: string): Pos => {
    const p = positions[key] ?? { x: 800, y: 500 };
    return { x: p.x + W / 2, y: p.y + H / 2 };
  };
  const cardAt = (key: string) => byKey.get(key);

  const edges = () => block.edges.map((e: MapEdge, i: number) => {
    const A = center(e.a), B = center(e.b);
    const mx = (A.x + B.x) / 2;
    const highlighted = pathKeys.has(e.a) && pathKeys.has(e.b) && pathEdges.has(e.room);
    const dim = (e.a !== 'owner' && cardAt(e.a) && !visible(cardAt(e.a)!)) || (cardAt(e.b) && !visible(cardAt(e.b)!));
    const d = `M${A.x},${A.y} H${mx} V${B.y} H${B.x}`;
    return (
      <g key={i} className={`rmEdge ${e.kind === 'direct' ? '' : 'shared '}${highlighted ? 'rmPath ' : ''}${dim ? 'dim' : ''}`}>
        <path className="rmEdgePath" d={d} />
        <path className="rmArrow" d={`M${B.x - 6},${B.y - 4} L${B.x},${B.y} L${B.x - 6},${B.y + 4} Z`} />
        {highlighted ? (
          <g>
            <rect className="rmPillBox" x={mx - e.room.length * 3 - 8} y={Math.min(A.y, B.y) - 20} width={e.room.length * 6 + 16} height={19} rx={10} />
            <text className="rmPillText" x={mx} y={Math.min(A.y, B.y) - 6} textAnchor="middle">{e.room}</text>
          </g>
        ) : null}
      </g>
    );
  });

  const ringGroups = () => [1, 2, 3, 4].map((id) => {
    const list = block.nodes.filter((n) => n.ring === id && visible(n)).map((n) => positions[n.key]).filter(Boolean);
    if (!list.length) return null;
    const x = Math.min(...list.map((p) => p.x)) - 18, y = Math.min(...list.map((p) => p.y)) - 36;
    const w = Math.max(...list.map((p) => p.x + W)) - Math.min(...list.map((p) => p.x)) + 36;
    const h = Math.max(...list.map((p) => p.y + H)) - Math.min(...list.map((p) => p.y)) + 54;
    const col = id === 4 ? 'var(--rm-fg-muted)' : `var(--rm-${RING_TONE[id]}-dot)`;
    const label = `RING ${id} · ${RING_NAME[id].toUpperCase()}`;
    return (
      <g key={id}>
        <rect className="rmRingGroup" x={x} y={y} width={w} height={h} rx={8} stroke={col} data-ring={id} onMouseDown={(e) => startRingDrag(e, id)} />
        <rect className="rmRingLabelBox" x={x + 8} y={y - 10} width={label.length * 6.4 + 18} height={20} rx={4} stroke={col} data-ring={id} onMouseDown={(e) => startRingDrag(e, id)} />
        <text className="rmRingLabelText" x={x + 17} y={y + 4} fill={col} data-ring={id} onMouseDown={(e) => startRingDrag(e, id)}>{label}</text>
      </g>
    );
  });

  const startRingDrag = (e: MouseEvent<SVGElement>, id: number) => {
    e.preventDefault();
    const z = zoom;
    ringDrag.current = { id, sx: e.clientX, sy: e.clientY, z, start: block.nodes.filter((n) => n.ring === id).map((n) => ({ key: n.key, ...(positions[n.key] ?? { x: 0, y: 0 }) })) };
  };

  const onNodeDrag = (e: MouseEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { key, sx: e.clientX, sy: e.clientY, ox: positions[key]?.x ?? 0, oy: positions[key]?.y ?? 0, z: zoom };
  };
  useEffect(() => {
    const move = (e: globalThis.MouseEvent) => {
      if (drag.current) {
        const d = drag.current;
        setPositions((prev) => ({ ...prev, [d.key]: { x: clamp(d.ox + (e.clientX - d.sx) / d.z, 0, 1600), y: clamp(d.oy + (e.clientY - d.sy) / d.z, 0, 2000) } }));
      } else if (ringDrag.current) {
        const d = ringDrag.current;
        const dx = (e.clientX - d.sx) / d.z, dy = (e.clientY - d.sy) / d.z;
        setPositions((prev) => { const next = { ...prev }; for (const s of d.start) next[s.key] = { x: clamp(s.x + dx, 0, 1600), y: clamp(s.y + dy, 0, 2000) }; return next; });
      } else if (panDrag.current) {
        const d = panDrag.current;
        setPan({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
      }
    };
    const up = () => { drag.current = null; ringDrag.current = null; panDrag.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.25, 2.5);
    const rect = canvas.current?.getBoundingClientRect();
    const vx = rect ? e.clientX - rect.left : 0, vy = rect ? e.clientY - rect.top : 0;
    const ratio = next / zoom;
    setPan((prev) => ({ x: prev.x + vx * (1 - ratio), y: prev.y + vy * (1 - ratio) }));
    setZoom(next);
  };
  const fit = () => {
    const width = canvas.current?.clientWidth ?? 900;
    setZoom(Number(clamp((width - 36) / 1900, 0.25, 1).toFixed(3)));
  };

  const openedNode = opened ? byKey.get(opened) : undefined;
  const summary = block.summary ?? `${block.total} people in the Relate graph`;
  const rootClass = `rmMachine networkMap ${dark ? 'dark' : 'light'}`;

  return (
    <div className={rootClass} data-view={openedNode ? 'person' : 'overview'}>
      <style>{mapCss()}{`.networkMap .rmCanvas{overflow:hidden !important}.networkMap .rmSurface{transform:translate(var(--pan-x,0px),var(--pan-y,0px))}`}</style>
      {openedNode ? (
        <>
          <div className="rmCrumb" style={{ position: 'static', display: 'block', padding: '6px 12px' }}>
            <button type="button" className="rmBack" onClick={() => setOpened(null)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--rm-primary-text)', fontWeight: 700 }}>← Back to map</button>
            {' '} · Relate › <b>{openedNode.handle}</b> › state machine
          </div>
          <StateMachine machine={openedNode.machine} theme={dark ? 'dark' : 'light'} />
        </>
      ) : (
        <div className="rmCanvas" ref={canvas} onWheel={onWheel} onMouseDown={(e) => {
          const target = e.target as Element;
          if (target.closest('.rmNode, .rmRingGroup, .rmRingLabelBox, .rmRingLabelText, .rmBar, .rmCrumb')) return;
          panDrag.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
        }}>
          <div className="rmCrumb">Relate › <b>map</b> · {summary}</div>
          <div className="rmSurface" style={{ ['--zoom' as string]: String(zoom), ['--pan-x' as string]: `${pan.x}px`, ['--pan-y' as string]: `${pan.y}px`, height: 2200 }}>
            <svg viewBox="0 0 1900 2200" style={{ height: 2200 }}>
              {ringGroups()}
              {edges()}
              {block.path.length > 1 ? (
                <g>
                  <rect className="rmPillBox" x={12} y={12} width={Math.min(760, block.path.length * 120)} height={22} rx={11} />
                  <text className="rmPillText" x={22} y={27}>Bridge: {block.path.map((h) => h.handle).join(' → ')}</text>
                </g>
              ) : null}
            </svg>
            <div className="rmOwner" style={{ position: 'absolute', left: positions.owner?.x ?? 760, top: positions.owner?.y ?? 560, width: W }}>
              <div className="rmRingBanner" style={{ ['--tone' as string]: 'var(--rm-primary)' }}>Your accounts</div>
              <div className="rmNodeHeader"><span className="rmNodeName">You</span><span className="rmPlatformGallery">{[...new Set(block.nodes.flatMap((n) => n.platforms))].map((p) => <Mark key={p} platform={p} />)}</span></div>
              <div className="rmNodeBody"><div className="rmDesc">The centre of this map: your connected accounts on each platform. Every line comes from a real room, chat or reply.</div></div>
            </div>
            {block.nodes.map((node) => <Card key={node.key} node={node} pos={positions[node.key] ?? { x: 800, y: 500 }} dim={!visible(node)} selected={false} pathKeys={pathKeys} onOpen={setOpened} onDrag={onNodeDrag} />)}
          </div>
          <div className="rmBar" role="toolbar" aria-label="Map filters">
            {['all', 'twitter', 'discord'].map((p) => <button key={p} type="button" data-platform={p} aria-pressed={platform === p} onClick={() => setPlatform(p)}>{p === 'all' ? 'All' : p === 'twitter' ? 'X' : 'Discord'}</button>)}
            <span className="sep" />
            {[1, 2, 3, 4].map((r) => <button key={r} type="button" data-ring={r} aria-pressed={ring === r} onClick={() => setRing(ring === r ? null : r)}><i className="dot" style={{ background: r === 4 ? 'transparent' : `var(--rm-${RING_TONE[r]}-dot)`, borderStyle: r === 4 ? 'dashed' : undefined }} />{r}</button>)}
            <span className="sep" />
            <button type="button" id="talkBtn" aria-pressed={talk} onClick={() => setTalk(!talk)}>Who to talk to</button>
            <button type="button" id="organizeBtn" onClick={organize}>Organize</button>
            <button type="button" id="fitBtn" aria-pressed={zoom !== 1} onClick={fit}>Fit</button>
            <button type="button" id="fullBtn" aria-pressed={zoom === 1} onClick={() => setZoom(1)}>100%</button>
            <span id="zoomLabel">{Math.round(zoom * 100)}%</span>
            <button type="button" id="themeBtn" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
