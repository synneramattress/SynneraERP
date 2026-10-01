/**
 * Designs domain pure helpers (map, filter, normalize).
 * No Firestore access.
 */

import type { DesignCatalogue, DesignPhoto, FabricType } from "./designTypes";
import { normalizeFabric as sharedNormalizeFabric } from "@/lib/catalog/fabric";
import {
  DESIGN_FABRIC_KEYS,
  DESIGN_STATUS_ACTIVE,
  DESIGN_STATUS_INACTIVE,
} from "./designDefinitions";
import type { DesignOption, DesignSlide } from "./designTypes";

export function normalizeFabric(raw: unknown): FabricType {
  return sharedNormalizeFabric(raw);
}

export function isCatalogueActive(c: DesignCatalogue): boolean {
  return c.status !== DESIGN_STATUS_INACTIVE;
}

export function activePhotos(photos: DesignPhoto[] | undefined): DesignPhoto[] {
  return (photos || []).filter((p) => p.status !== "inactive" && !!p.imageUrl);
}

/** Ensure photos array + main photo fallback */
export function resolveCataloguePhotos(c: DesignCatalogue): DesignPhoto[] {
  const photos = activePhotos(c.photos);
  if (!photos.length && c.mainPhotoUrl) {
    return [
      {
        id: "main",
        imageUrl: c.mainPhotoUrl,
        status: "active",
        isMain: true,
      },
    ];
  }
  return photos;
}

export function catalogueToSlide(c: DesignCatalogue): DesignSlide | null {
  if (!isCatalogueActive(c)) return null;
  const photos = resolveCataloguePhotos(c);
  if (!photos.length) return null;
  const main = photos.find((p) => p.isMain) || photos[0];
  return {
    url: main.imageUrl,
    designCode: c.designCode || "",
    designName: c.designName || "",
    fabric: String(c.fabric || ""),
    photos,
  };
}

export function mapLegacyDesignDoc(
  id: string,
  x: Record<string, unknown>
): DesignCatalogue {
  const photo = x.imageUrl
    ? [
        {
          id: "main",
          imageUrl: String(x.imageUrl),
          status: "active" as const,
          isMain: true,
        },
      ]
    : [];
  const inactive =
    x.isActive === false || String(x.status || "").toLowerCase() === "inactive";
  return {
    id,
    fabric: normalizeFabric(x.fabric),
    designCode: String(
      x.code || x.designCode || id.slice(0, 6).toUpperCase()
    ),
    designName: String(x.name || x.designName || "Design"),
    status: inactive ? DESIGN_STATUS_INACTIVE : DESIGN_STATUS_ACTIVE,
    photos: photo,
    mainPhotoUrl: x.imageUrl ? String(x.imageUrl) : undefined,
  };
}

export function sortDesignOptions(options: DesignOption[]): DesignOption[] {
  return [...options].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  );
}

export function filterCataloguesByFabric(
  catalogues: DesignCatalogue[],
  fabric: string
): DesignCatalogue[] {
  const f = fabric.toLowerCase();
  return catalogues.filter(
    (c) => isCatalogueActive(c) && String(c.fabric).toLowerCase() === f
  );
}
