// Configuration Capacitor minimaliste pour la sortie Next.js mobile
// Typée localement pour éviter la dépendance au CLI pendant les builds.
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
};

const config = {
  appId: "com.usegather.app",
  appName: "Usegather",
  webDir: "www",
  bundledWebRuntime: false,
} satisfies CapacitorConfig;

export default config;
