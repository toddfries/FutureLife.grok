import type { AppUser } from "@/lib/auth/use-current-user";

/** Guest polls send empty so the relay assigns Guest N. Signed-in → X name. */
export function formatPilotName(user: AppUser | null): string {
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
