import { createApiClient } from './client';

let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiToken(value: string | null): void {
  token = value;
}

export function getApiToken(): string | null {
  return token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Client API unique de l'appli. */
export const api = createApiClient({
  getToken: () => token,
  onUnauthorized: () => unauthorizedHandler?.(),
});
