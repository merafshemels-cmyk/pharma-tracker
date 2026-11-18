export const ROLES = ['owner', 'cashier']

export const ROLE_LABELS = {
  owner: 'Owner',
  cashier: 'Cashier',
}

export const ROLE_LABEL_KEYS = {
  owner: 'role.owner',
  cashier: 'role.cashier',
}

export function roleLabelKey(role) {
  return ROLE_LABEL_KEYS[normalizeRole(role)]
}

export const ROLE_DESCRIPTIONS = {
  owner:
    'Business oversight, inventory and purchasing, packaging configuration, staff management, and pharmacy settings.',
  cashier:
    'Day-to-day sales, inventory look-up, and expiry information needed to serve customers.',
}

export const ROLE_ROUTES = {
  owner: [
    'dashboard',
    'sales',
    'inventory',
    'purchases',
    'packaging',
    'expiry',
    'reports',
    'staff',
    'settings',
  ],
  cashier: ['dashboard', 'sales', 'inventory', 'expiry'],
}

// Existing database roles are kept for backwards compatibility. Manager and
// pharmacist memberships already exist in deployed databases, so they are
// mapped onto the two application roles instead of being deleted.
const DATABASE_ROLE_MAP = {
  owner: 'owner',
  manager: 'owner',
  pharmacist: 'owner',
  cashier: 'cashier',
}

export function normalizeRole(role) {
  return DATABASE_ROLE_MAP[role] ?? 'cashier'
}

export function lookUpRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)]
}

export function isRouteAllowed(role, route) {
  const normalized = normalizeRole(role)
  return ROLE_ROUTES[normalized].includes(route)
}

export function canManageInventory(role) {
  return normalizeRole(role) === 'owner'
}

export function canManagePurchases(role) {
  return normalizeRole(role) === 'owner'
}

export function canManagePackaging(role) {
  return normalizeRole(role) === 'owner'
}

export function canManageStaff(role) {
  return normalizeRole(role) === 'owner'
}

export function canManageSettings(role) {
  return normalizeRole(role) === 'owner'
}
