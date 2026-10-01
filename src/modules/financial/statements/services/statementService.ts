import { fetchLedgerEntries } from "../../ledger/services/ledgerEntriesService";
import type { LedgerType } from "../../ledger/ledgerTypes";
import { buildPartyStatement } from "../statementLogic";
import type { PartyStatement, StatementPeriod } from "../statementTypes";

export async function fetchPartyStatement(opts: {
  partyId: string;
  ledgerType: LedgerType;
  period: StatementPeriod;
}): Promise<PartyStatement> {
  const allEntries = await fetchLedgerEntries(opts.partyId, opts.ledgerType);
  return buildPartyStatement({
    partyId: opts.partyId,
    ledgerType: opts.ledgerType,
    period: opts.period,
    allEntries,
  });
}
