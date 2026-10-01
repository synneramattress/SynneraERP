"use client";

import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { REGULAR_SIZES } from "@/lib/utils";
import {
  fetchRateTables,
  fetchRateSettings,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
  WARRANTY_LABELS,
} from "@/modules/rates";
import type { RateSettings, RateTables } from "@/modules/rates";
import {
  ORDER_MATTRESS_TYPE_LABELS,
  standardThicknessOptions,
  warrantyOptionsForItem,
  emptyOrderItem,
  type OrderItem,
} from "@/modules/orders";
import {
  applyRetailPricingToItem,
  saveRetailOrder,
  validateRetailItemsAgainstPartyRate,
  sumRetailTotal,
} from "@/modules/sales";
import {
  fabricsForMattressType,
  FABRIC_LABELS,
  normalizeFabric,
  type FabricType,
} from "@/lib/catalog/fabric";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { mattressTypeKeyFromLabel } from "@/lib/catalog/mattressTypes";
import { parseThicknessInches } from "@/lib/catalog/thickness";
import { normalizeWarrantyKey } from "@/modules/rates/rateEngine";
import { RETAIL_ORDER_PREFILL_KEY } from "@/modules/retailFollowUps";
import {
  fetchCustomersForSalesperson,
  searchCustomers,
  type RetailCustomerMaster,
  type CustomerGstRegistrationType,
} from "@/modules/customers";
import AddressFields from "@/components/shared/AddressFields";
import { DEFAULT_RETAIL_ADDRESS, type Address } from "@/types/address";
import { formatAmountINR } from "@/lib/mattress";
import { MeasureField, usePreloadMeasureIcons } from "@/components/shared/MeasureField";
import { MattressTypeIcon, usePreloadMattressIcons } from "@/components/mattress/MattressTypeIcon";
import { WizardSpeechButton } from "@/components/shared/WizardSpeechButton";
import { StickyNav } from "@/components/wizard/StickyNav";
import { fetchActiveDesignSlides, type DesignSlide } from "@/modules/designs";

type DraftItem = OrderItem & {
  belowPartyRate?: boolean;
  salesPricingMode?: "rate_per_sqft" | "total_amount";
};

type Step = "customer" | "type" | "warranty" | "size" | "thickness" | "design" | "quantity" | "basket" | "preview";


export default function SalespersonNewRetailOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editOrderId = searchParams?.get("orderId") || null;
  const { t } = useLanguage();
  usePreloadMattressIcons();
  usePreloadMeasureIcons();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("customer");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerHits, setCustomerHits] = useState<RetailCustomerMaster[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [custGstType, setCustGstType] = useState<CustomerGstRegistrationType>("UNREGISTERED");
  const [custGstin, setCustGstin] = useState("");
  const [custPan, setCustPan] = useState("");
  const [custBilling, setCustBilling] = useState<Address>({
    ...DEFAULT_RETAIL_ADDRESS,
  });
  const [custShipping, setCustShipping] = useState<Address>({
    ...DEFAULT_RETAIL_ADDRESS,
  });
  const [custShipSame, setCustShipSame] = useState(true);
  const [custEmail, setCustEmail] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpId, setFollowUpId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [rateTables, setRateTables] = useState<RateTables>({ master: {}, party: {}, retail: {} });
  const [settings, setSettings] = useState<RateSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Raw sale-rate text is kept separately so the input can be temporarily empty
  // without the pricing engine immediately restoring the retail fallback.
  const [saleRateDrafts, setSaleRateDrafts] = useState<Record<string, string>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [sizeModes, setSizeModes] = useState<Record<string, "regular" | "custom">>({});
  const [designSlides, setDesignSlides] = useState<DesignSlide[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [r, s, slides] = await Promise.all([
          fetchRateTables(),
          fetchRateSettings(),
          fetchActiveDesignSlides().catch(() => [] as DesignSlide[]),
        ]);
        setRateTables(r);
        setSettings(s);
        setDesignSlides(slides || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RETAIL_ORDER_PREFILL_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.customerName) setCustomerName(String(data.customerName));
      if (data.mobile) setContact(String(data.mobile));
      if (data.city) setCity(String(data.city));
      if (data.address) setAddress(String(data.address));
      if (data.followUpId) setFollowUpId(String(data.followUpId));
      sessionStorage.removeItem(RETAIL_ORDER_PREFILL_KEY);
    } catch {
      /* ignore */
    }
  }, []);


  const reprice = useCallback(
    (list: DraftItem[]) =>
      list.map((it) => {
        const typeKey = mattressTypeKeyFromLabel(it.type);
        const hasType = !!typeKey;
        const hasWarranty = !!String(it.warranty || "").trim();
        const hasFabric = !!String(it.fabric || "").trim();
        const hasSize =
          it.sizeType === "custom"
            ? Number(it.length) > 0 && Number(it.width) > 0 && Number(it.height || it.thickness) > 0
            : !!String(it.regularSize || "").trim() && !!String(it.thickness || "").trim();

        // Incomplete progressive-selection items must not be priced or marked
        // as below-party-rate. They are intentionally waiting for the next step.
        if (!hasType || !hasWarranty || !hasFabric || !hasSize) {
          return { ...it, belowPartyRate: false };
        }
        return applyRetailPricingToItem(it, rateTables, settings) as DraftItem;
      }),
    [rateTables, settings]
  );

  useEffect(() => {
    if (!Object.keys(rateTables.master).length) return;
    setItems((prev) => (prev.length ? reprice(prev) : prev));
  }, [rateTables, settings, reprice]);

  useEffect(() => {
    if (!editOrderId || !Object.keys(rateTables.master).length) return;
    (async () => {
      try {
        const { fetchOrderById } = await import("@/modules/orders");
        const o = await fetchOrderById(editOrderId);
        if (!o || String(o.status).toLowerCase() !== "draft") return;
        if (String(o.orderType || "").toUpperCase() !== "RETAIL") return;
        setEditingOrderId(o.id);
        setSelectedCustomerId((o as { customerId?: string }).customerId || null);
        setDeliveryDate(o.deliveryDate || "");
        setNotes(o.notes || "");
        const draft = (o as { customerMasterDraft?: Record<string, any> }).customerMasterDraft;
        if (draft && typeof draft === "object") {
          setCustomerName(String(draft.name || o.customerName || o.customer?.name || ""));
          setContact(String(draft.mobile || o.customerContact || o.customer?.contact || ""));
          setCustEmail(String(draft.email || ""));
          setCustGstType(
            draft.gstRegistrationType === "REGISTERED_REGULAR"
              ? "REGISTERED_REGULAR"
              : "UNREGISTERED"
          );
          setCustGstin(String(draft.gstin || ""));
          setCustPan(String(draft.pan || ""));
          const bill = draft.billingAddress || {};
          setCustBilling({
            ...DEFAULT_RETAIL_ADDRESS,
            line1: String(bill.line1 || ""),
            line2: String(bill.line2 || ""),
            city: String(bill.city || ""),
            district: String(bill.district || ""),
            state: String(bill.state || "").trim() || DEFAULT_RETAIL_ADDRESS.state,
            stateCode:
              String(bill.stateCode || "").trim() ||
              DEFAULT_RETAIL_ADDRESS.stateCode,
            pincode: String(bill.pincode || ""),
            country: String(bill.country || "India"),
          });
          setAddress(
            [bill.line1, bill.line2].filter(Boolean).join(", ") ||
              o.customer?.address ||
              ""
          );
          setCity(String(bill.city || o.customerCity || o.customer?.city || ""));
          const shipSame = draft.shippingSameAsBilling !== false;
          setCustShipSame(shipSame);
          const ship = draft.shippingAddress || bill;
          setCustShipping({
            ...DEFAULT_RETAIL_ADDRESS,
            line1: String(ship.line1 || ""),
            line2: String(ship.line2 || ""),
            city: String(ship.city || ""),
            district: String(ship.district || ""),
            state: String(ship.state || "").trim() || DEFAULT_RETAIL_ADDRESS.state,
            stateCode:
              String(ship.stateCode || "").trim() ||
              DEFAULT_RETAIL_ADDRESS.stateCode,
            pincode: String(ship.pincode || ""),
            country: String(ship.country || "India"),
          });
        } else {
          setCustomerName(o.customerName || o.customer?.name || "");
          setContact(o.customerContact || o.customer?.contact || "");
          setAddress(o.customer?.address || "");
          setCity(o.customerCity || o.customer?.city || "");
        }
        if (o.items?.length) {
          setItems(
            o.items.map((it) =>
              applyRetailPricingToItem(it, rateTables, settings) as DraftItem
            )
          );
        }
        const leadId = (o as any).retailFollowUpId || (o as any).followUpId;
        if (leadId) setFollowUpId(String(leadId));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [editOrderId, rateTables, settings]);

  const rateError = useMemo(
    () => validateRetailItemsAgainstPartyRate(items),
    [items]
  );
  const totalAmount = useMemo(() => sumRetailTotal(items), [items]);
  const totalQty = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
    [items]
  );

  const addItem = () => {
    const base = emptyOrderItem() as DraftItem;
    // New items intentionally start with no product choice. The salesperson
    // must progress Type → Warranty → Size/Thickness → Fabric → Quantity.
    base.type = "";
    base.sizeType = "regular";
    base.regularSize = undefined;
    base.thickness = undefined;
    base.warranty = undefined;
    base.fabric = undefined;
    base.notes = "";
    base.quantity = 1;
    base.salesPricingMode = "rate_per_sqft";
    // Ensure unique id even if crypto.randomUUID is unavailable
    if (!base.id) {
      base.id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    setItems((prev) => [...prev, base]);
    // Critical: wizard must edit the NEW line, not the previous one
    setActiveItemId(base.id);
    return base.id;
  };

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      reprice(
        prev.map((it) => {
          if (it.id !== id) return it;

          const next: DraftItem = { ...it, ...patch };
          if (patch.sizeType) {
            setSizeModes((modes) => ({ ...modes, [id]: patch.sizeType as "regular" | "custom" }));
          }
          const typeChanged = patch.type !== undefined;
          const warrantyChanged = patch.warranty !== undefined;
          const sizeChanged =
            patch.sizeType !== undefined ||
            patch.regularSize !== undefined ||
            patch.length !== undefined ||
            patch.width !== undefined ||
            patch.height !== undefined ||
            patch.thickness !== undefined;
          const fabricChanged = patch.fabric !== undefined;

          // Any upstream selection change invalidates downstream choices.
          if (typeChanged) {
            setSizeModes((modes) => {
              const copy = { ...modes };
              delete copy[id];
              return copy;
            });
            next.warranty = undefined;
            next.regularSize = undefined;
            next.length = undefined;
            next.width = undefined;
            next.height = undefined;
            next.thickness = undefined;
            next.fabric = undefined;
            next.quantity = 1;
          } else if (warrantyChanged) {
            setSizeModes((modes) => {
              const copy = { ...modes };
              delete copy[id];
              return copy;
            });
            next.regularSize = undefined;
            next.length = undefined;
            next.width = undefined;
            next.height = undefined;
            next.thickness = undefined;
            next.fabric = undefined;
            next.quantity = 1;
          } else if (sizeChanged) {
            next.fabric = undefined;
            next.quantity = 1;
          } else if (fabricChanged) {
            next.quantity = Math.max(1, Number(next.quantity) || 1);
          }

          const configChanged = typeChanged || warrantyChanged || sizeChanged || fabricChanged;
          if (configChanged) {
            next.actualSaleRate = undefined;
            next.actualSaleAmount = undefined;
            next.salesPricingMode = "rate_per_sqft";
            setSaleRateDrafts((drafts) => {
              if (!(id in drafts)) return drafts;
              const copy = { ...drafts };
              delete copy[id];
              return copy;
            });
          }

          return next;
        })
      )
    );
  };
  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      setActiveItemId((cur) => {
        if (cur !== id) return cur;
        return next.length ? next[next.length - 1].id : null;
      });
      return next;
    });
    setSaleRateDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    setQuantityDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    setSizeModes((modes) => {
      const next = { ...modes };
      delete next[id];
      return next;
    });
  };

  const editItem = (id: string) => {
    setActiveItemId(id);
    setStep("type");
  };


  const applyMasterCustomer = (c: RetailCustomerMaster) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setContact(c.mobile);
    setCustEmail(c.email || "");
    setCustGstType(c.gstRegistrationType || "UNREGISTERED");
    setCustGstin(c.gstin || "");
    setCustPan(c.pan || "");
    const bill = c.billingAddress || {};
    const billMerged: Address = {
      ...DEFAULT_RETAIL_ADDRESS,
      ...bill,
      state: String(bill.state || "").trim() || DEFAULT_RETAIL_ADDRESS.state,
      stateCode:
        String(bill.stateCode || "").trim() || DEFAULT_RETAIL_ADDRESS.stateCode,
    };
    setCustBilling(billMerged);
    setAddress(
      [billMerged.line1, billMerged.line2].filter(Boolean).join(", ") || ""
    );
    setCity(billMerged.city || "");
    setCustShipSame(c.shippingSameAsBilling !== false);
    if (c.shippingAddress) {
      const ship = c.shippingAddress;
      setCustShipping({
        ...DEFAULT_RETAIL_ADDRESS,
        ...ship,
        state: String(ship.state || "").trim() || DEFAULT_RETAIL_ADDRESS.state,
        stateCode:
          String(ship.stateCode || "").trim() || DEFAULT_RETAIL_ADDRESS.stateCode,
      });
    } else {
      setCustShipping({ ...billMerged });
    }
    setCustomerSearch("");
    setCustomerSearchOpen(false);
    setCustomerHits([]);
  };

  const runCustomerSearch = async (term: string) => {
    setCustomerSearch(term);
    if (!user?.uid) return;
    if (!term.trim()) {
      setCustomerHits([]);
      return;
    }
    try {
      const digits = term.replace(/\D/g, "");
      const hits =
        digits.length >= 8
          ? await searchCustomers({ salespersonId: user.uid, mobile: term })
          : await searchCustomers({ salespersonId: user.uid, term });
      setCustomerHits(hits.slice(0, 8));
      setCustomerSearchOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  /** Build pending GST customer payload for the order (finalized only after Admin approval). */
  const buildCustomerMasterDraft = () => {
    const billing = {
      ...DEFAULT_RETAIL_ADDRESS,
      ...custBilling,
      line1: custBilling.line1?.trim() || address.trim(),
      city: custBilling.city?.trim() || city.trim(),
      state: custBilling.state?.trim() || DEFAULT_RETAIL_ADDRESS.state,
      stateCode: custBilling.stateCode?.trim() || DEFAULT_RETAIL_ADDRESS.stateCode,
      country: custBilling.country || "India",
    };
    const shipping = custShipSame
      ? { ...billing }
      : {
          ...DEFAULT_RETAIL_ADDRESS,
          ...custShipping,
          state: custShipping.state?.trim() || DEFAULT_RETAIL_ADDRESS.state,
          stateCode:
            custShipping.stateCode?.trim() || DEFAULT_RETAIL_ADDRESS.stateCode,
        };

    return {
      name: customerName.trim(),
      mobile: contact.trim(),
      email: custEmail.trim() || undefined,
      gstRegistrationType: custGstType,
      gstin: custGstin.trim() || undefined,
      pan: custPan.trim() || undefined,
      billingAddress: billing,
      shippingSameAsBilling: custShipSame,
      shippingAddress: shipping,
    };
  };

  /**
   * Retail order customer gate — only compulsory fields:
   * name, contact, address line 1, city, state; GSTIN if registered.
   * PIN, line2, district, email, PAN, shipping are optional.
   */
  const validateCustomerCompulsory = (): string | null => {
    if (!customerName.trim()) {
      return t("Customer name is required.");
    }
    if (!contact.trim()) {
      return t("Contact is required.");
    }
    const mobileDigits = contact.replace(/\D/g, "");
    const ten =
      mobileDigits.length === 12 && mobileDigits.startsWith("91")
        ? mobileDigits.slice(2)
        : mobileDigits.length === 10
          ? mobileDigits
          : mobileDigits;
    if (!/^[6-9]\d{9}$/.test(ten)) {
      return t("Enter a valid 10-digit Indian mobile number.");
    }
    const billLine = custBilling.line1?.trim() || address.trim();
    const billCity = custBilling.city?.trim() || city.trim();
    const billState =
      custBilling.state?.trim() ||
      custBilling.stateCode?.trim() ||
      "";
    if (!billLine) {
      return t("Address line 1 is required.");
    }
    if (!billCity) {
      return t("City is required.");
    }
    if (!billState) {
      return t("State is required.");
    }
    if (custGstType === "REGISTERED_REGULAR") {
      if (!custGstin.trim()) {
        return t("GSTIN is required for registered customers.");
      }
      const gst = custGstin.trim().toUpperCase();
      if (
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gst)
      ) {
        return t(
          "GSTIN must be 15 characters in valid format (e.g. 24AAAAA0000A1Z5)."
        );
      }
    }
    return null;
  };

  const validateCustomerDraft = (): string | null => {
    return validateCustomerCompulsory();
  };

  const validateForm = (): string | null => {
    const custErr = validateCustomerCompulsory();
    if (custErr) return custErr;
    if (!items.length) {
      return t("Add at least one mattress item.");
    }
    for (const it of items) {
      if (!mattressTypeKeyFromLabel(it.type)) {
        return t("Select mattress type for every item.");
      }
      if (!String(it.warranty || "").trim()) {
        return t("Select warranty for every item.");
      }
      if (it.sizeType === "custom") {
        if (!it.length || !it.width || !(it.height || it.thickness)) {
          return t("Custom size requires length, width and thickness.");
        }
      } else if (!it.regularSize || !it.thickness) {
        return t("Select mattress size and thickness for every item.");
      }
      if (!String(it.designCode || "").trim() && !it.fabric) {
        return t("Fabric design selection is required.");
      }
      if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) < 1) {
        return t("Quantity must be a whole number greater than zero.");
      }
    }
    const err = validateRetailItemsAgainstPartyRate(items);
    if (err) return t("Sale rate cannot be below Party Rate.");
    return null;
  };

  const goPreview = () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep("preview");
  };

  const submit = async (status: "draft" | "submitted") => {
    setError("");
    if (!user?.uid) return;
    const err = validateForm();
    if (err) {
      setError(err);
      setStep("basket");
      return;
    }
    setSaving(true);
    try {
      // Validate only — Customer Master is finalized after Admin approval
      const draftErr = validateCustomerDraft();
      if (draftErr) {
        setError(draftErr);
        setStep("customer");
        setSaving(false);
        return;
      }

      const draft = buildCustomerMasterDraft();
      const snapAddress =
        custBilling.line1?.trim() ||
        address.trim() ||
        [custBilling.line1, custBilling.line2].filter(Boolean).join(", ");
      const snapCity = custBilling.city?.trim() || city.trim();

      const { orderId, orderNumber } = await saveRetailOrder({
        orderId: editingOrderId || undefined,
        salespersonId: user.uid,
        salespersonName: user.name || user.email || "Salesperson",
        // Only pass customerId when selecting an EXISTING master — do not create at submit
        customerId: selectedCustomerId || undefined,
        customerMasterDraft: draft,
        customer: {
          name: customerName,
          contact,
          address: snapAddress,
          city: snapCity,
        },
        deliveryDate,
        notes,
        items,
        status,
        ...(followUpId ? { retailFollowUpId: followUpId } as any : {}),
      });
      // Convert linked lead ONLY on submit (never on draft)
      if (status === "submitted" && followUpId) {
        try {
          const { convertLeadOnRetailOrderSubmit } = await import(
            "@/modules/retailFollowUps"
          );
          await convertLeadOnRetailOrderSubmit(followUpId, orderId);
        } catch (e) {
          console.warn("Could not convert lead", e);
        }
      }
      if (status === "submitted") {
        try {
          const { notifyAdminsNewRetailOrder } = await import(
            "@/modules/notifications"
          );
          await notifyAdminsNewRetailOrder({
            orderId,
            orderNumber,
            salespersonName: user.name || user.email || undefined,
            customerName: customerName.trim(),
          });
        } catch {
          /* ignore */
        }
      }
      router.replace(`/salesperson/orders/${orderId}`);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not save order.");
    } finally {
      setSaving(false);
    }
  };


  const goWizardBack = () => {
    if (step === "preview") setStep("basket");
    else if (step === "customer") router.push("/salesperson/orders");
    else if (step === "basket") setStep("quantity");
    else if (step === "type") setStep(items.length > 1 ? "basket" : "customer");
    else {
      const map: Record<string, Step> = {
        warranty: "type",
        size: "warranty",
        thickness: "size",
        design: "thickness",
        quantity: "design",
      };
      setStep(map[step] || "customer");
    }
  };

  const advanceWizardStep = () => {
    const order: Step[] = ["customer", "type", "warranty", "size", "thickness", "design", "quantity", "basket", "preview"];
    const i = order.indexOf(step);
    if (i < 0 || i >= order.length - 1) return;
    const next = order[i + 1];
    if (next === "type" && !items.length) {
      addItem();
    } else if (next === "type" && items.length && !activeItemId) {
      setActiveItemId(items[0].id);
    }
    setStep(next);
  };

  return (
    <div className="space-y-4 pb-36 w-full min-w-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            step === "preview"
              ? setStep("basket")
              : step === "customer"
                ? router.push("/salesperson/orders")
                : step === "basket"
                  ? setStep("quantity")
                  : step === "type"
                    ? setStep(items.length ? "basket" : "customer")
                    : setStep(
                        (
                          {
                            warranty: "type",
                            size: "warranty",
                            thickness: "size",
                            design: "thickness",
                            quantity: "design",
                          } as Record<string, Step>
                        )[step] || "customer"
                      )
          }
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              <T>New Retail Sale</T>
            </h1>
            <WizardSpeechButton step={step === "type" ? "mattress" : step} />
          </div>
          <p className="text-xs text-slate-500">
            {step === "preview" ? (
              <T>Preview · Draft or Submit</T>
            ) : step === "customer" ? (
              <T>Customer</T>
            ) : (
              <T>Mattress</T>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}


      {step === "preview" ? (
        <>
          <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-1 text-sm">
            <p className="text-xs font-bold text-slate-500 uppercase"><T>Customer</T></p>
            <p className="font-semibold text-slate-900">{customerName}</p>
            <p className="text-slate-600">{contact}</p>
            <p className="text-slate-600">{address}</p>
            <p className="text-slate-600">{city}</p>
            {deliveryDate && (
              <p className="text-xs text-slate-500 mt-1">
                <T>Delivery Date</T>: {deliveryDate}
              </p>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold text-slate-800"><T>Items</T></p>
            {items.map((it, idx) => (
              <div
                key={it.id}
                className={`bg-white rounded-2xl border p-3 text-sm ${
                  it.belowPartyRate ? "border-rose-400" : "border-slate-100"
                }`}
              >
                <p className="font-semibold">
                  {idx + 1}. {it.type} ·{" "}
                  {it.sizeType === "custom"
                    ? `${it.length}×${it.width}×${it.height || it.thickness}`
                    : it.regularSize}{" "}
                  · Qty {it.quantity}
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs mt-1 text-slate-600">
                  <span><T>Party Rate</T></span>
                  <span className="text-right">{formatAmountINR(it.partyRate)}</span>
                  <span><T>Retail Rate</T></span>
                  <span className="text-right">{formatAmountINR(it.retailRate)}</span>
                  <span><T>Sale Rate</T></span>
                  <span className="text-right font-semibold text-[#330066]">
                    {formatAmountINR(it.actualSaleRate)}
                  </span>
                  <span><T>Sale Amount</T></span>
                  <span className="text-right font-bold text-[#330066]">
                    {formatAmountINR(it.actualSaleAmount)}
                  </span>
                </div>
                {it.belowPartyRate && (
                  <p className="text-xs font-semibold text-rose-600 mt-1">
                    <T>Sale rate cannot be below Party Rate.</T>
                  </p>
                )}
              </div>
            ))}
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500"><T>Total Quantity</T></span>
              <span className="font-semibold">{totalQty}</span>
            </div>
            <div className="flex justify-between text-base mt-1">
              <span className="font-bold"><T>Total Amount</T></span>
              <span className="font-bold text-[#330066]">
                {formatAmountINR(totalAmount)}
              </span>
            </div>
          </section>

          <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/95 border-t border-slate-100 z-30 lg:bottom-0">
            <div className="max-w-lg mx-auto flex gap-2">
              <button
                type="button"
                onClick={() => setStep("basket")}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-semibold text-slate-700"
              >
                <T>Edit</T>
              </button>
              <button
                type="button"
                disabled={saving || !!rateError}
                onClick={() => submit("draft")}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-semibold text-slate-700 disabled:opacity-50"
              >
                <T>Save Draft</T>
              </button>
              <button
                type="button"
                disabled={saving || !!rateError}
                onClick={() => submit("submitted")}
                className="flex-[1.3] py-3 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50"
              >
                {saving ? <T>Saving…</T> : <T>Submit Sale</T>}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {step === "customer" && (
          <>
          <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 pb-24">
            <p className="text-sm font-bold text-slate-800"><T>Customer</T></p>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder={t("Search customer by name or mobile")}
                value={customerSearch}
                onChange={(e) => runCustomerSearch(e.target.value)}
                onFocus={() => customerHits.length && setCustomerSearchOpen(true)}
              />
              {customerSearchOpen && customerHits.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {customerHits.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      onClick={() => applyMasterCustomer(c)}
                    >
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="text-slate-500"> · {c.mobile}</span>
                      {c.billingAddress?.city ? (
                        <span className="text-slate-400"> · {c.billingAddress.city}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomerId && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">
                <T>Linked to customer master</T>
              </p>
            )}
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder={t("Customer Name") + " *"}
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setSelectedCustomerId(null);
              }}
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder={t("Contact") + " *"}
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setSelectedCustomerId(null);
              }}
              inputMode="tel"
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder={t("Email")}
              type="email"
              value={custEmail}
              onChange={(e) => setCustEmail(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                <T>GST Registration Type</T>
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={custGstType}
                onChange={(e) =>
                  setCustGstType(e.target.value as CustomerGstRegistrationType)
                }
              >
                <option value="UNREGISTERED">Unregistered</option>
                <option value="REGISTERED_REGULAR">Registered</option>
              </select>
            </div>
            {custGstType === "REGISTERED_REGULAR" && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="GSTIN *"
                  value={custGstin}
                  maxLength={15}
                  onChange={(e) => setCustGstin(e.target.value.toUpperCase())}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="PAN"
                  value={custPan}
                  maxLength={10}
                  onChange={(e) => setCustPan(e.target.value.toUpperCase())}
                />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                <T>Billing address</T> *
              </p>
              <AddressFields
                value={custBilling}
                onChange={(a) => {
                  setCustBilling(a);
                  setAddress([a.line1, a.line2].filter(Boolean).join(", "));
                  setCity(a.city || "");
                }}
                idPrefix="ord-bill"
                compact
                requiredCore
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={custShipSame}
                onChange={(e) => setCustShipSame(e.target.checked)}
              />
              <T>Shipping same as billing</T>
            </label>
            {!custShipSame && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  <T>Shipping address</T>
                </p>
                <AddressFields
                  value={custShipping}
                  onChange={setCustShipping}
                  idPrefix="ord-ship"
                  compact
                />
              </div>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">
                <T>Delivery Date</T>
              </span>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </label>
          </section>
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-3">
            <button type="button" className="w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold" onClick={() => {
              const gate = validateCustomerCompulsory();
              if (gate) {
                alert(gate);
                return;
              }
              if (!items.length) {
                addItem();
              } else if (!activeItemId) {
                setActiveItemId(items[0].id);
              }
              setStep("type");
            }}><T>Next</T></button>
          </div>
          </>
          )}
          

          {step === "basket" && (
            <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">
              <T>Mattress Items</T>
            </p>
            <button
              type="button"
              onClick={() => {
                addItem();
                setStep("type");
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#330066]"
            >
              <Plus className="w-4 h-4" />
              <T>Add item</T>
            </button>
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              <T>No items yet. Tap Add item.</T>
            </div>
          )}
            </>
          )}

          {/* Show saved lines while configuring another item */}
          {(
            step === "type" ||
            step === "warranty" ||
            step === "size" ||
            step === "thickness" ||
            step === "design" ||
            step === "quantity"
          ) && items.length > 1 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                <T>Items in this order</T>
              </p>
              {items.map((row, i) => {
                const isActive = row.id === (activeItemId || items[0]?.id);
                return (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 ${
                      isActive ? "bg-[#330066]/10 text-[#330066] font-semibold" : "text-slate-600"
                    }`}
                  >
                    <span className="truncate">
                      {i + 1}. {row.type || <T>Not configured</T>}
                      {row.type
                        ? ` · ${row.warranty || "—"} · ${row.regularSize || (row.sizeType === "custom" ? "Custom" : "—")} · qty ${row.quantity || 1}`
                        : ""}
                    </span>
                    {!isActive && row.type ? (
                      <button
                        type="button"
                        className="shrink-0 text-[10px] font-bold text-[#330066]"
                        onClick={() => editItem(row.id)}
                      >
                        <T>Edit</T>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Item wizard steps only (positive check avoids TS narrowing issues) */}
          {(
            step === "type" ||
            step === "warranty" ||
            step === "size" ||
            step === "thickness" ||
            step === "design" ||
            step === "quantity"
          ) && items
            .filter((it) => it.id === (activeItemId || items[0]?.id))
            .map((it, idx) => {
            const typeKey = mattressTypeKeyFromLabel(it.type);
            const fabrics = fabricsForMattressType(typeKey);
            const thicknesses = standardThicknessOptions(it.type, it.warranty);
            const warranties = warrantyOptionsForItem(
              it.type,
              parseThicknessInches(it.sizeType === "custom" ? it.height : it.thickness)
            );
            const invalid = !!it.belowPartyRate;
            const selectedSizeMode = sizeModes[it.id] || (it.regularSize ? "regular" : undefined);
            const isCustom = selectedSizeMode === "custom";
            return (
              <section
                key={it.id}
                className={`bg-white rounded-2xl border p-4 space-y-2 ${
                  invalid
                    ? "border-rose-400 ring-1 ring-rose-200"
                    : "border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    <T>Item</T>{" "}
                    {Math.max(1, items.findIndex((x) => x.id === it.id) + 1)}
                    {items.length > 1 ? (
                      <span className="text-slate-400 font-medium">
                        {" "}
                        / {items.length}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="p-1.5 text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Step 1: Mattress Type */}
                {step === "type" && (
                <>
                <p className="text-xs font-semibold text-slate-500"><T>Mattress Type</T></p>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_MATTRESS_TYPE_LABELS.map((lab) => (
                    <button
                      key={lab}
                      type="button"
                      onClick={() => updateItem(it.id, { type: lab })}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-semibold border ${
                        it.type === lab
                          ? "bg-[#330066]/10 text-[#330066] border-[#330066]"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      <MattressTypeIcon type={lab} size={40} />
                      <span>{tMattressType(lab, t)}</span>
                    </button>
                  ))}
                </div>

                <StickyNav
                  onBack={goWizardBack}
                  onNext={() => {
                    if (!it.type) { alert(t("Please select a valid mattress type.")); return; }
                    setStep("warranty");
                  }}
                  nextDisabled={!it.type}
                />
                </>
                )}

                {/* Step 2: Warranty */}
                {step === "warranty" && typeKey && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500"><T>Warranty</T></p>
                    <div className="flex flex-wrap gap-2">
                      {warrantyKeysForMattress(typeKey).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateItem(it.id, { warranty: w })}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                            it.warranty === w
                              ? "bg-[#330066] text-white border-[#330066]"
                              : "bg-white text-slate-700 border-slate-200"
                          }`}
                        >
                          {WARRANTY_LABELS[w] || `${w} Year`}
                        </button>
                      ))}
                    </div>
                    <StickyNav
                      onBack={goWizardBack}
                      onNext={() => {
                        if (!it.warranty) { alert(t("Select warranty for every item.")); return; }
                        setStep("size");
                      }}
                      nextDisabled={!it.warranty}
                    />
                  </div>
                )}

                {/* Step 3: Size */}
                {step === "size" && typeKey && it.warranty && (
                  <div className="space-y-2 pb-24">
                    <p className="text-xs font-semibold text-slate-500"><T>Size</T></p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(it.id, {
                            sizeType: "regular",
                            regularSize: undefined,
                            length: undefined,
                            width: undefined,
                            height: undefined,
                            thickness: undefined,
                          })
                        }
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                          !isCustom
                            ? "bg-[#330066] text-white"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <T>Regular</T>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(it.id, {
                            sizeType: "custom",
                            regularSize: undefined,
                            length: undefined,
                            width: undefined,
                            height: undefined,
                            thickness: undefined,
                          })
                        }
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                          isCustom
                            ? "bg-[#330066] text-white"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <T>Custom</T>
                      </button>
                    </div>

                    {isCustom ? (
                      <div className="space-y-2">
                        <MeasureField kind="length" label="Length">
                          <input
                            type="number"
                            min={60}
                            max={108}
                            step="0.01"
                            className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-center font-semibold"
                            value={it.length ?? ""}
                            onChange={(e) =>
                              updateItem(it.id, {
                                length: Number(e.target.value) || undefined,
                              })
                            }
                            placeholder="72"
                          />
                        </MeasureField>
                        <MeasureField kind="width" label="Width">
                          <input
                            type="number"
                            min={1}
                            max={108}
                            step="0.01"
                            className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-center font-semibold"
                            value={it.width ?? ""}
                            onChange={(e) =>
                              updateItem(it.id, {
                                width: Number(e.target.value) || undefined,
                              })
                            }
                            placeholder="36"
                          />
                        </MeasureField>
                        <MeasureField kind="thickness" label="Thickness">
                          <input
                            type="number"
                            min={1}
                            step="1"
                            className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-center font-semibold"
                            value={it.height ?? it.thickness ?? ""}
                            onChange={(e) => {
                              const v = Number(e.target.value) || undefined;
                              updateItem(it.id, {
                                height: v,
                                thickness: v != null ? String(v) : undefined,
                              });
                            }}
                            placeholder="6"
                          />
                        </MeasureField>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500"><T>Mattress Size</T></p>
                        <div className="grid grid-cols-2 gap-2">
                          {REGULAR_SIZES.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() =>
                                updateItem(it.id, {
                                  sizeType: "regular",
                                  regularSize: size,
                                })
                              }
                              className={`py-2 rounded-xl text-xs font-semibold border ${
                                it.regularSize === size
                                  ? "bg-[#330066] text-white border-[#330066]"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500"><T>Thickness</T></p>
                        <div className="flex flex-wrap gap-2">
                          {thicknesses.map((th) => (
                            <button
                              key={th}
                              type="button"
                              onClick={() => updateItem(it.id, { thickness: th })}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                                String(it.thickness || "") === String(th)
                                  ? "bg-[#330066] text-white border-[#330066]"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {th}&quot;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <StickyNav
                      onBack={goWizardBack}
                      onNext={() => {
                        const sizeOk = isCustom
                          ? Number(it.length) > 0 && Number(it.width) > 0 && Number(it.height || it.thickness) > 0
                          : !!it.regularSize && !!it.thickness;
                        if (!sizeOk) {
                          alert(t("Select mattress size and thickness for every item."));
                          return;
                        }
                        setStep("design");
                      }}
                      nextDisabled={
                        isCustom
                          ? !(Number(it.length) > 0 && Number(it.width) > 0 && Number(it.height || it.thickness) > 0)
                          : !(it.regularSize && it.thickness)
                      }
                    />
                  </div>
                )}

                {/* Step 4: Design (catalogue) */}
                {step === "design" && typeKey && (
                  <div className="space-y-3 pb-24">
                    <p className="text-sm font-semibold text-slate-800"><T>Choose Design</T></p>
                    <p className="text-xs text-slate-500"><T>Fabric design selection is required.</T></p>
                    {(() => {
                      const allowed = new Set((fabrics || []).map((f) => normalizeFabric(f)));
                      const slides = designSlides.filter((d) => {
                        const raw = String(d.fabric || "").trim();
                        if (!raw) return true;
                        return allowed.has(normalizeFabric(raw));
                      });
                      if (!slides.length) {
                        return (
                          <p className="text-sm text-slate-500">
                            <T>No designs available for this mattress type.</T>
                          </p>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {slides.map((d) => {
                            const selected = it.designCode === d.designCode;
                            return (
                              <button
                                key={d.designCode}
                                type="button"
                                onClick={() =>
                                  updateItem(it.id, {
                                    designCode: d.designCode,
                                    designName: d.designName,
                                    fabric: normalizeFabric(d.fabric) || fabrics[0],
                                  } as Partial<DraftItem>)
                                }
                                className={`rounded-2xl border-2 overflow-hidden text-left bg-white ${
                                  selected
                                    ? "border-[#330066] ring-2 ring-[#330066]/20"
                                    : "border-slate-200"
                                }`}
                              >
                                <div className="aspect-square bg-slate-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={d.url} alt={d.designCode} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2">
                                  <p className="font-bold text-sm text-slate-900 truncate">{d.designCode}</p>
                                  <p className="text-xs text-slate-500 truncate">{d.designName}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <StickyNav
                      onBack={goWizardBack}
                      onNext={() => {
                        if (!String(it.designCode || "").trim()) {
                          alert(t("Fabric design selection is required."));
                          return;
                        }
                        setStep("quantity");
                      }}
                      nextDisabled={!String(it.designCode || "").trim()}
                    />
                  </div>
                )}

                {/* Step 5: Quantity + pricing */}
                {step === "quantity" && typeKey && it.warranty && (it.fabric || it.designCode) && (
                    <div className="space-y-3 pb-24">
                      <div>
                        <span className="text-xs text-slate-500"><T>Quantity</T></span>
                        <div className="mt-0.5 flex items-center gap-2">
                          <button
                            type="button"
                            className="w-10 h-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-700"
                            onClick={() =>
                              updateItem(it.id, {
                                quantity: Math.max(1, (Number(it.quantity) || 1) - 1),
                              })
                            }
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            className="w-16 h-10 text-center rounded-xl border border-slate-200 text-sm font-bold"
                            value={quantityDrafts[it.id] ?? Math.max(1, Number(it.quantity) || 1)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setQuantityDrafts((d) => ({ ...d, [it.id]: raw }));
                              if (raw === "") return;
                              const value = Number(raw);
                              if (Number.isInteger(value) && value > 0) {
                                updateItem(it.id, { quantity: value });
                              }
                            }}
                            onBlur={() => {
                              setQuantityDrafts((d) => {
                                if (!(it.id in d)) return d;
                                const copy = { ...d };
                                delete copy[it.id];
                                return copy;
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="w-10 h-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-700"
                            onClick={() =>
                              updateItem(it.id, {
                                quantity: Math.max(1, (Number(it.quantity) || 1) + 1),
                              })
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-xl p-3">
                        <div>
                          <p className="text-slate-500"><T>Party Rate</T></p>
                          <p className="font-semibold text-slate-800">
                            {formatAmountINR(it.partyRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500"><T>Retail Rate</T></p>
                          <p className="font-semibold text-slate-800">
                            {formatAmountINR(it.retailRate)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500"><T>Default Retail Amount</T></p>
                          <p className="font-semibold text-slate-800">
                            {formatAmountINR(it.defaultRetailAmount)}
                            {it.sqFt != null ? (
                              <span className="text-slate-400 font-normal"> · {it.sqFt} sq.ft</span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">
                          <T>Your Sale Rate</T> (₹/sq.ft)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`mt-0.5 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                            invalid ? "border-rose-400 bg-rose-50" : "border-slate-200"
                          }`}
                          value={saleRateDrafts[it.id] ?? (it.actualSaleRate ?? "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setSaleRateDrafts((d) => ({ ...d, [it.id]: raw }));
                            if (raw === "") return;
                            const value = Number(raw);
                            if (Number.isFinite(value) && value >= 0) {
                              updateItem(it.id, {
                                salesPricingMode: "rate_per_sqft",
                                actualSaleRate: value,
                              });
                            }
                          }}
                          onBlur={() => {
                            setSaleRateDrafts((d) => {
                              if (!(it.id in d)) return d;
                              const raw = d[it.id];
                              const copy = { ...d };
                              delete copy[it.id];
                              return copy;
                            });
                          }}
                        />
                      </label>
                      {invalid && (
                        <p className="text-xs font-semibold text-rose-600">
                          <T>Sale rate cannot be below Party Rate.</T>
                        </p>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500"><T>Sale Amount</T></span>
                        <span className="font-bold text-[#330066]">
                          {formatAmountINR(it.actualSaleAmount)}
                        </span>
                      </div>
                    <StickyNav
                      onBack={goWizardBack}
                      onNext={() => setStep("basket")}
                      nextLabel={<T>Add to Order</T>}
                    />
                    </div>
                )}
              </section>
            );
          })}

          {step === "basket" && (
            <>
          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500"><T>Total Quantity</T></span>
              <span className="font-semibold">{totalQty}</span>
            </div>
            <div className="flex justify-between text-base mt-1">
              <span className="font-bold text-slate-800">
                <T>Total Amount</T>
              </span>
              <span className="font-bold text-[#330066]">
                {formatAmountINR(totalAmount)}
              </span>
            </div>
          </section>

          {/* Basket item summary */}
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.id} className="bg-white rounded-2xl border border-slate-100 p-3 text-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {idx + 1}. {it.type || "—"} · {it.warranty || "—"} · {it.regularSize || (it.sizeType === "custom" ? "Custom" : "—")} · {it.thickness || it.height || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.designCode || it.fabric || "—"} · qty {it.quantity} · {formatAmountINR(it.actualSaleAmount)}
                    </p>
                    {it.notes ? (
                      <p className="text-xs text-slate-400 mt-0.5"><T>Notes</T>: {it.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => editItem(it.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#330066] border border-[#330066]/30"
                    >
                      <T>Edit</T>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (items.length <= 1) {
                          alert(t("At least one mattress item is required."));
                          return;
                        }
                        removeItem(it.id);
                      }}
                      className="p-1.5 rounded-lg text-rose-600 border border-rose-100"
                      aria-label={t("Delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-500"><T>Item notes</T></span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("Optional notes for this mattress")}
                    value={it.notes || ""}
                    onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/95 border-t border-slate-100 z-30 lg:bottom-0">
            <div className="max-w-lg mx-auto flex gap-2">
              <button
                type="button"
                disabled={saving || !items.length}
                onClick={() => submit("draft")}
                className="flex-1 py-3 rounded-2xl border border-slate-300 font-semibold text-slate-800 disabled:opacity-50"
              >
                <T>Save Draft</T>
              </button>
              <button
                type="button"
                disabled={!items.length}
                onClick={goPreview}
                className="flex-[1.3] py-3 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50"
              >
                <T>Preview Order</T>
              </button>
            </div>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
