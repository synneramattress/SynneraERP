/** Designs module — Rates / Announcements-style structure */

export type {
  DesignSlide,
  DesignOption,
  DesignGalleryItem,
  DesignStatus,
  DesignCatalogue,
  DesignPhoto,
  Design,
  FabricType,
} from "./designTypes";

export {
  DESIGN_CATALOGUES_COLLECTION,
  DESIGNS_LEGACY_COLLECTION,
  DESIGN_FABRIC_KEYS,
  DESIGN_FABRIC_LABELS,
  DESIGN_STATUS_ACTIVE,
  DESIGN_STATUS_INACTIVE,
} from "./designDefinitions";

export {
  normalizeFabric,
  isCatalogueActive,
  activePhotos,
  resolveCataloguePhotos,
  catalogueToSlide,
  mapLegacyDesignDoc,
  sortDesignOptions,
  filterCataloguesByFabric,
} from "./logic";

export {
  fetchAllCatalogues,
  fetchCatalogueById,
  fetchActiveDesignSlides,
  fetchActiveDesignOptions,
  fetchDesignGalleryByFabric,
  saveDesignCatalogue,
  setDesignCatalogueStatus,
  deleteDesignCatalogue,
} from "./services/designsService";

export { downloadDesignCataloguePdf, getDesignCataloguePdfBlob, buildDesignCataloguePdfDoc } from "./utils/cataloguePdf";
