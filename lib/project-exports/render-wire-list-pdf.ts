import "server-only";

import { chromium } from "playwright";

export async function renderWireListPdfFromRoute(options: {
  origin: string;
  projectId: string;
  sheetSlug: string;
}): Promise<Uint8Array> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (launchError) {
    const message = launchError instanceof Error ? launchError.message : String(launchError);
    throw new Error(
      `Playwright Chromium browser is not available. Run "npx playwright install chromium" to install it. (${message})`,
    );
  }

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1800 },
      deviceScaleFactor: 1,
    });
    const targetUrl = new URL(
      `/print/project-context/${encodeURIComponent(options.projectId)}/wire-list/${encodeURIComponent(options.sheetSlug)}`,
      options.origin,
    );

    await page.goto(targetUrl.toString(), { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0.25in",
        right: "0.25in",
        bottom: "0.25in",
        left: "0.25in",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}