// Things the scene needs from the page: web fonts for canvas text, and the light or dark theme.
import { useEffect, useState } from 'react';
import { Color, SRGBColorSpace } from 'three';
import { create } from 'zustand';

/** Bumped once the web fonts are in, so canvas text gets redrawn with them. */
export const useFonts = create<{ epoch: number }>(() => ({ epoch: 0 }));

export function loadFonts() {
  if (!document.fonts?.load) return;
  Promise.all([
    document.fonts.load('800 58px "Big Shoulders Display"'),
    document.fonts.load('900 210px "Big Shoulders Display"'),
    document.fonts.load('600 30px "Barlow Condensed"'),
    document.fonts.load('700 50px "Barlow Condensed"'),
  ])
    .then(() => useFonts.setState((s) => ({ epoch: s.epoch + 1 })))
    .catch(() => {});
}

export interface SceneTheme { stage: string; hall: string; dark: boolean }

function readTheme(): SceneTheme {
  const css = getComputedStyle(document.documentElement);
  const stage = css.getPropertyValue('--stage').trim() || '#C6D2DB';
  const hall = css.getPropertyValue('--hall').trim() || '#A8B7C3';
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(stage).getHSL(hsl, SRGBColorSpace);
  return { stage, hall, dark: hsl.l < 0.3 };
}

/** Stage colours come from the CSS variables, so the 3D hall follows the page theme. */
export function useSceneTheme(): SceneTheme {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const update = () => setTheme(readTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return theme;
}
