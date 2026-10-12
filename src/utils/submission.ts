/**
 * Bridges the in-site configurator to the repo's GitHub submission form
 * (.github/ISSUE_TEMPLATE/submit-template.yml). The form's field ids
 * (name / image / json / source) are the canonical keys for URL prefills.
 */
export const REPO_URL = 'https://github.com/cholf5/gengtu';

export const SUBMISSION_ISSUE_PATH = `${REPO_URL}/issues/new?template=submit-template.yml`;

/** GitHub truncates long URLs (~8k); stay safely under it with a prefill. */
const MAX_PREFILL_URL_LENGTH = 7500;

export interface SubmissionIssueInput {
  name: string;
  json: string;
}

/**
 * Build a prefilled 模板投稿 issue URL. Returns null when the JSON is too
 * long to fit safely into the query string — callers should fall back to
 * opening the bare form and pasting the JSON (e.g. from the clipboard).
 */
export function buildSubmissionIssueUrl({ name, json }: SubmissionIssueInput): string | null {
  const trimmedName = name.trim();
  const params = new URLSearchParams();
  params.set('template', 'submit-template.yml');
  if (trimmedName) {
    params.set('name', trimmedName);
    params.set('title', `[模板投稿] ${trimmedName}`);
  }
  params.set('json', json);

  const url = `${REPO_URL}/issues/new?${params.toString()}`;
  return url.length <= MAX_PREFILL_URL_LENGTH ? url : null;
}
