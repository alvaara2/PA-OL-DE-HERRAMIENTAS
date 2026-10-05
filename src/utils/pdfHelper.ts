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
