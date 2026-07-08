import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        "entry": resolve(__dirname, "jsm-org-panel.html"),
        "entry-2": resolve(__dirname, "jsm-request-view-action.html"),
        "entry-3": resolve(__dirname, "jsm-portal-user-menu-action.html"),
      },
    },
  },
});
