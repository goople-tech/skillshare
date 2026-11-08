export declare const api: { me(): Promise<unknown>; updateMe(changes: object): Promise<unknown>; skillMatches(): Promise<unknown> }
export declare const setTokenGetter: (getter: () => Promise<string | null | undefined>) => void
export declare function apiRequest<T>(path: string, options?: RequestInit): Promise<T>
type ApiRequestOptions = RequestInit & { headers?: Record<string, string> }
