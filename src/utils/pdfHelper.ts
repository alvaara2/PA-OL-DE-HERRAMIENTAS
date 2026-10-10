/**
 * Generates a valid, minimal standalone PDF data URL for official calibration certificates
 */
export function generateSampleCalibrationPdf(
  codigoActivo: string,
  instrumento: string,
  numeroCertificado: string,
  entidad: string,
  fechaCal: string,
  fechaVen: string
): string {
  // Clean minimal PDF 1.4 template with vector text
  const content = `BT
/F1 18 Tf
50 750 Td
(CERTIFICADO OFICIAL DE CALIBRACION METROLOGICA) Tj
/F1 11 Tf
0 -30 Td
(Laboratorio Acreditado: ${entidad}) Tj
0 -20 Td
(Norma Tecnica Aplicable: NTP-ISO/IEC 17025:2017) Tj
/F1 12 Tf
0 -40 Td
(DATOS DEL INSTRUMENTO AUDITADO:) Tj
/F1 10 Tf
0 -20 Td
(Codigo de Activo Fisico: ${codigoActivo}) Tj
0 -16 Td
(Descripcion: ${instrumento}) Tj
0 -16 Td
(Numero de Certificado: ${numeroCertificado}) Tj
0 -16 Td
(Fecha de Emision / Calibracion: ${fechaCal}) Tj
0 -16 Td
(Fecha de Proximo Vencimiento: ${fechaVen}) Tj
/F1 12 Tf
0 -40 Td
(DICTAMEN METROLOGICO: CONFORME) Tj
/F1 9 Tf
0 -20 Td
(El instrumento evaluado cumple con los errores maximos tolerados y trazabilidad metrologica.) Tj
0 -15 Td
(Patrones trazables al Sistema Internacional de Unidades INACAL - BIPM.) Tj
0 -50 Td
(Firma y Sello Digital: Director Tecnico de Metrologia e Inspeccion de Calidad) Tj
ET`;

  const streamLength = content.length;

  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300+streamLength 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${380 + streamLength}
%%EOF`;

  try {
    if (typeof window !== 'undefined' && window.btoa) {
      const base64 = window.btoa(unescape(encodeURIComponent(pdfSource)));
      return `data:application/pdf;base64,${base64}`;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Downloads a Base64 PDF data URL as a physical file
 */
export function downloadPdfFromDataUrl(dataUrl: string, filename: string): void {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Error al descargar PDF:', err);
  }
}

/**
 * Checks if a string is a valid web URL (http:// or https://)
 */
export function isWebUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Checks if a URL points to Google Drive / Google Docs
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
}

/**
 * Extracts Google Drive File ID from multiple link variations:
 * - https://drive.google.com/file/d/XYZ/view?usp=sharing
 * - https://drive.google.com/open?id=XYZ
 * - https://drive.google.com/uc?id=XYZ
 * - https://docs.google.com/file/d/XYZ/...
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/{FILE_ID}
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Pattern 2: ?id={FILE_ID} or &id={FILE_ID}
  const matchParamId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchParamId && matchParamId[1]) return matchParamId[1];

  // Pattern 3: /d/{FILE_ID}
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  return null;
}

/**
 * Transforms any Google Drive URL into its official embeddable preview format:
 * https://drive.google.com/file/d/{FILE_ID}/preview
 */
export function formatGoogleDriveEmbedUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const fileId = extractGoogleDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url.trim();
}

/**
 * Returns the URL ready to be displayed in an <iframe>.
 * Automatically transforms Google Drive links to /preview format.
 */
export function getEmbeddableCertificateUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (isGoogleDriveUrl(trimmed)) {
    return formatGoogleDriveEmbedUrl(trimmed);
  }
  return trimmed;
}

/**
 * Returns the canonical original web URL to open in a new tab or browser.
 * For Google Drive, formats as the full view link: https://drive.google.com/file/d/{FILE_ID}/view
 */
export function getOriginalCertificateUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId && isGoogleDriveUrl(trimmed)) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return trimmed;
}

/**
 * Safely opens a certificate in a new browser tab.
 * Works seamlessly with Google Drive URLs, external web links, and Base64 data URLs.
 */
export function openCertificateInNewTab(url: string, filename = 'certificado_calibracion.pdf'): void {
  if (!url) {
    alert('No hay enlace o archivo de certificado configurado.');
    return;
  }

  const trimmed = url.trim();

  // 1. Base64 Data URL: convert to Blob URL to avoid browser security blocking of data: navigation
  if (trimmed.startsWith('data:application/pdf;base64,')) {
    try {
      const base64Data = trimmed.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      return;
    } catch (err) {
      console.warn('Error al abrir dataURL como Blob, intentando descarga directa:', err);
      downloadPdfFromDataUrl(trimmed, filename);
      return;
    }
  }

  // 2. Google Drive or Web URL: open original link
  const originalUrl = getOriginalCertificateUrl(trimmed);
  window.open(originalUrl, '_blank', 'noopener,noreferrer');
}
