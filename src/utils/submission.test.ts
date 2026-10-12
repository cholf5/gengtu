import { describe, expect, it } from 'vitest';
import { buildSubmissionIssueUrl, REPO_URL, SUBMISSION_ISSUE_PATH } from './submission';

describe('buildSubmissionIssueUrl', () => {
  it('prefills the form template, name, title and json', () => {
    const url = buildSubmissionIssueUrl({ name: 'Two Buttons', json: '{"id":"two-buttons"}' });
    expect(url).not.toBeNull();

    const parsed = new URL(url!);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(`${REPO_URL}/issues/new`);
    expect(parsed.searchParams.get('template')).toBe('submit-template.yml');
    expect(parsed.searchParams.get('name')).toBe('Two Buttons');
    expect(parsed.searchParams.get('title')).toBe('[模板投稿] Two Buttons');
    expect(parsed.searchParams.get('json')).toBe('{"id":"two-buttons"}');
  });

  it('round-trips multi-line JSON through the query string', () => {
    const json = '{\n  "id": "x",\n  "name": "X"\n}\n';
    const url = buildSubmissionIssueUrl({ name: 'X', json })!;
    expect(new URL(url).searchParams.get('json')).toBe(json);
  });

  it('omits name/title when the name is blank', () => {
    const url = buildSubmissionIssueUrl({ name: '   ', json: '{}' })!;
    const params = new URL(url).searchParams;
    expect(params.has('name')).toBe(false);
    expect(params.has('title')).toBe(false);
    expect(params.get('template')).toBe('submit-template.yml');
    expect(params.get('json')).toBe('{}');
  });

  it('returns null when the prefill would exceed the URL budget', () => {
    const url = buildSubmissionIssueUrl({ name: 'X', json: 'x'.repeat(9000) });
    expect(url).toBeNull();
  });

  it('exposes the bare form URL for entry points without a draft', () => {
    expect(SUBMISSION_ISSUE_PATH).toBe(`${REPO_URL}/issues/new?template=submit-template.yml`);
  });
});
