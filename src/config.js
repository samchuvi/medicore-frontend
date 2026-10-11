// ─── PLATFORM CONFIG ─────────────────────────────────────────────────────────
// The one place to rename / re-colour the product. (You can also run
// `node rebrand.mjs --name "..." --color "#RRGGBB"` to change these for you.)
// Hospitals see THEIR OWN name, logo and colour (set on the Hospitals screen);
// the values below are what the platform itself and the login page show when no
// hospital is selected.
export const PLATFORM_NAME = "MediCore HMS";
export const PLATFORM_COLOR = "#2E7D32";
// Optional: a logo file for the platform, e.g. put logo.png in the "public" folder
// and set this to "/logo.png". Leave "" to show the hospital emoji instead.
export const PLATFORM_LOGO = "";

// Should the login page remember the last hospital code typed on this device?
// false = the Hospital code box starts empty unless the hospital's own link
// (?hospital=code) is used. Set true if you want it remembered.
export const REMEMBER_HOSPITAL_CODE = false;
