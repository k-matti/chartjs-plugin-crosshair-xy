import type { Chart, ChartType, Plugin } from 'chart.js';

export interface CrosshairOptions {
  /** Any canvas `strokeStyle`. Defaults to the chart's own `options.borderColor`. */
  color?: string;
  /** Line width in pixels. Default: `1`. */
  width?: number;
  /** Dash pattern; `[]` draws a solid line. Default: `[4, 4]`. */
  dash?: number[];
  /** Which lines to draw. Default: `'both'`. */
  lines?: 'both' | 'vertical' | 'horizontal';
  /**
   * `true` snaps the crosshair to the active data point, `false` lets it follow
   * the pointer freely. Default: `true`.
   */
  snap?: boolean;
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    crosshair?: CrosshairOptions | false;
  }
}

interface Pos {
  x: number;
  y: number;
}

/** Free-mode pointer, per chart. Snap mode keeps no state - it reads the active element. */
const pointers = new WeakMap<object, Pos | null>();

function target(chart: Chart, opts: CrosshairOptions): Pos | null {
  if (opts.snap === false) return pointers.get(chart) ?? null;
  const hovered = chart.getActiveElements();
  const active = hovered.length ? hovered : (chart.tooltip?.getActiveElements() ?? []);
  const el = active[0]?.element;
  return el ? { x: el.x, y: el.y } : null;
}

export const crosshair: Plugin<ChartType, CrosshairOptions> = {
  id: 'crosshair',

  defaults: {
    width: 1,
    dash: [4, 4],
    lines: 'both',
    snap: true,
  },

  afterEvent(chart, args, opts) {
    if (opts.snap !== false) return;
    const { event, inChartArea } = args;
    const next =
      inChartArea && event.x !== null && event.y !== null ? { x: event.x, y: event.y } : null;
    const prev = pointers.get(chart) ?? null;
    if (prev?.x === next?.x && prev?.y === next?.y) return;
    pointers.set(chart, next);
    args.changed = true;
  },

  afterDatasetsDraw(chart, _args, opts) {
    const point = target(chart, opts);
    if (!point) return;

    const { ctx, chartArea } = chart;
    const lines = opts.lines ?? 'both';
    ctx.save();
    ctx.strokeStyle = opts.color ?? (chart.options.borderColor as string);
    ctx.lineWidth = opts.width ?? 1;
    ctx.setLineDash(opts.dash ?? []);
    ctx.beginPath();
    if (lines !== 'horizontal') {
      ctx.moveTo(point.x, chartArea.top);
      ctx.lineTo(point.x, chartArea.bottom);
    }
    if (lines !== 'vertical') {
      ctx.moveTo(chartArea.left, point.y);
      ctx.lineTo(chartArea.right, point.y);
    }
    ctx.stroke();
    ctx.restore();
  },
};

export default crosshair;
