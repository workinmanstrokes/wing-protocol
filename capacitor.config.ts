import type { CapacitorConfig } from "@capacitor/cli";

// Android wrapper around the static SPA build (BUILD_TARGET=capacitor -> dist/client).
const config: CapacitorConfig = {
  appId: "com.diddlerrr.wingprotocol",
  appName: "Wing Protocol",
  webDir: "dist/client",
  backgroundColor: "#09090b",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
