/**
 * Employees pure helpers — no Firestore.
 */

import {
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS_ACTIVE,
  EMPLOYEE_STATUS_INACTIVE,
  EMPLOYEE_ID_PREFIX,
  EMPLOYEE_ID_PAD,
} from "./employeeDefinitions";
import type { EmployeeRecord } from "./employeeTypes";

export function mapEmployee(
  id: string,
  data: Record<string, unknown>
): EmployeeRecord {
  return {
    id,
    uid: String(data.uid || id),
    name: data.name != null ? String(data.name) : undefined,
    email: data.email != null ? String(data.email) : undefined,
    phone: data.phone != null ? String(data.phone) : undefined,
    role: data.role != null ? String(data.role) : undefined,
    status: data.status != null ? String(data.status) : undefined,
    employeeCode:
      data.employeeCode != null ? String(data.employeeCode) : undefined,
    active: data.active as boolean | undefined,
    ...data,
  };
}

export function isEmployeeAssignable(e: EmployeeRecord): boolean {
  return (
    e.active !== false &&
    String(e.status || EMPLOYEE_STATUS_ACTIVE).toUpperCase() !==
      EMPLOYEE_STATUS_INACTIVE
  );
}

export function looksLikeEmployee(e: EmployeeRecord): boolean {
  const role = String(e.role || "");
  return (
    role === EMPLOYEE_ROLE ||
    role.includes("employee") ||
    !!e.employeeCode
  );
}

export function employeeDisplayName(e: EmployeeRecord): string {
  return String(e.name || e.email || e.employeeCode || e.id || "Employee");
}

export function sortEmployeesByName(rows: EmployeeRecord[]): EmployeeRecord[] {
  return [...rows].sort((a, b) =>
    employeeDisplayName(a).localeCompare(employeeDisplayName(b), undefined, {
      sensitivity: "base",
    })
  );
}


export function formatEmployeeId(nextNum: number): string {
  return `${EMPLOYEE_ID_PREFIX}${String(nextNum).padStart(EMPLOYEE_ID_PAD, "0")}`;
}
