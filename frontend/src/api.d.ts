export type ApiClientOptions = RequestInit & { keepalive?: boolean }
export declare const api: {
  me<T = unknown>(): Promise<T>
  signup<T = unknown>(profile: object): Promise<T>
  updateMe<T = unknown>(changes: object): Promise<T>
  skillMatches<T = unknown>(): Promise<T>
}
export declare const setTokenGetter: (getter: () => Promise<string | null | undefined>) => void
export declare function apiRequest<T = unknown>(path: string, options?: ApiClientOptions): Promise<T>
