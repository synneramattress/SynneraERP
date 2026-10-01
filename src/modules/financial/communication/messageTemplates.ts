/**
 * Ledger communication templates (Phase 10).
 * Provider send is Phase 11 — here we only generate text.
 */

export type MessageTemplateId =
  | "OUTSTANDING_TAX_INVOICE"
  | "OUTSTANDING_OTHER_ORDER"
  | "STATEMENT_TAX_INVOICE"
  | "STATEMENT_OTHER_ORDER"
  | "PAYMENT_RECEIPT";

export type MessageTemplateDef = {
  id: MessageTemplateId;
  label: string;
  description: string;
  /** Placeholders: {{partyName}}, {{amount}}, {{period}}, etc. */
  body: string;
};

export const MESSAGE_TEMPLATES: MessageTemplateDef[] = [
  {
    id: "OUTSTANDING_TAX_INVOICE",
    label: "Tax invoice outstanding",
    description: "Reminder for tax-invoice ledger balance",
    body: `Dear {{partyName}},

This is a gentle reminder that your outstanding balance on tax invoices with Synnera is {{amount}}.

Please arrange payment at your earliest convenience.

Thank you,
Synnera`,
  },
  {
    id: "OUTSTANDING_OTHER_ORDER",
    label: "Other order outstanding",
    description: "Reminder for other-order ledger balance",
    body: `Dear {{partyName}},

Your outstanding balance on other orders with Synnera is {{amount}}.

Please settle this amount at the earliest.

Thank you,
Synnera`,
  },
  {
    id: "STATEMENT_TAX_INVOICE",
    label: "Tax invoice statement",
    description: "Period statement summary for tax invoices",
    body: `Dear {{partyName}},

Please find your Tax Invoice account statement for {{period}}.

Opening: {{opening}}
Debit: {{debit}}
Credit: {{credit}}
Closing / outstanding: {{closing}}

Thank you,
Synnera`,
  },
  {
    id: "STATEMENT_OTHER_ORDER",
    label: "Other order statement",
    description: "Period statement summary for other orders",
    body: `Dear {{partyName}},

Please find your Other Order account statement for {{period}}.

Opening: {{opening}}
Debit: {{debit}}
Credit: {{credit}}
Closing / outstanding: {{closing}}

Thank you,
Synnera`,
  },
  {
    id: "PAYMENT_RECEIPT",
    label: "Payment received",
    description: "Acknowledge a recorded payment",
    body: `Dear {{partyName}},

We have received your payment of {{amount}}{{invoicePart}} on {{paymentDate}} ({{paymentNumber}}).

Thank you,
Synnera`,
  },
];

export function getTemplate(id: MessageTemplateId): MessageTemplateDef {
  const t = MESSAGE_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}
