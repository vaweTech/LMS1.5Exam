/** Default tenant for main VAWE LMS (no college subdomain on host). */
export const DEFAULT_COLLEGE_SUBDOMAIN = "vawe";

export function normalizeCollegeSubdomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveCollegeSubdomain(raw) {
  return normalizeCollegeSubdomain(raw) || DEFAULT_COLLEGE_SUBDOMAIN;
}

export function getScopedCrtStudentRole(collegeSubdomain) {
  const sub = normalizeCollegeSubdomain(collegeSubdomain);
  return sub ? `${sub}CrtStudent` : "crtStudent";
}

export function getScopedStudentRole(collegeSubdomain) {
  const sub = resolveCollegeSubdomain(collegeSubdomain);
  return `${sub}Student`;
}

export function getScopedInternshipRole(collegeSubdomain) {
  const sub = resolveCollegeSubdomain(collegeSubdomain);
  return `${sub}Internship`;
}

export function isCrtStudentRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return false;
  return value === "crtstudent" || value.endsWith("crtstudent");
}

export function isScopedInternshipRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return false;
  if (value === "internship") return true;
  return value.endsWith("internship");
}

/** @deprecated Use isScopedInternshipRole */
export function isInternshipRole(role) {
  return isScopedInternshipRole(role);
}

export function isScopedStudentRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return false;
  if (isCrtStudentRole(role) || isScopedInternshipRole(role)) return false;
  if (value === "student") return true;
  return value.endsWith("student");
}

export function isLegacyStudentRole(role) {
  return String(role || "").trim().toLowerCase() === "student";
}

export function isLegacyInternshipRole(role) {
  return String(role || "").trim().toLowerCase() === "internship";
}

export function inferStudentRole(student) {
  if (!student) return getScopedStudentRole(DEFAULT_COLLEGE_SUBDOMAIN);
  if (student.role) return student.role;
  const sub = student.collegeSubdomain || DEFAULT_COLLEGE_SUBDOMAIN;
  if (student.isCrt) return getScopedCrtStudentRole(sub);
  if (student.isInternship) return getScopedInternshipRole(sub);
  return getScopedStudentRole(sub);
}

export function formatStudentRoleLabel(role) {
  if (isCrtStudentRole(role)) return String(role || "CRT Student");
  if (isScopedInternshipRole(role)) return "Internship";
  if (isScopedStudentRole(role)) return "Student";
  return String(role || "Student");
}

export function matchesStudentRoleFilter(role, filter) {
  if (!filter) return true;
  if (filter === "crtStudent") return isCrtStudentRole(role);
  if (filter === "internship") return isScopedInternshipRole(role);
  if (filter === "student") return isScopedStudentRole(role);
  return String(role || "").trim() === filter;
}

/** Roles to count toward college student limit (legacy + scoped). */
export function getStudentLimitRoles(collegeSubdomain) {
  const scoped = getScopedStudentRole(collegeSubdomain);
  return scoped === "student" ? ["student"] : ["student", scoped];
}

/** Firestore `in` query values for internship students (legacy + scoped). */
export function getInternshipRoleQueryValues(collegeSubdomain) {
  const scoped = getScopedInternshipRole(collegeSubdomain);
  return [...new Set(["internship", scoped])];
}

/** Firestore `in` query values for regular students (legacy + scoped). */
export function getStudentRoleQueryValues(collegeSubdomain) {
  const scoped = getScopedStudentRole(collegeSubdomain);
  return [...new Set(["student", scoped])];
}

export function isInternshipStudentDoc(student) {
  if (!student) return false;
  return !!student.isInternship || isScopedInternshipRole(student.role);
}

export function isRegularStudentDoc(student) {
  if (!student) return false;
  if (student.isCrt || isCrtStudentRole(student.role)) return false;
  if (isInternshipStudentDoc(student)) return false;
  return (
    isScopedStudentRole(student.role) ||
    isLegacyStudentRole(student.role) ||
    !student.role
  );
}

/** Normalize student doc for admin UI (resolved role + internship flag). */
export function normalizeStudentDoc(student) {
  if (!student) return student;
  const sub = resolveCollegeSubdomain(student.collegeSubdomain);
  const role = inferStudentRole(student);
  const isInternship = isInternshipStudentDoc(student);
  return {
    ...student,
    collegeSubdomain: student.collegeSubdomain || sub,
    role,
    isInternship,
  };
}

export function normalizeStudentsForAdmin(students) {
  return (students || []).map((s) => normalizeStudentDoc(s));
}

/** Map legacy role strings to scoped roles when saving from admin forms. */
export function coerceStudentRoleForSave(role, collegeSubdomain) {
  const raw = String(role || "").trim();
  if (!raw) return getScopedStudentRole(collegeSubdomain);
  if (isLegacyStudentRole(raw) || isScopedStudentRole(raw)) {
    return getScopedStudentRole(collegeSubdomain);
  }
  if (isLegacyInternshipRole(raw) || isScopedInternshipRole(raw)) {
    return getScopedInternshipRole(collegeSubdomain);
  }
  return raw;
}
