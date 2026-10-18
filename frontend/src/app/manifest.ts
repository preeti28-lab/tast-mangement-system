import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskFlow – Task Management",
    short_name: "TaskFlow",
    description: "Create, assign and track your team's tasks.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
