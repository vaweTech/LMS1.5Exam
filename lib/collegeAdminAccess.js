/**
 * College-scoped admin: role collegeAdmin with moduleLms / moduleCrt flags on users/{uid}.
 */

export function computeAdminAccess(role, moduleLms, moduleCrt) {
  // Treat collegeAdmin as full admin inside the app.
  // Tenant isolation already ensures they only affect their college data.
  const isFullAdmin = role === "admin" || role === "superadmin" || role === "collegeAdmin";
  const isCollegeAdmin = role === "collegeAdmin";
  const isDataEntry = role === "dataentry";
  return {
    isFullAdmin,
    isCollegeAdmin,
    isDataEntry,
    hasCrtManagerAccess:
      isFullAdmin || isDataEntry || (isCollegeAdmin && !!moduleCrt),
    hasLmsManagerAccess:
      isFullAdmin || isDataEntry || (isCollegeAdmin && !!moduleLms),
  };
}

/**
 * Route guard for collegeAdmin only. Full admins and dataentry should bypass in the layout.
 */
export function collegeAdminPathAllowed(pathname, moduleLms, moduleCrt) {
  // collegeAdmin has full access to Admin pages now.
  return true;
  // (legacy rules kept below for reference)
  const p = (pathname || "").replace(/\/$/, "") || "/Admin";
  if (p.startsWith("/Admin/register-form")) return false;
  if (p.startsWith("/Admin/analytics")) return false;
  if (p === "/Admin" || p === "/Admin/dashboard") return !!(moduleLms || moduleCrt);
  if (p.startsWith("/Admin/crt")) return !!moduleCrt;
  if (p.startsWith("/Admin/programs") || p.startsWith("/Admin/internships")) {
    return !!moduleLms;
  }
  return !!moduleLms;
}
