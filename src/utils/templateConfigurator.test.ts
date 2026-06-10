import { describe, expect, it } from 'vitest';
import type { EditableTextField } from '../types';
import { buildTemplateJson, createConfiguratorTextField, getNextTextFieldIndex, parseTags } from './templateConfigurator';

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
});
