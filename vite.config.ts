import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const base = process.env.VITE_BASE_URL?.replace(/\/?$/, "/") ?? "/";

export default defineConfig(() => {
  const siteUrl = (process.env.VITE_SITE_URL ?? "http://localhost:8080/").replace(
    /\/?$/,
    "/",
  );

  const routes = ["merge", "split", "rearrange", "compress"];
  const sitemapUrls = [siteUrl, ...routes.map((r) => `${siteUrl}${r}`)];

  return {
    base,
    server: { host: "::", port: 8080 },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "seo",
        transformIndexHtml(html) {
          return html.replaceAll("__SITE_URL__", siteUrl);
        },
        generateBundle() {
          const body = sitemapUrls
            .map((loc) => {
              const priority = loc.endsWith("/") ? "1.0" : "0.8";
              return `  <url>
    <loc>${loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
            })
            .join("\n");
          this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`,
          });
        },
        writeBundle(options) {
          const robots = path.join(options.dir ?? "dist", "robots.txt");
          if (fs.existsSync(robots)) {
            fs.appendFileSync(robots, `\nSitemap: ${siteUrl}sitemap.xml\n`);
          }
        },
      },
    ],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
  };
});
