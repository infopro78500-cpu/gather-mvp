import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gather.mvp",
  appName: "Gather",
  webDir: "public",
  bundledWebRuntime: false,
  server: {
    // ⚠️ Mets ici ton URL Vercel en prod
  url: "https://gather-mvp.vercel.app",
    androidScheme: "https",
  },
};

export default config;

