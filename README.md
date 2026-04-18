# Obsidian-Charts [![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/ashleyjackson/obsidian-charts)](https://github.com/ashleyjackson/obsidian-charts/releases) [![Release Obsidian Plugin](https://github.com/ashleyjackson/obsidian-charts/actions/workflows/release.yml/badge.svg)](https://github.com/ashleyjackson/obsidian-charts/actions/workflows/release.yml) ![GitHub all releases](https://img.shields.io/github/downloads/ashleyjackson/obsidian-charts/total)

This plugin lets you create interactive Charts in [Obsidian](https://www.obsidian.md).

## Installation

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) Settings and **disable** Safe Mode
2. Click on **Browse** and search for "Charts"
3. Click install
4. Toggle the Plugin on in the **Community Plugins** Tab

## Basic Usage

Create a chart using a codeblock of type `chart` with YAML properties:

```yaml
```chart
type: bar
labels: [Mon, Tue, Wed, Thu, Fri]
series:
    - title: Sales
      data: [1, 2, 3, 4, 5]
    - title: Revenue
      data: [5, 4, 3, 2, 1]
```
```

> **Note:** You may not be able to copy examples directly into Obsidian — the indentation can be wrong and Obsidian may convert pasted text to Markdown, escaping important characters.

### Numeric Data Values

Data values in `data` arrays are automatically converted to numbers. If YAML parses a value as a string (e.g., `"5"` instead of `5`), the plugin converts it before rendering. You can write values as either numbers or strings.

Empty values in data arrays are converted to `null`, which is important for `spanGaps` support — Chart.js uses `null` to properly bridge gaps in line charts.

### Graphical Chart Creator

For simple charts you can use the graphical Chart Creator, accessible via the Command Palette. You can even set a hotkey for it!

<img width="60%" src="https://cdn.buymeacoffee.com/uploads/project_updates/2021/04/b913e0cec14e6bad57ef0757ce29d288.gif"/>

## Chart Types

### Bar Chart

```yaml
```chart
type: bar
labels: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, "next Week", "next Month"]
series:
    - title: Title 1
      data: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    - title: Title 2
      data: [5, 4, 3, 2, 1, 0, -1, -2, -3]
```
```

![Bar Chart](https://github.com/ashleyjackson/obsidian-charts/raw/master/images/barchart.png)

**Bar-specific modifiers:** `indexAxis` (set to `y` for horizontal bars), `stacked`

### Line Chart

```yaml
```chart
type: line
labels: [Monday, Tuesday, Wednesday, Thursday, Friday]
series:
    - title: Title 1
      data: [1, 2, 3, 4, 5]
    - title: Title 2
      data: [5, 4, 3, 2, 1]
    - title: Title 3
      data: [8, 2, 5, -1, 4]
```
```

![Line Chart](https://github.com/ashleyjackson/obsidian-charts/raw/master/images/linechart.png)

**Line-specific modifiers:** `bestFit`, `stepped`, `fill`, `tension`, `spanGaps`

### Pie and Doughnut Charts

```yaml
```chart
type: pie
labels: [Monday, Tuesday, Wednesday, Thursday, Friday]
series:
    - title: Title 1
      data: [1, 2, 3, 4, 5]
    - title: Title 2
      data: [5, 4, 3, 2, 1]
width: 40%
labelColors: true
```
```

Use `type: doughnut` for the doughnut variant. A `width` modifier is recommended since these charts can be very large otherwise. `labelColors: true` is also commonly used to assign colors per label rather than per series.

### Radar Chart

```yaml
```chart
type: radar
labels: [Monday, Tuesday, Wednesday, Thursday, Friday]
series:
    - title: Title 1
      data: [1, 2, 3, 4, 5]
    - title: Title 2
      data: [5, 4, 3, 2, 1]
width: 40%
```
```

### Polar Area Chart

```yaml
```chart
type: polarArea
labels: [Monday, Tuesday, Wednesday, Thursday, Friday]
series:
    - title: Title 1
      data: [1, 2, 3, 4, 5]
    - title: Title 2
      data: [5, 4, 3, 2, 1]
labelColors: true
width: 40%
```
```

### Sankey Chart

```yaml
```chart
type: sankey
labels: [Oil, "Natural Gas", Coal, "Fossil Fuels", Electricity, Energy]
series:
  - data:
      - [Oil, 15, "Fossil Fuels"]
      - ["Natural Gas", 20, "Fossil Fuels"]
      - [Coal, 25, "Fossil Fuels"]
      - [Coal, 25, Electricity]
      - ["Fossil Fuels", 60, Energy]
      - [Electricity, 25, Energy]
    priority:
      Oil: 1
      Natural Gas: 2
      Coal: 3
      Fossil Fuels: 1
      Electricity: 2
      Energy: 1
    colorFrom:
      Oil: "black"
      Coal: "gray"
      "Fossil Fuels": "slategray"
      Electricity: "blue"
      Energy: "orange"
    colorTo:
      Oil: "black"
      Coal: "gray"
      "Fossil Fuels": "slategray"
      Electricity: "blue"
      Energy: "orange"
```
```

### Candlestick and OHLC Charts

Financial chart types for stock and securities analysis. Data uses the `[open, high, low, close]` format:

```yaml
```chart
type: candlestick
labels: [Mon, Tue, Wed, Thu, Fri]
series:
    - title: AAPL
      data:
        - [150, 155, 148, 152]
        - [152, 158, 150, 156]
        - [156, 160, 154, 158]
        - [158, 162, 155, 160]
        - [160, 165, 157, 163]
yMin: 140
yMax: 170
```
```

Use `type: ohlc` for the open-high-low-close bar style instead of candlesticks. The data format is identical.

You can also use object format for data points:

```yaml
series:
    - title: AAPL
      data:
        - o: 150
          h: 155
          l: 148
          c: 152
```

**Financial chart modifiers:** `yMin`, `yMax`

## Link Table to Chart

You can link a chart to a Markdown table so it displays the table's data.

1. Add a Block ID (`^name`) to your table:
    ```md
    |       | Test1 | Test2 | Test3 |
    | ----- | ----- | ----- | ----- |
    | Data1 | 1     | 2     | 3.33  |
    | Data2 | 3     | 2     | 1     |
    | Data3 | 6.7   | 4     | 2     |
    ^table
    ```
2. Reference the block ID in your chart:
    ```yaml
    ```chart
    type: bar
    id: ^table
    layout: rows
    width: 80%
    beginAtZero: true
    ```
    ```
3. To link a table from a different file, add the `file` attribute:
    ```yaml
    ```chart
    type: bar
    id: ^table
    file: OtherNote
    layout: rows
    ```
    ```
4. Choose the layout using `layout: rows` or `layout: columns`
5. Optionally select specific rows/columns with `select: [Data2]`

> **Tip:** You can use either `^my-table` or `my-table` as the `id` value. The leading `^` is automatically stripped when looking up the block ID.

> **Note:** When a table has a block ID for chart linking, the block ID link that normally appears below the table is automatically hidden in reading mode.

### Empty Cell Handling

Empty cells in linked tables are automatically converted to `null` values. When using `spanGaps: true`, gaps from missing data are properly bridged instead of showing the missing values as 0.

### Date Auto-Transpose

When your table has date-like values in the first column or row (depending on layout), the plugin automatically transposes the data for proper time series display.

**Without auto-transpose:** dates become series names, resulting in multiple lines instead of a single time series.

**With auto-transpose:** dates become X-axis labels and the original column headers become series names.

Given this table:

```md
| Date       | Sales | Revenue |
| ---------- | ----- | ------- |
| 2026-01-01 | 100   | 500     |
| 2026-02-01 | 150   | 750     |
| 2026-03-01 | 120   | 600     |
^sales-table
```

With `layout: rows`, auto-transpose makes the dates the X-axis labels:

```yaml
```chart
type: line
id: ^sales-table
layout: rows
```
```

Supported date formats: ISO (`2026-03-17`), US (`03/17/2026`), European (`17/03/2026`), and more. The transposition triggers when the majority (>50%) of field keys are date-like.

### Replace Table with Chart

Select a whole Markdown table and run the command "Create Chart from Table" to replace it with a chart.

<img src="https://media.discordapp.net/attachments/855181471643861002/897811518022909982/tabletochart.gif" referrerpolicy="no-referrer" />

## Dataview Integration

Use `window.renderChart(data, element)` to render charts from JavaScript (e.g., DataviewJS).

The API supports two data formats:

### YAML-like Format (Recommended)

Use the `series` key format — the same schema as `chart` code blocks. Modifiers like `fill`, `stacked`, `spanGaps`, `beginAtZero`, and color generation are handled automatically:

```js
```dataviewjs
const data = dv.current()

const chartData = {
    type: 'line',
    labels: [data.test],
    series: [{
        title: 'Grades',
        data: [data.mark],
    }],
    fill: true,
    stacked: true,
    beginAtZero: true,
}

window.renderChart(chartData, this.container);
```
```

### Chart.js Format

For advanced use cases, pass a raw [Chart.js](https://www.chartjs.org/docs/latest/) configuration with `data.datasets`:

```js
```dataviewjs
const pages = dv.pages('#test')
const testNames = pages.map(p => p.file.name).values
const testMarks = pages.map(p => p.mark).values

const chartData = {
    type: 'bar',
    data: {
        labels: testNames,
        datasets: [{
            label: 'Mark',
            data: testMarks,
            backgroundColor: ['rgba(255, 99, 132, 0.2)'],
            borderColor: ['rgba(255, 99, 132, 1)'],
            borderWidth: 1,
        }]
    }
}

window.renderChart(chartData, this.container)
```
```

> **Caution:** You must use `dataviewjs` code blocks for this to work.

## Convert Charts to Images

Select the whole chart codeblock and run the command "Create image from Chart" to replace it with an image. You can choose the quality and format in the plugin settings.

<img src="https://media.discordapp.net/attachments/855181471643861002/897811615037136966/charttoimage.gif" referrerpolicy="no-referrer" />

> **Tip:** The generated image respects the `width` modifier from your chart YAML. Pixel widths (e.g., `width: 800px` or `width: 800`) set the image width. Percentage values (e.g., `width: 80%`) fall back to 600px for image export. The height is automatically calculated at a 2:1 aspect ratio.

## Modifiers

### `width`

Set the width of any chart. Especially recommended for Pie, Doughnut, Radar, and Polar Area charts. Accepts any valid CSS value (e.g., `400px`, `40%`).

- **Default:** `100%`

### `fill`

Fill the area under line chart traces.

- **Type:** `boolean`
- **Default:** `false`

### `stacked`

Stack bars or lines on top of each other. When used with `fill`, the first dataset fills to `origin` and subsequent datasets fill to the previous dataset.

- **Type:** `boolean`
- **Default:** `false`

### `bestFit`, `bestFitTitle`, `bestFitNumber`

Add a line of best fit using linear regression. The regression is computed against index positions (0, 1, 2, ...) as X values and your data values as Y values.

- `bestFit` — **Type:** `boolean`, **Default:** `false`
- `bestFitTitle` — **Type:** `string`, **Default:** `"Line of Best Fit"`
- `bestFitNumber` — **Type:** `integer` (0-indexed series selector), **Default:** `0`

### `spanGaps`

Connect data points across null/empty values. When linking to a table, empty cells are automatically treated as `null` so gaps are properly bridged.

- **Type:** `boolean`
- **Default:** `false`

### `tension`

Control the smoothness of line chart traces. 0 = no smoothness, 1 = maximum smoothness.

- **Type:** `number` (0-1)
- **Default:** `0`

### `beginAtZero`

Force the chart to start at 0. Otherwise the chart cuts out unused space.

- **Type:** `boolean`
- **Default:** `false`

### `legend`

Show or hide the chart legend.

- **Type:** `boolean`
- **Default:** `true`

### `legendPosition`

Position of the legend.

- **Type:** `top` | `left` | `bottom` | `right`
- **Default:** `top`

### `stepped`

Render the line in a stepped (staircase) fashion.

- **Type:** `boolean` or `'before'` | `'after'` | `'middle'`
- **Default:** `false`

### `labelColors`

Assign colors based on labels instead of series. Most useful for Pie, Doughnut, and Polar Area charts.

- **Type:** `boolean`
- **Default:** `false`

### `transparency`

Override the inner color transparency of chart elements.

- **Type:** `number` (0.0 - 1.0)
- **Default:** `0.25`

### `padding`

Add padding around the chart.

- **Type:** `integer` or `object`
- **Default:** none

### `textColor`

Override the text color for chart labels and legends.

- **Type:** `string` (CSS color value)
- **Default:** Obsidian's `--text-muted` CSS variable

### `time`

Automatically format date values on the X axis.

- **Type:** `string` (`day`, `week`, `month`, `year`, etc.)

### Axes Modifiers

Valid for `bar` and `line` types only.

| Modifier | Type | Description |
|----------|------|-------------|
| `indexAxis` | `x` or `y` | Set to `y` for horizontal charts. Default: `x` |
| `stacked` | `boolean` | Stack values. Default: `false` |
| `xTitle` / `yTitle` | `string` | Add a title to the axis |
| `xReverse` / `yReverse` | `boolean` | Reverse the axis direction. Default: `false` |
| `xMin` / `yMin` / `xMax` / `yMax` | `number` | Set axis min/max. `Min` overrides `beginAtZero` |
| `rMin` / `rMax` | `number` | Set radial axis min/max for radar and polar area charts |
| `xDisplay` / `yDisplay` | `boolean` | Show/hide the axis. Default: `true` |
| `xTickDisplay` / `yTickDisplay` | `boolean` | Show/hide axis ticks. Default: `true` |
