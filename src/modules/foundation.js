// Text shared by the app shell (login code field, lab-tech role, new dashboard cards).
import { addTranslations } from "../shared";

addTranslations({
  en: {
    audit: {
      filters: { hospital: "Hospital", allHospitals: "All hospitals", platformOnly: "Platform only (no hospital)", search: "Search", searchHint: "Name or text…" },
      clear: {
        button: "Clear history", title: "Clear audit history",
        warning: "This permanently deletes audit log entries only. Patients, hospitals and all other data are not touched. This cannot be undone.",
        scope: "Which hospital", before: "Only entries up to this date (optional)", beforeHint: "Leave empty to clear everything in the chosen scope.",
        type: "Type DELETE to confirm", confirm: "Delete entries", cancel: "Cancel", close: "Close", done: "{{count}} entries deleted.",
      },
    },
    theme: { toDark: "Switch to dark mode", toLight: "Switch to light mode" },
    roles: { labstaff: "Lab Technician" },
    login: {
      poweredBy: "Powered by {{name}}",
      hospitalCode: "Hospital code",
      hospitalCodeHint: "Leave blank only if you are the platform owner",
      unreachable: "Cannot reach the server. Check your internet connection and try again.",
      tooMany: "Too many login attempts. Please wait a few minutes and try again.",
      suspended: "Your hospital's access has been suspended. Please contact the platform administrator.",
    },
    dashboard: {
      pendingOrders: "Pending lab orders",
      inProgressOrders: "In progress",
      urgentOpenOrders: "Urgent open orders",
      completedToday: "Completed today",
      todaySalesCount: "Sales today",
      todaySalesRevenue: "Sales revenue today",
    },
  },
  fr: {
    audit: {
      filters: { hospital: "Hôpital", allHospitals: "Tous les hôpitaux", platformOnly: "Plateforme uniquement (sans hôpital)", search: "Recherche", searchHint: "Nom ou texte…" },
      clear: {
        button: "Effacer l'historique", title: "Effacer l'historique d'audit",
        warning: "Cela supprime définitivement uniquement les entrées du journal d'audit. Les patients, hôpitaux et toutes les autres données ne sont pas touchés. Action irréversible.",
        scope: "Quel hôpital", before: "Seulement les entrées jusqu'à cette date (facultatif)", beforeHint: "Laissez vide pour tout effacer dans le périmètre choisi.",
        type: "Tapez DELETE pour confirmer", confirm: "Supprimer les entrées", cancel: "Annuler", close: "Fermer", done: "{{count}} entrées supprimées.",
      },
    },
    theme: { toDark: "Passer en mode sombre", toLight: "Passer en mode clair" },
    roles: { labstaff: "Technicien de laboratoire" },
    login: {
      poweredBy: "Propulsé par {{name}}",
      hospitalCode: "Code de l'hôpital",
      hospitalCodeHint: "Laissez vide uniquement si vous êtes le propriétaire de la plateforme",
      unreachable: "Impossible de joindre le serveur. Vérifiez votre connexion Internet et réessayez.",
      tooMany: "Trop de tentatives de connexion. Veuillez patienter quelques minutes et réessayer.",
      suspended: "L'accès de votre hôpital a été suspendu. Veuillez contacter l'administrateur de la plateforme.",
    },
    dashboard: {
      pendingOrders: "Analyses en attente",
      inProgressOrders: "En cours",
      urgentOpenOrders: "Analyses urgentes ouvertes",
      completedToday: "Terminées aujourd'hui",
      todaySalesCount: "Ventes aujourd'hui",
      todaySalesRevenue: "Revenu des ventes aujourd'hui",
    },
  },
  ar: {
    audit: {
      filters: { hospital: "المستشفى", allHospitals: "كل المستشفيات", platformOnly: "المنصة فقط (بدون مستشفى)", search: "بحث", searchHint: "الاسم أو نص…" },
      clear: {
        button: "مسح السجل", title: "مسح سجل التدقيق",
        warning: "سيؤدي هذا إلى حذف إدخالات سجل التدقيق فقط نهائيًا. لا تتأثر بيانات المرضى أو المستشفيات أو أي بيانات أخرى. لا يمكن التراجع.",
        scope: "أي مستشفى", before: "الإدخالات حتى هذا التاريخ فقط (اختياري)", beforeHint: "اتركه فارغًا لمسح كل شيء ضمن النطاق المختار.",
        type: "اكتب DELETE للتأكيد", confirm: "حذف الإدخالات", cancel: "إلغاء", close: "إغلاق", done: "تم حذف {{count}} إدخال.",
      },
    },
    theme: { toDark: "التبديل إلى الوضع الداكن", toLight: "التبديل إلى الوضع الفاتح" },
    roles: { labstaff: "فني مختبر" },
    login: {
      poweredBy: "بدعم من {{name}}",
      hospitalCode: "رمز المستشفى",
      hospitalCodeHint: "اتركه فارغًا فقط إذا كنت مالك المنصة",
      unreachable: "تعذر الوصول إلى الخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.",
      tooMany: "محاولات تسجيل دخول كثيرة. يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.",
      suspended: "تم تعليق وصول مستشفاك. يرجى الاتصال بمسؤول المنصة.",
    },
    dashboard: {
      pendingOrders: "طلبات المختبر المعلقة",
      inProgressOrders: "قيد التنفيذ",
      urgentOpenOrders: "الطلبات العاجلة المفتوحة",
      completedToday: "المكتملة اليوم",
      todaySalesCount: "مبيعات اليوم",
      todaySalesRevenue: "إيرادات مبيعات اليوم",
    },
  },
});
