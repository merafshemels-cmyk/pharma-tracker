import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  ROLES,
  canManageInventory,
  canManagePackaging,
  canManagePurchases,
  canManageSettings,
  canManageStaff,
  isRouteAllowed,
  lookUpRoleLabel,
  normalizeRole,
} from '../src/utils/roles.js'

test('only Owner and Cashier are exposed as application roles', () => {
  assert.deepEqual(ROLES, ['owner', 'cashier'])
  assert.equal(lookUpRoleLabel('owner'), 'Owner')
  assert.equal(lookUpRoleLabel('cashier'), 'Cashier')
})

test('legacy manager and pharmacist memberships map to the owner role', () => {
  assert.equal(normalizeRole('owner'), 'owner')
  assert.equal(normalizeRole('manager'), 'owner')
  assert.equal(normalizeRole('pharmacist'), 'owner')
  assert.equal(normalizeRole('cashier'), 'cashier')
})

test('unknown or missing roles fail closed as cashier', () => {
  assert.equal(normalizeRole('admin'), 'cashier')
  assert.equal(normalizeRole(undefined), 'cashier')
  assert.equal(normalizeRole(null), 'cashier')
})

test('cashier routes exclude staff, settings, purchases, and packaging', () => {
  assert.equal(isRouteAllowed('cashier', 'dashboard'), true)
  assert.equal(isRouteAllowed('cashier', 'sales'), true)
  assert.equal(isRouteAllowed('cashier', 'inventory'), true)
  assert.equal(isRouteAllowed('cashier', 'expiry'), true)
  assert.equal(isRouteAllowed('cashier', 'staff'), false)
  assert.equal(isRouteAllowed('cashier', 'settings'), false)
  assert.equal(isRouteAllowed('cashier', 'purchases'), false)
  assert.equal(isRouteAllowed('cashier', 'packaging'), false)
  assert.equal(isRouteAllowed('cashier', 'reports'), false)
})

test('owner has full navigation and management capabilities', () => {
  for (const route of [
    'dashboard',
    'sales',
    'inventory',
    'purchases',
    'packaging',
    'expiry',
    'reports',
    'staff',
    'settings',
  ]) {
    assert.equal(isRouteAllowed('owner', route), true, route)
  }

  assert.equal(canManageInventory('owner'), true)
  assert.equal(canManagePurchases('owner'), true)
  assert.equal(canManagePackaging('owner'), true)
  assert.equal(canManageStaff('owner'), true)
  assert.equal(canManageSettings('owner'), true)
})

test('cashier cannot manage owner-only areas', () => {
  assert.equal(canManageInventory('cashier'), false)
  assert.equal(canManagePurchases('cashier'), false)
  assert.equal(canManagePackaging('cashier'), false)
  assert.equal(canManageStaff('cashier'), false)
  assert.equal(canManageSettings('cashier'), false)
})

test('legacy roles retain owner capabilities while cashier stays limited', () => {
  assert.equal(canManageStaff('manager'), true)
  assert.equal(canManageSettings('pharmacist'), true)
  assert.equal(isRouteAllowed('manager', 'staff'), true)
  assert.equal(isRouteAllowed('pharmacist', 'settings'), true)
  assert.equal(isRouteAllowed('cashier', 'staff'), false)
})
