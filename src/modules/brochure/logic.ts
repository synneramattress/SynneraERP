/**
 * Brochure domain helpers (validate file).
 * No Firestore / ImageKit calls here.
 */

import { BROCHURE_MAX_BYTES, BROCHURE_MAX_MB } from "./brochureDefinitions";

export function isPdfFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function validateBrochureFile(file: File): string | null {
  if (!isPdfFile(file)) {
    return "Please upload a PDF file.";
  }
  if (file.size > BROCHURE_MAX_BYTES) {
    return `PDF must be under ${BROCHURE_MAX_MB} MB.`;
  }
  return null;
}
