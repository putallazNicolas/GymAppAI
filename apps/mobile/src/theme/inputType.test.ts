import { describe, expect, it } from '@jest/globals';

import { inputType } from './typography';

// iOS: textTransform on a TextInput rewrites the value onChangeText reports and leaves the last
// keystroke untransformed ("HELLO WORLd"). lineHeight clips glyphs while editing.
describe('inputType', () => {
  it.each(Object.entries(inputType))('%s has no textTransform and no lineHeight', (_, style) => {
    expect(style).not.toHaveProperty('textTransform');
    expect(style).not.toHaveProperty('lineHeight');
  });
});
