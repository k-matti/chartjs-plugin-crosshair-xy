import test from 'node:test';
import assert from 'node:assert/strict';
import { crosshair } from '../dist/index.js';

const AREA = { top: 10, bottom: 110, left: 20, right: 220 };

/** Records every call Chart.js would make on the canvas context. */
function ctxStub() {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    save: rec('save'),
    restore: rec('restore'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    setLineDash: rec('setLineDash'),
    set strokeStyle(v) {
      calls.push(['strokeStyle', v]);
    },
    set lineWidth(v) {
      calls.push(['lineWidth', v]);
    },
  };
}

function chartStub({ hovered = [], tooltip = [], borderColor = '#101010' } = {}) {
  const at = (list) => list.map(([x, y]) => ({ element: { x, y } }));
  return {
    ctx: ctxStub(),
    chartArea: AREA,
    options: { borderColor },
    getActiveElements: () => at(hovered),
    tooltip: { getActiveElements: () => at(tooltip) },
  };
}

/** Chart.js merges the plugin's `defaults` under the user options before calling a hook. */
const draw = (chart, opts = {}) =>
  crosshair.afterDatasetsDraw(chart, {}, { ...crosshair.defaults, ...opts });

const segments = (ctx) =>
  ctx.calls.filter(([n]) => n === 'moveTo' || n === 'lineTo').map(([n, x, y]) => [n, x, y]);

test('documented defaults', () => {
  assert.deepEqual(crosshair.defaults, { width: 1, dash: [4, 4], lines: 'both', snap: true });
  assert.equal(crosshair.id, 'crosshair');
});

test('draws nothing when nothing is active', () => {
  const chart = chartStub();
  draw(chart);
  assert.deepEqual(chart.ctx.calls, []);
});

test('snaps both lines to the active point, spanning the chart area', () => {
  const chart = chartStub({ hovered: [[75, 40]] });
  draw(chart);
  assert.deepEqual(segments(chart.ctx), [
    ['moveTo', 75, AREA.top],
    ['lineTo', 75, AREA.bottom],
    ['moveTo', AREA.left, 40],
    ['lineTo', AREA.right, 40],
  ]);
  assert.equal(chart.ctx.calls.filter(([n]) => n === 'stroke').length, 1);
  assert.deepEqual(chart.ctx.calls.at(0), ['save']);
  assert.deepEqual(chart.ctx.calls.at(-1), ['restore']);
});

test('falls back to the tooltip when hover has no active elements', () => {
  const chart = chartStub({ tooltip: [[10, 20]] });
  draw(chart);
  assert.deepEqual(segments(chart.ctx).at(0), ['moveTo', 10, AREA.top]);
});

test('lines option drops the other axis', () => {
  const vertical = chartStub({ hovered: [[75, 40]] });
  draw(vertical, { lines: 'vertical' });
  assert.deepEqual(segments(vertical.ctx), [
    ['moveTo', 75, AREA.top],
    ['lineTo', 75, AREA.bottom],
  ]);

  const horizontal = chartStub({ hovered: [[75, 40]] });
  draw(horizontal, { lines: 'horizontal' });
  assert.deepEqual(segments(horizontal.ctx), [
    ['moveTo', AREA.left, 40],
    ['lineTo', AREA.right, 40],
  ]);
});

test('style: options win, colour falls back to the chart border colour', () => {
  const themed = chartStub({ hovered: [[1, 2]], borderColor: '#abcdef' });
  draw(themed);
  assert.deepEqual(themed.ctx.calls.at(1), ['strokeStyle', '#abcdef']);
  assert.deepEqual(themed.ctx.calls.at(2), ['lineWidth', 1]);
  assert.deepEqual(themed.ctx.calls.at(3), ['setLineDash', [4, 4]]);

  const custom = chartStub({ hovered: [[1, 2]] });
  draw(custom, { color: '#ff0000', width: 2, dash: [] });
  assert.deepEqual(custom.ctx.calls.at(1), ['strokeStyle', '#ff0000']);
  assert.deepEqual(custom.ctx.calls.at(2), ['lineWidth', 2]);
  assert.deepEqual(custom.ctx.calls.at(3), ['setLineDash', []]);
});

test('free mode follows the pointer and asks for a re-render only on a move', () => {
  const chart = chartStub();
  const opts = { ...crosshair.defaults, snap: false };
  const move = (x, y, inChartArea = true) => {
    const args = { event: { type: 'mousemove', x, y }, replay: false, cancelable: false, inChartArea };
    crosshair.afterEvent(chart, args, opts);
    return args.changed;
  };

  assert.equal(move(50, 60), true);
  crosshair.afterDatasetsDraw(chart, {}, opts);
  assert.deepEqual(segments(chart.ctx), [
    ['moveTo', 50, AREA.top],
    ['lineTo', 50, AREA.bottom],
    ['moveTo', AREA.left, 60],
    ['lineTo', AREA.right, 60],
  ]);

  assert.equal(move(50, 60), undefined, 'same position must not force a render');

  assert.equal(move(null, null, false), true, 'leaving the chart area clears the crosshair');
  crosshair.afterDatasetsDraw(chart, {}, opts);
  assert.equal(chart.ctx.calls.filter(([n]) => n === 'stroke').length, 1, 'no second draw');
});

test('free mode ignores hover state, snap mode ignores the pointer', () => {
  const chart = chartStub({ hovered: [[9, 9]] });
  crosshair.afterEvent(
    chart,
    { event: { type: 'mousemove', x: 33, y: 44 }, replay: false, cancelable: false, inChartArea: true },
    { ...crosshair.defaults },
  );
  draw(chart);
  assert.deepEqual(segments(chart.ctx).at(0), ['moveTo', 9, AREA.top], 'snap mode stores no pointer');
});
