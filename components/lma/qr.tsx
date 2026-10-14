"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Ink-on-white QR as inline SVG. */
export function QR({ value, size = 240 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0B0B0C", light: "#FFFFFF" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [value]);
  return <div className="lma-qr" style={{ width: size }} role="img" aria-label={`QR code for ${value}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
