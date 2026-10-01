/**
 * Global types — identity + shared address.
 */
export type {
  UserRole,
  AccountStatus,
  UserIdentity,
  PartyProfileFields,
  PartyGstRegistrationType,
  EmployeeProfileFields,
  SalespersonProfileFields,
  PartyProfile,
  EmployeeProfile,
  SalespersonProfile,
  AdminProfile,
  User,
  Employee,
} from "./identity";

export type { Address } from "./address";
export {
  EMPTY_ADDRESS,
  INDIAN_STATES,
  formatAddressLines,
  isAddressEmpty,
} from "./address";
