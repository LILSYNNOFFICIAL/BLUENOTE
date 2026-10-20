export const WORKSPACE_OWNER_KEY = 'bluenote_workspace_owner_uid_v1';

export interface AccountWorkspaceResolution<T> {
  workspace: T;
  accountChanged: boolean;
}

/**
 * Keep a single legacy local workspace with its first account for backward
 * compatibility, but never carry it into a different account's cloud workspace.
 */
export function resolveWorkspaceForAccount<T>(
  storedOwnerId: string | null,
  userId: string,
  currentWorkspace: T,
  initialWorkspace: T
): AccountWorkspaceResolution<T> {
  if (storedOwnerId && storedOwnerId !== userId) {
    return { workspace: initialWorkspace, accountChanged: true };
  }
  return { workspace: currentWorkspace, accountChanged: false };
}
