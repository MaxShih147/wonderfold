import { memo, useId, type ReactNode } from 'react';
import { HOLE_RADIUS, cellCenter, type Cell, type FoldHint, type Piece, type Point } from '../engine/index.ts';

const PAD = 0.45;

function regionPath(region: readonly Point[]): string {
  return region.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('') + 'Z';
}

function holePath(cell: Cell): string {
  const c = cellCenter(cell);
  const r = HOLE_RADIUS;
  return `M${c.x - r} ${c.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function gridPath(n: number): string {
  let d = '';
  for (let i = 1; i < n; i++) d += `M${i} 0V${n}M0 ${i}H${n}`;
  return d;
}

function Arrow({ from, to, scale }: { from: Point; to: Point; scale: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Bow the shaft sideways so it reads as a flap lifting over the crease.
  const ctrl = { x: (from.x + to.x) / 2 - (dy / len) * len * 0.32, y: (from.y + to.y) / 2 + (dx / len) * len * 0.32 };
  const tx = to.x - ctrl.x;
  const ty = to.y - ctrl.y;
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const head = 0.34 * scale;
  const base = { x: to.x - ux * head, y: to.y - uy * head };
  const wing = head * 0.55;
  const shaft = `M${from.x} ${from.y}Q${ctrl.x} ${ctrl.y} ${base.x} ${base.y}`;
  const tip = `M${to.x} ${to.y}L${base.x - uy * wing} ${base.y + ux * wing}L${base.x + uy * wing} ${base.y - ux * wing}Z`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={shaft} fill="none" stroke="var(--hint-edge)" strokeWidth={0.2 * scale} />
      <path d={tip} fill="var(--hint-edge)" stroke="var(--hint-edge)" strokeWidth={0.12 * scale} />
      <path d={shaft} fill="none" stroke="var(--hint)" strokeWidth={0.1 * scale} />
      <path d={tip} fill="var(--hint)" />
    </g>
  );
}

export interface PunchMarks {
  cells: readonly Cell[];
  /** 0 = punch hovering above the paper, 1 = punched. */
  t: number;
}

interface Props {
  gridSize: number;
  pieces: readonly Piece[];
  hint?: FoldHint | null;
  punch?: PunchMarks | null;
  /** Draw the dashed outline and grid of the original sheet behind the paper. */
  mat?: boolean;
  /** Draw cell grid lines on the paper and the mat. */
  grid?: boolean;
  shadow?: boolean;
  /** Thinner hint strokes for thumbnail-sized canvases. */
  compact?: boolean;
  className?: string;
  label?: string;
  /** Extra SVG drawn over the paper, in grid coordinates. */
  children?: ReactNode;
}

/** Draws a stack of paper plies. Purely presentational. */
export const PaperCanvas = memo(function PaperCanvas({
  gridSize: n,
  pieces,
  hint,
  punch,
  mat = false,
  grid: showGrid = false,
  shadow = false,
  compact = false,
  className,
  label,
  children,
}: Props) {
  const id = useId();
  const grid = gridPath(n);
  const scale = n / 5;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${n + 2 * PAD} ${n + 2 * PAD}`}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label || children ? undefined : true}
      data-grid={showGrid}
    >
      <defs>
        {shadow && (
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy={0.05 * scale} stdDeviation={0.07 * scale} floodColor="#000" floodOpacity="0.28" />
          </filter>
        )}
        {showGrid &&
          pieces.map((piece, i) => (
          <clipPath key={piece.key} id={`${id}-clip-${i}`}>
            <path d={regionPath(piece.region)} />
          </clipPath>
        ))}
      </defs>

      {mat && (
        <g fill="none" vectorEffect="non-scaling-stroke">
          {showGrid && <path d={grid} stroke="var(--line)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />}
          <rect
            width={n}
            height={n}
            stroke="var(--muted)"
            strokeOpacity={0.6}
            strokeWidth={1.2}
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}

      <g filter={shadow ? `url(#${id}-shadow)` : undefined}>
        {pieces.map((piece, i) => {
          const outline = regionPath(piece.region) + piece.holes.map(holePath).join('');
          return (
            <g key={piece.key} transform={`matrix(${piece.matrix.join(' ')})`}>
              <path
                d={outline}
                fillRule="evenodd"
                fill={piece.back ? 'var(--paper-back)' : 'var(--paper)'}
                stroke={piece.back ? 'var(--paper-back-edge)' : 'var(--paper-edge)'}
                strokeWidth={1.2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {showGrid && (
                <path
                  d={grid}
                  clipPath={`url(#${id}-clip-${i})`}
                  fill="none"
                  stroke={piece.back ? 'var(--paper-back-grid)' : 'var(--paper-grid)'}
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {piece.lift > 0.01 && <path d={outline} fillRule="evenodd" fill="#000" opacity={piece.lift * 0.22} />}
            </g>
          );
        })}
      </g>

      {hint && (
        <g>
          <line
            x1={hint.crease[0].x}
            y1={hint.crease[0].y}
            x2={hint.crease[1].x}
            y2={hint.crease[1].y}
            stroke="var(--hint-edge)"
            strokeWidth={compact ? 2.2 : 4.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={hint.crease[0].x}
            y1={hint.crease[0].y}
            x2={hint.crease[1].x}
            y2={hint.crease[1].y}
            stroke="var(--hint)"
            strokeWidth={compact ? 1.2 : 2.5}
            strokeDasharray={compact ? '3 2.5' : '7 5'}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <Arrow from={hint.from} to={hint.to} scale={scale} />
        </g>
      )}

      {punch &&
        punch.t < 1 &&
        punch.cells.map((cell) => {
          const c = cellCenter(cell);
          const r = HOLE_RADIUS * (1 + 1.8 * (1 - punch.t));
          return (
            <g key={`${cell.x},${cell.y}`} opacity={Math.min(1, 0.25 + punch.t)}>
              <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="var(--hint-edge)" strokeWidth={0.16 * scale} />
              <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="var(--hint)" strokeWidth={0.09 * scale} />
            </g>
          );
        })}
      {children}
    </svg>
  );
});
