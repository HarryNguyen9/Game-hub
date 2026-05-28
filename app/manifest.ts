import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GameHub",
    short_name: "GameHub",
    description: "A friendly multiplayer game hub",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff7a90",
    icons: [
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
