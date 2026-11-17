import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EditableTitle } from './EditableTitle';

describe('EditableTitle', () => {
  it('saves exactly what was typed (case is presentation only)', async () => {
    const onCommit = jest.fn((_name: string) => Promise.resolve(true));
    await render(
      <EditableTitle label="Nombre de la rutina" value="Mi rutina" onCommit={onCommit} />,
    );
    const input = screen.getByLabelText('Nombre de la rutina');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Hello world');
    await fireEvent(input, 'endEditing');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('Hello world');
  });

  it('never applies textTransform to the input', async () => {
    await render(
      <EditableTitle label="Nombre" value="Piernas" onCommit={() => Promise.resolve(true)} />,
    );
    const input = screen.getByLabelText('Nombre');
    const flat = [input.props.style].flat(Infinity).reduce((a, s) => ({ ...a, ...s }), {});
    expect(flat).not.toHaveProperty('textTransform');
  });
});
