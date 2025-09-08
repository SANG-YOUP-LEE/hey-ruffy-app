// src/utils/deeplink.js (no-op)
export function installDeepLinkListener() {
  // deep link disabled: push to main is handled by default route
  return () => {};
}
export default { installDeepLinkListener };
