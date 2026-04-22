/**
 * Structured PDF text extraction utilities for layout parsing.
 * Captures text content along with page and item coordinates.
 */

import type { LayoutPdfTextItem, LayoutPdfTextSource } from "@/lib/wire-length/parse-layout-pdf";

const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

interface PdfTextContentItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

interface PdfPageProxy {
  getTextContent: () => Promise<{ items: PdfTextContentItem[] }>;
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (num: number) => Promise<PdfPageProxy>;
}

interface BrowserPdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PdfDocumentProxy> };
}

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<PdfDocumentProxy>;
      };
    };
  }
}

export async function loadBrowserPdfJs(): Promise<BrowserPdfJsLib> {
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN_URL;
    script.async = true;

    script.onload = () => {
      setTimeout(() => {
        if (!window.pdfjsLib) {
          reject(new Error("PDF.js failed to initialize"));
          return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(window.pdfjsLib);
      }, 100);
    };

    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

export async function extractStructuredPdfText(file: File): Promise<LayoutPdfTextSource> {
  const pdfjsLib = await loadBrowserPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const items: LayoutPdfTextItem[] = [];
  const pageText: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageItems = textContent.items
      .map((item) => {
        const text = item.str?.trim() ?? "";
        if (!text) {
          return null;
        }

        const transform = Array.isArray(item.transform) ? item.transform : [];
        return {
          text,
          pageNumber: pageNum,
          x: Number(transform[4] ?? 0),
          y: Number(transform[5] ?? 0),
          width: item.width,
          height: item.height,
        } satisfies LayoutPdfTextItem;
      })
      .filter((item): item is LayoutPdfTextItem => Boolean(item));

    items.push(...pageItems);
    pageText.push(pageItems.map((item) => item.text).join("\n"));
  }

  return {
    text: pageText.join("\n"),
    items,
    totalPages: pdf.numPages,
  };
}