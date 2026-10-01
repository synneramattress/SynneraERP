"use client";

import { PartyLedgerPanel } from "./PartyLedgerPanel";

type Props = {
  partyId: string;
  createdBy?: string;
};

/** @deprecated Prefer PartyLedgerPanel — kept for import compatibility */
export function OtherOrderLedgerPanel({ partyId, createdBy }: Props) {
  return (
    <PartyLedgerPanel
      partyId={partyId}
      ledgerType="OTHER_ORDER"
      createdBy={createdBy}
    />
  );
}
