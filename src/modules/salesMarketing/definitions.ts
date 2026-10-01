export const SALES_MARKETING_COLLECTION = "salesMarketingMaterials";

export const MARKETING_CATEGORIES = [
  "Product",
  "Offer",
  "Festival",
  "Brand",
  "Educational",
  "Other",
] as const;

export type MarketingCategory = (typeof MARKETING_CATEGORIES)[number];

export const MARKETING_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "archived",
] as const;

export type MarketingStatus = (typeof MARKETING_STATUSES)[number];
