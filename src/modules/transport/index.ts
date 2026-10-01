/** Transport module — Rates / Announcements-style structure */

export type { TransportDetail, TransportWriteInput } from "./transportTypes";

export {
  TRANSPORT_COLLECTION,
  TRANSPORT_EXPORT_HEADERS,
} from "./transportDefinitions";

export {
  normalizeServingCities,
  validateTransportInput,
  sortTransportByName,
} from "./logic";

export {
  fetchAllTransport,
  createTransport,
  updateTransport,
  deleteTransport,
} from "./services/transportService";
