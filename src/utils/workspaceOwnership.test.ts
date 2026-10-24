import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWorkspaceForAccount } from './workspaceOwnership';

test('first account adopts the existing local-first workspace', () => {
  const local = { tasks: ['local-task'] };
  const initial = { tasks: [] };
  const result = resolveWorkspaceForAccount(null, 'user-a', local, initial);
  assert.equal(result.accountChanged, false);
  assert.equal(result.workspace, local);
});

test('same account keeps its local workspace while remote sync starts', () => {
  const local = { tasks: ['user-a-task'] };
  const initial = { tasks: [] };
  const result = resolveWorkspaceForAccount('user-a', 'user-a', local, initial);
  assert.equal(result.accountChanged, false);
  assert.equal(result.workspace, local);
});

test('different account receives a clean workspace instead of previous account data', () => {
  const previousAccount = { tasks: ['private-user-a-task'], notes: ['private-user-a-note'] };
  const initial = { tasks: [], notes: [] };
  const result = resolveWorkspaceForAccount('user-a', 'user-b', previousAccount, initial);
  assert.equal(result.accountChanged, true);
  assert.equal(result.workspace, initial);
  assert.deepEqual(result.workspace, { tasks: [], notes: [] });
});
