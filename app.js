const METHODS = {
  linhas_ouro_lote_dobrado: { name: 'Linhas de Ouro', detail: 'Normal - virada no 4.8' },
  linhas_ouro_alvo_dobrado: { name: 'Linhas de Ouro', detail: 'Alvo dobrado - virada no 8.6' },
  fimathe_raiz_pullback: { name: 'Fimathe Raiz', detail: 'Rompimento vela + pullback' }
};

const BROKERS = {
  exness: {
    name: 'Exness',
    methods: {
      linhas_ouro_lote_dobrado: { source: 'data/linhas_ouro_lote_dobrado.csv', ready: true },
      linhas_ouro_alvo_dobrado: { source: 'data/linhas_ouro_alvo_dobrado.csv', ready: true },
      fimathe_raiz_pullback: { source: 'data/fimathe_raiz_pullback.csv', ready: true }
    }
  },
  hantec: {
    name: 'Hantec',
    methods: {
      linhas_ouro_lote_dobrado: { source: 'data/linhas_ouro_hantec.csv', ready: true, detail: 'Normal - virada no 4.8 | MT5 +6 para BRT' },
      linhas_ouro_alvo_dobrado: { source: 'data/linhas_ouro_hantec_alvo_dobrado.csv', ready: true, detail: 'Alvo dobrado - virada no 8.6 | MT5 +6 para BRT' },
      fimathe_raiz_pullback: { ready: false, detail: 'Aguardando backtest Hantec' }
    }
  }
};

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const state = { broker: 'exness', method: 'linhas_ouro_lote_dobrado', rows: [], headers: [], availableMonths: [] };

const els = {
  brokerFilter: document.getElementById('brokerFilter'),
  tabs: Array.from(document.querySelectorAll('.method-tab')),
  methodName: document.getElementById('methodName'),
  methodMeta: document.getElementById('methodMeta'),
  totalOps: document.getElementById('totalOps'),
  totalWins: document.getElementById('totalWins'),
  totalStops: document.getElementById('totalStops'),
  accuracy: document.getElementById('accuracy'),
  overallAccuracy: document.getElementById('overallAccuracy'),
  periodMeta: document.getElementById('periodMeta'),
  monthFilter: document.getElementById('monthFilter'),
  setupFilter: document.getElementById('setupFilter'),
  resultFilter: document.getElementById('resultFilter'),
  searchInput: document.getElementById('searchInput'),
  ranking: document.getElementById('ranking'),
  rankingLabel: document.getElementById('rankingLabel'),
  distributionLabel: document.getElementById('distributionLabel'),
  barTake: document.getElementById('barTake'),
  barVirada: document.getElementById('barVirada'),
  barStop: document.getElementById('barStop'),
  barTakeText: document.getElementById('barTakeText'),
  barViradaText: document.getElementById('barViradaText'),
  barStopText: document.getElementById('barStopText'),
  tableHead: document.getElementById('tableHead'),
  tableBody: document.getElementById('tableBody'),
  tableCaption: document.getElementById('tableCaption'),
  copyBtn: document.getElementById('copyBtn'),
  emptyTemplate: document.getElementById('emptyTemplate')
};

function currentBroker() {
  return BROKERS[state.broker] || BROKERS.exness;
}

function currentMethod(methodKey = state.method) {
  const base = METHODS[methodKey];
  const brokerMethod = currentBroker().methods[methodKey] || {};
  return { ...base, ...brokerMethod };
}

function renderBrokerOptions() {
  els.brokerFilter.innerHTML = Object.entries(BROKERS).map(([key, broker]) => '<option value="' + key + '">' + broker.name + '</option>').join('');
  els.brokerFilter.value = state.broker;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headerIndex = lines.findIndex(line => line.startsWith('DATA;'));
  if (headerIndex === -1) throw new Error('Cabecalho DATA nao encontrado.');
  const headers = lines[headerIndex].split(';').map(value => value.trim());
  const rows = lines.slice(headerIndex + 1).map(line => {
    const values = line.split(';');
    return Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()]));
  });
  return { headers, rows };
}

function parseDateBr(value) {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function monthKey(row) {
  const d = parseDateBr(row.DATA);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return MESES[month - 1] + '/' + year;
}

function shortDate(value) {
  const [day, month] = value.split('/');
  return day + '/' + month;
}

function percent(value) {
  return value.toFixed(2) + '%';
}

function displayHeader(header) {
  return header
    .replace('USTEC', 'NAS')
    .replace('H1M1', 'M1')
    .replace('H1M5', 'M5');
}

function countResults(rows, setup = 'TODOS') {
  const totals = { Take: 0, Virada: 0, Stop: 0, empty: 0, ops: 0, wins: 0, accuracy: 0 };
  const setups = Array.isArray(setup) ? setup : (setup === 'TODOS' ? state.headers.slice(1) : [setup]);
  rows.forEach(row => {
    setups.forEach(key => {
      const result = row[key];
      if (!result) { totals.empty += 1; return; }
      if (totals[result] !== undefined) totals[result] += 1;
    });
  });
  totals.ops = totals.Take + totals.Virada + totals.Stop;
  totals.wins = totals.Take + totals.Virada;
  totals.accuracy = totals.ops ? totals.wins / totals.ops * 100 : 0;
  return totals;
}

function rowsForSelectedMonth(rows) {
  const selected = els.monthFilter.value || 'TODOS';
  if (selected === 'TODOS') return rows;
  return rows.filter(row => monthKey(row) === selected);
}

function filteredRows() {
  const query = els.searchInput.value.trim().toLowerCase();
  const byMonth = rowsForSelectedMonth(state.rows);
  if (!query) return byMonth;
  return byMonth.filter(row => row.DATA.toLowerCase().includes(query));
}

function selectedPeriodLabel() {
  const selected = els.monthFilter.value || 'TODOS';
  return selected === 'TODOS' ? 'Todos os meses' : monthLabel(selected);
}

function renderMonthOptions() {
  const months = Array.from(new Set(state.rows.map(monthKey))).sort().reverse();
  state.availableMonths = months;
  els.monthFilter.innerHTML = '<option value="TODOS">Todos os meses</option>' + months.map(key => '<option value="' + key + '">' + monthLabel(key) + '</option>').join('');
  if (months.length) els.monthFilter.value = months[0];
}

function renderSetupOptions() {
  const topHeaders = topRankingHeaders(10);
  els.setupFilter.innerHTML = '<option value="TODOS">Top 10 melhores horarios</option>' + topHeaders.map(header => '<option value="' + header + '">' + displayHeader(header) + '</option>').join('');
}

function renderSummary(rows) {
  const method = currentMethod();
  const setup = els.setupFilter.value || 'TODOS';
  const activeSetup = setup === 'TODOS' ? topRankingHeaders(10) : setup;
  const periodTotals = countResults(rows, activeSetup);
  const overallTotals = countResults(state.rows, activeSetup);
  if (els.methodName) els.methodName.textContent = method.name;
  if (els.methodMeta) els.methodMeta.textContent = currentBroker().name + ' | ' + method.detail + ' | colunas em BRT';
  els.periodMeta.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'top 10 fixos' : setup);
  els.totalOps.textContent = periodTotals.ops;
  els.totalWins.textContent = periodTotals.wins;
  els.totalStops.textContent = periodTotals.Stop;
  els.accuracy.textContent = percent(periodTotals.accuracy);
  els.overallAccuracy.textContent = percent(overallTotals.accuracy);
}

function topRankingItems(limit = 10) {
  return state.headers.slice(1)
    .map(header => ({ header, ...countResults(state.rows, header) }))
    .sort((a, b) => b.accuracy - a.accuracy || b.ops - a.ops)
    .slice(0, limit);
}

function topRankingHeaders(limit = 10) {
  return topRankingItems(limit).map(item => item.header);
}

function renderRanking(rows) {
  const fixedHeaders = topRankingHeaders(10);
  const setups = fixedHeaders.map(header => ({ header, ...countResults(rows, header) }));
  els.rankingLabel.textContent = 'Top 10 geral | ' + selectedPeriodLabel() + ' | horarios em Brasilia';
  if (!setups.length) { els.ranking.innerHTML = els.emptyTemplate.innerHTML; return; }
  els.ranking.innerHTML = setups.map(item =>
    '<div class="rank-row"><div class="rank-name">' + displayHeader(item.header) + '<small>' + item.Take + 'T / ' + item.Virada + 'V / ' + item.Stop + 'S</small></div><div class="track"><i style="width:' + Math.max(2, item.accuracy) + '%"></i></div><div class="rank-pct">' + percent(item.accuracy) + '</div></div>'
  ).join('');
}

function renderDistribution(rows) {
  const setup = els.setupFilter.value || 'TODOS';
  const activeSetup = setup === 'TODOS' ? topRankingHeaders(5) : setup;
  const totals = countResults(rows, activeSetup);
  const max = Math.max(totals.Take, totals.Virada, totals.Stop, 1);
  els.distributionLabel.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'top 5 fixos' : setup);
  els.barTake.style.width = (totals.Take / max * 100) + '%';
  els.barVirada.style.width = (totals.Virada / max * 100) + '%';
  els.barStop.style.width = (totals.Stop / max * 100) + '%';
  els.barTakeText.textContent = totals.Take;
  els.barViradaText.textContent = totals.Virada;
  els.barStopText.textContent = totals.Stop;
}

function renderBadge(result) {
  if (!result) return '<span class="empty-cell">-</span>';
  return '<span class="badge ' + result + '">' + result + '</span>';
}

function visibleTableRows(rows, setup, selectedResult, visibleSetups) {
  return rows.filter(row => {
    const setups = setup === 'TODOS' ? visibleSetups : [setup];
    if (selectedResult === 'TODOS') return true;
    return setups.some(header => row[header] === selectedResult);
  });
}

function renderMonthTabs() {
  const tabs = state.availableMonths.map(key => {
    const active = els.monthFilter.value === key ? ' active' : '';
    return '<button class="month-tab' + active + '" data-month="' + key + '">' + monthLabel(key) + '</button>';
  }).join('');
  return '<div class="month-tabs"><button class="month-tab' + (els.monthFilter.value === 'TODOS' ? ' active' : '') + '" data-month="TODOS">Todos</button>' + tabs + '</div>';
}

function topTableHeaders() {
  return topRankingHeaders(5);
}

function renderTable(rows) {
  const setup = els.setupFilter.value || 'TODOS';
  const selectedResult = els.resultFilter.value;
  const visibleSetups = setup === 'TODOS' ? topTableHeaders() : [setup];
  const visibleHeaders = ['DATA', ...visibleSetups];
  const visibleRows = visibleTableRows(rows, setup, selectedResult, visibleSetups);
  els.tableHead.innerHTML = '<tr>' + visibleHeaders.map(header => '<th>' + displayHeader(header) + '</th>').join('') + '</tr>';
  els.tableBody.innerHTML = visibleRows.map(row => '<tr>' + visibleHeaders.map(header => '<td>' + (header === 'DATA' ? row[header] : renderBadge(row[header])) + '</td>').join('') + '</tr>').join('');
  els.tableCaption.innerHTML = renderMonthTabs() + '<span>' + visibleRows.length + ' datas exibidas | ' + selectedPeriodLabel() + (setup === 'TODOS' ? ' | top 5 fixos dos melhores' : '') + '</span>';
  Array.from(document.querySelectorAll('.month-tab')).forEach(btn => {
    btn.addEventListener('click', () => {
      els.monthFilter.value = btn.dataset.month;
      renderAll();
    });
  });
}

function resetEmpty(method) {
  state.rows = [];
  state.headers = ['DATA'];
  state.availableMonths = [];
  if (els.methodName) els.methodName.textContent = method.name;
  if (els.methodMeta) els.methodMeta.textContent = currentBroker().name + ' | ' + method.detail + ' | aguardando dados';
  els.totalOps.textContent = '0';
  els.totalWins.textContent = '0';
  els.totalStops.textContent = '0';
  els.accuracy.textContent = '0.00%';
  els.overallAccuracy.textContent = '0.00%';
  els.periodMeta.textContent = 'sem dados';
  els.monthFilter.innerHTML = '<option value="TODOS">Todos os meses</option>';
  els.setupFilter.innerHTML = '<option value="TODOS">Top 10 melhores horarios</option>';
  els.ranking.innerHTML = els.emptyTemplate.innerHTML;
  els.tableHead.innerHTML = '<tr><th>DATA</th></tr>';
  els.tableBody.innerHTML = '<tr><td>' + els.emptyTemplate.innerHTML + '</td></tr>';
  els.distributionLabel.textContent = 'Sem dados neste operacional';
  ['barTake', 'barVirada', 'barStop'].forEach(key => els[key].style.width = '0%');
  els.barTakeText.textContent = '0';
  els.barViradaText.textContent = '0';
  els.barStopText.textContent = '0';
  els.tableCaption.textContent = 'Aguardando CSV ou Supabase';
}

async function loadMethod(methodKey) {
  const method = currentMethod(methodKey);
  state.method = methodKey;
  els.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.method === methodKey));
  if (!method.ready) { resetEmpty(method); return; }
  const response = await fetch(method.source, { cache: 'no-store' });
  if (!response.ok) throw new Error('Nao foi possivel carregar ' + method.source);
  const parsed = parseCsv(await response.text());
  state.headers = parsed.headers;
  state.rows = parsed.rows.sort((a, b) => parseDateBr(b.DATA) - parseDateBr(a.DATA));
  els.searchInput.value = '';
  els.resultFilter.value = 'TODOS';
  renderMonthOptions();
  renderSetupOptions();
  renderAll();
}

function renderAll() {
  const rows = filteredRows();
  renderSummary(rows);
  renderRanking(rows);
  renderDistribution(rows);
  renderTable(rows);
}

async function copyTable() {
  const lines = [];
  const headers = Array.from(els.tableHead.querySelectorAll('th')).map(th => th.textContent);
  lines.push(headers.join(';'));
  els.tableBody.querySelectorAll('tr').forEach(tr => {
    const row = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    lines.push(row.join(';'));
  });
  await navigator.clipboard.writeText(lines.join('\n'));
  els.copyBtn.textContent = 'Copiado';
  setTimeout(() => { els.copyBtn.textContent = 'Copiar tabela'; }, 1200);
}

els.tabs.forEach(tab => tab.addEventListener('click', () => loadMethod(tab.dataset.method).catch(showError)));
els.brokerFilter.addEventListener('change', () => {
  state.broker = els.brokerFilter.value;
  loadMethod(state.method).catch(showError);
});
els.monthFilter.addEventListener('change', renderAll);
els.setupFilter.addEventListener('change', renderAll);
els.resultFilter.addEventListener('change', renderAll);
els.searchInput.addEventListener('input', renderAll);
els.copyBtn.addEventListener('click', () => copyTable().catch(showError));

function showError(error) {
  console.error(error);
  els.ranking.innerHTML = '<div class="empty-state"><strong>Erro ao carregar</strong><p>' + error.message + '</p></div>';
}

renderBrokerOptions();
loadMethod(state.method).catch(showError);







