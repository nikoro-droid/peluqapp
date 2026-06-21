import { useCallback } from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "./useAuth";

export function useApi() {
  const { session, logout } = useAuth();
  return useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          ...options.headers
        }
      });
      if (response.status === 401) logout();
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as T;
    },
    [logout, session?.token]
  );
}