/**
 * Resolve invoice recipient (Party or Retail Customer) from an Order.
 * Used when Admin creates an invoice from an order — single place for mapping.
 * Does not write Firestore; only reads Party/Customer masters.
 */

import type { Order } from "@/modules/orders";
import {
  fetchPartyById,
  partyDisplayName,
  type PartyRecord,
} from "@/modules/parties";
import {
  fetchCustomerById,
  type RetailCustomerMaster,
} from "@/modules/customers";
import { EMPTY_ADDRESS, type Address } from "@/types/address";
import type { InvoiceSource, InvoiceType } from "./invoiceTypes";

export type ResolvedInvoiceRecipient = {
  name: string;
  legalName?: string;
  gstin: string;
  pan: string;
  mobile: string;
  email: string;
  address: Address;
  partyId?: string;
  customerId?: string;
  source: InvoiceSource;
  invoiceType: InvoiceType;
  placeOfSupply: string;
};

export type ResolveInvoiceRecipientResult =
  | { ok: true; recipient: ResolvedInvoiceRecipient }
  | { ok: false; error: string };

function asAddress(raw: Address | null | undefined, fallbackCity?: string): Address {
  if (!raw || typeof raw !== "object") {
    return {
      ...EMPTY_ADDRESS,
      city: fallbackCity || "",
    };
  }
  return {
    ...EMPTY_ADDRESS,
    line1: String(raw.line1 || ""),
    line2: raw.line2 != null ? String(raw.line2) : "",
    city: String(raw.city || fallbackCity || ""),
    district: raw.district != null ? String(raw.district) : "",
    state: String(raw.state || ""),
    stateCode: String(raw.stateCode || ""),
    pincode: String(raw.pincode || ""),
    country: String(raw.country || "India"),
  };
}

/** True when order is a retail (salesperson) sale. Missing orderType ⇒ party order. */
export function isRetailOrder(
  order: Pick<Order, "orderType"> | null | undefined
): boolean {
  return String(order?.orderType || "").toUpperCase() === "RETAIL";
}

export function mapPartyToRecipient(party: PartyRecord): ResolvedInvoiceRecipient {
  const addr = asAddress(
    party.billingAddress as Address | undefined,
    party.city ? String(party.city) : undefined
  );
  // Legacy free-text address when structured billing is empty
  if (!addr.line1 && typeof party.address === "string" && party.address.trim()) {
    addr.line1 = party.address.trim();
  }
  if (!addr.city && party.city) {
    addr.city = String(party.city);
  }

  const name = partyDisplayName(party);
  const gstin = String(party.gstin || party.gstNumber || "").trim();
  const mobile = String(party.phone || party.contactNumber || "").trim();
  const email = String(party.email || "").trim();
  const pan = String(party.pan || "").trim();
  const legalName = String(party.company || party.shopName || "").trim();

  return {
    name,
    legalName: legalName || undefined,
    gstin,
    pan,
    mobile,
    email,
    address: addr,
    partyId: party.id,
    source: "PARTY",
    // Registered party (GSTIN) → B2B; unregistered party → B2C
    invoiceType: gstin ? "B2B" : "B2C",
    placeOfSupply: addr.state || addr.stateCode || "",
  };
}

export function mapCustomerToRecipient(
  customer: RetailCustomerMaster
): ResolvedInvoiceRecipient {
  const addr = asAddress(customer.billingAddress);
  return {
    name: String(customer.name || "").trim(),
    gstin: String(customer.gstin || "").trim(),
    pan: String(customer.pan || "").trim(),
    mobile: String(customer.mobile || "").trim(),
    email: String(customer.email || "").trim(),
    address: addr,
    customerId: customer.id,
    source: "RETAIL",
    invoiceType: String(customer.gstin || "").trim() ? "B2B" : "B2C",
    placeOfSupply: addr.state || addr.stateCode || "",
  };
}

/**
 * Build recipient from order-embedded retail fields when master is missing.
 */
function mapRetailOrderEmbedToRecipient(
  order: Order
): ResolvedInvoiceRecipient | null {
  const draft = order.customerMasterDraft;
  const rc = order.customer;
  const name = String(draft?.name || rc?.name || order.customerName || "").trim();
  if (!name) return null;

  const addr = asAddress(draft?.billingAddress, rc?.city || order.customerCity);
  if (!addr.line1 && rc?.address) {
    addr.line1 = String(rc.address);
  }
  if (!addr.city && (rc?.city || order.customerCity)) {
    addr.city = String(rc?.city || order.customerCity || "");
  }

  return {
    name,
    gstin: String(draft?.gstin || "").trim(),
    pan: String(draft?.pan || "").trim(),
    mobile: String(
      draft?.mobile || rc?.contact || order.customerContact || ""
    ).trim(),
    email: String(draft?.email || "").trim(),
    address: addr,
    customerId: order.customerId,
    source: "RETAIL",
    invoiceType: "B2C",
    placeOfSupply: addr.state || addr.stateCode || "",
  };
}

/**
 * Resolve Party or Customer for invoice draft from the source order.
 */
export async function resolveInvoiceRecipientFromOrder(
  order: Order
): Promise<ResolveInvoiceRecipientResult> {
  if (isRetailOrder(order)) {
    // Prefer Customer Master when linked
    if (order.customerId) {
      try {
        const customer = await fetchCustomerById(order.customerId);
        if (customer && customer.name?.trim()) {
          return { ok: true, recipient: mapCustomerToRecipient(customer) };
        }
      } catch (e) {
        console.error("[resolveInvoiceRecipient] fetchCustomerById failed", e);
      }
    }

    const embedded = mapRetailOrderEmbedToRecipient(order);
    if (embedded) {
      return { ok: true, recipient: embedded };
    }

    return {
      ok: false,
      error:
        "Retail customer details were not found on this order. Open the order, confirm customer name and address, then try again.",
    };
  }

  // Party order (orderType PARTY or missing)
  const partyId = String(order.partyId || "").trim();
  if (!partyId) {
    return {
      ok: false,
      error: "This order has no party linked. Cannot create an invoice.",
    };
  }

  let party: PartyRecord | null = null;
  try {
    party = await fetchPartyById(partyId);
  } catch (e) {
    console.error("[resolveInvoiceRecipient] fetchPartyById failed", e);
    return {
      ok: false,
      error: "Could not load party details. Check your connection and try again.",
    };
  }

  if (!party) {
    return {
      ok: false,
      error: `Party record not found for this order (id: ${partyId}). Update the party profile or relink the order.`,
    };
  }

  const recipient = mapPartyToRecipient(party);
  if (!recipient.name.trim()) {
    return {
      ok: false,
      error:
        "Party has no display name. Add shop name or company name on the party profile, then try again.",
    };
  }

  // Prefer denormalized order party name only if master name empty (already handled)
  if (!recipient.name && order.partyName) {
    recipient.name = String(order.partyName);
  }

  return { ok: true, recipient };
}
