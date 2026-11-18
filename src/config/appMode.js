export const APP_MODES = {
  LOCAL: 'local',
  PRODUCTION: 'production',
}

export function getAppMode() {
  return import.meta.env.VITE_APP_MODE === APP_MODES.PRODUCTION
    ? APP_MODES.PRODUCTION
    : APP_MODES.LOCAL
}

export function isLocalMode() {
  return getAppMode() === APP_MODES.LOCAL
}

export function isProductionMode() {
  return getAppMode() === APP_MODES.PRODUCTION
}
