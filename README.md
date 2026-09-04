# chartjs-plugin-crosshair-xy

A tiny [Chart.js](https://www.chartjs.org/) v4 plugin that draws a **vertical and horizontal
crosshair** across the chart area, crossing at the hovered point.

- ~70 lines, **zero dependencies** — it never imports Chart.js at runtime, only its types.
- Snaps to the active data point by default, or follows the pointer freely.
- Configured through the standard `options.plugins.crosshair` scope, with typed options.
- Drawn in `afterDatasetsDraw`: above the series, below the tooltip.

Not to be confused with [`chartjs-plugin-crosshair`](https://www.npmjs.com/package/chartjs-plugin-crosshair),
which draws a vertical line only and adds chart syncing and zoom. This one does one thing.

## Install

```bash
npm install chartjs-plugin-crosshair-xy
```

`chart.js` `^4.0.0` is a peer dependency.

## Usage

Register it for a single chart:

```ts
import { Chart } from 'chart.js';
import { crosshair } from 'chartjs-plugin-crosshair-xy';

new Chart(canvas, {
  type: 'line',
  data,
  plugins: [crosshair],
  options: {
    interaction: { mode: 'index', intersect: false },
    plugins: {
      crosshair: { color: 'rgba(96, 165, 250, 0.5)', dash: [4, 4] },
    },
  },
});
```

…or globally, for every chart:

```ts
Chart.register(crosshair);
```

Either way the crosshair needs *something* to hover: keep the default `interaction` options, or
the tooltip enabled. Disable it per chart with `plugins: { crosshair: false }`.

## Options

| Option  | Type                                     | Default                     | Description                                                            |
| ------- | ---------------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `color` | `string`                                 | the chart's `borderColor`   | Any canvas `strokeStyle`. Use `rgba()`/`#rrggbbaa` for a subtle line.   |
| `width` | `number`                                 | `1`                         | Line width in pixels.                                                  |
| `dash`  | `number[]`                               | `[4, 4]`                    | Dash pattern; `[]` draws a solid line.                                 |
| `lines` | `'both' \| 'vertical' \| 'horizontal'`   | `'both'`                    | Which of the two lines to draw.                                        |
| `snap`  | `boolean`                                | `true`                      | `true` snaps to the active data point, `false` follows the pointer.    |

TypeScript users get these on `options.plugins.crosshair` automatically — importing the package
augments Chart.js's own `PluginOptionsByType`.

### `snap`

With `snap: true` (the default) the crosshair sits exactly on the active element, so it lines up
with the tooltip and the hovered point marker. It reads `chart.getActiveElements()`, falling back
to the tooltip's active elements.

With `snap: false` the plugin tracks the pointer itself in `afterEvent` and requests a re-render
only when the position actually changes. It clears as soon as the pointer leaves the chart area.

With a multi-dataset chart in `interaction.mode: 'index'`, the horizontal line follows the *first*
active element. Use `lines: 'vertical'` if that is not what you want.

## License

MIT
