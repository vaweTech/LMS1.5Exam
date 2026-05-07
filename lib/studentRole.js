export function getScopedCrtStudentRole(collegeSubdomain) {
  const sub = String(collegeSubdomain || "").trim().toLowerCase();
  return sub ? `${sub}CrtStudent` : "crtStudent";
}

export function isCrtStudentRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return false;
  return value === "crtstudent" || value.endsWith("crtstudent");
}

export function isInternshipRole(role) {
  return String(role || "").trim().toLowerCase() === "internship";
}

export function matchesStudentRoleFilter(role, filter) {
  if (!filter) return true;
  if (filter === "crtStudent") return isCrtStudentRole(role);
  if (filter === "internship") return isInternshipRole(role);
  return String(role || "").trim() === filter;
}
