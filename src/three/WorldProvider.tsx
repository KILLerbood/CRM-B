import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Flow Canvas has no 3D scene any more. This provider keeps the small API the screens already use:
 *  - burst(): a short confetti shower (a deal was won, a login succeeded)
 *  - setDimmed(): kept as a no-op for dialogs
 * The confetti is plain DOM + CSS, so it costs nothing until it is used and respects reduced motion.
 */
type Ctx = { burst: () => void; setDimmed: (d: boolean) => void };
const WorldCtx = createContext<Ctx>({ burst: () => {}, setDimmed: () => {} });
export const useWorld = () => useContext(WorldCtx);

const COLORS = ['#ff6a55', '#ffc94d', '#0f9a82', '#9460dc', '#e84e87', '#6a7cea'];
type Piece = { id: number; x: number; dx: number; r: number; c: string; d: number; s: number };

export function WorldProvider({ children }: { children: ReactNode }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const seq = useRef(0);
  const burst = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off') return;
    const base = seq.current;
    const next: Piece[] = Array.from({ length: 36 }, (_, i) => ({
      id: base + i, x: 50 + (Math.random() - 0.5) * 30, dx: (Math.random() - 0.5) * 70, r: Math.random() * 720 - 360,
      c: COLORS[i % COLORS.length], d: Math.random() * 180, s: 6 + Math.random() * 7
    }));
    seq.current += next.length;
    setPieces(next);
    window.setTimeout(() => setPieces((p) => p.filter((x) => x.id < base)), 1800);
  }, []);
  const setDimmed = useCallback(() => {}, []);
  return (
    <WorldCtx.Provider value={{ burst, setDimmed }}>
      {children}
      {pieces.length ? (
        <div className="confetti" aria-hidden="true">
          {pieces.map((p) => <i key={p.id} style={{ left: p.x + '%', background: p.c, width: p.s, height: p.s * 0.45, animationDelay: p.d + 'ms', ['--dx' as string]: p.dx + 'vw', ['--rot' as string]: p.r + 'deg' }} />)}
        </div>
      ) : null}
    </WorldCtx.Provider>
  );
}
