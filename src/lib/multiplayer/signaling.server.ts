/**
 * WebRTC signaling over the app database (Neon deployed, PGLite in preview).
 * Only rendezvous traffic passes through here — roster + SDP/ICE relay while a
 * mesh forms; game data then flows peer-to-peer.
 */
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import type { PeerRow, RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
    message: "payload too large",
  }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 60;

const globalRef = globalThis as typeof globalThis & {
  __rtcSchemaPromise__?: Promise<void>;
};

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_peers (
         room TEXT NOT NULL,
         peer_id TEXT NOT NULL,
         name TEXT NOT NULL DEFAULT '',
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (room, peer_id)
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_signals (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         kind TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS webrtc_signals_inbox
         ON webrtc_signals (room, to_peer, id)`,
    );
    await sql.query(
      `ALTER TABLE webrtc_peers ADD COLUMN IF NOT EXISTS spawn_idx INTEGER NOT NULL DEFAULT 0`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_room_seq (
         room TEXT PRIMARY KEY,
         next_guest INTEGER NOT NULL DEFAULT 1,
         next_spawn INTEGER NOT NULL DEFAULT 0
       )`,
    );
  })().catch((err) => {
    globalRef.__rtcSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__rtcSchemaPromise__;
}

async function roster(sql: Sql, room: string): Promise<PeerRow[]> {
  const rows = await sql.query<{ peer_id: string; name: string }>(
    `SELECT peer_id, name FROM webrtc_peers
     WHERE room = $1 AND last_seen > now() - make_interval(secs => $2)
     ORDER BY peer_id LIMIT 32`,
    [room, PEER_TTL_SECONDS],
  );
  return rows.map((r) => ({ id: r.peer_id, name: r.name }));
}

async function claimIdentity(
  sql: Sql,
  room: string,
  peer: string,
  requested: string,
): Promise<{ name: string; spawn: number }> {
  const want = sanitizeName(requested);
  const custom = isCustomName(want);
  const existing = await sql.query<{ name: string; spawn_idx: number }>(
    `SELECT name, spawn_idx FROM webrtc_peers WHERE room = $1 AND peer_id = $2`,
    [room, peer],
  );
  const row = existing[0];
  if (row) {
    const name = custom ? want : row.name;
    await sql.query(
      `UPDATE webrtc_peers SET last_seen = now(), name = $3 WHERE room = $1 AND peer_id = $2`,
      [room, peer, name],
    );
    return { name, spawn: row.spawn_idx };
  }

  await sql.query(
    `INSERT INTO webrtc_room_seq (room, next_guest, next_spawn)
     VALUES ($1, 1, 0)
     ON CONFLICT (room) DO NOTHING`,
    [room],
  );
  const bumped = await sql.query<{ guest_n: number; spawn: number }>(
    `UPDATE webrtc_room_seq
     SET next_guest = next_guest + $2,
         next_spawn = next_spawn + 1
     WHERE room = $1
     RETURNING next_guest - $2 AS guest_n, next_spawn - 1 AS spawn`,
    [room, custom ? 0 : 1],
  );
  const seq = bumped[0] ?? { guest_n: 1, spawn: 0 };
  const name = custom ? want : `Guest ${seq.guest_n}`;
  await sql.query(
    `INSERT INTO webrtc_peers (room, peer_id, name, spawn_idx, last_seen)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (room, peer_id)
     DO UPDATE SET last_seen = now(), name = EXCLUDED.name`,
    [room, peer, name, seq.spawn],
  );
  return { name, spawn: seq.spawn };
}

function isCustomName(name: string) {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  if (n === "pilot" || n === "guest" || n === "pending") return false;
  if (/^guest\s*\d+$/.test(n)) return false;
  return true;
}

function sanitizeName(raw: string) {
  return raw.replace(/[<>\n\r]/g, "").trim().slice(0, 32);
}

async function prune(sql: Sql) {
  await Promise.all([
    sql.query(`DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`, [
      SIGNAL_TTL_SECONDS,
    ]),
    sql.query(`DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`, [
      PEER_TTL_SECONDS,
    ]),
  ]);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data;

  const sql = await getSql();
  await ensureSchema(sql);
  if (since === 0 || Math.random() < 0.02) await prune(sql);
  const you = await claimIdentity(sql, room, peer, name);
  const rows = await sql.query<{
    id: number;
    from_peer: string;
    kind: SignalRow["kind"];
    payload: unknown;
  }>(
    `SELECT id, from_peer, kind, payload FROM webrtc_signals
     WHERE room = $1 AND to_peer = $2 AND id > $3
     ORDER BY id LIMIT 200`,
    [room, peer, since],
  );
  const body: RtcPollResponse = {
    peers: await roster(sql, room),
    signals: rows.map((r) => ({
      id: r.id,
      from: r.from_peer,
      kind: r.kind,
      payload: r.payload,
    })),
    you,
  };
  return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const sql = await getSql();
  await ensureSchema(sql);

  if (msg.op === "signal") {
    await sql.query(
      `INSERT INTO webrtc_signals (room, to_peer, from_peer, kind, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [msg.room, msg.to, msg.from, msg.kind, JSON.stringify(msg.payload)],
    );
  } else {
    await sql.query(`DELETE FROM webrtc_peers WHERE room = $1 AND peer_id = $2`, [
      msg.room,
      msg.peer,
    ]);
  }
  return json({ ok: true });
}

export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}
