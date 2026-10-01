import type { MarketingCategory, MarketingStatus } from "./definitions";

export type MarketingLangBlock = {
  title?: string;
  content?: string;
  hashtags?: string;
};

export type SalesMarketingMaterial = {
  id: string;
  category: MarketingCategory | string;
  status: MarketingStatus | string;
  mediaType?: "image" | "video" | string;
  mediaUrl?: string;
  /** Language packs */
  en?: MarketingLangBlock;
  hi?: MarketingLangBlock;
  gu?: MarketingLangBlock;
  /** Fallback single-language fields */
  title?: string;
  content?: string;
  hashtags?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
