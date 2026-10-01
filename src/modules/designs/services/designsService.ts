import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { DesignCatalogue } from "../designTypes";
import {
  DESIGN_CATALOGUES_COLLECTION,
  DESIGNS_LEGACY_COLLECTION,
} from "../designDefinitions";
import {
  catalogueToSlide,
  filterCataloguesByFabric,
  isCatalogueActive,
  mapLegacyDesignDoc,
  resolveCataloguePhotos,
  sortDesignOptions,
} from "../logic";
import type {
  DesignGalleryItem,
  DesignOption,
  DesignSlide,
} from "../designTypes";

export type { DesignSlide, DesignOption, DesignGalleryItem };

function mapCatalogueDoc(
  id: string,
  data: DesignCatalogue
): DesignCatalogue {
  return { ...data, id, photos: data.photos || [] };
}

export async function fetchAllCatalogues(): Promise<DesignCatalogue[]> {
  const snap = await getDocs(collection(db, DESIGN_CATALOGUES_COLLECTION));
  const rows = snap.docs.map((d) =>
    mapCatalogueDoc(d.id, d.data() as DesignCatalogue)
  );
  if (rows.length) return rows;

  const legacy = await getDocs(collection(db, DESIGNS_LEGACY_COLLECTION));
  return legacy.docs.map((d) =>
    mapLegacyDesignDoc(d.id, d.data() as Record<string, unknown>)
  );
}

export async function fetchCatalogueById(
  id: string
): Promise<DesignCatalogue | null> {
  const snap = await getDoc(doc(db, DESIGN_CATALOGUES_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapCatalogueDoc(snap.id, snap.data() as DesignCatalogue);
}

export async function fetchActiveDesignSlides(): Promise<DesignSlide[]> {
  const catalogues = await fetchAllCatalogues();
  const list: DesignSlide[] = [];
  catalogues.forEach((c) => {
    const slide = catalogueToSlide(c);
    if (slide) list.push(slide);
  });
  return list;
}

export async function fetchActiveDesignOptions(): Promise<DesignOption[]> {
  const catalogues = await fetchAllCatalogues();
  const result: DesignOption[] = [];
  catalogues.forEach((c) => {
    if (isCatalogueActive(c) && c.designCode) {
      result.push({ code: c.designCode, name: c.designName || "" });
    }
  });
  if (result.length) return sortDesignOptions(result);

  const legacy = await getDocs(collection(db, DESIGNS_LEGACY_COLLECTION));
  const legacyOpts = legacy.docs
    .map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        code: String(x.code || x.designCode || ""),
        name: String(x.name || x.designName || ""),
      };
    })
    .filter((x) => x.code);
  return sortDesignOptions(legacyOpts);
}

export async function fetchDesignGalleryByFabric(
  fabric: string
): Promise<DesignGalleryItem[]> {
  const items: DesignGalleryItem[] = [];
  const cats = filterCataloguesByFabric(await fetchAllCatalogues(), fabric);
  cats.forEach((c) => {
    const photos = resolveCataloguePhotos(c);
    photos.forEach((p) =>
      items.push({
        url: p.imageUrl,
        title: `${c.designCode} ${c.designName}`,
      })
    );
  });

  if (!items.length) {
    const legacy = await getDocs(collection(db, DESIGNS_LEGACY_COLLECTION));
    legacy.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      if (
        x.isActive !== false &&
        String(x.status || "").toLowerCase() !== "inactive" &&
        String(x.fabric || "").toLowerCase() === fabric.toLowerCase() &&
        x.imageUrl
      ) {
        items.push({
          url: String(x.imageUrl),
          title: String(x.name || x.code || "Design"),
        });
      }
    });
  }
  return items;
}

export async function saveDesignCatalogue(
  id: string | null,
  payload: Record<string, unknown>
): Promise<string> {
  if (id) {
    try {
      await updateDoc(doc(db, DESIGN_CATALOGUES_COLLECTION, id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      return id;
    } catch {
      /* fall through to create */
    }
  }
  const ref = await addDoc(collection(db, DESIGN_CATALOGUES_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setDesignCatalogueStatus(
  id: string,
  active: boolean
): Promise<void> {
  const status = active ? "active" : "inactive";
  try {
    await updateDoc(doc(db, DESIGN_CATALOGUES_COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await updateDoc(doc(db, DESIGNS_LEGACY_COLLECTION, id), {
      isActive: active,
      status,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function deleteDesignCatalogue(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DESIGN_CATALOGUES_COLLECTION, id));
  } catch {
    await deleteDoc(doc(db, DESIGNS_LEGACY_COLLECTION, id));
  }
}
