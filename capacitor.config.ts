// Configuration Capacitor. Typée localement pour éviter la dépendance au CLI
// pendant les builds web.
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
  };
};

const config = {
  appId: "com.usegather.app",
  appName: "Usegather",
  webDir: "www",
  bundledWebRuntime: false,
  // L'app Next a des routes serveur (auth, gates hôtes, API) → elle NE PEUT PAS
  // être exportée en statique. L'app native charge donc le site live : c'est une
  // coque autour de usegather.app. L'auth marche nativement (même origine), et les
  // App Links (Android) / Universal Links (iOS) font ouvrir l'app par le magic link.
  server: {
    url: "https://usegather.app",
    androidScheme: "https",
  },
} satisfies CapacitorConfig;

export default config;
