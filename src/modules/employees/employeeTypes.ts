/**
 * Employees domain types — owned by modules/employees
 */

import type {
  AccountStatus,
  Employee as EmployeeDoc,
  EmployeeProfile,
  EmployeeProfileFields,
  UserIdentity,
} from "@/types/identity";

export type { EmployeeProfile, EmployeeProfileFields, AccountStatus };
export type Employee = EmployeeDoc;

export type EmployeeRecord = {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  employeeCode?: string;
  active?: boolean;
  department?: string;
  loginEmail?: string;
  mobile?: string;
  internalNotes?: string;
  [key: string]: unknown;
};

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export function asEmployeeProfile(
  identity: UserIdentity,
  extra?: EmployeeProfileFields
): EmployeeProfile {
  return {
    ...identity,
    role: "employee",
    ...extra,
  };
}
