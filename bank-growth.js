(function (root) {
  'use strict';

  function buildSeries({ rows, headers, metadata, mode = 'single' }) {
    if (!headers.length) return { status: 'empty' };
    const missing = headers.filter(header => !Array.isArray(metadata[header]?.nativeCashflows) || !Number.isFinite(metadata[header]?.nativeAudit?.balanceUsd));
    if (missing.length) return { status: 'missing', missing };
    const dates = new Set(rows.map(row => row.DATA.split('/').reverse().join('-')));
    const bases = headers.map(header => metadata[header].nativeAudit.balanceUsd);
    if (mode === 'single' && bases.some(value => value !== bases[0])) return { status: 'incompatible' };
    const initialCents = Math.round((mode === 'separate' ? bases.reduce((sum, value) => sum + value, 0) : bases[0]) * 100);
    if (!Number.isSafeInteger(initialCents) || initialCents <= 0) return { status: 'invalid' };
    const flows = headers.flatMap(header => metadata[header].nativeCashflows
      .filter(flow => dates.has(flow.channelDate))
      .map(flow => ({ ...flow, header, time: Date.parse(flow.timeBrt.replace(' ', 'T') + '-03:00'), cents: Math.round(flow.netUsd * 100) })))
      .sort((a, b) => a.time - b.time || a.header.localeCompare(b.header));
    if (!flows.length) return { status: 'empty' };
    if (flows.some(flow => !Number.isFinite(flow.time) || !Number.isSafeInteger(flow.cents))) return { status: 'invalid' };
    const points = [{ time: flows[0].time - 1000, balance: initialCents / 100 }];
    let balance = initialCents, peak = initialCents, drawdown = 0, drawdownPct = 0;
    // Net simultaneous cash movements before measuring a combined balance.
    for (let i = 0; i < flows.length;) {
      const time = flows[i].time;
      let amount = 0;
      while (i < flows.length && flows[i].time === time) amount += flows[i++].cents;
      balance += amount;
      peak = Math.max(peak, balance);
      drawdown = Math.max(drawdown, peak - balance);
      drawdownPct = Math.max(drawdownPct, peak > 0 ? 100 * (peak - balance) / peak : 0);
      points.push({ time, balance: balance / 100 });
    }
    const coverageStart = headers.map(header => metadata[header].nativeAudit.start).sort().at(-1);
    return {
      status: 'ready', points, initial: initialCents / 100, final: balance / 100,
      profit: (balance - initialCents) / 100, percent: 100 * (balance - initialCents) / initialCents,
      drawdown: drawdown / 100, drawdownPct, flows: flows.length,
      partial: rows.some(row => row.DATA.split('/').reverse().join('-') < coverageStart),
      negativeBalance: points.some(point => point.balance <= 0), mode
    };
  }

  function usd(value) {
    return 'US$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dateLabel(time, detailed = false) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', ...(detailed ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(time);
  }

  function mount(elements) {
    let series = null, hoverIndex = -1, geometry = null;
    const canvas = elements.canvas;
    const context = canvas.getContext('2d');

    function draw() {
      if (!series || series.status !== 'ready') return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const width = rect.width, height = rect.height, ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const left = width < 450 ? 62 : 76, right = 14, top = 16, bottom = 30;
      const plotWidth = width - left - right, plotHeight = height - top - bottom;
      const values = series.points.map(point => point.balance);
      let min = Math.min(...values), max = Math.max(...values);
      const padding = Math.max((max - min) * .15, Math.abs(max) * .002, 1);
      min -= padding; max += padding;
      const start = series.points[0].time, end = series.points.at(-1).time;
      const x = point => left + (point.time - start) / Math.max(1, end - start) * plotWidth;
      const y = point => top + (max - point.balance) / (max - min) * plotHeight;
      geometry = { left, plotWidth, start, end, x, y };
      context.font = '11px Barlow, sans-serif'; context.lineWidth = 1;
      context.textAlign = 'right'; context.textBaseline = 'middle';
      for (let tick = 0; tick < 4; tick++) {
        const yy = top + tick / 3 * plotHeight;
        context.strokeStyle = 'rgba(157,179,204,.16)'; context.beginPath(); context.moveTo(left, yy); context.lineTo(width - right, yy); context.stroke();
        context.fillStyle = '#a9bbcf';
        context.fillText(Math.round(max - tick / 3 * (max - min)).toLocaleString('pt-BR'), left - 9, yy);
      }
      const positive = series.profit >= 0;
      const fill = context.createLinearGradient(0, top, 0, height - bottom);
      fill.addColorStop(0, positive ? 'rgba(115,184,255,.24)' : 'rgba(240,135,127,.22)');
      fill.addColorStop(1, positive ? 'rgba(115,184,255,.015)' : 'rgba(240,135,127,.015)');
      context.beginPath();
      series.points.forEach((point, i) => i ? context.lineTo(x(point), y(point)) : context.moveTo(x(point), y(point)));
      context.lineTo(x(series.points.at(-1)), height - bottom); context.lineTo(left, height - bottom); context.closePath();
      context.fillStyle = fill; context.fill();
      context.beginPath();
      series.points.forEach((point, i) => i ? context.lineTo(x(point), y(point)) : context.moveTo(x(point), y(point)));
      context.strokeStyle = positive ? '#78b8ff' : '#f19489'; context.lineWidth = 2; context.lineJoin = 'round'; context.stroke();
      context.fillStyle = '#a9bbcf'; context.textBaseline = 'bottom';
      [0, .5, 1].forEach((position, i) => {
        context.textAlign = ['left', 'center', 'right'][i];
        context.fillText(dateLabel(start + position * (end - start)), left + position * plotWidth, height - 2);
      });
      if (hoverIndex >= 0) {
        const point = series.points[hoverIndex];
        context.strokeStyle = 'rgba(200,216,233,.4)'; context.lineWidth = 1;
        context.beginPath(); context.moveTo(x(point), top); context.lineTo(x(point), height - bottom); context.stroke();
        context.fillStyle = positive ? '#78b8ff' : '#f19489'; context.beginPath(); context.arc(x(point), y(point), 4, 0, Math.PI * 2); context.fill();
        elements.tooltip.hidden = false;
        elements.tooltip.textContent = dateLabel(point.time, true) + ' BRT - ' + usd(point.balance);
        elements.tooltip.style.left = Math.max(6, Math.min(width - 216, x(point) - 100)) + 'px';
      }
    }

    canvas.addEventListener('pointermove', event => {
      if (!geometry || !series || series.status !== 'ready') return;
      const offset = event.clientX - canvas.getBoundingClientRect().left;
      const time = geometry.start + Math.max(0, Math.min(1, (offset - geometry.left) / geometry.plotWidth)) * (geometry.end - geometry.start);
      let low = 0, high = series.points.length - 1;
      while (low < high) { const middle = Math.floor((low + high) / 2); if (series.points[middle].time < time) low = middle + 1; else high = middle; }
      hoverIndex = low > 0 && Math.abs(series.points[low - 1].time - time) < Math.abs(series.points[low].time - time) ? low - 1 : low;
      draw();
    });
    function clearHover() { hoverIndex = -1; elements.tooltip.hidden = true; draw(); }
    canvas.addEventListener('pointerleave', clearHover);
    canvas.addEventListener('blur', clearHover);
    canvas.addEventListener('keydown', event => {
      if (!series || series.status !== 'ready' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      hoverIndex = Math.max(0, Math.min(series.points.length - 1, (hoverIndex < 0 ? 0 : hoverIndex) + (event.key === 'ArrowRight' ? 1 : -1)));
      draw();
    });
    const observer = new ResizeObserver(draw); observer.observe(canvas);

    return {
      render(next, label) {
        series = next; hoverIndex = -1; geometry = null;
        elements.tooltip.hidden = true;
        const ready = next.status === 'ready';
        elements.frame.hidden = !ready; elements.empty.hidden = ready; elements.metrics.hidden = !ready;
        elements.panel.classList.toggle('is-negative', ready && next.profit < 0);
        elements.percent.textContent = ready ? (next.percent > 0 ? '+' : '') + next.percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '-';
        elements.label.textContent = label;
        if (!ready) {
          elements.empty.textContent = next.status === 'missing' || next.status === 'incompatible' ? 'Historico financeiro incompleto para esta selecao.' : 'Sem lancamentos financeiros no periodo selecionado.';
          elements.period.textContent = 'Estatisticas historicas preservadas. Curva financeira disponivel desde 06/10/2026 para os modelos auditados da Hantec.';
          elements.note.textContent = 'Take, Virada e Stop nao foram convertidos em lucro estimado.';
          canvas.setAttribute('aria-label', 'Sem curva financeira disponivel para esta selecao.');
          return;
        }
        elements.initial.textContent = usd(next.initial); elements.final.textContent = usd(next.final);
        elements.profit.textContent = usd(next.profit);
        elements.drawdown.textContent = usd(next.drawdown) + ' (' + next.drawdownPct.toFixed(2).replace('.', ',') + '%)';
        elements.period.textContent = dateLabel(next.points[0].time) + ' a ' + dateLabel(next.points.at(-1).time) + '/2026 - ' + next.flows + ' lancamentos' + (next.partial ? ' - financeiro somente desde 06/10' : '');
        elements.note.textContent = (next.mode === 'single' ? 'Projecao de banca unica com lotes originais e risco nominal fixo de US$ 60 por entrada. Margem conjunta e simultaneidade nao validadas.' : 'Capital agregado de contas independentes de US$ 10 mil por horario, com os lotes originais.') + ' Saldo realizado, sem juros compostos; nao e equity intratrade. Ciclos selecionados, ordenados pela execucao real em BRT; saidas podem ultrapassar o mes do canal.' + (next.negativeBalance ? ' A projecao ficou sem saldo; operacoes posteriores nao foram bloqueadas nesta soma.' : '');
        canvas.setAttribute('aria-label', label + '. Saldo realizado de ' + usd(next.initial) + ' para ' + usd(next.final) + '. Crescimento ' + next.percent.toFixed(2) + ' por cento.');
        draw();
      }
    };
  }

  const api = { buildSeries, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BankGrowth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
