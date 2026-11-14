/**
 * The event-day card as a real PDF file (docs/SPEC.md 11.7): A5 portrait, black on white, the same
 * content as the card on screen (name, label, date, three "first, then" steps, one technique,
 * the disclaimer). Built in the browser with jsPDF (MIT, github.com/parallax/jsPDF), loaded only
 * when the parent taps "Download PDF". Text goes in already rendered (name filled in).
 */
export interface CardPdfInput {
  title: string; // "Mia's big day"
  subtitle: string; // "Dentist visit · Thu, Nov 19"
  steps: [string, string, string];
  technique: { label: string; how: string };
  footnote: string;
}

/** The built-in PDF fonts cover Latin-1 only: straighten quotes and dashes, drop anything else. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
}

export async function buildCardPdf(input: CardPdfInput): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const W = 148;
  const M = 12;
  const inner = W - 2 * M;
  let y = M + 4;

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(M - 4, M - 4, W - 2 * (M - 4), 210 - 2 * (M - 4), 4, 4);

  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(pdfSafe(input.subtitle), M, y);
  y += 9;
  doc.setFont('helvetica', 'bold').setFontSize(22);
  doc.text(pdfSafe(input.title), M, y);
  y += 7;
  doc.setFontSize(12);
  doc.text('First, then. One step at a time.', M, y);
  y += 9;

  const lead = ['First: ', 'Then: ', 'And then: '];
  input.steps.forEach((s, i) => {
    doc.setFont('helvetica', 'bold').setFontSize(15);
    const lines = doc.splitTextToSize(pdfSafe(lead[i] + s), inner - 16) as string[];
    const h = Math.max(16, lines.length * 6.2 + 8);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, inner, h, 3, 3);
    doc.circle(M + 7, y + h / 2, 4.2);
    doc.text(String(i + 1), M + 7, y + h / 2 + 1.8, { align: 'center' });
    doc.text(lines, M + 15, y + (h - (lines.length - 1) * 6.2) / 2 + 2); // vertically centred in the box
    y += h + 4;
  });

  y += 2;
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text('If it feels hard', M + 4, y + 6);
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(pdfSafe(input.technique.label), M + 4, y + 12.5);
  doc.setFont('helvetica', 'normal').setFontSize(12);
  const how = doc.splitTextToSize(pdfSafe(input.technique.how), inner - 8) as string[];
  doc.text(how, M + 4, y + 19);
  const boxH = 19 + how.length * 5.2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(M, y, inner, boxH, 3, 3);
  doc.setLineDashPattern([], 0);
  y += boxH + 8;

  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(pdfSafe(input.footnote), inner) as string[], M, Math.min(y, 196));
  return doc.output('arraybuffer');
}

/** Saves the file through a temporary link: a download, not the print window. */
export function saveFile(data: ArrayBuffer, name: string, type = 'application/pdf'): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
