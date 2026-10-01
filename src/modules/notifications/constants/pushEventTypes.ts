/**
 * Server-side FCM event types (aligned with Cloud Functions).
 * Actual dispatch is performed by Cloud Functions (Admin SDK).
 */

export const PUSH_EVENT = {
  NEW_ORDER: "NEW_ORDER",
  ORDER_APPROVED: "ORDER_APPROVED",
  ORDER_REJECTED: "ORDER_REJECTED",
  EMPLOYEE_ASSIGNMENT: "EMPLOYEE_ASSIGNMENT",
  PRODUCTION_STARTED: "PRODUCTION_STARTED",
  READY_TO_DISPATCH: "READY_TO_DISPATCH",
  RETAIL_FOLLOWUP_DUE: "RETAIL_FOLLOWUP_DUE",
} as const;

export type PushEventType = (typeof PUSH_EVENT)[keyof typeof PUSH_EVENT];
