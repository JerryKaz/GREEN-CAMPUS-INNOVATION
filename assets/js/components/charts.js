// Chart.js (self-hosted in /vendor) loaded lazily — only on pages that draw charts.
import { CHART_COLORS } from '../lib/labels.js';
import { loadScript } from '../lib/vendor.js';

let chartLib;
async function lib() {
  chartLib ??= loadScript('chartjs/chart.umd.min.js', 'Chart').then((Chart) => {
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
    Chart.defaults.color = '#5B6B60';
    Chart.defaults.borderColor = '#E2E8E4';
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.maintainAspectRatio = false;
    return Chart;
  });
  return chartLib;
}

const instances = new WeakMap();

/** Render (or re-render) a chart into a container element. */
export async function renderChart(container, { type, labels, datasets, yTitle, stacked = false, horizontal = false }) {
  const Chart = await lib();
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', container.dataset.label || 'Chart');
    container.append(canvas);
  }
  instances.get(container)?.destroy();
  const styled = datasets.map((d, i) => {
    const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
    return {
      borderColor: color,
      backgroundColor: type === 'line' ? `${color}22` : (d.colors ?? color),
      borderWidth: type === 'line' ? 2.5 : 0,
      borderRadius: type === 'bar' ? 5 : 0,
      pointRadius: type === 'line' ? 3 : 0,
      tension: 0.3,
      fill: type === 'line' && datasets.length === 1,
      maxBarThickness: 46,
      ...d,
    };
  });
  const isPie = type === 'doughnut' || type === 'pie';
  const chart = new Chart(canvas, {
    type,
    data: { labels, datasets: styled },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      interaction: { mode: isPie ? 'nearest' : 'index', intersect: false },
      plugins: { legend: { display: isPie || datasets.length > 1, position: 'bottom' } },
      scales: isPie ? {} : {
        x: { stacked, grid: { display: false } },
        y: { stacked, beginAtZero: true, title: { display: !!yTitle, text: yTitle } },
      },
      ...(isPie ? { cutout: '62%' } : {}),
    },
  });
  instances.set(container, chart);
  return chart;
}
