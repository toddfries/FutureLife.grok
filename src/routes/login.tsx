import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
  const rest = GROK_PROVIDERS.filter((p) => p.idp !== "twitter");

  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <section className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-overlay">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          FutureLife
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-display">Sign in</h1>
        <p className="mt-2 text-sm leading-normal text-muted">
          Sign in with X to paint your handle on the roadster. Guests still fly
          as Guest 1, Guest 2, …
        </p>
        {authEnabled ? (
          <div className="mt-6 flex flex-col gap-3">
            {x ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => signIn(x.providerId, { callbackURL: "/" })}
              >
                Continue with {x.label}
              </Button>
            ) : null}
            {rest.map((p) => (
              <Button
                key={p.providerId}
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-muted underline-offset-4 hover:underline"
        >
          Fly as a guest
        </Link>
      </section>
    </main>
  );
}
