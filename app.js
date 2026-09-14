const METHODS = {
  linhas_ouro_lote_dobrado: { name: 'Linhas de Ouro', detail: 'Lote dobrado', source: 'data/linhas_ouro_lote_dobrado.csv', ready: true },
  linhas_ouro_alvo_dobrado: { name: 'Linhas de Ouro', detail: 'Alvo dobrado', source: 'data/linhas_ouro_alvo_dobrado.csv', ready: true },
  fimathe_raiz_pullback: { name: 'Fimathe Raiz', detail: 'Rompimento vela + pullback', source: 'data/fimathe_raiz_pullback.csv', ready: true }
};

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const state = { method: 'linhas_ouro_lote_dobrado', rows: [], headers: [], availableMonths: [] };

const els = {
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

function countResults(rows, setup = 'TODOS') {
  const totals = { Take: 0, Virada: 0, Stop: 0, empty: 0, ops: 0, wins: 0, accuracy: 0 };
  const setups = setup === 'TODOS' ? state.headers.slice(1) : [setup];
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
  els.setupFilter.innerHTML = '<option value="TODOS">Todos os horarios</option>' + state.headers.slice(1).map(header => '<option value="' + header + '">' + header + '</option>').join('');
}

function renderSummary(rows) {
  const method = METHODS[state.method];
  const setup = els.setupFilter.value || 'TODOS';
  const periodTotals = countResults(rows, setup);
  const overallTotals = countResults(state.rows, setup);
  if (els.methodName) els.methodName.textContent = method.name;
  if (els.methodMeta) els.methodMeta.textContent = method.detail + ' | colunas em BRT';
  els.periodMeta.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'todos os horarios' : setup);
  els.totalOps.textContent = periodTotals.ops;
  els.totalWins.textContent = periodTotals.wins;
  els.totalStops.textContent = periodTotals.Stop;
  els.accuracy.textContent = percent(periodTotals.accuracy);
  els.overallAccuracy.textContent = percent(overallTotals.accuracy);
}

function renderRanking(rows) {
  const setups = state.headers.slice(1).map(header => ({ header, ...countResults(rows, header) })).sort((a, b) => b.accuracy - a.accuracy || b.ops - a.ops);
  els.rankingLabel.textContent = selectedPeriodLabel() + ' | horarios em Brasilia';
  if (!setups.length) { els.ranking.innerHTML = els.emptyTemplate.innerHTML; return; }
  els.ranking.innerHTML = setups.map(item =>
    '<div class="rank-row"><div class="rank-name">' + item.header + '<small>' + item.Take + 'T / ' + item.Virada + 'V / ' + item.Stop + 'S</small></div><div class="track"><i style="width:' + Math.max(2, item.accuracy) + '%"></i></div><div class="rank-pct">' + percent(item.accuracy) + '</div></div>'
  ).join('');
}

function renderDistribution(rows) {
  const setup = els.setupFilter.value || 'TODOS';
  const totals = countResults(rows, setup);
  const max = Math.max(totals.Take, totals.Virada, totals.Stop, 1);
  els.distributionLabel.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'todos os horarios' : setup);
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

function visibleTableRows(rows, setup, selectedResult) {
  return rows.filter(row => {
    if (setup !== 'TODOS') return selectedResult === 'TODOS' || row[setup] === selectedResult;
    if (selectedResult === 'TODOS') return true;
    return state.headers.slice(1).some(header => row[header] === selectedResult);
  });
}

function renderMonthTabs() {
  const tabs = state.availableMonths.map(key => {
    const active = els.monthFilter.value === key ? ' active' : '';
    return '<button class="month-tab' + active + '" data-month="' + key + '">' + monthLabel(key) + '</button>';
  }).join('');
  return '<div class="month-tabs"><button class="month-tab' + (els.monthFilter.value === 'TODOS' ? ' active' : '') + '" data-month="TODOS">Todos</button>' + tabs + '</div>';
}

function renderTable(rows) {
  const setup = els.setupFilter.value || 'TODOS';
  const selectedResult = els.resultFilter.value;
  const visibleHeaders = setup === 'TODOS' ? state.headers : ['DATA', setup];
  const visibleRows = visibleTableRows(rows, setup, selectedResult);
  els.tableHead.innerHTML = '<tr>' + visibleHeaders.map(header => '<th>' + header + '</th>').join('') + '</tr>';
  els.tableBody.innerHTML = visibleRows.map(row => '<tr>' + visibleHeaders.map(header => '<td>' + (header === 'DATA' ? row[header] : renderBadge(row[header])) + '</td>').join('') + '</tr>').join('');
  els.tableCaption.innerHTML = renderMonthTabs() + '<span>' + visibleRows.length + ' datas exibidas | ' + selectedPeriodLabel() + '</span>';
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
  if (els.methodMeta) els.methodMeta.textContent = method.detail + ' | aguardando dados';
  els.totalOps.textContent = '0';
  els.totalWins.textContent = '0';
  els.totalStops.textContent = '0';
  els.accuracy.textContent = '0.00%';
  els.overallAccuracy.textContent = '0.00%';
  els.periodMeta.textContent = 'sem dados';
  els.monthFilter.innerHTML = '<option value="TODOS">Todos os meses</option>';
  els.setupFilter.innerHTML = '<option value="TODOS">Todos os horarios</option>';
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
  const method = METHODS[methodKey];
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
els.monthFilter.addEventListener('change', renderAll);
els.setupFilter.addEventListener('change', renderAll);
els.resultFilter.addEventListener('change', renderAll);
els.searchInput.addEventListener('input', renderAll);
els.copyBtn.addEventListener('click', () => copyTable().catch(showError));

function showError(error) {
  console.error(error);
  els.ranking.innerHTML = '<div class="empty-state"><strong>Erro ao carregar</strong><p>' + error.message + '</p></div>';
}

loadMethod(state.method).catch(showError);


