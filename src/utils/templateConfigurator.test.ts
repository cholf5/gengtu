import { describe, expect, it } from 'vitest';
import type { EditableTextField } from '../types';
import {
  buildTemplateJson,
  createConfiguratorTextField,
  deriveTemplateDraftFromFilename,
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

  it('derives template draft fields from an upload filename', () => {
    expect(deriveTemplateDraftFromFilename('Distracted-Boyfriend.jpg')).toEqual({
      id: 'Distracted-Boyfriend',
      name: 'Distracted Boyfriend',
      url: '/memes/distracted-boyfriend.jpg',
    });
  });

  it('normalizes whitespace, underscores and stray dashes when deriving the draft', () => {
    expect(deriveTemplateDraftFromFilename('  Two_Buttons   meme .PNG ')).toEqual({
      id: 'Two-Buttons-meme',
      name: 'Two Buttons meme',
      url: '/memes/two-buttons-meme.png',
    });
  });

  it('handles filenames without extensions', () => {
    expect(deriveTemplateDraftFromFilename('choice road')).toEqual({
      id: 'choice-road',
      name: 'choice road',
      url: '/memes/choice-road',
    });
  });
});
