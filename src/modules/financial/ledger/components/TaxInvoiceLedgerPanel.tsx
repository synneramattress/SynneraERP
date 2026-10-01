"use client";

import { PartyLedgerPanel } from "./PartyLedgerPanel";

type Props = {
  partyId: string;
  createdBy?: string;
};

/** @deprecated Prefer PartyLedgerPanel — kept for import compatibility */
export function TaxInvoiceLedgerPanel({ partyId, createdBy }: Props) {
  return (
    <PartyLedgerPanel
      partyId={partyId}
      ledgerType="TAX_INVOICE"
      createdBy={createdBy}
    />
  );
}
