import type { ReactNode } from 'react';
import { fr } from '../domain/texts';
import type { Level } from '../domain/quiz';

export interface SegOption<T extends string> { value: T; label: ReactNode; id?: string; disabled?: boolean }

/** Segmented control: one pressed button among a few. */
export function Seg<T extends string>(props: {
  id?: string;
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const { id, label, value, options, onChange, className } = props;
  return (
    <div className={className ? `seg ${className}` : 'seg'} id={id} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} id={o.id} type="button" aria-pressed={o.value === value} disabled={o.disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type Tone = 'ok' | 'fault' | 'warn';
export const toneOf = (level: Level): Tone => (level === 'faute' ? 'fault' : level === 'loin' ? 'warn' : 'ok');

export function Feedback({ id, tone, title, lines }: { id?: string; tone: Tone; title: string; lines: string[] }) {
  return (
    <div className={`feedback ${tone}`} id={id}>
      <strong>{fr(title)}</strong>
      <ul>
        {lines.map((l, i) => <li key={i}>{fr(l)}</li>)}
      </ul>
    </div>
  );
}

export function Score({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <div className="score">
      {items.map(([label, value]) => (
        <div key={label}>
          <span className="lbl">{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}
