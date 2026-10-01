"use client";

/**
 * Salesperson Assisted Order — multi-step wizard.
 * Steps/rules/design→fabric/speech: party order.
 * Button chrome: retail-style (large rounded purple).
 * Pricing: party rates. No commission. Regular Salary only.
 */

import { T, useLanguage } from "@/i18n";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAssignedPartiesForSalesperson,
  fetchLastAssistedOrderForParty,
  cloneItemsForReorder,
  saveAssistedPartyOrder,
  buildAssistedWhatsAppText,
  type AssignedPartyRow,
  type LastAssistedOrderSummary,
} from "@/modules/sales";
import type { OrderReceivedVia } from "@/modules/orders";
import {
  formatOrderItemSize,
  ORDER_MATTRESS_TYPE_LABELS,
  standardThicknessOptions,
  warrantyOptionsForItem,
  validateOrderItems,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
  normalizeItemAfterChange,
  effectiveThicknessInches,
  isCustomThicknessValid,
  getAllowedThicknessRange,
  customThicknessInvalidMessage,
  mattressTypeKeyFromLabel,
} from "@/modules/orders";
import type { OrderItem } from "@/modules/orders";
import { fetchActiveDesignSlides, type DesignSlide } from "@/modules/designs";
import {
  fabricsForMattressType,
  normalizeFabric,
  FABRIC_LABELS,
  type FabricType,
} from "@/lib/catalog/fabric";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { REGULAR_SIZES } from "@/lib/utils";
import {
  fetchMasterRates,
  fetchRateSettings,
  fetchJobWorkRates,
  lookupJobWorkRate,
  withJobWorkPricing,
  withJobWorkPricingFromItem,
  normalizeJobWorkThicknessFromItem,
  isJobWorkCustomThicknessValid,
  jobWorkCustomThicknessInvalidMessage,
  JOB_WORK_CUSTOM_THICKNESS_MIN,
  JOB_WORK_CUSTOM_THICKNESS_MAX,
} from "@/modules/rates";
import { hasJobWorkCapability } from "@/modules/parties";
import { computeItemSquareFeet } from "@/lib/mattress/calculations";
import {
  withItemPricing,
  sumOrderAmount,
  formatAmountINR,
  isDistributorParty,
  type PartyRateContext,
} from "@/lib/mattress";
import { MeasureField, usePreloadMeasureIcons } from "@/components/shared/MeasureField";
import {
  MattressTypeIcon,
  usePreloadMattressIcons,
} from "@/components/mattress/MattressTypeIcon";
import { WizardSpeechButton } from "@/components/shared/WizardSpeechButton";
import { whatsappHref } from "@/lib/phoneLinks";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Trash2,
  Search,
} from "lucide-react";

type Step =
  | "party"
  | "item_type"
  | "mattress"
  | "warranty"
  | "size"
  | "custom_size"
  | "thickness"
  | "design"
  | "fabric_type"
  | "quantity"
  | "basket"
  | "preview"
  | "success";

/** Progress steps for Regular (no item_type). Job Work path is built dynamically. */
const STEP_ORDER_REGULAR: Step[] = [
  "mattress",
  "warranty",
  "size",
  "thickness",
  "design",
  "quantity",
  "basket",
  "preview",
];

function buildAssistedStepOrder(
  canJobWork: boolean,
  draft: { itemType?: string; fabricSource?: string }
): Step[] {
  const isJw = draft.itemType === "JOB_WORK";
  const partyFab = isJw && draft.fabricSource === "PARTY";
  const steps: Step[] = [];
  if (canJobWork) steps.push("item_type");
  steps.push("mattress");
  if (!isJw) steps.push("warranty");
  steps.push("size", "thickness");
  if (partyFab) steps.push("fabric_type");
  else steps.push("design");
  steps.push("quantity", "basket", "preview");
  return steps;
}

function assistedAfterThickness(draft: { itemType?: string; fabricSource?: string }): "design" | "fabric_type" {
  if (draft.itemType === "JOB_WORK" && draft.fabricSource === "PARTY") return "fabric_type";
  return "design";
}

type DraftItem = Partial<OrderItem> & { fabric?: string };

const ORDER_RECEIVED_VIA_OPTIONS: { key: OrderReceivedVia; label: string }[] = [
  { key: "PHONE_CALL", label: "Phone call" },
  { key: "WHATSAPP_TEXT", label: "WhatsApp text" },
  { key: "WHATSAPP_VOICE", label: "WhatsApp voice" },
  { key: "WHATSAPP_PHOTO", label: "WhatsApp photo" },
  { key: "SALES_VISIT", label: "Sales visit" },
  { key: "OTHER", label: "Other" },
];


function sizeLabel(s: string) {
  return s.replace(/\s*in\s*$/i, "").trim();
}

function fabricOf(item: Partial<OrderItem> & { fabric?: string }) {
  if (item.fabric) return item.fabric;
  const m = item.notes?.match(/^\[([^\]]+)\]/);
  return m?.[1] || "";
}

function Progress({ step, steps }: { step: Step; steps: Step[] }) {
  const order = steps.length ? steps : STEP_ORDER_REGULAR;
  const idx = order.indexOf(step);
  if (idx < 0) return null;
  return (
    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
      {order.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              i < idx
                ? "bg-[#330066] text-white"
                : i === idx
                  ? "bg-[#330066] text-white ring-4 ring-[#330066]/20"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {i < idx ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          {i < order.length - 1 && (
            <div
              className={`h-0.5 w-2.5 shrink-0 ${
                i < idx ? "bg-[#330066]" : "bg-slate-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StickyNav({
  onBack,
  onNext,
  nextLabel,
  backLabel,
  nextDisabled,
  backDisabled,
  hideNext,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: React.ReactNode;
  backLabel?: React.ReactNode;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  hideNext?: boolean;
}) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-3 safe-area-pb">
      <div className="max-w-3xl mx-auto flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 bg-white disabled:opacity-40"
        >
          {backLabel || <T>Back</T>}
        </button>
        {!hideNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="flex-1 py-3.5 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-40"
          >
            {nextLabel || <T>Next</T>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AssistedOrderPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  usePreloadMattressIcons();
  usePreloadMeasureIcons();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPartyId = searchParams?.get("partyId") || "";

  const compensationType = String(
    user?.compensationType || "REGULAR_SALARY"
  ).toUpperCase();
  const isRegularSalary = compensationType !== "COMMISSION_ONLY";

  const [step, setStep] = useState<Step>("party");
  const [parties, setParties] = useState<AssignedPartyRow[]>([]);
  const [partySearch, setPartySearch] = useState("");
  const [jobWorkRates, setJobWorkRates] = useState<Record<string, number>>({});
  const [selectedParty, setSelectedParty] = useState<AssignedPartyRow | null>(
    null
  );
  const [items, setItems] = useState<OrderItem[]>([]);
  const [draft, setDraft] = useState<DraftItem>({ quantity: 1 });
  const canJobWork = hasJobWorkCapability(selectedParty);
  const stepOrder = buildAssistedStepOrder(canJobWork, draft);
  const isJobWorkDraft = draft.itemType === "JOB_WORK";
  const [customThickVal, setCustomThickVal] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [designSlides, setDesignSlides] = useState<DesignSlide[]>([]);
  const [rateCtx, setRateCtx] = useState<PartyRateContext>({
    masterRates: {},
    settings: null,
    isDistributor: false,
  });
  const [loadingParties, setLoadingParties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOrderNumber, setSuccessOrderNumber] = useState("");
  const [waHref, setWaHref] = useState<string | null>(null);
  const [orderReceivedVia, setOrderReceivedVia] = useState<OrderReceivedVia | "">("");
  const [lastOrder, setLastOrder] = useState<LastAssistedOrderSummary | null>(null);
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (String(user.role || "").toLowerCase() !== "salesperson") {
      router.replace("/auth/login");
      return;
    }
    if (!isRegularSalary) {
      router.replace("/salesperson/dashboard");
    }
  }, [user, authLoading, isRegularSalary, router]);

  const loadParties = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingParties(true);
    setError("");
    try {
      const list = await fetchAssignedPartiesForSalesperson(user.uid);
      setParties(
        list.filter(
          (p) => String(p.status || "ACTIVE").toUpperCase() !== "INACTIVE"
        )
      );
    } catch (e) {
      console.error(e);
      setError(t("Could not load parties."));
    } finally {
      setLoadingParties(false);
    }
  }, [user?.uid, t]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  useEffect(() => {
    if (!prefillPartyId || !parties.length || selectedParty) return;
    const p = parties.find((x) => x.id === prefillPartyId);
    if (p) {
      setSelectedParty(p);
      const jw = hasJobWorkCapability(p);
      setStep(jw ? "item_type" : "mattress");
    }
  }, [prefillPartyId, parties, selectedParty]);

  useEffect(() => {
    (async () => {
      try {
        setDesignSlides(await fetchActiveDesignSlides());
      } catch {
        setDesignSlides([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedParty) return;
    (async () => {
      try {
        const [rates, settings, jwRates] = await Promise.all([
          fetchMasterRates(),
          fetchRateSettings(),
          fetchJobWorkRates().catch(() => ({})),
        ]);
        setRateCtx({
          masterRates: rates,
          settings,
          isDistributor: isDistributorParty({
            partyCategory: selectedParty.partyCategory,
          }),
        });
        setJobWorkRates(jwRates || {});
      } catch {
        setRateCtx({
          masterRates: {},
          settings: null,
          isDistributor: isDistributorParty({
            partyCategory: selectedParty.partyCategory,
          }),
        });
      }
    })();
  }, [selectedParty]);

  useEffect(() => {
    const hasMaster =
      rateCtx.masterRates && Object.keys(rateCtx.masterRates).length > 0;
    const hasJw = jobWorkRates && Object.keys(jobWorkRates).length > 0;
    if (!hasMaster && !hasJw) return;
    setItems((prev) => {
      if (!prev.length) return prev;
      return prev.map((it) => {
        if (it.itemType === "JOB_WORK") {
          return hasJw
            ? (withJobWorkPricingFromItem(it as any, jobWorkRates) as OrderItem)
            : it;
        }
        return hasMaster
          ? (withItemPricing(it as any, rateCtx) as OrderItem)
          : it;
      });
    });
  }, [rateCtx, jobWorkRates]);

  const thicknessOpts = useMemo(
    () =>
      standardThicknessOptions(
        draft.type,
        isJobWorkDraft ? null : draft.warranty
      ),
    [draft.type, draft.warranty, isJobWorkDraft]
  );
  const customThicknessRange = useMemo(() => {
    if (isJobWorkDraft) {
      return {
        min: JOB_WORK_CUSTOM_THICKNESS_MIN,
        max: JOB_WORK_CUSTOM_THICKNESS_MAX,
      };
    }
    return getAllowedThicknessRange(draft.type, draft.warranty);
  }, [draft.type, draft.warranty, isJobWorkDraft]);
  const warrantyOpts = useMemo(
    () => warrantyOptionsForItem(draft.type, null),
    [draft.type]
  );
  const allowedFabricsForType = useMemo(() => {
    const mKey = mattressTypeKeyFromLabel(draft.type);
    return fabricsForMattressType(mKey || draft.type);
  }, [draft.type]);
  const filteredDesignSlides = useMemo(() => {
    const allowed = new Set<FabricType>(allowedFabricsForType);
    return designSlides.filter((d) => {
      const raw = String(d.fabric || "").trim();
      if (!raw) return false;
      return allowed.has(normalizeFabric(raw));
    });
  }, [designSlides, allowedFabricsForType]);
  const designsByFabric = useMemo(() => {
    return allowedFabricsForType.map((fabKey) => ({
      key: fabKey,
      label: tFabric(fabKey, t) || fabKey,
      items: filteredDesignSlides.filter(
        (d) => normalizeFabric(d.fabric) === fabKey
      ),
    }));
  }, [allowedFabricsForType, filteredDesignSlides]);

  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const totalAmount = useMemo(() => sumOrderAmount(items), [items]);

  const draftPreview = useMemo(() => {
    const isJw = draft.itemType === "JOB_WORK";
    if (!draft.type) return null;
    if (!isJw && !draft.warranty) return null;
    try {
      let item: OrderItem = {
        id: draft.id || "preview",
        type: draft.type,
        sizeType: draft.sizeType || "regular",
        regularSize: draft.regularSize,
        length: draft.length,
        width: draft.width,
        height: draft.height,
        thickness: draft.thickness,
        quantity: Math.max(1, Number(draft.quantity) || 1),
        notes: draft.notes || "",
        designCode: draft.designCode || "",
        designName: draft.designName || "",
        warranty: isJw ? undefined : String(draft.warranty || ""),
        itemType: isJw ? "JOB_WORK" : "REGULAR",
      };
      const fab = draft.fabric || "";
      if (fab) {
        (item as any).fabric = fab;
      }
      if (!isJw) {
        item = withItemPricing(item as any, rateCtx) as OrderItem;
      }
      return item;
    } catch {
      return null;
    }
  }, [draft, rateCtx]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((p) => {
      const blob =
        `${p.name || ""} ${p.shopName || ""} ${p.city || ""} ${p.contactNumber || p.phone || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [parties, partySearch]);

  const startNewItem = () => {
    setDraft({
      id: crypto.randomUUID(),
      type: "",
      sizeType: "regular",
      quantity: 1,
      notes: "",
      designCode: "",
      designName: "",
      warranty: undefined,
      fabric: "",
      itemType: "REGULAR",
      fabricSource: undefined,
      jobWorkFabricType: undefined,
      jobWorkRate: undefined,
      jobWorkRateSnapshot: undefined,
    });
    setCustomThickVal("");
    // Always restart at item_type when party can do Job Work
    setStep(canJobWork ? "item_type" : "mattress");
  };

  const applyWarrantyNormalize = (item: OrderItem): OrderItem => {
    const inches = effectiveThicknessInches(item);
    const opts = warrantyOptionsForItem(item.type, inches);
    const w =
      opts.find((o) => String(o.key) === String(item.warranty))?.key ||
      opts[0]?.key ||
      item.warranty ||
      "";
    return normalizeItemAfterChange({ ...item, warranty: w }, "warranty");
  };

  const commitDraftToBasket = () => {
    if (!draft.type) {
      setStep("mattress");
      return;
    }
    const isJw = draft.itemType === "JOB_WORK";
    const isPartyFab = isJw && draft.fabricSource === "PARTY";
    if (!isJw && !draft.warranty) {
      alert(t("Please select warranty."));
      setStep("warranty");
      return;
    }
    if (isPartyFab) {
      if (!draft.jobWorkFabricType && !draft.fabric) {
        alert(t("Select Fabric Type"));
        setStep("fabric_type");
        return;
      }
    } else if (!String(draft.designCode || "").trim()) {
      alert(t("Fabric design selection is required."));
      setStep("design");
      return;
    }
    const warrantyForRules = isJw ? null : draft.warranty;
    if (draft.sizeType !== "custom") {
      const allowedTh = standardThicknessOptions(draft.type, warrantyForRules);
      if (!draft.thickness || !allowedTh.includes(draft.thickness)) {
        alert(t("Please select thickness."));
        setStep("thickness");
        return;
      }
    } else {
      const inches =
        draft.height != null ? Number(draft.height) : parseFloat(customThickVal);
      const inchesOk = Number.isFinite(inches) ? inches : null;
      if (isJw) {
        if (!isJobWorkCustomThicknessValid(inchesOk)) {
          alert(t(jobWorkCustomThicknessInvalidMessage()));
          setStep("custom_size");
          return;
        }
      } else if (
        !isCustomThicknessValid(inchesOk, draft.type, warrantyForRules)
      ) {
        alert(t(customThicknessInvalidMessage(draft.type, warrantyForRules)));
        setStep("custom_size");
        return;
      }
    }
    const qty = Math.max(1, Number(draft.quantity) || 1);
    const fabType = (draft.jobWorkFabricType ||
      (draft.fabric ? String(draft.fabric).toLowerCase() : "") ||
      "") as "jacquard" | "cotton" | "rotto" | "";
    let item: OrderItem = {
      id: draft.id || crypto.randomUUID(),
      type: draft.type,
      sizeType: draft.sizeType || "regular",
      regularSize: draft.regularSize,
      length: draft.length,
      width: draft.width,
      height: draft.height,
      thickness: draft.thickness,
      quantity: qty,
      notes: draft.notes || "",
      designCode: isPartyFab ? "" : draft.designCode || "",
      designName: isPartyFab ? "" : draft.designName || "",
      warranty: isJw ? undefined : String(draft.warranty || ""),
      itemType: isJw ? "JOB_WORK" : "REGULAR",
      fabricSource: isJw ? draft.fabricSource : undefined,
      jobWorkFabricType: isJw && fabType ? (fabType as any) : undefined,
    };
    const fab = isPartyFab ? fabType || draft.fabric || "" : draft.fabric || "";
    if (fab) {
      const rest = (item.notes || "").replace(/^\[[^\]]+\]\s*/, "");
      item.notes = rest ? `[${fab}] ${rest}` : `[${fab}]`;
      (item as any).fabric = fab;
    }
    if (!isJw) {
      item = applyWarrantyNormalize(item);
    }
    if (isJw) {
      const th = normalizeJobWorkThicknessFromItem(item);
      const source = (draft.fabricSource || "PARTY") as "PARTY" | "SYNNERA";
      const ft = (fabType || "cotton") as "jacquard" | "cotton" | "rotto";
      const priced = withJobWorkPricing(
        item as any,
        jobWorkRates,
        ft,
        source,
        th
      ) as OrderItem;
      if (priced.rate == null || priced.sqFt == null || priced.amount == null) {
        if (lookupJobWorkRate(jobWorkRates, ft, source, th) == null) {
          alert(t("Job Work Rate") + " — " + t("Rate not available"));
        } else {
          alert(t("Could not calculate size / square feet for this item."));
        }
        return;
      }
      item = priced;
    } else {
      item = withItemPricing(item as any, rateCtx) as OrderItem;
    }
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = item;
        return next;
      }
      return [...prev, item];
    });
    setDraft({ quantity: 1, itemType: "REGULAR" });
    setCustomThickVal("");
    setStep("basket");
  };

  const editItem = (item: OrderItem) => {
    setDraft({
      ...item,
      fabric: fabricOf(item as any),
      quantity: item.quantity || 1,
    });
    setCustomThickVal(
      item.sizeType === "custom" && item.height ? String(item.height) : ""
    );
    setStep("mattress");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const goBack = () => {
    if (step === "party") {
      router.push("/salesperson/dashboard");
      return;
    }
    if (step === "item_type") {
      if (items.length) setStep("basket");
      else {
        setSelectedParty(null);
        setStep("party");
      }
      return;
    }
    if (step === "mattress") {
      if (canJobWork) {
        setStep("item_type");
        return;
      }
      if (items.length) setStep("basket");
      else {
        setSelectedParty(null);
        setStep("party");
      }
      return;
    }
    if (step === "warranty") {
      setStep("mattress");
      return;
    }
    if (step === "size") {
      // Job Work skips warranty
      setStep(isJobWorkDraft ? "mattress" : "warranty");
      return;
    }
    if (step === "custom_size") {
      setStep("size");
      return;
    }
    if (step === "thickness") {
      setStep(draft.sizeType === "custom" ? "custom_size" : "size");
      return;
    }
    if (step === "design" || step === "fabric_type") {
      setStep(draft.sizeType === "custom" ? "custom_size" : "thickness");
      return;
    }
    if (step === "quantity") {
      const isJwParty =
        draft.itemType === "JOB_WORK" && draft.fabricSource === "PARTY";
      setStep(isJwParty ? "fabric_type" : "design");
      return;
    }
    if (step === "basket") {
      if (items.length) setStep("preview");
      else startNewItem();
      return;
    }
    if (step === "preview") {
      setStep("basket");
      return;
    }
  };

  const selectParty = async (p: AssignedPartyRow) => {
    setSelectedParty(p);
    setItems([]);
    setDraft({ quantity: 1 });
    setGeneralNotes("");
    setError("");
    setCustomThickVal("");
    setOrderReceivedVia("");
    setLastOrder(null);
    setLoadingLastOrder(true);
    if (user?.uid) {
      try {
        const last = await fetchLastAssistedOrderForParty(user.uid, p.id);
        setLastOrder(last);
      } catch {
        setLastOrder(null);
      }
    }
    setLoadingLastOrder(false);
    const jw =
      hasJobWorkCapability(p);
    setStep(jw ? "item_type" : "mattress");
  };

  const startReorderFromLast = () => {
    if (!lastOrder?.items?.length) return;
    setItems(cloneItemsForReorder(lastOrder.items));
    setDraft({ quantity: 1 });
    setCustomThickVal("");
    setStep("basket");
  };

  const submitOrder = async () => {
    if (!user?.uid || !selectedParty) return;
    if (!items.length) {
      alert(t("Please add at least one mattress item with quantity 1 or more."));
      setStep("basket");
      return;
    }
    const pricedItems = items.map((it) =>
      it.itemType === "JOB_WORK"
        ? (withJobWorkPricingFromItem(it as any, jobWorkRates) as OrderItem)
        : (withItemPricing(it as any, rateCtx) as OrderItem)
    );
    const validation = validateOrderItems(pricedItems, "submitted");
    if (validation) {
      alert(t(validation) || validation);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const pricedTotal = sumOrderAmount(pricedItems);
      const qty = pricedItems.reduce(
        (s, it) => s + (Number(it.quantity) || 0),
        0
      );
      const result = await saveAssistedPartyOrder({
        party: selectedParty,
        salespersonId: user.uid,
        salespersonName: user.name || "",
        items: pricedItems,
        totalAmount: pricedTotal,
        totalQuantity: qty,
        notes: generalNotes,
        orderReceivedVia: orderReceivedVia || null,
      });
      setSuccessOrderNumber(result.orderNumber || result.orderId);
      const phone =
        selectedParty.whatsappNumber ||
        selectedParty.contactNumber ||
        selectedParty.phone ||
        "";
      const text = buildAssistedWhatsAppText({
        orderNumber: result.orderNumber || "",
        partyName:
          selectedParty.shopName || selectedParty.name || selectedParty.id,
        salespersonName: user.name || "",
        items: pricedItems,
        totalAmount: pricedTotal,
        totalQuantity: qty,
      });
      const href = whatsappHref(phone);
      setWaHref(
        href
          ? `${href}${href.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`
          : null
      );
      setStep("success");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || t("Failed to create order."));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <T>Loading…</T>
      </div>
    );
  }

  if (!isRegularSalary) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === "success") router.push("/salesperson/dashboard");
              else goBack();
            }}
            className="w-10 h-10 rounded-full border bg-white flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 flex-1">
            {step === "basket" ? (
              <T>Order Basket</T>
            ) : step === "preview" ? (
              <T>Preview Order</T>
            ) : step === "success" ? (
              <T>Order Created</T>
            ) : step === "party" ? (
              <T>Assisted Order</T>
            ) : (
              <T>Assisted Order</T>
            )}
          </h1>
        </div>

        {selectedParty && step !== "party" && step !== "success" && (
          <div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-sm space-y-1">
            <p className="text-xs text-slate-500">
              <T>Order for</T>
            </p>
            <p className="font-semibold text-slate-900">
              {selectedParty.shopName || selectedParty.name}
              {selectedParty.city ? (
                <span className="text-slate-500 font-normal">
                  {" "}
                  · {selectedParty.city}
                </span>
              ) : null}
            </p>
            {loadingLastOrder ? (
              <p className="text-xs text-slate-400">
                <T>Loading…</T>
              </p>
            ) : lastOrder ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <p className="text-xs text-slate-500">
                  <T>Last order</T>:{" "}
                  <span className="font-medium text-slate-700">
                    {lastOrder.orderNumber || "—"}
                  </span>
                  {lastOrder.totalQuantity > 0
                    ? ` · ${lastOrder.totalQuantity} pcs`
                    : ""}
                </p>
                {lastOrder.items?.length ? (
                  <button
                    type="button"
                    onClick={startReorderFromLast}
                    className="text-xs font-bold text-[#330066] underline"
                  >
                    <T>Reorder</T>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {step !== "party" && step !== "success" && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Progress step={step} steps={stepOrder} />
            </div>
            <WizardSpeechButton step={step} className="mt-1 shrink-0" />
          </div>
        )}

        {error ? (
          <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">
            {error}
          </div>
        ) : null}

        {/* Party select */}
        {step === "party" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select party</T>
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                placeholder={t("Search party, shop, city…")}
                className="w-full pl-9 pr-3 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-[#330066]"
              />
            </div>
            {loadingParties ? (
              <p className="text-sm text-slate-500">
                <T>Loading…</T>
              </p>
            ) : filteredParties.length === 0 ? (
              <p className="text-sm text-slate-500">
                <T>No assigned parties found.</T>
              </p>
            ) : (
              <div className="space-y-2">
                {filteredParties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectParty(p)}
                    className="w-full text-left rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 hover:border-[#330066]/40"
                  >
                    <p className="font-bold text-slate-900">
                      {p.shopName || p.name || p.id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[p.city, p.contactNumber || p.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {step === "item_type" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select Item Type</T>
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  itemType: "REGULAR",
                  fabricSource: undefined,
                  jobWorkFabricType: undefined,
                }));
                setStep("mattress");
              }}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 bg-white"
            >
              <p className="font-bold"><T>Regular</T></p>
              <p className="text-sm text-slate-500"><T>Normal Synnera sale</T></p>
            </button>
            <div className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white space-y-2">
              <p className="font-bold"><T>Job Work / OEM</T></p>
              <p className="text-sm text-slate-500"><T>Manufacturing / processing</T></p>
              <button
                type="button"
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    itemType: "JOB_WORK",
                    fabricSource: "PARTY",
                    designCode: "",
                    designName: "",
                  }));
                  setStep("mattress");
                }}
                className="w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              >
                • <T>Party Fabric</T>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    itemType: "JOB_WORK",
                    fabricSource: "SYNNERA",
                  }));
                  setStep("mattress");
                }}
                className="w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              >
                • <T>Synnera Fabric</T>
              </button>
            </div>
          </div>
        )}

        {step === "fabric_type" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select Fabric Type</T>
            </p>
            {(["jacquard", "cotton", "rotto"] as const).map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    jobWorkFabricType: ft,
                    fabric: ft,
                  }))
                }
                className={`w-full py-4 rounded-2xl border-2 text-lg font-bold ${
                  draft.jobWorkFabricType === ft || draft.fabric === ft
                    ? "border-[#330066] bg-[#330066]/5 text-[#330066]"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tFabric(ft, t)}
              </button>
            ))}
            <StickyNav
              onBack={() => setStep("thickness")}
              onNext={() => {
                if (!draft.jobWorkFabricType && !draft.fabric) {
                  alert(t("Select Fabric Type"));
                  return;
                }
                setStep("quantity");
              }}
              nextDisabled={!draft.jobWorkFabricType && !draft.fabric}
            />
          </div>
        )}

        {/* Mattress type */}
        {step === "mattress" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select mattress type.</T>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ORDER_MATTRESS_TYPE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      id: d.id || crypto.randomUUID(),
                      type: label,
                      warranty: undefined,
                      thickness: undefined,
                      height: undefined,
                      designCode: "",
                      designName: "",
                      fabric: "",
                    }))
                  }
                  className={`rounded-2xl border-2 p-3 text-center ${
                    draft.type === label
                      ? "border-[#330066] bg-[#330066]/5 ring-2 ring-[#330066]/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mx-auto w-24 h-24 mb-2">
                    <MattressTypeIcon
                      type={label}
                      size={96}
                      className="w-full h-full rounded-xl"
                    />
                  </div>
                  <p className="font-bold text-slate-900">{tMattressType(label, t)}</p>
                </button>
              ))}
            </div>
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (!draft.type) {
                  alert(t("Please select mattress type."));
                  return;
                }
                if (draft.itemType === "JOB_WORK") {
                  setStep("size");
                } else {
                  setStep("warranty");
                }
              }}
              nextDisabled={!draft.type}
            />
          </div>
        )}

        {/* Warranty — Regular items only */}
        {step === "warranty" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select warranty.</T>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {warrantyOpts.map((o) => (
                <button
                  key={String(o.key)}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      warranty: String(o.key),
                      thickness: undefined,
                      height: undefined,
                    }))
                  }
                  className={`py-4 rounded-2xl border-2 text-lg font-bold ${
                    String(draft.warranty) === String(o.key)
                      ? "border-[#330066] bg-[#330066]/5 text-[#330066]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {o.label || `${o.key} yr`}
                </button>
              ))}
            </div>
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (!draft.warranty) {
                  alert(t("Please select warranty."));
                  return;
                }
                setStep("size");
              }}
              nextDisabled={!draft.warranty}
            />
          </div>
        )}

        {/* Size */}
        {step === "size" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Choose Size</T>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {REGULAR_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      sizeType: "regular",
                      regularSize: sz,
                      length: undefined,
                      width: undefined,
                      height: undefined,
                    }))
                  }
                  className={`py-4 px-2 rounded-2xl border-2 text-base font-semibold ${
                    draft.regularSize === sz
                      ? "border-[#330066] bg-[#330066]/5 text-[#330066]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {sizeLabel(sz)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  sizeType: "custom",
                  regularSize: undefined,
                }));
                setStep("custom_size");
              }}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-[#330066]/40 text-[#330066] font-bold bg-[#330066]/5"
            >
              <T>Custom Size</T>
            </button>
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (draft.sizeType !== "custom" && !draft.regularSize) {
                  alert(t("Please select mattress type."));
                  return;
                }
                setCustomThickVal("");
                setStep("thickness");
              }}
              nextDisabled={!draft.regularSize}
            />
          </div>
        )}

        {/* Custom size */}
        {step === "custom_size" && (
          <div className="space-y-4">
            <p className="text-base font-semibold text-slate-800">
              <T>Custom Size</T>
            </p>
            <MeasureField kind="length" label="Length">
              <input
                type="number"
                inputMode="decimal"
                min={60}
                max={108}
                step="0.01"
                value={draft.length ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    length: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full text-center text-lg font-bold py-2 rounded-xl border-2 border-slate-200 focus:border-[#330066] outline-none"
              />
            </MeasureField>
            <MeasureField kind="width" label="Width">
              <input
                type="number"
                inputMode="decimal"
                min={30}
                max={84}
                step="0.01"
                value={draft.width ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    width: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full text-center text-lg font-bold py-2 rounded-xl border-2 border-slate-200 focus:border-[#330066] outline-none"
              />
            </MeasureField>
            <MeasureField
              kind="thickness"
              label="Thickness"
              hint={
                <p className="text-xs text-slate-500">
                  ({customThicknessRange.min}–{customThicknessRange.max} inch){" "}
                  <T>
                    {isJobWorkDraft
                      ? jobWorkCustomThicknessInvalidMessage()
                      : customThicknessInvalidMessage(
                          draft.type,
                          draft.warranty
                        )}
                  </T>
                </p>
              }
            >
              <input
                type="number"
                inputMode={isJobWorkDraft ? "numeric" : "decimal"}
                min={customThicknessRange.min}
                max={customThicknessRange.max}
                step={isJobWorkDraft ? 1 : 0.5}
                value={customThickVal}
                onChange={(e) => {
                  setCustomThickVal(e.target.value);
                  const n = e.target.value ? Number(e.target.value) : undefined;
                  setDraft((d) => ({
                    ...d,
                    height: n,
                    thickness: n != null ? `${n} inch` : undefined,
                  }));
                }}
                className="w-full text-center text-lg font-bold py-2 rounded-xl border-2 border-slate-200 focus:border-[#330066] outline-none"
                placeholder={String(customThicknessRange.min)}
              />
            </MeasureField>
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (!draft.length || !draft.width) return;
                const inches = customThickVal
                  ? parseFloat(customThickVal)
                  : null;
                if (isJobWorkDraft) {
                  if (!isJobWorkCustomThicknessValid(inches)) {
                    alert(t(jobWorkCustomThicknessInvalidMessage()));
                    return;
                  }
                } else if (
                  inches == null ||
                  !isCustomThicknessValid(inches, draft.type, draft.warranty)
                ) {
                  alert(
                    t(customThicknessInvalidMessage(draft.type, draft.warranty))
                  );
                  return;
                }
                setDraft((d) => ({
                  ...d,
                  sizeType: "custom",
                  height: inches as number,
                  thickness: `${inches} inch`,
                }));
                setStep(assistedAfterThickness(draft));
              }}
              nextDisabled={
                !draft.length ||
                !draft.width ||
                !customThickVal ||
                (isJobWorkDraft
                  ? !isJobWorkCustomThicknessValid(
                      parseFloat(customThickVal) || null
                    )
                  : !isCustomThicknessValid(
                      parseFloat(customThickVal) || null,
                      draft.type,
                      draft.warranty
                    ))
              }
            />
          </div>
        )}

        {/* Thickness (regular) */}
        {step === "thickness" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Choose Thickness</T>
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {thicknessOpts.map((th) => {
                const short = th.replace(/\s*inch\s*$/i, '"');
                return (
                  <button
                    key={th}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        thickness: th,
                        height: undefined,
                      }))
                    }
                    className={`py-4 rounded-2xl border-2 text-lg font-bold ${
                      draft.thickness === th
                        ? "border-[#330066] bg-[#330066]/5 text-[#330066]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (!draft.thickness) {
                  alert(t("Please select thickness."));
                  return;
                }
                setStep(assistedAfterThickness(draft));
              }}
              nextDisabled={!draft.thickness}
            />
          </div>
        )}

        {/* Design — fabric auto from design */}
        {step === "design" && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-800">
              <T>Select mattress design.</T>
            </p>
            {designsByFabric.every((g) => g.items.length === 0) ? (
              <p className="text-sm text-slate-500">
                <T>No designs available for this mattress type.</T>
              </p>
            ) : (
              <div className="space-y-4">
                {designsByFabric.map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.key}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {group.items.map((d) => {
                            const selected = draft.designCode === d.designCode;
                            return (
                              <button
                                key={d.designCode}
                                type="button"
                                onClick={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    designCode: d.designCode,
                                    designName: d.designName,
                                    fabric: group.key,
                                  }))
                                }
                                className={`rounded-2xl border-2 overflow-hidden text-left bg-white ${
                                  selected
                                    ? "border-[#330066] ring-2 ring-[#330066]/20"
                                    : "border-slate-200"
                                }`}
                              >
                                <div className="aspect-square bg-slate-100 relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={d.url}
                                    alt={d.designCode}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2">
                                  <p className="font-bold text-sm text-slate-900 truncate">
                                    {d.designCode}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {d.designName}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )
                )}
              </div>
            )}
            <StickyNav
              onBack={goBack}
              onNext={() => {
                if (!draft.designCode) {
                  alert(t("Fabric design selection is required."));
                  return;
                }
                setDraft((d) => ({ ...d, quantity: d.quantity || 1 }));
                setStep("quantity");
              }}
              nextDisabled={!draft.designCode}
            />
          </div>
        )}

        {/* Quantity + rate preview */}
        {step === "quantity" && (
          <div className="space-y-4">
            <p className="text-base font-semibold text-slate-800">
              <T>Select quantity.</T>
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    quantity: Math.max(1, Number(d.quantity || 1) - 1),
                  }))
                }
                className="w-14 h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center"
              >
                <Minus className="w-6 h-6" />
              </button>
              <span className="text-3xl font-bold w-12 text-center">
                {Number(draft.quantity) || 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    quantity: Number(d.quantity || 1) + 1,
                  }))
                }
                className="w-14 h-14 rounded-2xl bg-[#330066] text-white flex items-center justify-center"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            {draftPreview && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1 text-sm">
                {draftPreview.sqFt != null ? (
                  <p>
                    <T>Sq.ft</T>: {Number(draftPreview.sqFt).toFixed(2)}
                    {draftPreview.rate != null ? (
                      <>
                        {" · "}
                        <T>Rate</T>: {formatAmountINR(draftPreview.rate)}/
                        <T>sq.ft</T>
                      </>
                    ) : (
                      <>
                        {" · "}
                        <span className="text-amber-700">
                          <T>Rate not available</T>
                        </span>
                      </>
                    )}
                  </p>
                ) : null}
                {draftPreview.amount != null ? (
                  <p className="text-base font-bold text-[#330066]">
                    <T>Amount</T>: {formatAmountINR(draftPreview.amount)}
                  </p>
                ) : null}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-600">
                <T>Notes</T>{" "}
                <span className="text-slate-400 font-normal">
                  (<T>(optional)</T>)
                </span>
              </label>
              <textarea
                value={(() => {
                  const n = String(draft.notes || "");
                  return n.replace(/^\[[^\]]+\]\s*/, "");
                })()}
                onChange={(e) => {
                  const free = e.target.value;
                  const fab = draft.fabric || fabricOf(draft);
                  setDraft((d) => ({
                    ...d,
                    notes: fab
                      ? free.trim()
                        ? `[${fab}] ${free}`
                        : `[${fab}]`
                      : free,
                  }));
                }}
                rows={2}
                className="mt-1 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#330066]"
                placeholder={t("Notes (optional)")}
              />
            </div>
            <StickyNav
              onBack={goBack}
              onNext={commitDraftToBasket}
              nextLabel={<T>Add to Basket</T>}
            />
          </div>
        )}

        {/* Basket */}
        {step === "basket" && (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}
                >
                  <T>{getOrderItemKindLabel(item)}</T>
                </span>
                <p className="text-lg font-bold text-slate-900">{tMattressType(item.type, t)}</p>
                <p className="text-sm text-slate-600">
                  {formatOrderItemSize(item)}
                </p>
                <p className="text-sm text-slate-600">
                  {item.thickness ||
                    (item.height ? `${item.height}"` : "—")}
                  {item.itemType === "JOB_WORK"
                    ? ""
                    : item.warranty
                      ? ` · ${item.warranty} yr`
                      : ""}
                </p>
                {item.designCode ? (
                  <p className="text-sm text-slate-500">
                    {item.designCode}
                    {item.designName ? ` — ${item.designName}` : ""}
                  </p>
                ) : null}
                <p className="text-sm font-semibold">
                  <T>Qty</T>: {item.quantity}
                </p>
                {item.sqFt != null ? (
                  <p className="text-sm text-slate-600">
                    <T>Sq.ft</T>: {Number(item.sqFt).toFixed(2)}
                    {item.rate != null ? (
                      <>
                        {" · "}
                        <T>Rate</T>: {formatAmountINR(item.rate)}/
                        <T>sq.ft</T>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {item.amount != null ? (
                  <p className="text-sm font-bold text-[#330066]">
                    <T>Amount</T>: {formatAmountINR(item.amount)}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => editItem(item)}
                    className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                  >
                    <T>Edit</T>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={startNewItem}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#330066]/30 text-[#330066] font-bold"
            >
              <T>Add another item</T>
            </button>
            <div className="bg-slate-100 rounded-2xl p-4 space-y-2 text-sm font-semibold">
              <div className="flex justify-between">
                <span>
                  <T>Total Items</T>: {items.length}
                </span>
                <span>
                  <T>Total Quantity</T>: {totalQty}
                </span>
              </div>
              {totalAmount > 0 ? (
                <div className="flex justify-between text-base text-[#330066]">
                  <span>
                    <T>Total Amount</T>
                  </span>
                  <span>{formatAmountINR(totalAmount)}</span>
                </div>
              ) : null}
            </div>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder={t("Notes (optional)")}
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm min-h-[72px]"
            />
            <div className="h-20" />
            <StickyNav
              onBack={() => {
                if (items.length) startNewItem();
                else goBack();
              }}
              backLabel={<T>Add item</T>}
              onNext={() => {
                if (!items.length) {
                  alert(
                    t(
                      "Please add at least one mattress item with quantity 1 or more."
                    )
                  );
                  return;
                }
                setStep("preview");
              }}
              nextLabel={<T>Preview</T>}
              nextDisabled={!items.length}
            />
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border p-4 text-sm space-y-1">
              <p className="font-bold text-slate-900">
                {selectedParty?.shopName || selectedParty?.name}
              </p>
              <p className="text-slate-500">
                {[selectedParty?.city, selectedParty?.contactNumber || selectedParty?.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 text-sm"
              >
                <p className="font-bold text-base">
                  {item.quantity} × {tMattressType(item.type, t)}
                </p>
                <p>{formatOrderItemSize(item)}</p>
                <p>
                  {item.thickness}
                  {item.warranty ? ` · ${item.warranty} yr` : ""}
                </p>
                {item.designCode ? (
                  <p>
                    {item.designCode}
                    {item.designName ? ` — ${item.designName}` : ""}
                  </p>
                ) : null}
                {item.sqFt != null ? (
                  <p>
                    <T>Sq.ft</T>: {Number(item.sqFt).toFixed(2)}
                    {item.rate != null ? (
                      <>
                        {" · "}
                        <T>Rate</T>: {formatAmountINR(item.rate)}/
                        <T>sq.ft</T>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {item.amount != null ? (
                  <p className="font-bold text-[#330066]">
                    <T>Amount</T>: {formatAmountINR(item.amount)}
                  </p>
                ) : null}
              </div>
            ))}
            {totalAmount > 0 ? (
              <p className="text-lg font-bold text-[#330066] text-right">
                <T>Total Amount</T>: {formatAmountINR(totalAmount)}
              </p>
            ) : null}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                <T>Order received via</T>{" "}
                <span className="text-slate-400 font-normal">
                  (<T>(optional)</T>)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {ORDER_RECEIVED_VIA_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() =>
                      setOrderReceivedVia((prev) =>
                        prev === o.key ? "" : o.key
                      )
                    }
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold ${
                      orderReceivedVia === o.key
                        ? "border-[#330066] bg-[#330066]/5 text-[#330066]"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <T>{o.label}</T>
                  </button>
                ))}
              </div>
            </div>
            <div className="h-20" />
            <StickyNav
              onBack={() => setStep("basket")}
              onNext={submitOrder}
              nextLabel={
                saving ? <T>Saving…</T> : <T>Create Order & Send WhatsApp</T>
              }
              nextDisabled={saving || !items.length}
            />
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="space-y-4 text-center pt-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              <T>Order Created</T>
            </h2>
            <p className="text-slate-600">
              <T>Order No</T>:{" "}
              <span className="font-bold">{successOrderNumber}</span>
            </p>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-bold"
              >
                <T>Send WhatsApp to party</T>
              </a>
            ) : null}
            <Link
              href="/salesperson/assisted-order"
              className="block w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold"
              onClick={() => {
                setSelectedParty(null);
                setItems([]);
                setStep("party");
                setSuccessOrderNumber("");
                setWaHref(null);
              }}
            >
              <T>New Assisted Order</T>
            </Link>
            <Link
              href="/salesperson/dashboard"
              className="block w-full py-3.5 rounded-2xl border-2 border-slate-200 font-bold text-slate-800"
            >
              <T>Dashboard</T>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
