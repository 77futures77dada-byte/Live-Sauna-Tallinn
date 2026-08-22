import { ImageResponse } from "next/og";

// Placeholder favicon until real branding exists — echoes the ember flame
// mark used next to the wordmark in AppHeader, on the fjord navy ground,
// so the browser tab isn't the default Next.js/Vercel triangle at demos.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e2233",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            background: "#e8632c",
            borderRadius: "50% 50% 50% 0%",
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
