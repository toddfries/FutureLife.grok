import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as __exportAll } from "./ssr.mjs";
import { i as Compass, n as Pause, r as Mountain } from "../_libs/lucide-react.mjs";
import { n as GROK_PROVIDERS } from "./router-VAZZY4Db.mjs";
import { i as signOut, n as authClient, r as signIn, t as Button } from "./client-9yZOApmw.mjs";
import { I as Vector2, L as Vector3, M as Scene, O as Raycaster, P as SphereGeometry, S as MeshPhongMaterial, T as PerspectiveCamera, a as Color, b as MeshBasicMaterial, c as DirectionalLight, i as CanvasTexture, j as SRGBColorSpace, m as HemisphereLight, p as Group, t as WebGLRenderer, x as MeshLambertMaterial, y as Mesh } from "../_libs/three.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DiWBtRiJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BLOCK_RGB = [
	new Float32Array([
		0,
		0,
		0
	]),
	new Float32Array([
		.22,
		.48,
		.28
	]),
	new Float32Array([
		.38,
		.26,
		.16
	]),
	new Float32Array([
		.55,
		.5,
		.42
	]),
	new Float32Array([
		.76,
		.68,
		.48
	]),
	new Float32Array([
		.1,
		.38,
		.46
	]),
	new Float32Array([
		.18,
		.55,
		.32
	]),
	new Float32Array([
		.33,
		.22,
		.14
	]),
	new Float32Array([
		.14,
		.36,
		.24
	]),
	new Float32Array([
		.42,
		.82,
		.78
	]),
	new Float32Array([
		.62,
		.4,
		.28
	])
];
var FACE_SHADE = [
	1.05,
	.52,
	.82,
	.82,
	.7,
	.7
];
function isOpaque(b) {
	return b !== 0 && b !== 5;
}
/** Hex used by the sky / fog / ocean — keep in sync with CSS tokens conceptually. */
var WORLD_HEX = {
	fog: 8038576,
	skyZenith: 1456202,
	skyHorizon: 12047568,
	ocean: 1401197,
	sun: 16770754,
	ambientSky: 9357782,
	ambientGround: 2373676
};
/** World position → lat/lon (degrees). Pole at the playable isles. */
function worldToLatLon(x, y, z) {
	const cy = y + 680;
	const r = Math.hypot(x, cy, z) || 1;
	return {
		lat: Math.asin(cy / r) * 180 / Math.PI,
		lon: Math.atan2(z, x) * 180 / Math.PI,
		r
	};
}
function makeEarthTexture(w = 1024, h = 512) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const g = c.getContext("2d");
	g.fillStyle = "#15616d";
	g.fillRect(0, 0, w, h);
	const img = g.getImageData(0, 0, w, h);
	const d = img.data;
	for (let y = 0; y < h; y++) {
		const lat = 1 - y / (h - 1);
		for (let x = 0; x < w; x++) {
			const lon = x / w;
			const n = Math.sin(x * .07 + y * .03) * .35 + Math.sin(x * .021 + 2) * .28 + Math.sin(y * .05) * .22;
			const pole = Math.pow(lat, 1.6);
			const gulf = Math.exp(-((lat - .92) ** 2) * 80 - (lon - .12) ** 2 * 40);
			let land = n * .55 + pole * .2 + .18;
			if (gulf > .25) land = .22 + gulf * .15;
			const i = (y * w + x) * 4;
			if (land > .42) {
				const t = Math.min(1, (land - .42) * 3);
				d[i] = Math.floor(40 + t * 70);
				d[i + 1] = Math.floor(90 + t * 50);
				d[i + 2] = Math.floor(48 + t * 20);
			} else if (land > .34) {
				d[i] = 194;
				d[i + 1] = 176;
				d[i + 2] = 110;
			} else {
				const deep = .34 - land;
				d[i] = Math.floor(12 + deep * 10);
				d[i + 1] = Math.floor(70 - deep * 30);
				d[i + 2] = Math.floor(90 - deep * 20);
			}
			d[i + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	const ice = g.createLinearGradient(0, 0, 0, 28);
	ice.addColorStop(0, "rgba(236,244,248,0.95)");
	ice.addColorStop(1, "rgba(236,244,248,0)");
	g.fillStyle = ice;
	g.fillRect(0, 0, w, 26);
	const south = g.createLinearGradient(0, h, 0, h - 22);
	south.addColorStop(0, "rgba(236,244,248,0.9)");
	south.addColorStop(1, "rgba(236,244,248,0)");
	g.fillStyle = south;
	g.fillRect(0, h - 22, w, 22);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 4;
	return tex;
}
function addPlanet(scene) {
	const tex = makeEarthTexture();
	const geo = new SphereGeometry(680, 96, 64);
	const mat = new MeshPhongMaterial({
		map: tex,
		shininess: 22,
		specular: new Color(2771544)
	});
	const mesh = new Mesh(geo, mat);
	mesh.position.set(0, -680, 0);
	mesh.receiveShadow = true;
	scene.add(mesh);
	const water = new Mesh(new SphereGeometry(680.6, 64, 40), new MeshPhongMaterial({
		color: WORLD_HEX.ocean,
		transparent: true,
		opacity: .22,
		depthWrite: false,
		shininess: 80,
		specular: 8964308
	}));
	water.position.copy(mesh.position);
	scene.add(water);
	const atmo = new Mesh(new SphereGeometry(708, 48, 32), new MeshBasicMaterial({
		color: 8304816,
		transparent: true,
		opacity: .11,
		side: 1,
		depthWrite: false
	}));
	atmo.position.copy(mesh.position);
	scene.add(atmo);
	return {
		mesh,
		water,
		atmo,
		tex
	};
}
var savedDetail = (() => {
	if (typeof window === "undefined") return 0;
	const n = Number(window.localStorage.getItem("futurelife.detail") ?? window.localStorage.getItem("cloudroot.detail"));
	return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
})();
var useFlight = create((set) => ({
	playing: false,
	helpOpen: false,
	globeOpen: true,
	altitude: 0,
	speed: 0,
	heading: 0,
	zoom: 22,
	detail: savedDetail,
	seed: 0,
	chunksLoaded: 0,
	chunksQueued: 0,
	braking: false,
	cruiseLabel: "still",
	generating: true,
	fps: 0,
	cpuPct: 0,
	selfId: "",
	callsign: "",
	spawnIdx: -1,
	remotes: [],
	sights: [],
	setPlaying: (playing) => set({ playing }),
	setHelpOpen: (helpOpen) => set({ helpOpen }),
	setGlobeOpen: (globeOpen) => set({ globeOpen }),
	setDetail: (detail) => {
		if (typeof window !== "undefined") window.localStorage.setItem("futurelife.detail", String(detail));
		set({ detail });
	},
	patch: (p) => set(p)
}));
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of).
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
var GAGARIN_MS = (/* @__PURE__ */ new Date("1961-04-12T00:00:00Z")).getTime();
function Hud() {
	const playing = useFlight((s) => s.playing);
	const altitude = useFlight((s) => s.altitude);
	const speed = useFlight((s) => s.speed);
	const heading = useFlight((s) => s.heading);
	const detail = useFlight((s) => s.detail);
	const setDetail = useFlight((s) => s.setDetail);
	const cruiseLabel = useFlight((s) => s.cruiseLabel);
	const braking = useFlight((s) => s.braking);
	const generating = useFlight((s) => s.generating);
	const chunksLoaded = useFlight((s) => s.chunksLoaded);
	const chunksQueued = useFlight((s) => s.chunksQueued);
	const fps = useFlight((s) => s.fps);
	const cpuPct = useFlight((s) => s.cpuPct);
	const callsign = useFlight((s) => s.callsign);
	const setHelpOpen = useFlight((s) => s.setHelpOpen);
	const [now, setNow] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.code === "Slash" && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				setHelpOpen(!useFlight.getState().helpOpen);
			}
			if (e.code === "Escape" && useFlight.getState().playing) setHelpOpen(true);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [setHelpOpen]);
	(0, import_react.useEffect)(() => {
		if (!playing) return;
		setNow(/* @__PURE__ */ new Date());
		const id = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
		return () => window.clearInterval(id);
	}, [playing]);
	if (!playing) return null;
	const tz = tzOffset(now);
	const fpsLabel = fps > 0 ? `${Math.round(fps)} fps` : "— fps";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10 p-3 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-border bg-surface px-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-lg leading-tight tracking-display text-fg",
							children: [
								"FutureLife",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[11px] font-normal text-muted tabular-nums",
									children: [fpsLabel, cpuPct > 1 ? " · load" : ""]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-[11px] text-muted tabular-nums",
							children: [
								fmt(altitude),
								"m · ",
								fmt(speed),
								" u/s · ",
								normHead(heading),
								"°",
								callsign ? ` · ${callsign}` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-[11px] text-subtle",
							children: [braking ? "coasting to halt" : cruiseLabel, generating ? ` · weaving ${chunksQueued}` : ` · ${chunksLoaded} isles`]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "mt-2 w-full border-collapse border-t border-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
								className: "pr-4 pt-1.5 text-left text-[11px] font-medium tracking-[0.12em] text-muted whitespace-nowrap",
								children: ["date ", tz]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pt-1.5 text-left text-[11px] font-medium tracking-[0.12em] text-muted",
								children: "stardate"
							})] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "pr-4 font-mono text-[11px] text-fg tabular-nums whitespace-nowrap",
								children: localStamp(now)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "font-mono text-[11px] text-fg tabular-nums whitespace-nowrap",
								children: stardateOf(now)
							})] }) })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden sm:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							size: "default",
							className: "h-11 px-3 text-xs",
							onClick: () => {
								const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
								if (x) signIn(x.providerId, { callbackURL: "/" });
							},
							children: "Sign in with X"
						}) })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "icon",
						"aria-label": "Pause and controls",
						onClick: () => setHelpOpen(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute top-3 right-3 hidden w-56 rounded-lg border border-border bg-surface p-3 sm:top-5 sm:right-16 sm:block",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						htmlFor: "detail",
						className: "flex items-center justify-between text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, {
								className: "size-3.5",
								"aria-hidden": true
							}), "World detail"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono tabular-nums text-fg",
							children: Math.round(detail * 100)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "detail",
						type: "range",
						min: 0,
						max: 100,
						value: Math.round(detail * 100),
						onChange: (e) => setDetail(Number(e.target.value) / 100),
						className: "mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[11px] leading-snug text-subtle",
						children: "Planet skin is smooth. Voxels are local sky. Slide up for finer isles."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute bottom-24 left-1/2 hidden -translate-x-1/2 sm:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-5 w-px bg-fg/40" })
			})
		]
	});
}
function fmt(n) {
	return Math.round(n).toString();
}
function normHead(deg) {
	const d = (deg % 360 + 360) % 360;
	return Math.round(d);
}
function pad2(n) {
	return String(n).padStart(2, "0");
}
function tzOffset(date) {
	const off = -date.getTimezoneOffset();
	const sign = off >= 0 ? "+" : "-";
	const abs = Math.abs(off);
	return `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
}
function localStamp(date) {
	return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}
function stardateOf(date) {
	return ((date.getTime() - GAGARIN_MS) / 6e8).toFixed(5);
}
var engineHandle = { current: null };
var FAST_POLL_MS = 400;
var IDLE_POLL_MS = 2e3;
var PING_INTERVAL_MS = 2e3;
var STALL_MS = 1e4;
var MAX_RECOVERY_ATTEMPTS = 3;
var SIGNAL_RETRY_DELAYS_MS = [250, 750];
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
var P2PRoom = class {
	opts;
	peers = /* @__PURE__ */ new Map();
	/** Per-remote-peer signal delivery chains (order-preserving). */
	signalQueues = /* @__PURE__ */ new Map();
	cursor = 0;
	pollTimer = null;
	pingTimer = null;
	closed = false;
	everPolled = false;
	lastPeersFingerprint = "";
	constructor(opts) {
		this.opts = opts;
	}
	/**
	* The first poll IS the join: it registers this peer and returns the
	* roster. A failed first poll (cold DB, offline tab) must not strand the
	* room: the loop and timers start regardless and the next poll retries.
	*/
	async join() {
		try {
			await this.pollOnce();
		} catch {}
		if (this.closed) return;
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
		this.pingTimer = setInterval(() => {
			this.pingAll();
			this.watchdog();
		}, PING_INTERVAL_MS);
	}
	close() {
		this.closed = true;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		if (this.pingTimer) clearInterval(this.pingTimer);
		for (const slot of this.peers.values()) slot.pc.close();
		this.peers.clear();
		fetch("/api/rtc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.opts.room,
				peer: this.opts.selfId
			}),
			keepalive: true
		}).catch(() => {});
	}
	/** Send on the unreliable game-state channel (drops stale packets). */
	broadcast(data) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		for (const slot of this.peers.values()) if (slot.state?.readyState === "open") slot.state.send(wire);
	}
	/** Send reliably (ordered) to one peer, or to all when peerId is omitted. */
	send(data, peerId) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
		for (const slot of targets) if (slot?.reliable?.readyState === "open") slot.reliable.send(wire);
	}
	peerList() {
		return [...this.peers.values()].map((s) => ({ ...s.info }));
	}
	schedulePoll(delay) {
		if (this.closed) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		this.pollTimer = setTimeout(() => void this.poll(), delay);
	}
	anyPairConnecting() {
		for (const s of this.peers.values()) {
			if (s.terminal) continue;
			if (s.info.connectionState !== "connected") return true;
		}
		return false;
	}
	async pollOnce() {
		const params = new URLSearchParams({
			room: this.opts.room,
			peer: this.opts.selfId,
			name: this.opts.name ?? "",
			since: String(this.cursor)
		});
		const res = await fetch(`/api/rtc?${params}`);
		if (this.closed) return;
		if (!res.ok) throw new Error(`signaling poll failed: ${res.status}`);
		const body = await res.json();
		if (this.closed) return;
		if (!this.everPolled) {
			this.everPolled = true;
			this.opts.onConnected?.();
		}
		if (body.you) this.opts.onSelf?.(body.you);
		this.reconcileRoster(body.peers);
		const roster = new Set(body.peers.map((p) => p.id));
		for (const sig of body.signals) {
			this.cursor = Math.max(this.cursor, sig.id);
			await this.onSignal(sig.from, sig.kind, sig.payload, roster);
			if (this.closed) return;
		}
	}
	async poll() {
		if (this.closed) return;
		try {
			await this.pollOnce();
		} catch {}
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
	}
	reconcileRoster(peers) {
		const alive = new Set(peers.map((p) => p.id));
		for (const p of peers) {
			if (p.id === this.opts.selfId) continue;
			const existing = this.peers.get(p.id);
			if (existing) existing.info.name = p.name;
			else this.connectTo(p.id, p.name, this.opts.selfId > p.id);
		}
		for (const [id, slot] of this.peers) if (!alive.has(id)) {
			slot.pc.close();
			this.peers.delete(id);
		}
		this.emitPeers();
	}
	connectTo(peerId, name, initiator) {
		if (this.closed) return null;
		const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers ?? defaultIceServers() });
		const slot = {
			pc,
			makingOffer: false,
			ignoreOffer: false,
			pendingCandidates: [],
			lastProgressAt: Date.now(),
			recoveryAttempts: 0,
			info: {
				id: peerId,
				name,
				connectionState: pc.connectionState,
				candidateType: null,
				rttMs: null
			}
		};
		this.peers.set(peerId, slot);
		pc.onicecandidate = (e) => {
			if (e.candidate) this.sendSignal(peerId, "ice", e.candidate.toJSON());
		};
		pc.onconnectionstatechange = () => {
			slot.info.connectionState = pc.connectionState;
			if (pc.connectionState === "connecting" || pc.connectionState === "connected") slot.lastProgressAt = Date.now();
			if (pc.connectionState === "connected") {
				slot.recoveryAttempts = 0;
				slot.terminal = false;
				this.readCandidateType(slot);
			}
			this.emitPeers();
			if (pc.connectionState === "failed") pc.restartIce();
			if (pc.connectionState === "failed" || pc.connectionState === "disconnected") this.schedulePoll(FAST_POLL_MS);
		};
		pc.onnegotiationneeded = async () => {
			try {
				slot.makingOffer = true;
				await pc.setLocalDescription();
				await this.sendSignal(peerId, "offer", pc.localDescription.toJSON());
			} catch {} finally {
				slot.makingOffer = false;
			}
		};
		pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);
		if (initiator) {
			this.attachChannel(slot, pc.createDataChannel("state", {
				ordered: false,
				maxRetransmits: 0
			}));
			this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
		}
		return slot;
	}
	attachChannel(slot, channel) {
		if (channel.label === "state") slot.state = channel;
		else slot.reliable = channel;
		channel.onopen = () => {
			slot.lastProgressAt = Date.now();
		};
		channel.onmessage = (e) => {
			let msg;
			try {
				msg = JSON.parse(e.data);
			} catch {
				return;
			}
			if (msg.t === "ping") {
				if (slot.state?.readyState === "open") slot.state.send(JSON.stringify({ t: "pong" }));
			} else if (msg.t === "pong") {
				if (slot.pingSentAt) {
					slot.info.rttMs = Math.round(performance.now() - slot.pingSentAt);
					slot.pingSentAt = void 0;
					this.emitPeers();
				}
			} else this.opts.onMessage?.(slot.info.id, msg.d, channel.label === "state" ? "state" : "reliable");
		};
	}
	/** Apply buffered ICE candidates once a remote description is in place. */
	async flushPendingCandidates(slot) {
		while (slot.pendingCandidates.length > 0) {
			const candidate = slot.pendingCandidates.shift();
			try {
				await slot.pc.addIceCandidate(candidate);
			} catch (err) {
				if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
			}
			if (this.closed) return;
		}
	}
	async onSignal(from, kind, payload, roster) {
		if (this.closed) return;
		let slot = this.peers.get(from);
		if (!slot) {
			if (!roster.has(from)) return;
			const created = this.connectTo(from, "", false);
			if (!created) return;
			slot = created;
		}
		const polite = this.opts.selfId < from;
		try {
			if (kind === "offer" || kind === "answer") {
				const description = payload;
				const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
				slot.ignoreOffer = !polite && collision;
				if (slot.ignoreOffer) return;
				try {
					await slot.pc.setRemoteDescription(description);
				} catch (err) {
					if (kind !== "offer" || slot.recreatedForOffer) throw err;
					const attempts = slot.recoveryAttempts;
					const name = slot.info.name;
					slot.pc.close();
					this.peers.delete(from);
					const fresh = this.connectTo(from, name, false);
					if (!fresh) return;
					fresh.recoveryAttempts = attempts;
					fresh.recreatedForOffer = true;
					slot = fresh;
					await slot.pc.setRemoteDescription(description);
				}
				if (this.closed) return;
				await this.flushPendingCandidates(slot);
				if (this.closed) return;
				if (kind === "offer") {
					await slot.pc.setLocalDescription();
					if (this.closed) return;
					await this.sendSignal(from, "answer", slot.pc.localDescription.toJSON());
				}
			} else if (kind === "ice") {
				const candidate = payload;
				if (!slot.pc.remoteDescription) {
					slot.pendingCandidates.push(candidate);
					return;
				}
				try {
					await slot.pc.addIceCandidate(candidate);
				} catch (err) {
					if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
				}
			}
		} catch {}
	}
	/**
	* Signals are serialized per remote peer (a candidate must never overtake
	* its SDP into the DB) and retried on failure with short backoff.
	*/
	sendSignal(to, kind, payload) {
		const next = (this.signalQueues.get(to) ?? Promise.resolve()).then(() => this.postSignal(to, kind, payload));
		this.signalQueues.set(to, next.catch(() => {}));
		return next;
	}
	async postSignal(to, kind, payload) {
		for (let attempt = 0;; attempt++) {
			if (this.closed) return;
			try {
				const res = await fetch("/api/rtc", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						op: "signal",
						room: this.opts.room,
						from: this.opts.selfId,
						to,
						kind,
						payload
					})
				});
				if (res.ok) return;
				throw new Error(`signal POST failed: ${res.status}`);
			} catch (err) {
				if (attempt >= SIGNAL_RETRY_DELAYS_MS.length) {
					console.warn(`[p2p] signal ${kind} to ${to} failed after retries`, err);
					return;
				}
				await new Promise((r) => setTimeout(r, SIGNAL_RETRY_DELAYS_MS[attempt]));
			}
		}
	}
	pingAll() {
		const wire = JSON.stringify({ t: "ping" });
		for (const slot of this.peers.values()) {
			if (slot.state?.readyState !== "open") continue;
			const stale = slot.pingSentAt !== void 0 && performance.now() - slot.pingSentAt > 2 * PING_INTERVAL_MS;
			if (slot.pingSentAt === void 0 || stale) {
				slot.pingSentAt = performance.now();
				slot.state.send(wire);
			}
		}
	}
	/**
	* Stuck-pair recovery, piggybacked on the ping interval. A pair that has
	* made no progress for STALL_MS gets rebuilt by the dialer with a FRESH
	* RTCPeerConnection (new DTLS identity — fixes the suspend/resume
	* fingerprint wedge). After MAX_RECOVERY_ATTEMPTS the pair is terminal:
	* visible to the app as its last connectionState, ignored by fast-poll.
	*/
	watchdog() {
		if (this.closed) return;
		const now = Date.now();
		for (const [peerId, slot] of this.peers) {
			const live = slot.pc.connectionState;
			if (live !== slot.info.connectionState) {
				slot.info.connectionState = live;
				if (live === "connecting" || live === "connected") slot.lastProgressAt = now;
				this.emitPeers();
			}
			if (slot.terminal || live === "connected") continue;
			if (now - slot.lastProgressAt <= STALL_MS) continue;
			if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
				slot.terminal = true;
				this.emitPeers();
				continue;
			}
			slot.recoveryAttempts += 1;
			slot.lastProgressAt = now;
			if (this.opts.selfId > peerId) {
				const { name } = slot.info;
				const attempts = slot.recoveryAttempts;
				slot.pc.close();
				this.peers.delete(peerId);
				const fresh = this.connectTo(peerId, name, true);
				if (fresh) fresh.recoveryAttempts = attempts;
				this.schedulePoll(FAST_POLL_MS);
			}
		}
	}
	async readCandidateType(slot) {
		try {
			const stats = await slot.pc.getStats();
			let selected;
			stats.forEach((s) => {
				if (s.type === "candidate-pair" && s.nominated) selected = s;
			});
			const localId = selected?.localCandidateId;
			if (localId) {
				const local = stats.get(localId);
				slot.info.candidateType = local?.candidateType ?? null;
				this.emitPeers();
			}
		} catch {}
	}
	emitPeers() {
		const list = this.peerList();
		const fingerprint = JSON.stringify(list.map((p) => [
			p.id,
			p.name,
			p.connectionState,
			p.candidateType,
			p.rttMs
		]));
		if (fingerprint === this.lastPeersFingerprint) return;
		this.lastPeersFingerprint = fingerprint;
		this.opts.onPeersChanged?.(list);
	}
};
/**
* React binding for P2PRoom. Identity and room id are captured once on mount.
*/
function defaultRoom() {
	if (typeof window === "undefined") return "room-ssr";
	return `room-${window.location.hostname.split(".")[0]}`.slice(0, 64);
}
function useP2PRoom(options = {}) {
	const [selfId] = (0, import_react.useState)(() => `p-${Math.random().toString(36).slice(2, 10)}`);
	const [room] = (0, import_react.useState)(() => options.room ?? defaultRoom());
	const [peers, setPeers] = (0, import_react.useState)([]);
	const [joined, setJoined] = (0, import_react.useState)(false);
	const roomRef = (0, import_react.useRef)(null);
	const optsRef = (0, import_react.useRef)(options);
	optsRef.current = options;
	const enabled = options.enabled !== false;
	const listeners = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	(0, import_react.useEffect)(() => {
		if (!enabled) return;
		const p2p = new P2PRoom({
			room,
			selfId,
			get name() {
				return optsRef.current.name ?? "";
			},
			onPeersChanged: setPeers,
			onMessage: (from, data, channel) => {
				for (const fn of listeners.current) fn(from, data, channel);
			},
			onConnected: () => setJoined(true),
			onSelf: (you) => optsRef.current.onSelf?.(you)
		});
		roomRef.current = p2p;
		p2p.join();
		return () => {
			roomRef.current = null;
			p2p.close();
		};
	}, [
		room,
		selfId,
		enabled
	]);
	return {
		selfId,
		room,
		peers,
		joined,
		broadcast: (0, import_react.useCallback)((data) => roomRef.current?.broadcast(data), []),
		send: (0, import_react.useCallback)((data, peerId) => roomRef.current?.send(data, peerId), []),
		onMessage: (0, import_react.useCallback)((fn) => {
			listeners.current.add(fn);
			return () => {
				listeners.current.delete(fn);
			};
		}, [])
	};
}
/** Guest polls send empty so the relay assigns Guest N. Signed-in → X name. */
function formatPilotName(user) {
	if (!user || user.isDevFallback) return "";
	const n = (user.displayName || "").trim();
	if (n) {
		if (n.startsWith("@")) return n.slice(0, 32);
		if (!/\s/.test(n) && n.length <= 16) return `@${n}`;
		return n.slice(0, 32);
	}
	const mail = user.primaryEmail?.split("@")[0];
	return mail ? mail.slice(0, 32) : "";
}
function PeerNet() {
	const { user, isPending } = useCurrentUserState();
	const [waited, setWaited] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!isPending) return;
		const t = window.setTimeout(() => setWaited(true), 1200);
		return () => window.clearTimeout(t);
	}, [isPending]);
	const ready = !isPending || waited;
	const requested = ready ? formatPilotName(user) : "";
	const live = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const p2p = useP2PRoom({
		name: requested,
		enabled: ready,
		onSelf: (0, import_react.useCallback)((you) => {
			const first = useFlight.getState().spawnIdx < 0;
			useFlight.getState().patch({
				callsign: you.name,
				spawnIdx: you.spawn
			});
			if (first) engineHandle.current?.applySpawn(you.spawn);
			engineHandle.current?.setCallsign(you.name);
		}, [])
	});
	(0, import_react.useEffect)(() => {
		useFlight.getState().patch({ selfId: p2p.selfId });
	}, [p2p.selfId]);
	(0, import_react.useEffect)(() => {
		live.current = new Set(p2p.peers.map((p) => p.id));
		const eng = engineHandle.current;
		if (eng && typeof eng.pruneRemotes === "function") eng.pruneRemotes(live.current);
		const remotes = useFlight.getState().remotes.filter((r) => live.current.has(r.id));
		useFlight.getState().patch({ remotes });
	}, [p2p.peers]);
	(0, import_react.useEffect)(() => p2p.onMessage((from, data, channel) => {
		if (channel !== "state" || !data || typeof data !== "object") return;
		const d = data;
		if (![
			d.x,
			d.y,
			d.z,
			d.yaw
		].every((n) => typeof n === "number")) return;
		const tag = d.name || from;
		engineHandle.current?.setRemote(from, tag, d);
		const next = {
			id: from,
			kind: "player",
			name: tag,
			x: d.x,
			y: d.y,
			z: d.z,
			yaw: d.yaw,
			pitch: d.pitch,
			roll: d.roll
		};
		const cur = useFlight.getState().remotes;
		const i = cur.findIndex((r) => r.id === from);
		const remotes = i >= 0 ? cur.map((r, k) => k === i ? next : r) : [...cur, next];
		useFlight.getState().patch({ remotes });
	}), [p2p.onMessage]);
	(0, import_react.useEffect)(() => {
		let raf = 0;
		let last = 0;
		const loop = (now) => {
			raf = requestAnimationFrame(loop);
			if (now - last < 50) return;
			last = now;
			const eng = engineHandle.current;
			if (!eng) return;
			const s = eng.snapshot();
			const name = useFlight.getState().callsign || "Guest";
			p2p.broadcast({
				...s,
				name
			});
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [p2p.broadcast]);
	return null;
}
function PlanetGlobe() {
	const playing = useFlight((s) => s.playing);
	const open = useFlight((s) => s.globeOpen);
	const setOpen = useFlight((s) => s.setGlobeOpen);
	const canvasRef = (0, import_react.useRef)(null);
	const lastTap = (0, import_react.useRef)({
		id: "",
		t: 0
	});
	(0, import_react.useEffect)(() => {
		if (!playing || !open) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		renderer.setSize(196, 196, false);
		const scene = new Scene();
		const camera = new PerspectiveCamera(35, 1, .1, 80);
		camera.position.set(0, .6, 4.6);
		const tex = makeEarthTexture(512, 256);
		const globe = new Mesh(new SphereGeometry(1.4, 48, 32), new MeshLambertMaterial({ map: tex }));
		scene.add(new HemisphereLight(13625572, 2372140, 1.1));
		const sun = new DirectionalLight(16773590, .9);
		sun.position.set(2, 2, 3);
		scene.add(sun);
		const pivot = new Group();
		scene.add(pivot);
		pivot.add(globe);
		const dots = new Group();
		pivot.add(dots);
		const dotGeo = new SphereGeometry(.05, 8, 6);
		const mats = {
			self: new MeshBasicMaterial({ color: 15262940 }),
			player: new MeshBasicMaterial({ color: 3900150 }),
			sight: new MeshBasicMaterial({ color: 14427686 })
		};
		const pool = [];
		const tmp = new Vector3();
		let drag = false;
		let lastX = 0;
		let lastY = 0;
		const onDown = (e) => {
			drag = true;
			lastX = e.clientX;
			lastY = e.clientY;
			canvas.setPointerCapture(e.pointerId);
		};
		const onMove = (e) => {
			if (!drag) return;
			pivot.rotation.y += (e.clientX - lastX) * .01;
			pivot.rotation.x += (e.clientY - lastY) * .01;
			pivot.rotation.x = Math.max(-1.1, Math.min(1.1, pivot.rotation.x));
			lastX = e.clientX;
			lastY = e.clientY;
		};
		const onUp = () => {
			drag = false;
		};
		canvas.addEventListener("pointerdown", onDown);
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerup", onUp);
		const ray = new Raycaster();
		const ndc = new Vector2();
		const onClick = (e) => {
			const r = canvas.getBoundingClientRect();
			ndc.x = (e.clientX - r.left) / r.width * 2 - 1;
			ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
			ray.setFromCamera(ndc, camera);
			const hit = ray.intersectObjects(dots.children, false)[0];
			if (!hit) return;
			const id = hit.object.userData.id;
			const now = performance.now();
			if (lastTap.current.id === id && now - lastTap.current.t < 420) {
				const t = hit.object.userData.target;
				engineHandle.current?.superspeedTo(t.x, t.y + 18, t.z);
			}
			lastTap.current = {
				id,
				t: now
			};
		};
		canvas.addEventListener("pointerup", onClick);
		let raf = 0;
		const loop = () => {
			raf = requestAnimationFrame(loop);
			let n = 0;
			const addDot = (id, x, y, z, kind, scale) => {
				const { lat, lon } = worldToLatLon(x, y, z);
				const la = lat * Math.PI / 180;
				const lo = lon * Math.PI / 180;
				tmp.set(Math.cos(la) * Math.cos(lo) * 1.45, Math.sin(la) * 1.45, Math.cos(la) * Math.sin(lo) * 1.45);
				let m = pool[n];
				if (!m) {
					m = new Mesh(dotGeo, mats[kind]);
					pool[n] = m;
					dots.add(m);
				}
				m.material = mats[kind];
				m.scale.setScalar(scale);
				m.position.copy(tmp);
				m.userData = {
					id,
					target: {
						x,
						y,
						z
					}
				};
				m.visible = true;
				n++;
			};
			const self = engineHandle.current?.pos;
			if (self) addDot("self", self.x, self.y, self.z, "self", 1.4);
			for (const p of useFlight.getState().remotes) addDot(p.id, p.x, p.y, p.z, "player", 1.6);
			for (const s of useFlight.getState().sights) addDot(s.id, s.x, s.y, s.z, "sight", 2.1);
			for (let i = n; i < pool.length; i++) pool[i].visible = false;
			renderer.render(scene, camera);
		};
		loop();
		return () => {
			cancelAnimationFrame(raf);
			canvas.removeEventListener("pointerdown", onDown);
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerup", onUp);
			canvas.removeEventListener("pointerup", onClick);
			renderer.dispose();
			globe.geometry.dispose();
			globe.material.dispose();
			tex.dispose();
			dotGeo.dispose();
			mats.self.dispose();
			mats.player.dispose();
			mats.sight.dispose();
		};
	}, [playing, open]);
	if (!playing) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto absolute right-3 bottom-3 z-10 w-[220px] rounded-xl border border-border bg-surface p-3 sm:bottom-5 sm:right-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-[0.12em] text-muted uppercase",
				children: "Planet"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				size: "default",
				className: "h-9 px-3 text-xs",
				onClick: () => setOpen(!open),
				children: open ? "Hide" : "Show"
			})]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			width: 196,
			height: 196,
			className: "mt-2 size-[196px] touch-none rounded-lg bg-bg",
			"aria-label": "Interactive planet"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-[11px] leading-snug text-subtle",
			children: "Drag to spin. Blue: pilots. Red: sights. Double-tap a dot to superspeed there."
		})] }) : null]
	});
}
var MOVE = [
	["h / l", "strafe left / right"],
	["k / j", "rise / descend"],
	["Space", "fly forward"],
	["Shift+Space", "fly back"],
	["s", "stop — 2s coast if cruising"]
];
var LOOK = [
	["u / a", "tilt left (turn + bank)"],
	["o / d", "tilt right"],
	["i", "tilt forward (nose down)"],
	[",", "tilt back (nose up)"],
	["z / Z", "zoom in / out"]
];
function StartOverlay() {
	const playing = useFlight((s) => s.playing);
	const helpOpen = useFlight((s) => s.helpOpen);
	const generating = useFlight((s) => s.generating);
	const callsign = useFlight((s) => s.callsign);
	const setPlaying = useFlight((s) => s.setPlaying);
	const setHelpOpen = useFlight((s) => s.setHelpOpen);
	const { isPending } = useCurrentUserState();
	if (playing && !helpOpen) return null;
	const enter = () => {
		setPlaying(true);
		setHelpOpen(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-20 flex items-end justify-center p-4 sm:items-center sm:p-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-bg/55" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative w-full max-w-xl rounded-xl border border-border bg-surface p-5 shadow-overlay sm:p-8",
			role: "dialog",
			"aria-labelledby": "futurelife-title",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs tracking-[0.18em] text-muted uppercase",
					children: "Floating archipelago"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					id: "futurelife-title",
					className: "mt-2 font-display text-4xl font-medium tracking-display text-fg sm:text-5xl",
					children: "FutureLife"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-prose text-sm leading-normal text-muted",
					children: "A spherical gulf world. The planet itself is a smooth mesh; nearby isles stay voxels you can sharpen with World detail. You fly a compressed-air roadster. Other pilots are blue on the planet card; Starbase Louisiana and other sights are red. Double-tap a dot to superspeed. Guests are numbered in join order; sign in with X to stamp your @handle on the plates."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-fg",
							children: callsign ? `You are ${callsign}` : isPending ? "Checking X sign-in…" : "Claiming a guest number…"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => {
								const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
								if (x) signIn(x.providerId, { callbackURL: "/" });
							},
							children: "Sign in with X"
						}) })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyTable, {
						title: "Move",
						rows: MOVE
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyTable, {
						title: "Tilt and look",
						rows: LOOK
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-xs leading-snug text-subtle",
					children: "Single tap nudges. Double tap holds a cruise. Triple tap is the fast cruise. Space is the exception: double-tap Space for fast flight."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-3 sm:flex-row sm:items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "lg",
						onClick: enter,
						className: "w-full sm:w-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, {
							className: "size-4",
							"aria-hidden": true
						}), playing ? "Resume flight" : "Start flight"]
					}), playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						onClick: () => {
							engineHandle.current?.newWorld();
							setHelpOpen(false);
						},
						children: "New world"
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 font-mono text-xs text-subtle",
					children: [generating ? "Weaving nearby isles…" : "Terrain ready", " · slash opens this card"]
				})
			]
		})]
	});
}
function KeyTable({ title, rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: "text-xs font-medium tracking-[0.14em] text-muted uppercase",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "mt-2 space-y-1.5",
		children: rows.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-baseline justify-between gap-3 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
				className: "rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg",
				children: k
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-right text-muted",
				children: v
			})]
		}, k))
	})] });
}
function TouchPad() {
	const playing = useFlight((s) => s.playing);
	const detail = useFlight((s) => s.detail);
	const setDetail = useFlight((s) => s.setDetail);
	if (!playing) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 pointer-events-auto rounded-lg border border-border bg-surface px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: "detail-m",
				className: "flex justify-between text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "World detail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono tabular-nums text-fg",
					children: Math.round(detail * 100)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "detail-m",
				type: "range",
				min: 0,
				max: 100,
				value: Math.round(detail * 100),
				onChange: (e) => setDetail(Number(e.target.value) / 100),
				className: "mt-1 h-2 w-full appearance-none rounded-full bg-surface-2 accent-primary"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stick, {
					label: "Move",
					onVec: (x, y) => engineHandle.current?.setTouch({
						x,
						y
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex flex-col gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PadButton, {
							label: "Fly",
							onHold: (v) => engineHandle.current?.setTouch({ fwd: v ? 1 : 0 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PadButton, {
							label: "Back",
							onHold: (v) => engineHandle.current?.setTouch({ back: v ? 1 : 0 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PadButton, {
							label: "Stop",
							onHold: (v) => {
								if (v) engineHandle.current?.input && (engineHandle.current.input.stopLatched = true);
							}
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stick, {
					label: "Look",
					onVec: (x, y) => engineHandle.current?.setTouch({
						lookX: x,
						lookY: y
					})
				})
			]
		})]
	});
}
function PadButton({ label, onHold }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "min-h-11 min-w-16 rounded-md border border-border bg-surface px-3 text-sm text-fg",
		onPointerDown: (e) => {
			e.currentTarget.setPointerCapture(e.pointerId);
			onHold(true);
		},
		onPointerUp: () => onHold(false),
		onPointerCancel: () => onHold(false),
		children: label
	});
}
function Stick({ label, onVec }) {
	const ref = (0, import_react.useRef)(null);
	const id = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => onVec(0, 0), [onVec]);
	const read = (e) => {
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width * 2 - 1;
		const y = -((e.clientY - r.top) / r.height * 2 - 1);
		const m = Math.hypot(x, y);
		const s = m < .12 ? 0 : Math.min(1, (m - .12) / .88) / (m || 1);
		onVec(x * s, y * s);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto flex flex-col items-center gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref,
			className: "size-28 rounded-full border border-border bg-surface-2",
			onPointerDown: (e) => {
				id.current = e.pointerId;
				e.currentTarget.setPointerCapture(e.pointerId);
				read(e);
			},
			onPointerMove: (e) => {
				if (id.current === e.pointerId) read(e);
			},
			onPointerUp: () => {
				id.current = null;
				onVec(0, 0);
			},
			onPointerCancel: () => {
				id.current = null;
				onVec(0, 0);
			}
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[11px] text-muted",
			children: label
		})]
	});
}
function WorldStage() {
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!canvasRef.current) return;
		let disposed = false;
		let unsub;
		import("./engine-Dpq2Jtbb.mjs").then(({ Engine }) => {
			if (disposed || !canvasRef.current) return;
			const engine = new Engine(canvasRef.current, (p) => useFlight.getState().patch(p), useFlight.getState().detail);
			engine.start();
			engineHandle.current = engine;
			const now = useFlight.getState();
			if (now.spawnIdx >= 0) engine.applySpawn(now.spawnIdx);
			if (now.callsign) engine.setCallsign(now.callsign);
			let prev = now;
			unsub = useFlight.subscribe((s) => {
				if (s.playing !== prev.playing) engine.setPlaying(s.playing);
				if (s.detail !== prev.detail) engine.setDetail(s.detail);
				if (s.spawnIdx >= 0 && prev.spawnIdx < 0) engine.applySpawn(s.spawnIdx);
				if (s.callsign && s.callsign !== prev.callsign) engine.setCallsign(s.callsign);
				prev = s;
			});
		});
		return () => {
			disposed = true;
			unsub?.();
			engineHandle.current?.dispose();
			engineHandle.current = null;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref: canvasRef,
		tabIndex: 0,
		className: "absolute inset-0 size-full touch-none",
		"aria-label": "FutureLife sky"
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "sr-only",
				children: "FutureLife — fly the floating isles"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldStage, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PeerNet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanetGlobe, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchPad, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StartOverlay, {})
		]
	});
}
//#endregion
export { WORLD_HEX as a, FACE_SHADE as i, addPlanet as n, isOpaque as o, BLOCK_RGB as r, routes_exports as t };
