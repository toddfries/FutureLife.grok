import { _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as GROK_PROVIDERS } from "./router-VAZZY4Db.mjs";
import { r as signIn, t as Button } from "./client-9yZOApmw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DaMMOo6L.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
	const rest = GROK_PROVIDERS.filter((p) => p.idp !== "twitter");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg p-6 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-overlay",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs tracking-[0.18em] text-muted uppercase",
					children: "FutureLife"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-3xl tracking-display",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-normal text-muted",
					children: "Sign in with X to paint your handle on the roadster. Guests still fly as Guest 1, Guest 2, …"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-3",
					children: [x ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "lg",
						className: "w-full",
						onClick: () => signIn(x.providerId, { callbackURL: "/" }),
						children: ["Continue with ", x.label]
					}) : null, rest.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						className: "w-full",
						onClick: () => signIn(p.providerId, { callbackURL: "/" }),
						children: ["Continue with ", p.label]
					}, p.providerId))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "mt-6 inline-block text-sm text-muted underline-offset-4 hover:underline",
					children: "Fly as a guest"
				})
			]
		})
	});
}
//#endregion
export { Login as component };
