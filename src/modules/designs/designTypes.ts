/**
 * Designs domain types — owned by modules/designs
 */

import type { FabricType } from "@/lib/catalog/fabric";
export type { FabricType };

export type DesignStatus = "active" | "inactive";

export interface DesignPhoto {
  id: string;
  imageKitFileId?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  status: "active" | "inactive";
  sortOrder?: number;
  isMain?: boolean;
  createdAt?: unknown;
}

export interface DesignCatalogue {
  id: string;
  fabric: FabricType;
  designCode: string;
  designName: string;
  status: "active" | "inactive";
  mainPhotoId?: string;
  mainPhotoUrl?: string;
  photos: DesignPhoto[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Legacy design document shape */
export interface Design {
  id: string;
  code: string;
  name: string;
  description?: string;
  mattressType?: string;
  fabric?: string;
  material?: string;
  color?: string;
  tags?: string[];
  imageUrl?: string;
  imageFileId?: string;
  thumbnail?: string;
  images?: string[];
  images360?: string[];
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DesignSlide = {
  url: string;
  designCode: string;
  designName: string;
  fabric: string;
  photos: DesignPhoto[];
};

export type DesignOption = {
  code: string;
  name: string;
};

export type DesignGalleryItem = {
  url: string;
  title: string;
};
