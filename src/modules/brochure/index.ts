/** Brochure module — Rates / Announcements-style structure */

export type { CompanyBrochure } from "./brochureTypes";

export {
  BROCHURE_COLLECTION,
  BROCHURE_DOC_ID,
  BROCHURE_IMAGEKIT_FOLDER,
  BROCHURE_MAX_BYTES,
  BROCHURE_MAX_MB,
} from "./brochureDefinitions";

export { isPdfFile, validateBrochureFile } from "./logic";

export {
  fetchCurrentBrochure,
  uploadBrochurePdf,
  deleteCurrentBrochure,
} from "./services/brochureService";
