import { jest, describe, expect, it, beforeEach } from '@jest/globals';
import { createInMemoryRepositories, type Repositories } from '@gym/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Keyboard, type KeyboardEvent, type KeyboardEventName } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import EditPlannedExerciseSheet from '../app/rutina/ejercicio/[plannedId]';
import { DataProvider } from '../data/DataProvider';

import { routeParams } from './routerMock';

jest.mock(
  'expo-router',
  () => (jest.requireActual('./routerMock') as typeof import('./routerMock')).expoRouterMock,
);

const METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

async function setup() {
  const repos: Repositories = createInMemoryRepositories();
  const routine = await repos.routines.create({ name: 'Mi rutina' });
  const day = await repos.routines.addDay(routine.id, { name: 'Día 1' });
  const [exercise] = await repos.exercises.list();
  const [planned] = await repos.routines.addPlannedExercises(day.id, [
    { exerciseId: exercise!.id },
  ]);
  routeParams.current = { plannedId: planned!.id, dayId: day.id };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DataProvider repositories={repos}>
        <EditPlannedExerciseSheet />
      </DataProvider>
    </SafeAreaProvider>,
  );
  await screen.findByLabelText('Una serie más');
  const stored = async () =>
    (await repos.routines.getDay(day.id))!.exercises[0]!.plannedSets.map((s) => s.reps);
  return { stored };
}

/** Lets the saver's write promises settle. */
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

describe('Edit planned exercise sheet', () => {
  beforeEach(() => {
    routeParams.current = {};
  });

  it('the series stepper adds and removes sets ("Igual en todas")', async () => {
    const { stored } = await setup();
    expect(await stored()).toEqual(['10', '10', '10']);
    await fireEvent.press(screen.getByLabelText('Una serie más'));
    await settle();
    expect(await stored()).toEqual(['10', '10', '10', '10']);
    await fireEvent.press(screen.getByLabelText('Una serie menos'));
    await fireEvent.press(screen.getByLabelText('Una serie menos'));
    await settle();
    expect(await stored()).toEqual(['10', '10']);
  });

  it('"Por serie" has its own add and remove actions', async () => {
    const { stored } = await setup();
    await fireEvent.press(screen.getByText('Por serie'));
    await fireEvent.press(screen.getByText('5 · 3 · 1'));
    await settle();
    expect(await stored()).toEqual(['5', '3', '1']);
    await fireEvent.press(screen.getByLabelText('Agregar serie'));
    await settle();
    expect(await stored()).toEqual(['5', '3', '1', '1']);
    await fireEvent.press(screen.getByLabelText('Quitar la última serie'));
    await fireEvent.press(screen.getByLabelText('Quitar la última serie'));
    await settle();
    expect(await stored()).toEqual(['5', '3']);
  });

  it('the "N ×" of "Igual en todas" leads to the series stepper', async () => {
    await setup();
    expect(screen.getByLabelText('3 series. Cambiar cantidad')).toBeTruthy();
  });

  describe('keyboard bar (AMRAP · – · Siguiente)', () => {
    const handlers = new Map<KeyboardEventName, (e: KeyboardEvent) => void>();
    beforeEach(() => {
      handlers.clear();
      jest.spyOn(Keyboard, 'addListener').mockImplementation((name, handler) => {
        handlers.set(name, handler as (e: KeyboardEvent) => void);
        return { remove: () => handlers.delete(name) } as ReturnType<typeof Keyboard.addListener>;
      });
    });

    const showKeyboard = () =>
      act(() =>
        handlers.get('keyboardWillShow')?.({
          duration: 0,
          easing: 'keyboard',
          endCoordinates: { screenX: 0, screenY: 516, width: 393, height: 336 },
        }),
      );

    it('appears above the keyboard only while a reps field is focused', async () => {
      const { stored } = await setup();
      const field = screen.getByLabelText('Reps en todas las series');
      // With the bar mounted the field can use the number pad.
      expect(field.props.keyboardType).toBe('number-pad');
      expect(screen.queryByLabelText('Atajos del teclado de reps')).toBeNull();

      await fireEvent(field, 'focus');
      await showKeyboard();
      expect(screen.getByLabelText('Atajos del teclado de reps')).toBeTruthy();

      const keyboardBar = screen.getByLabelText('Atajos del teclado de reps');
      await fireEvent.press(within(keyboardBar).getByLabelText('AMRAP'));
      await fireEvent(field, 'blur');
      await settle();
      expect(await stored()).toEqual(['AMRAP', 'AMRAP', 'AMRAP']);
    });

    it('does not appear for other fields (notes)', async () => {
      await setup();
      await fireEvent(screen.getByLabelText('Notas del ejercicio'), 'focus');
      await showKeyboard();
      expect(screen.queryByLabelText('Atajos del teclado de reps')).toBeNull();
    });

    it('"–" types a range', async () => {
      const { stored } = await setup();
      await fireEvent.press(screen.getByText('Por serie'));
      const first = screen.getByLabelText(/^Reps de la serie 1/);
      await fireEvent(first, 'focus');
      await showKeyboard();
      await fireEvent.changeText(first, '8');
      await fireEvent.press(screen.getByLabelText('Guion para rangos'));
      expect(screen.getByLabelText(/^Reps de la serie 1/).props.value).toBe('8-');
      await fireEvent.changeText(first, '8-10');
      await fireEvent(first, 'blur');
      await settle();
      expect((await stored())[0]).toBe('8-10');
    });
  });
});
