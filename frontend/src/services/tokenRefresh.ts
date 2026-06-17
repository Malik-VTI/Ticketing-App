/**
 * Singleton bridge that lets the axios interceptor (api.ts) call the auth
 * refresh logic defined in AuthContext without creating a circular import or
 * polluting the global `window` object.
 *
 * AuthContext registers its `refreshAccessToken` via `setRefreshHandler` on
 * mount and unregisters it (passing `null`) on unmount. The interceptor invokes
 * `callRefreshHandler` when it needs to refresh an expired access token.
 */
type RefreshFn = () => Promise<string | null>

let refreshFn: RefreshFn | null = null

export const setRefreshHandler = (fn: RefreshFn | null): void => {
  refreshFn = fn
}

export const callRefreshHandler = (): Promise<string | null> =>
  refreshFn ? refreshFn() : Promise.resolve(null)
