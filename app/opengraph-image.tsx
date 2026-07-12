import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_SLOGAN } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Satori (le moteur de rendu de next/og) ne décode pas le WebP : on utilise
  // le mark carré déjà exporté en PNG pour app/icon.png.
  const logoBuffer = await readFile(join(process.cwd(), "public", "uam-mark.png"));
  const logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(160deg, #00a8e3 0%, #00a8e3 45%, #9c4c36 45%, #9c4c36 100%)",
        color: "white",
        fontFamily: "sans-serif",
        padding: 80,
        textAlign: "center",
      }}
    >
      <img
        src={logoDataUrl}
        alt=""
        width={140}
        height={140}
        style={{
          borderRadius: 24,
          marginBottom: 32,
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        }}
      />
      <div style={{ fontSize: 60, fontWeight: 700, display: "flex" }}>{SITE_NAME}</div>
      <div
        style={{
          fontSize: 28,
          marginTop: 24,
          opacity: 0.95,
          display: "flex",
          maxWidth: 900,
        }}
      >
        {SITE_SLOGAN}
      </div>
    </div>,
    { ...size }
  );
}
