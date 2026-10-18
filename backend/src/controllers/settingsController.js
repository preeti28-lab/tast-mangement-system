import { logAudit } from "../services/auditService.js";
import { CONFIGURABLE_ROLES, PERMISSIONS, getRoleAccess, saveRoleAccess } from "../services/accessService.js";

// GET /api/settings/access   (admin only)
// The permission catalogue plus the current switches per role.
export const getAccess = async (req, res) => {
  res.json({ permissions: PERMISSIONS, roles: CONFIGURABLE_ROLES, access: await getRoleAccess() });
};

// PUT /api/settings/access   (admin only)
// Body: { manager: { "tasks.viewAll": true, ... }, user: { ... } }. Unknown keys are ignored.
export const updateAccess = async (req, res) => {
  const body = req.body ?? {};
  for (const role of CONFIGURABLE_ROLES) {
    const values = body[role];
    if (values === undefined) continue;
    if (typeof values !== "object" || Object.values(values).some((v) => typeof v !== "boolean")) {
      return res.status(400).json({ message: `${role} permissions must be true or false` });
    }
  }

  const before = await getRoleAccess();
  const merged = Object.fromEntries(CONFIGURABLE_ROLES.map((role) => [role, { ...before[role], ...(body[role] ?? {}) }]));
  const access = await saveRoleAccess(merged);

  const changes = CONFIGURABLE_ROLES.flatMap((role) =>
    Object.keys(access[role])
      .filter((key) => access[role][key] !== before[role][key])
      .map((key) => ({ field: `${role}.${key}`, from: before[role][key], to: access[role][key] }))
  );
  if (changes.length) await logAudit({ actor: req.user, action: "settings.access_changed", changes });

  res.json({ permissions: PERMISSIONS, roles: CONFIGURABLE_ROLES, access });
};
