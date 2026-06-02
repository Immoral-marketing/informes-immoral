"use client";

export type PdfDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

let loadingTask: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (loadingTask) return loadingTask;
  loadingTask = import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
    return pdfjs;
  });
  return loadingTask;
}

export async function loadPdfFromBytes(
  bytes: Uint8Array
): Promise<PdfDocumentProxy> {
  const pdfjs = await getPdfJs();
  const loadingDoc = pdfjs.getDocument({ data: bytes });
  return loadingDoc.promise;
}
