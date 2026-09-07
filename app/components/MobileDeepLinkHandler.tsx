"use client";

import { useEffect } from "react";

// Deep-link natif (chantier comptes hôtes, phase 3).
// Quand un App Link / Universal Link ouvre l'app native (ex. le magic link
// https://usegather.app/auth/confirm?code=…), Capacitor émet `appUrlOpen` mais
// ne navigue pas la webview. On route donc nous-mêmes vers le chemin interne, où
// la route /auth/confirm échange le code contre une session (dans la même webview,
// même origine usegather.app → le verifier PKCE en cookie est disponible).
// No-op complet sur le web (isNativePlatform() = false).
export function MobileDeepLinkHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", ({ url }) => {
          try {
            const parsed = new URL(url);
            // On ne route que les liens internes d'auth (jamais une URL arbitraire).
            if (parsed.pathname.startsWith("/auth/")) {
              window.location.href = parsed.pathname + parsed.search;
            }
          } catch {
            // URL non parsable : on ignore.
          }
        });
        cleanup = () => {
          void handle.remove();
        };
      } catch {
        // @capacitor/app indisponible (contexte web) : no-op.
      }
    })();

    return () => cleanup?.();
  }, []);

  return null;
}
