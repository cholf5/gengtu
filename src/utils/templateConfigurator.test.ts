import { describe, expect, it } from 'vitest';
import type { EditableTextField } from '../types';
import {
  buildTemplateJson,
  createConfiguratorTextField,
  deriveTemplateDraftFromFilename,
  deriveTemplateDraftFromName,
  extractFileExtension,
  getNextTextFieldIndex,
  parseTags,
} from './templateConfigurator';

const field: EditableTextField = {
  id: 'text_1',
  text: 'Text 1',
  placeholder: 'Text 1',
  x: 10.2,
  y: 20.6,
  width: 100.4,
  height: 50.5,
  rotation: 0,
  zIndex: 1,
  styleOverrides: {},
};

describe('template configurator helpers', () => {
  it('parses comma separated tags', () => {
    expect(parseTags('classic, choice, ,fun')).toEqual(['classic', 'choice', 'fun']);
  });

  it('creates centered default text fields', () => {
    expect(createConfiguratorTextField(1, 1000, 500)).toMatchObject({
      id: 'text_1',
      placeholder: 'Text 1',
      width: 600,
      height: 80,
      x: 200,
      y: 210,
      rotation: 0,
    });
  });

  it('finds the next unused text field index', () => {
    expect(getNextTextFieldIndex([{ ...field, id: 'text_2' }])).toBe(1);
    expect(getNextTextFieldIndex([field, { ...field, id: 'text_2' }])).toBe(3);
  });

  it('builds MemeTemplate-compatible JSON with rounded layout fields', () => {
    expect(buildTemplateJson({ id: 'demo', name: 'Demo', url: '/memes/demo.jpg', tagsInput: 'classic' }, [field])).toEqual({
      id: 'demo',
      name: 'Demo',
      url: '/memes/demo.jpg',
      tags: ['classic'],
      textFields: [
        {
          id: 'text_1',
          placeholder: 'Text 1',
          x: 10,
          y: 21,
          width: 100,
          height: 51,
          fontSize: 36,
          color: '#ffffff',
          align: 'center',
        },
      ],
    });
  });

  it('only writes rotation into JSON when it is non-zero', () => {
    const rotated: EditableTextField = { ...field, rotation: 12.4 };
    const json = buildTemplateJson({ id: 'demo', name: 'Demo', url: '/memes/demo.jpg', tagsInput: '' }, [rotated]);
    expect(json.textFields[0]).toMatchObject({ rotation: 12 });
  });

  it('derives template draft fields from an upload filename', () => {
    expect(deriveTemplateDraftFromFilename('Distracted-Boyfriend.jpg')).toEqual({
      id: 'Distracted-Boyfriend',
      name: 'Distracted Boyfriend',
      url: '/memes/distracted-boyfriend.jpg',
    });
  });

  it('normalizes whitespace, underscores and stray dashes when deriving the draft', () => {
    expect(deriveTemplateDraftFromFilename('  Two_Buttons   meme .PNG ')).toEqual({
      id: 'Two-Buttons-Meme',
      name: 'Two Buttons Meme',
      url: '/memes/two-buttons-meme.png',
    });
  });

  it('title-cases each word so lowercase filenames still produce a friendly Name', () => {
    expect(deriveTemplateDraftFromFilename('two-buttons.jpg')).toEqual({
      id: 'Two-Buttons',
      name: 'Two Buttons',
      url: '/memes/two-buttons.jpg',
    });
  });

  it('handles filenames without extensions', () => {
    expect(deriveTemplateDraftFromFilename('choice road')).toEqual({
      id: 'Choice-Road',
      name: 'Choice Road',
      url: '/memes/choice-road',
    });
  });

  it('derives id and url from a free-form name plus extension', () => {
    expect(deriveTemplateDraftFromName('Distracted Boyfriend', 'jpg')).toEqual({
      id: 'Distracted-Boyfriend',
      name: 'Distracted Boyfriend',
      url: '/memes/distracted-boyfriend.jpg',
    });
    expect(deriveTemplateDraftFromName('  Two   Buttons  ', '.PNG')).toEqual({
      id: 'Two-Buttons',
      name: 'Two   Buttons',
      url: '/memes/two-buttons.png',
    });
    expect(deriveTemplateDraftFromName('  ', 'jpg')).toEqual({ id: '', name: '', url: '' });
  });

  it('extracts a lowercased extension or empty when missing', () => {
    expect(extractFileExtension('Foo.PNG')).toBe('png');
    expect(extractFileExtension('foo.tar.gz')).toBe('gz');
    expect(extractFileExtension('foo')).toBe('');
    expect(extractFileExtension('.hidden')).toBe('');
  });
});
