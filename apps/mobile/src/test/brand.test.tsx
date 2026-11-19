import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Children, type ReactElement, type ReactNode } from 'react';
import { hideAsync } from 'expo-splash-screen';

import { AboutKalk } from '../components/brand/AboutKalk';
import { BrandSplash } from '../components/brand/BrandSplash';
import { KalkMark } from '../components/brand/KalkMark';
import { KalkWordmark } from '../components/brand/KalkWordmark';
import HomeEmpty from './homeEmptyHarness';
import { brand } from '../theme';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

/** Fills of the shapes a (hook-free) brand component draws. */
function fills(element: ReactElement): string[] {
  const { children } = element.props as { children: ReactNode };
  return Children.toArray(children).map(
    (child) => (child as ReactElement<{ fill: string }>).props.fill,
  );
}

describe('KalkWordmark', () => {
  it('is an image labelled "Kalk", 232 × 52, 16 pt by default', async () => {
    await render(<KalkWordmark />);
    const svg = screen.getByLabelText('Kalk');
    expect(svg.props.height).toBe(16);
    expect(svg.props.width).toBeCloseTo((16 * 232) / 52);
  });

  it('never goes below 16 pt', async () => {
    await render(<KalkWordmark height={10} />);
    expect(screen.getByLabelText('Kalk').props.height).toBe(16);
  });

  it('"mono" is one ink (bone); "color" only paints the first arm orange', () => {
    expect(new Set(fills(KalkWordmark({ tone: 'mono' })))).toEqual(new Set([brand.bone]));
    const color = fills(KalkWordmark({ tone: 'color' }));
    expect(color.filter((f) => f === brand.signal)).toHaveLength(1);
    expect(color[1]).toBe(brand.signal);
  });
});

describe('KalkMark', () => {
  it('crop: the K alone, framed tight, with size as its height (Hoy header, design/L4 B)', async () => {
    expect(fills(KalkMark({ crop: true, tile: true, tone: 'mono' }))).toEqual([
      brand.bone,
      brand.bone,
    ]);
    await render(<KalkMark size={22} crop tone="mono" />);
    const svg = screen.getByLabelText('Kalk');
    expect(svg.props.height).toBe(22);
    expect(svg.props.width).toBeCloseTo((22 * 51) / 52);
  });

  it('draws the ink tile only when asked, and is labelled "Kalk"', async () => {
    expect(fills(KalkMark({ tile: true }))).toEqual([brand.ink, brand.bone, brand.signal]);
    expect(fills(KalkMark({ tone: 'mono' }))).toEqual([brand.bone, brand.bone]);
    await render(<KalkMark />);
    expect(screen.getByLabelText('Kalk')).toBeTruthy();
  });
});

describe('BrandSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (hideAsync as jest.Mock).mockClear();
  });

  it('hides the native splash on its first layout, once', async () => {
    await render(<BrandSplash leaving={false} onGone={() => undefined} canShowText />);
    await fireEvent(screen.getByTestId('brand-splash'), 'layout', { nativeEvent: { layout: {} } });
    await fireEvent(screen.getByTestId('brand-splash'), 'layout', { nativeEvent: { layout: {} } });
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('shows "Preparando tus datos…" only after 1.5 s', async () => {
    await render(<BrandSplash leaving={false} onGone={() => undefined} canShowText />);
    expect(screen.queryByText('Preparando tus datos…')).toBeNull();
    await act(() => jest.advanceTimersByTime(1400));
    expect(screen.queryByText('Preparando tus datos…')).toBeNull();
    await act(() => jest.advanceTimersByTime(200));
    expect(screen.getByText('Preparando tus datos…')).toBeTruthy();
  });

  it('plays its exit when everything is loaded and then calls onGone', async () => {
    const onGone = jest.fn();
    await render(<BrandSplash leaving={false} onGone={onGone} canShowText />);
    await act(() => jest.advanceTimersByTime(1000));
    expect(onGone).not.toHaveBeenCalled();
    await screen.rerender(<BrandSplash leaving onGone={onGone} canShowText />);
    await act(() => jest.advanceTimersByTime(500));
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('shows the error instead of the K when loading fails', async () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    await render(
      <BrandSplash leaving={false} onGone={() => undefined} canShowText>
        <Text>No pudimos abrir tus datos.</Text>
      </BrandSplash>,
    );
    expect(screen.getByText('No pudimos abrir tus datos.')).toBeTruthy();
    expect(screen.queryByLabelText('Kalk')).toBeNull();
  });
});

describe('AboutKalk', () => {
  it('shows only the icon (no wordmark) and the name as text next to the version', async () => {
    await render(<AboutKalk />);
    // One drawn logo: the 80 pt icon. The name is text, never the wordmark.
    expect(screen.getAllByRole('image', { name: 'Kalk' })).toHaveLength(1);
    expect(screen.getByRole('image', { name: 'Kalk' }).props.width).toBe(80);
    expect(screen.getByText('Kalk')).toBeTruthy();
    // The version comes from expo-application (mocked by jest-expo as "mock").
    expect(screen.getByLabelText(/^Kalk, versión \S+/)).toBeTruthy();
    expect(screen.queryByText(/^Versión/)).toBeNull();
  });
});

describe('HomeEmpty', () => {
  it('names the app once, as text', async () => {
    await render(<HomeEmpty />);
    expect(screen.getByText(/Kalk.*te sugiere qué entrenar cada día/)).toBeTruthy();
  });
});
