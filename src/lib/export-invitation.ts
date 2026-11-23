import { jsPDF } from "jspdf";

export const EXPORT_HIDE_IMAGE = "export-hide-image";
export const EXPORT_HIDE_PDF = "export-hide-pdf";
export const EXPORT_LOCATION_LINK = "export-location-link";

export interface PdfCardExportItem {
  element: HTMLElement;
  mapUrl?: string | null;
}

export function triggerFileDownload(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "-");
}

export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const { toPng } = await import("html-to-image");

  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font readiness check is unavailable
    }
  }

  const dataUrl = await toPng(element, {
    pixelRatio: 2.5,
    cacheBust: true,
    filter: (domNode) => {
      const el = domNode as HTMLElement;
      if (el.classList && el.classList.contains(EXPORT_HIDE_IMAGE)) {
        return false;
      }
      return true;
    },
  });

  triggerFileDownload(dataUrl, filename);
}

export async function generateMultiPagePdf(
  cards: PdfCardExportItem[],
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const { toJpeg } = await import("html-to-image");

  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font readiness check is unavailable
    }
  }

  const PDF_WIDTH = 540;
  const PDF_HEIGHT = 960;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [PDF_WIDTH, PDF_HEIGHT],
  });

  const total = cards.length;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);
    const item = cards[i];

    if (i > 0) {
      pdf.addPage([PDF_WIDTH, PDF_HEIGHT], "portrait");
    }

    // Capture card image omitting elements marked with EXPORT_HIDE_PDF
    const imgData = await toJpeg(item.element, {
      quality: 0.94,
      pixelRatio: 2.2,
      cacheBust: true,
      filter: (domNode) => {
        const el = domNode as HTMLElement;
        if (el.classList && el.classList.contains(EXPORT_HIDE_PDF)) {
          return false;
        }
        return true;
      },
    });

    pdf.addImage(imgData, "JPEG", 0, 0, PDF_WIDTH, PDF_HEIGHT, undefined, "FAST");

    // If mapUrl is present, calculate location button bounds and create PDF hyperlink
    if (item.mapUrl && item.mapUrl.trim()) {
      const linkEl = item.element.querySelector(
        `.${EXPORT_LOCATION_LINK}`
      ) as HTMLElement | null;

      if (linkEl) {
        const cardRect = item.element.getBoundingClientRect();
        const linkRect = linkEl.getBoundingClientRect();

        if (cardRect.width > 0 && cardRect.height > 0) {
          const relX = (linkRect.left - cardRect.left) / cardRect.width;
          const relY = (linkRect.top - cardRect.top) / cardRect.height;
          const relW = linkRect.width / cardRect.width;
          const relH = linkRect.height / cardRect.height;

          const pdfX = relX * PDF_WIDTH;
          const pdfY = relY * PDF_HEIGHT;
          const pdfW = relW * PDF_WIDTH;
          const pdfH = relH * PDF_HEIGHT;

          pdf.link(pdfX, pdfY, pdfW, pdfH, { url: item.mapUrl.trim() });
        }
      }
    }
  }

  pdf.save(filename);
}
