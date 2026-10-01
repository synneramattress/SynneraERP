/** Employees module — Rates-style structure */

export type { EmployeeRecord, EmployeeStatus } from "./employeeTypes";

export {
  EMPLOYEES_COLLECTION,
  EMPLOYEES_USERS_COLLECTION,
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS_ACTIVE,
  EMPLOYEE_STATUS_INACTIVE,
  EMPLOYEE_COUNTER_DOC,
  EMPLOYEE_ID_PREFIX,
} from "./employeeDefinitions";

export {
  mapEmployee,
  isEmployeeAssignable,
  looksLikeEmployee,
  employeeDisplayName,
  sortEmployeesByName,
  formatEmployeeId,
} from "./logic";

export {
  fetchAllEmployees,
  fetchEmployeeById,
  fetchAssignableEmployees,
  updateEmployee,
  saveEmployeeMirror,
  createEmployeeProfile,
  updateEmployeeStatus,
  generateEmployeeId,
} from "./services/employeesService";

export * from "./speech";
