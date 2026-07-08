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
        "entry": resolve(__dirname, "jira-ui-modifications.html"),
      },
    },
  },
});
