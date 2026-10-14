// ─── MODULE REGISTRY ─────────────────────────────────────────────────────────
// To add a feature to the app: build it as a file in this folder, then add ONE
// line to the list below. That is the whole registration.
//
// A module looks like:
//   {
//     key:       "lab",                  // unique id
//     navKey:    "lab",                  // text key: nav.lab in its translations
//     icon:      "lab",                  // an icon name from shared.jsx
//     Component: LabOrders,              // receives { token, user, hospital }
//     roles:     ["admin","doctor","labstaff"],   // who sees it
//     feature:   "laboratory",           // hospital feature flag it needs (omit = always on)
//   }
// A hospital that hasn't enabled the feature never sees the menu entry.
import "./foundation";
import Hospitals from "./hospitals";
import PlatformSettings from "./platformSettings";
import FindPatient from "./patientHistory";
import PharmacySales from "./pharmacySales";
import Lab from "./lab";
import Inpatient from "./inpatient";
import Referrals from "./carePlans";
import HospitalSettings from "./hospitalSettings";

// after:"key" places a module right under another menu item.
// first:true puts a module at the top of the menu (used for platform-owner tools).
export const MODULES = [
  { key: "hospitals", navKey: "hospitals", icon: "building", Component: Hospitals, roles: ["superadmin"], first: true },
  { key: "platform", navKey: "platform", icon: "settings", Component: PlatformSettings, roles: ["superadmin"], first: true },
  { key: "findPatient", navKey: "findPatient", icon: "search", Component: FindPatient, roles: ["admin", "doctor", "receptionist"], after: "dashboard" },
  { key: "pharmacySales", navKey: "pharmacySales", icon: "pharmacy", Component: PharmacySales, roles: ["admin", "pharmacist"], feature: "pharmacy" },
  { key: "lab", navKey: "lab", icon: "lab", Component: Lab, roles: ["admin", "doctor", "labstaff"], feature: "laboratory" },
  { key: "inpatient", navKey: "inpatient", icon: "bed", Component: Inpatient, roles: ["admin", "doctor", "receptionist"], feature: "inpatient" },
  { key: "referrals", navKey: "referrals", icon: "referral", Component: Referrals, roles: ["admin", "doctor", "receptionist"], feature: "referrals" },
  { key: "hospitalSettings", navKey: "hospitalSettings", icon: "settings", Component: HospitalSettings, roles: ["admin"] },
  // (more feature modules are added here as they are built)
];
