import { describe, expect, it } from 'vitest';
import type { MemeTemplate } from '../types';
import { DEFAULT_TEXT_STYLE } from './textStyles';
import { buildImportedDraft, parseTemplateJson, resolveTemplateImageUrl } from './templateImport';

const minimalTemplate: MemeTemplate = {
  id: 'demo',
  name: 'Demo',
  url: '/memes/demo.jpg',
  tags: ['classic', 'choice'],
  textFields: [
    {
      id: 'text_1',
      placeholder: 'Top text',
      x: 10,
      y: 20,
      width: 200,
      height: 60,
      fontSize: 48,
      color: '#ffffff',
      align: 'center',
    },
  ],
};

describe('parseTemplateJson', () => {
  it('returns the parsed template when JSON is well-formed', () => {
    const text = JSON.stringify(minimalTemplate);
    expect(parseTemplateJson(text)).toEqual(minimalTemplate);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseTemplateJson('{ not json')).toThrow(/JSON 不是合法的模板/);
  });

  it('throws when the parsed value is not an object', () => {
    expect(() => parseTemplateJson('null')).toThrow(/JSON 不是合法的模板/);
    expect(() => parseTemplateJson('"a string"')).toThrow(/JSON 不是合法的模板/);
    expect(() => parseTemplateJson('[]')).toThrow(/JSON 不是合法的模板/);
  });

  it('throws when required template fields are missing', () => {
    const broken = { ...minimalTemplate } as Partial<MemeTemplate>;
    delete broken.tags;
    expect(() => parseTemplateJson(JSON.stringify(broken))).toThrow(/JSON 不是合法的模板/);
  });

  it('throws when a textField has the wrong shape', () => {
    const broken = {
      ...minimalTemplate,
      textFields: [{ ...minimalTemplate.textFields[0], align: 'middle' }],
    };
    expect(() => parseTemplateJson(JSON.stringify(broken))).toThrow(/JSON 不是合法的模板/);
  });

  it('accepts an optional thumbnail without validating its range here', () => {
    // The manifest loader runs a stricter range check; the import flow leaves
    // it to clampCropTo43 to handle weird values once the image is loaded.
    const withThumb: MemeTemplate = {
      ...minimalTemplate,
      thumbnail: { x: 0.1, y: 0.1, width: 0.5, height: 0.375 },
    };
    expect(parseTemplateJson(JSON.stringify(withThumb))).toEqual(withThumb);
  });
});

describe('buildImportedDraft', () => {
  it('lifts name / tags / extension into the draft state', () => {
    const result = buildImportedDraft(minimalTemplate);
    expect(result.draft).toEqual({
      name: 'Demo',
      tagsInput: 'classic, choice',
      imageExt: 'jpg',
    });
  });

  it('joins zero / one / many tags with a comma+space', () => {
    expect(buildImportedDraft({ ...minimalTemplate, tags: [] }).draft.tagsInput).toBe('');
    expect(buildImportedDraft({ ...minimalTemplate, tags: ['solo'] }).draft.tagsInput).toBe('solo');
    expect(buildImportedDraft({ ...minimalTemplate, tags: ['a', 'b', 'c'] }).draft.tagsInput).toBe('a, b, c');
  });

  it('returns editable fields whose ids and geometry match the JSON', () => {
    const result = buildImportedDraft(minimalTemplate);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({
      id: 'text_1',
      placeholder: 'Top text',
      text: 'Top text', // createEditableFields seeds text from placeholder
      x: 10,
      y: 20,
      width: 200,
      height: 60,
      rotation: 0,
      zIndex: 1,
    });
  });

  it('lifts JSON style fields back into styleOverrides so the editor reproduces them', () => {
    const styled: MemeTemplate = {
      ...minimalTemplate,
      textFields: [
        {
          ...minimalTemplate.textFields[0],
          fontSize: 60,
          color: '#ff00ff',
          align: 'left',
          bold: false,
          italic: true,
          outlineColor: '#123456',
        },
      ],
    };
    const result = buildImportedDraft(styled);
    expect(result.fields[0].styleOverrides).toMatchObject({
      fontSize: 60,
      fontColor: '#ff00ff',
      textAlign: 'left',
      bold: false,
      italic: true,
      outlineColor: '#123456',
    });
    // Untouched JSON keys should NOT appear as overrides — they fall through to DEFAULT_TEXT_STYLE.
    expect(result.fields[0].styleOverrides).not.toHaveProperty('uppercase');
    expect(result.fields[0].styleOverrides).not.toHaveProperty('effect');
    expect(DEFAULT_TEXT_STYLE.effect).toBe('shadow'); // sanity: default is what we expect to fall through to
  });

  it('returns null pendingThumbnail when the JSON has no thumbnail', () => {
    expect(buildImportedDraft(minimalTemplate).pendingThumbnail).toBeNull();
  });

  it('returns the raw normalized thumbnail when the JSON has one', () => {
    const withThumb: MemeTemplate = {
      ...minimalTemplate,
      thumbnail: { x: 0.25, y: 0, width: 0.5, height: 0.375 },
    };
    expect(buildImportedDraft(withThumb).pendingThumbnail).toEqual({
      x: 0.25,
      y: 0,
      width: 0.5,
      height: 0.375,
    });
  });

  it('handles urls without a recognizable extension', () => {
    expect(buildImportedDraft({ ...minimalTemplate, url: '/memes/demo' }).draft.imageExt).toBe('');
  });
});

describe('resolveTemplateImageUrl', () => {
  it('prefixes absolute paths with the supplied baseUrl', () => {
    expect(resolveTemplateImageUrl('/memes/foo.jpg', '/open-meme/')).toBe('/open-meme/memes/foo.jpg');
    expect(resolveTemplateImageUrl('/memes/foo.jpg', '/')).toBe('/memes/foo.jpg');
  });

  it('leaves non-absolute urls untouched', () => {
    expect(resolveTemplateImageUrl('https://cdn.example.com/foo.jpg', '/open-meme/')).toBe(
      'https://cdn.example.com/foo.jpg',
    );
    expect(resolveTemplateImageUrl('blob:https://x/abc', '/')).toBe('blob:https://x/abc');
  });
});
