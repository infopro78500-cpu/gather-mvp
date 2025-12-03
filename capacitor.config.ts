type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url?: string;
    androidScheme?: string;
  };
};

const config: CapacitorConfig = {
  appId: "com.gather.mvp",
  appName: "Gather",
  webDir: "public",
  server: {
    url: "https://gather-mvp.vercel.app",
    androidScheme: "https",
  },
};

export default config;
