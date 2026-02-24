import qrcode from "qrcode-generator";

interface QRCodeProps {
  url: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export default function QRCode({ url, size = 44, bgColor = "#D4AF37", fgColor = "#0A0C10" }: QRCodeProps) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = size / moduleCount;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 6, background: bgColor }}>
      {Array.from({ length: moduleCount }, (_, row) =>
        Array.from({ length: moduleCount }, (_, col) =>
          qr.isDark(row, col) ? (
            <rect
              key={`${row}-${col}`}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}
