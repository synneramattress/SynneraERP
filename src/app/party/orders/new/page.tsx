"use client";
import { T, useLanguage } from "@/i18n";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { allocateOrderNumber } from "@/lib/orderNumber";
import {
  fetchOrderById,
  saveOrderWithId,
  updateOrderFields,
  stripUndefined,
  formatOrderItemSize,
  ORDER_MATTRESS_TYPE_LABELS,
  standardThicknessOptions,
  warrantyOptionsForItem,
  validateOrderItems,
  normalizeItemAfterChange,
  effectiveThicknessInches,
  isCustomThicknessValid,
  getAllowedThicknessRange,
  customThicknessInvalidMessage,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
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
import { mattressTypeKeyFromLabel } from "@/modules/orders";
import { isOffline, queueOrderForSync } from "@/lib/offline/sync";
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
import type { RateSettings } from "@/modules/rates";
import {
  withItemPricing,
  sumOrderAmount,
  formatAmountINR,
  isDistributorParty,
  type PartyRateContext,
} from "@/lib/mattress";
import { serverTimestamp } from "firebase/firestore";
import { MeasureField, usePreloadMeasureIcons } from "@/components/shared/MeasureField";
import { MattressTypeIcon, usePreloadMattressIcons } from "@/components/mattress/MattressTypeIcon";
import { WizardSpeechButton } from "@/components/shared/WizardSpeechButton";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  WifiOff,
  BedDouble,
  Layers,
  Box,
  Sparkles,
  CircleDot,
} from "lucide-react";

type Step =
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
  | "success"
  | "draft_success";

/** Base guided steps for Regular items */
const BASE_STEPS: Step[] = [
  "mattress",
  "warranty",
  "size",
  "thickness",
  "design",
  "quantity",
  "basket",
  "preview",
];

/** Build step list for current draft (Job Work skips warranty; may use fabric_type) */
function buildStepOrder(
  canJobWork: boolean,
  draft: Partial<OrderItem> & { fabric?: string }
): Step[] {
  const isJw = draft.itemType === "JOB_WORK";
  const partyFab = isJw && draft.fabricSource === "PARTY";
  const steps: Step[] = [];
  if (canJobWork) steps.push("item_type");
  steps.push("mattress");
  // Warranty only for Regular items — Job Work has no warranty→thickness rules
  if (!isJw) steps.push("warranty");
  steps.push("size", "thickness");
  if (partyFab) steps.push("fabric_type");
  else steps.push("design");
  steps.push("quantity", "basket", "preview");
  return steps;
}

type DraftItem = Partial<OrderItem> & { fabric?: string };


function sizeLabel(s: string) {
  return s.replace(/\s*in\s*$/i, "").trim();
}

function fabricOf(item: Partial<OrderItem> & { fabric?: string }) {
  if (item.fabric) return item.fabric;
  const m = item.notes?.match(/^\[([^\]]+)\]/);
  return m?.[1] || "";
}

function Progress({ step, steps }: { step: Step; steps: Step[] }) {
  const order = steps.length ? steps : BASE_STEPS;
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {order.map((s, i) => (
        <div key={s} className="flex items-center flex-1 min-w-0">
          <div
            className={`h-1.5 flex-1 rounded-full ${
              i <= idx ? "bg-[#330066]" : "bg-slate-200"
            }`}
          />
          {i < order.length - 1 && (
            <div className="w-0.5" />
          )}
        </div>
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

export default function CreateOrderPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  usePreloadMattressIcons();
  usePreloadMeasureIcons();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [step, setStep] = useState<Step>("mattress");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [draft, setDraft] = useState<DraftItem>({ quantity: 1 });
  const [customThickVal, setCustomThickVal] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState("");
  const [designSlides, setDesignSlides] = useState<DesignSlide[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [rateCtx, setRateCtx] = useState<PartyRateContext>({
    masterRates: {},
    settings: null,
    isDistributor: false,
  });
  const [jobWorkRates, setJobWorkRates] = useState<Record<string, number>>({});
  const canJobWork = hasJobWorkCapability(user);
  const stepOrder = buildStepOrder(canJobWork, draft);
  /** One-time init only — must not re-run after user leaves item_type → mattress */
  const didInitItemTypeStep = useRef(false);

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
          isDistributor: isDistributorParty(user as any),
        });
        setJobWorkRates(jwRates || {});
      } catch {
        setRateCtx({
          masterRates: {},
          settings: null,
          isDistributor: isDistributorParty(user as any),
        });
      }
    })();
  }, [user]);

  // Re-apply pricing when rates / party category / job-work rates load or change
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

  useEffect(() => {
    if (!editId || !user?.uid) {
      setLoadingEdit(false);
      return;
    }
    (async () => {
      try {
        const o = await fetchOrderById(editId);
        if (o && o.partyId === user.uid) {
          setItems(o.items?.length ? o.items : []);
          setGeneralNotes(o.notes || "");
          setStep("basket");
        }
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId, user?.uid]);

  // First open only: REGULAR_AND_JOB_WORK parties start on item_type.
  // Uses a ref so navigating item_type → mattress is never forced back.
  useEffect(() => {
    if (editId || loadingEdit) return;
    if (!user?.uid) return;
    if (didInitItemTypeStep.current) return;
    if (!canJobWork) {
      didInitItemTypeStep.current = true;
      return;
    }
    didInitItemTypeStep.current = true;
    setStep("item_type");
  }, [user?.uid, canJobWork, editId, loadingEdit]);

  const isJobWorkDraft = draft.itemType === "JOB_WORK";
  // Job Work: type-base thicknesses only (no warranty filter). Regular: warranty rules apply.
  const thicknessOpts = useMemo(
    () =>
      standardThicknessOptions(
        draft.type,
        isJobWorkDraft ? null : draft.warranty
      ),
    [draft.type, draft.warranty, isJobWorkDraft]
  );
  const customThicknessRange = useMemo(() => {
    // Job Work custom size: whole inches 2–12 only
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

  /** Fabrics allowed for selected mattress type (shared catalog rules) */
  const allowedFabricsForType = useMemo(() => {
    const mKey = mattressTypeKeyFromLabel(draft.type);
    return fabricsForMattressType(mKey || draft.type);
  }, [draft.type]);

  /** Only designs whose fabric is allowed for this mattress type */
  const filteredDesignSlides = useMemo(() => {
    const allowed = new Set<FabricType>(allowedFabricsForType);
    return designSlides.filter((d) => {
      const raw = String(d.fabric || "").trim();
      if (!raw) return false;
      const fab = normalizeFabric(raw);
      return allowed.has(fab);
    });
  }, [designSlides, allowedFabricsForType]);

  /** Group filtered designs under fabric headings (JACQUARD / COTTON / ROTTO) */
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
    // Job Work: warranty not required / not stored. Regular: required.
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
        alert(t("Please select mattress thickness."));
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
      // Job Work: omit warranty (null). Regular: required string.
      warranty: isJw ? undefined : String(draft.warranty || ""),
      itemType: isJw ? "JOB_WORK" : "REGULAR",
      fabricSource: isJw ? draft.fabricSource : undefined,
      jobWorkFabricType: isJw && fabType ? (fabType as any) : undefined,
    };

    const fab = isPartyFab
      ? fabType || draft.fabric || ""
      : draft.fabric || "";
    if (fab) {
      const rest = (item.notes || "").replace(/^\[[^\]]+\]\s*/, "");
      item.notes = rest ? `[${fab}] ${rest}` : `[${fab}]`;
      (item as any).fabric = fab;
    }

    // Warranty normalize only for Regular items
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

  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));

  const editItem = (item: OrderItem) => {
    setDraft({ ...item, fabric: fabricOf(item as any), quantity: item.quantity || 1 });
    setCustomThickVal(
      item.sizeType === "custom" && item.height ? String(item.height) : ""
    );
    setStep("mattress");
  };

  const save = async (status: "draft" | "submitted") => {
    if (!user?.uid) return router.push("/auth/login");
    if (!items.length) {
      alert(t("Please add at least one mattress item with quantity 1 or more."));
      return;
    }
    const ruleErr = validateOrderItems(items, status);
    if (ruleErr) {
      alert(t(ruleErr));
      return;
    }
    setSaving(true);
    // Final pricing snapshot at save time (regular + job work sq.ft)
    const pricedItems = items.map((it) =>
      it.itemType === "JOB_WORK"
        ? (withJobWorkPricingFromItem(it as any, jobWorkRates) as OrderItem)
        : (withItemPricing(it as any, rateCtx) as OrderItem)
    );
    const pricedTotalAmount = sumOrderAmount(pricedItems);
    const base: Record<string, unknown> = {
      partyId: String(user.uid),
      partyName: user.name || "",
      partyEmail: user.email || "",
      partyCity: (user as any).city || "",
      partyShopName: (user as any).shopName || (user as any).company || "",
      notes: generalNotes.trim() || "",
      items: pricedItems.map((it) => {
        const isJw = it.itemType === "JOB_WORK";
        const row: Record<string, unknown> = {
          id: it.id,
          type: it.type || "",
          sizeType: it.sizeType || "regular",
          quantity: Number(it.quantity) || 1,
          notes: it.notes || "",
          designCode: it.designCode || "",
          designName: it.designName || "",
          // Job Work: omit warranty; Regular: keep string
          warranty: isJw
            ? null
            : it.warranty != null
              ? String(it.warranty)
              : "",
          // Persist kind so post-submit badges stay correct
          itemType: isJw ? "JOB_WORK" : "REGULAR",
        };
        if (isJw && it.fabricSource) row.fabricSource = it.fabricSource;
        if (isJw && it.jobWorkFabricType) {
          row.jobWorkFabricType = it.jobWorkFabricType;
        }
        if (isJw && it.jobWorkRate != null) row.jobWorkRate = it.jobWorkRate;
        if (isJw && it.jobWorkRateSnapshot) {
          row.jobWorkRateSnapshot = it.jobWorkRateSnapshot;
        }
        if (it.regularSize) row.regularSize = it.regularSize;
        if (it.thickness) row.thickness = it.thickness;
        if (it.length != null) row.length = it.length;
        if (it.width != null) row.width = it.width;
        if (it.height != null) row.height = it.height;
        if ((it as any).fabric) row.fabric = (it as any).fabric;
        // Pricing snapshot (Party + Admin visibility)
        if (it.sqFt != null) row.sqFt = it.sqFt;
        if (it.rate != null) row.rate = it.rate;
        if (it.amount != null) row.amount = it.amount;
        if (it.calculatedLength != null) row.calculatedLength = it.calculatedLength;
        if (it.calculatedWidth != null) row.calculatedWidth = it.calculatedWidth;
        return row;
      }),
      totalQuantity: Number(totalQty) || 0,
      totalAmount: Number(pricedTotalAmount) || 0,
      status,
    };
    const clientOrderId = editId || crypto.randomUUID();

    // Offline: queue and tell user (do not pretend it is live)
    if (isOffline()) {
      try {
        await queueOrderForSync({
          action: editId ? "update" : "create",
          firestoreId: editId || undefined,
          localId: clientOrderId,
          ...base,
        } as any);
        alert(
          t(
            "You are offline. Orders will sync later."
          )
        );
        setStep(status === "draft" ? "draft_success" : "success");
        setSuccessOrderNumber("");
      } catch {
        alert(t("Could not save offline. Please try again."));
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      const data: Record<string, unknown> = { ...base };
      if (status === "submitted") {
        data.submittedAt = serverTimestamp();
        data.rateSnapshotAt = serverTimestamp();
        if (editId) {
          data.rejectionReason = null;
        }
        // Do NOT allocate order number before save — failed saves were burning sequence numbers
      }

      if (editId) {
        await updateOrderFields(editId, data);
      } else {
        await saveOrderWithId(clientOrderId, {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      // Verify write landed (prevents false success)
      const savedId = editId || clientOrderId;
      let verify = await fetchOrderById(savedId);
      if (!verify || verify.partyId !== user.uid) {
        throw new Error("Order write not found after save");
      }

      // Allocate sequential number ONLY after successful save
      let finalOrderNumber = String(verify.orderNumber || "");
      if (status === "submitted" && !finalOrderNumber) {
        try {
          finalOrderNumber = await allocateOrderNumber();
          await updateOrderFields(savedId, { orderNumber: finalOrderNumber });
          verify = { ...verify, orderNumber: finalOrderNumber };
        } catch (numErr) {
          console.error("Order number allocate failed after save", numErr);
          // Order is saved; number can be assigned later — do not fail the whole submit
        }
      }

      if (status === "submitted") {
        try {
          const { notifyAdminsNewOrder } = await import(
            "@/modules/notifications"
          );
          await notifyAdminsNewOrder({
            orderId: savedId,
            orderNumber: finalOrderNumber || verify.orderNumber,
            partyName: user.name || user.email || "",
          });
        } catch {
          /* non-blocking */
        }
      }

      setSuccessOrderNumber(String(finalOrderNumber || verify.orderNumber || ""));
      setStep(status === "draft" ? "draft_success" : "success");
    } catch (e: any) {
      console.error("Order save failed", e);
      const code = e?.code ? String(e.code) : "";
      const msg = e?.message ? String(e.message) : String(e || "");
      if (code.includes("permission") || msg.includes("permission")) {
        alert(
          t("Order could not be saved. Please check Firebase permissions.") +
            "\n\n" +
            (code || msg)
        );
      } else {
        alert(
          t("Order could not be saved. Please check Firebase permissions.") +
            "\n\n" +
            (msg || code || "unknown error")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    const isJw = draft.itemType === "JOB_WORK";
    const isJwParty = isJw && draft.fabricSource === "PARTY";
    const map: Partial<Record<Step, Step>> = {
      item_type: "basket",
      mattress: canJobWork ? "item_type" : "basket",
      warranty: "mattress",
      // Job Work skips warranty — size goes back to mattress
      size: isJw ? "mattress" : "warranty",
      custom_size: "size",
      thickness: draft.sizeType === "custom" ? "custom_size" : "size",
      design: "thickness",
      fabric_type: "thickness",
      quantity: isJwParty ? "fabric_type" : "design",
      preview: "basket",
    };
    if (step === "basket") {
      router.push("/party/orders");
      return;
    }
    if (step === "item_type") {
      if (items.length) setStep("basket");
      else router.back();
      return;
    }
    if (step === "mattress" && !canJobWork) {
      if (items.length) setStep("basket");
      else router.back();
      return;
    }
    setStep(map[step] || (canJobWork ? "item_type" : "mattress"));
  };

  const guided = ![
    "basket",
    "preview",
    "success",
    "draft_success",
  ].includes(step);

  if (loadingEdit) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "success" || step === "draft_success") {
    const isDraft = step === "draft_success";
    return (
      <div className="flex flex-col items-center text-center py-10 px-2 space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {isDraft ? (
            <T>Order Saved as Draft</T>
          ) : (
            <T>Order Submitted Successfully!</T>
          )}
        </h1>
        {successOrderNumber ? (
          <p className="text-lg font-semibold text-[#330066]">
            {successOrderNumber}
          </p>
        ) : null}
        <p className="text-sm text-slate-600 max-w-xs">
          {isDraft ? (
            <T>You can continue and submit it later.</T>
          ) : (
            <T>Your order has been submitted successfully.</T>
          )}
        </p>
        <button
          type="button"
          onClick={() => router.push("/party/orders")}
          className="w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold"
        >
          {isDraft ? <T>Go to Orders</T> : <T>View Order</T>}
        </button>
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setDraft({ quantity: 1 });
            setGeneralNotes("");
            setSuccessOrderNumber("");
            startNewItem();
          }}
          className="w-full py-3.5 rounded-2xl border border-slate-200 font-semibold"
        >
          <T>Create Another Order</T>
        </button>
      </div>
    );
  }

  if (step === "basket" && items.length === 0 && !draft.type) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">
          <T>New Order</T>
        </h1>
        <p className="text-sm text-slate-600">
          <T>Tap below to choose a mattress.</T>
        </p>
        <button
          type="button"
          onClick={startNewItem}
          className="w-full py-4 rounded-2xl bg-[#330066] text-white font-bold text-lg"
        >
          <T>Choose Mattress</T>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${guided ? "pb-28" : "pb-6"}`}>
      {isOffline() && (
        <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <T>You are offline. Orders will sync later.</T>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1">
          {step === "basket" ? (
            <T>Order Basket</T>
          ) : step === "preview" ? (
            <T>Preview Order</T>
          ) : (
            <T>New Order</T>
          )}
        </h1>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Progress step={step} steps={stepOrder} />
        </div>
        <WizardSpeechButton step={step} className="mt-1 shrink-0" />
      </div>

      {/* Mattress — icon boxes */}

      {/* Item Type — only when party has Job Work capability */}
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
            className={`w-full text-left p-4 rounded-2xl border-2 ${
              draft.itemType === "REGULAR"
                ? "border-[#330066] bg-[#330066]/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <p className="font-bold text-slate-900"><T>Regular</T></p>
            <p className="text-sm text-slate-500"><T>Normal Synnera sale</T></p>
          </button>
          <div
            className={`w-full text-left p-4 rounded-2xl border-2 space-y-3 ${
              draft.itemType === "JOB_WORK"
                ? "border-[#330066] bg-[#330066]/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <div>
              <p className="font-bold text-slate-900"><T>Job Work / OEM</T></p>
              <p className="text-sm text-slate-500"><T>Manufacturing / processing</T></p>
            </div>
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
              className={`w-full text-left px-3 py-2.5 rounded-xl border ${
                draft.itemType === "JOB_WORK" && draft.fabricSource === "PARTY"
                  ? "border-[#330066] bg-white"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="font-semibold text-sm">• <T>Party Fabric</T></p>
              <p className="text-xs text-slate-500 ml-3"><T>Party will provide fabric</T></p>
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
              className={`w-full text-left px-3 py-2.5 rounded-xl border ${
                draft.itemType === "JOB_WORK" && draft.fabricSource === "SYNNERA"
                  ? "border-[#330066] bg-white"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="font-semibold text-sm">• <T>Synnera Fabric</T></p>
              <p className="text-xs text-slate-500 ml-3"><T>Use Synnera fabric design</T></p>
            </button>
          </div>
          <StickyNav
            onBack={goBack}
            onNext={() => {
              if (!draft.itemType) {
                alert(t("Select Item Type"));
                return;
              }
              if (draft.itemType === "JOB_WORK" && !draft.fabricSource) {
                alert(t("Select Item Type"));
                return;
              }
              setStep("mattress");
            }}
            nextDisabled={
              !draft.itemType ||
              (draft.itemType === "JOB_WORK" && !draft.fabricSource)
            }
          />
        </div>
      )}

      {/* Job Work Party Fabric — simple fabric type only */}
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
            onBack={goBack}
            onNext={() => {
              if (!draft.jobWorkFabricType && !draft.fabric) {
                alert(t("Select Fabric Type"));
                return;
              }
              setDraft((d) => ({ ...d, quantity: d.quantity || 1 }));
              setStep("quantity");
            }}
            nextDisabled={!draft.jobWorkFabricType && !draft.fabric}
          />
        </div>
      )}

      {step === "mattress" && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-slate-800">
            <T>Choose Mattress</T>
          </p>
          <p className="text-sm text-slate-500">
            <T>Tap the mattress you want.</T>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ORDER_MATTRESS_TYPE_LABELS.map((label) => {
              const selected = draft.type === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      type: label,
                      thickness: undefined,
                      height: undefined,
                      warranty: undefined,
                      fabric: "",
                      designCode: "",
                      designName: "",
                      regularSize: undefined,
                      sizeType: "regular",
                      quantity: d.quantity || 1,
                    }));
                    setCustomThickVal("");
                  }}
                  className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition ${
                    selected
                      ? "border-[#330066] bg-[#330066]/5 shadow-sm"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                    <MattressTypeIcon type={label} size={96} className="w-full h-full rounded-xl" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 pb-1">
                    {tMattressType(label, t)}
                  </span>
                </button>
              );
            })}
          </div>
          <StickyNav
            onBack={goBack}
            onNext={() => {
              if (!draft.type) {
                alert(t("Please select a valid mattress type."));
                return;
              }
              // Job Work: skip warranty → size. Regular: warranty first.
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
            <T>Choose Warranty</T>
          </p>
          <div className="space-y-2.5">
            {warrantyOpts.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, warranty: w.key }))}
                className={`w-full text-left p-4 rounded-2xl border-2 flex justify-between items-center ${
                  String(draft.warranty) === String(w.key)
                    ? "border-[#330066] bg-[#330066]/5"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-lg font-bold">{w.label}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
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
                alert(t("Please select a valid mattress type."));
                return;
              }
              setCustomThickVal("");
              setStep("thickness");
            }}
            nextDisabled={!draft.regularSize}
          />
        </div>
      )}

      {/* Custom size + thickness */}
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
                placeholder="72"
              />
          </MeasureField>
          <MeasureField kind="width" label="Width">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={108}
                step="0.01"
                value={draft.width ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    width: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full text-center text-lg font-bold py-2 rounded-xl border-2 border-slate-200 focus:border-[#330066] outline-none"
                placeholder="108"
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
              if (draft.itemType === "JOB_WORK" && draft.fabricSource === "PARTY") {
                setStep("fabric_type");
              } else {
                setStep("design");
              }
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

      {/* Thickness standard */}
      {step === "thickness" && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-slate-800">
            <T>Choose Thickness</T>
          </p>
          {thicknessOpts.length === 0 && (
            <p className="text-sm text-rose-600">
              <T>No thickness options for this mattress type.</T>
            </p>
          )}
          <div className="grid grid-cols-3 gap-2.5">
            {thicknessOpts.map((th) => {
              const short = th.replace(/\s*inch(es)?/i, '"');
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
                alert(t("Please select mattress thickness."));
                return;
              }
              if (draft.itemType === "JOB_WORK" && draft.fabricSource === "PARTY") {
                setStep("fabric_type");
              } else {
                setStep("design");
              }
            }}
            nextDisabled={!draft.thickness}
          />
        </div>
      )}

      {/* Design — compulsory, grouped by fabric per mattress rules */}
      {step === "design" && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-slate-800">
            <T>Choose Design</T>
          </p>
          <p className="text-sm text-slate-500">
            <T>Fabric design selection is required.</T>
          </p>
          {filteredDesignSlides.length === 0 ? (
            <p className="text-sm text-slate-500">
              <T>No designs available for this mattress type.</T>
            </p>
          ) : (
            <div className="space-y-5">
              {designsByFabric.map((group) =>
                group.items.length === 0 ? null : (
                  <div key={group.key} className="space-y-2">
                    <p className="text-xs font-bold tracking-wide text-[#330066] uppercase">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
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

      {/* Quantity + optional per-mattress notes */}
      {step === "quantity" && (
        <div className="space-y-6">
          <p className="text-base font-semibold text-slate-800">
            <T>Quantity</T>
          </p>
          <div className="flex items-center justify-center gap-6 py-6">
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  quantity: Math.max(1, Number(d.quantity || 1) - 1),
                }))
              }
              className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-[#330066]"
            >
              <Minus className="w-6 h-6" />
            </button>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.quantity === undefined || draft.quantity === null ? "" : draft.quantity}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === "") {
                  // Temporary empty so user can type a new value
                  setDraft((d) => ({ ...d, quantity: undefined as unknown as number }));
                  return;
                }
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n)) return;
                setDraft((d) => ({
                  ...d,
                  quantity: n < 1 ? 1 : n,
                }));
              }}
              onBlur={() => {
                setDraft((d) => ({
                  ...d,
                  quantity: Math.max(1, Number(d.quantity) || 1),
                }));
              }}
              className="w-20 text-center text-3xl font-bold border-0 bg-transparent outline-none"
            />
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
          {draft.itemType === "JOB_WORK" && (
            <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide text-center">
                <T>Job Work Rate</T>
              </p>
              {(() => {
                const ft = (draft.jobWorkFabricType ||
                  draft.fabric ||
                  "cotton") as "jacquard" | "cotton" | "rotto";
                const th = String(draft.thickness || draft.height || "")
                  .replace(/\s*inch(es)?/i, "")
                  .trim()
                  .replace(/^0+(\d)/, "$1");
                const src = (draft.fabricSource || "PARTY") as "PARTY" | "SYNNERA";
                const r = lookupJobWorkRate(jobWorkRates, ft, src, th);
                const size = computeItemSquareFeet({
                  sizeType: draft.sizeType,
                  regularSize: draft.regularSize,
                  length: draft.length,
                  width: draft.width,
                  height: draft.height,
                  thickness: draft.thickness,
                });
                const sqFt = size?.calculated?.totalSquareFeet ?? null;
                const qty = Math.max(1, Number(draft.quantity) || 1);
                if (r == null) {
                  return (
                    <p className="text-center text-sm font-semibold text-rose-600">
                      {t("Rate not available")}
                    </p>
                  );
                }
                if (sqFt == null || !(sqFt > 0)) {
                  return (
                    <p className="text-center text-sm font-semibold text-rose-600">
                      {t("Could not calculate size / square feet for this item.")}
                    </p>
                  );
                }
                const amount = Math.round(sqFt * r * qty * 100) / 100;
                return (
                  <div className="text-sm text-slate-700 space-y-0.5">
                    <div className="flex justify-between gap-2">
                      <span><T>Sq.ft</T></span>
                      <span className="font-semibold">{sqFt}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span><T>Rate</T> (₹/<T>sq.ft</T>)</span>
                      <span className="font-semibold">₹ {r}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span><T>Quantity</T></span>
                      <span className="font-semibold">{qty}</span>
                    </div>
                    <div className="border-t border-violet-200 pt-1.5 mt-1 flex justify-between gap-2">
                      <span className="font-semibold text-slate-800"><T>Amount</T></span>
                      <span className="text-xl font-bold text-[#330066]">₹ {amount}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center pt-0.5">
                      {sqFt} × {r} × {qty}
                    </p>
                  </div>
                );
              })()}
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
                <p className="text-xs text-slate-500">
                  <T>Sq.ft</T>: {Number(item.sqFt).toFixed(2)}
                  {item.rate != null ? (
                    <>
                      {" · "}
                      <T>Rate</T>: {formatAmountINR(item.rate)}/<T>sq.ft</T>
                    </>
                  ) : null}
                </p>
              ) : null}
              {item.amount != null ? (
                <p className="text-sm font-bold text-[#330066]">
                  <T>Amount</T>: {formatAmountINR(item.amount)}
                </p>
              ) : null}
              {(() => {
                const free = String(item.notes || "").replace(/^\[[^\]]+\]\s*/, "").trim();
                return free ? (
                  <p className="text-xs text-slate-500">
                    <T>Notes</T>: {free}
                  </p>
                ) : null;
              })()}
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
            <T>Add another mattress</T>
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
            onBack={() => save("draft")}
            backLabel={saving ? "…" : <T>Save as Draft</T>}
            backDisabled={saving || !items.length}
            onNext={() => setStep("preview")}
            nextLabel={<T>Preview Order</T>}
            nextDisabled={!items.length}
          />
        </div>
      )}

      {/* Preview — submit here (no extra confirm step) */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 text-sm">
            <p className="font-bold text-slate-900 text-base">
              {user?.name || "—"}
            </p>
            <p className="text-slate-600">
              {(user as any)?.shopName || (user as any)?.company || "—"}
            </p>
            <p className="text-slate-600">{(user as any)?.city || "—"}</p>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            <T>ORDER ITEMS</T>
          </p>
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 text-sm space-y-0.5"
            >
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}
              >
                <T>{getOrderItemKindLabel(item)}</T>
              </span>
              <p className="font-bold">{tMattressType(item.type, t)}</p>
              <p>{formatOrderItemSize(item)}</p>
              <p>
                {item.thickness ||
                  (item.height ? `${item.height}"` : "—")}
                {item.itemType === "JOB_WORK"
                  ? ""
                  : item.warranty
                    ? ` · ${item.warranty} yr`
                    : ""}
              </p>
              {item.designCode ? <p>{item.designCode}</p> : null}
              <p className="font-semibold">
                <T>Qty</T>: {item.quantity}
              </p>
              {item.sqFt != null ? (
                <p className="text-xs text-slate-500">
                  <T>Sq.ft</T>: {Number(item.sqFt).toFixed(2)}
                  {item.rate != null ? (
                    <>
                      {" · "}
                      <T>Rate</T>: {formatAmountINR(item.rate)}/<T>sq.ft</T>
                    </>
                  ) : null}
                </p>
              ) : null}
              {item.amount != null ? (
                <p className="font-bold text-[#330066]">
                  <T>Amount</T>: {formatAmountINR(item.amount)}
                </p>
              ) : null}
              {(() => {
                const free = String(item.notes || "").replace(/^\[[^\]]+\]\s*/, "").trim();
                return free ? (
                  <p className="text-xs text-slate-500">
                    <T>Notes</T>: {free}
                  </p>
                ) : null;
              })()}
            </div>
          ))}
          <p className="text-center font-semibold">
            <T>Total Quantity</T>: {totalQty}
          </p>
          {totalAmount > 0 ? (
            <p className="text-center font-bold text-lg text-[#330066]">
              <T>Total Amount</T>: {formatAmountINR(totalAmount)}
            </p>
          ) : null}
          <div className="h-20" />
          <StickyNav
            onBack={() => setStep("basket")}
            backLabel={<T>Go Back / Edit Order</T>}
            onNext={() => save("submitted")}
            nextLabel={saving ? "…" : <T>Submit Order</T>}
            nextDisabled={saving}
          />
        </div>
      )}
    </div>
  );
}