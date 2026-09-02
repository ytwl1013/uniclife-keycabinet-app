export type SessionState = {
  token: string | null;
  permissions: readonly string[];
};

export const initialSessionState: SessionState = {
  token: null,
  permissions: [],
};
