import QRCode from 'qrcode';

/**
 * Generates a high-quality dataURL for a physical asset code
 */
export async function generateQrDataUrl(code: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(code, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code for', code, err);
    // Return empty fallback
    return '';
  }
}

/**
 * Cache for generated QR codes to avoid re-rendering
 */
const qrCache = new Map<string, string>();

export async function getCachedQrDataUrl(code: string): Promise<string> {
  if (qrCache.has(code)) {
    return qrCache.get(code)!;
  }
  const url = await generateQrDataUrl(code);
  qrCache.set(code, url);
  return url;
}
