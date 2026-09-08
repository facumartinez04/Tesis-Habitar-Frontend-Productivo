import { apiFetch } from '../lib/apiClient';
import type { JiraIssue, JiraToken } from '../types/jira';

export const jiraService = {
  async getIssues(): Promise<JiraIssue[]> {
    const res = await apiFetch<{ issues: JiraIssue[] }>('/jira/issues');
    return res?.issues ?? [];
  },

  async createIssue(payload: any): Promise<JiraIssue> {
    const res = await apiFetch<{ issue: JiraIssue }>('/jira/issues', {
      method: 'POST',
      body: payload,
    });
    return res.issue;
  },

  async updateIssue(id: string, updates: Partial<JiraIssue>): Promise<JiraIssue> {
    const res = await apiFetch<{ issue: JiraIssue }>(`/jira/issues/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return res.issue;
  },

  async deleteIssue(id: string): Promise<boolean> {
    await apiFetch(`/jira/issues/${id}`, { method: 'DELETE' });
    return true;
  },

  async getTokens(): Promise<JiraToken[]> {
    const res = await apiFetch<{ tokens: JiraToken[] }>('/jira/tokens');
    return res?.tokens ?? [];
  },

  async createToken(name: string): Promise<JiraToken> {
    const res = await apiFetch<{ token: JiraToken }>('/jira/tokens', {
      method: 'POST',
      body: { name },
    });
    return res.token;
  },

  async deleteToken(id: string): Promise<boolean> {
    await apiFetch(`/jira/tokens/${id}`, { method: 'DELETE' });
    return true;
  },
};
