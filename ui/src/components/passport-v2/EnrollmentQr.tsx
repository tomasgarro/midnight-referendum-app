import { BarcodeFormat, QRCodeWriter } from '@zxing/library';
import { useMemo } from 'react';

interface EnrollmentQrProps {
  readonly value: string;
  readonly label?: string;
  readonly size?: number;
}

/**
 * Render a real QR matrix with the ZXing encoder already bundled by the UI.
 * SVG keeps the code sharp at any size and does not require a canvas or a
 * server-side image endpoint.
 */
export function EnrollmentQr({
  value,
  label = 'Código QR de verificación',
  size = 256,
}: EnrollmentQrProps) {
  const matrix = useMemo(() => {
    try {
      return new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, size, size, new Map());
    } catch {
      return null;
    }
  }, [size, value]);

  if (!matrix) {
    return <p role="alert">No pudimos generar el código QR. Copiá el enlace para continuar.</p>;
  }

  const width = matrix.getWidth();
  const height = matrix.getHeight();
  let path = '';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (matrix.get(x, y)) path += `M${x} ${y}h1v1H${x}z`;
    }
  }

  return (
    <svg
      aria-label={label}
      className="passport-enrollment-qr"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
    >
      <title>{label}</title>
      <rect width={width} height={height} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
