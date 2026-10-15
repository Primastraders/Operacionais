const METHODS = {
  linhas_ouro_lote_dobrado: { name: 'Linhas de Ouro', detail: 'Normal - virada no 4.8' },
  linhas_ouro_alvo_dobrado: { name: 'Linhas de Ouro', detail: 'Alvo dobrado - virada no 8.6' },
  fimathe_raiz_pullback: { name: 'Fimathe Raiz', detail: 'Rompimento vela + pullback' }
};

const BROKERS = {
  axi: {
    name: 'Axi',
    methods: {
      linhas_ouro_lote_dobrado: {
        source: 'data/linhas_ouro_axi.csv', ready: true,
        detail: 'Normal - virada no 4.8 | Top 5 historico 2026 | MT5 +5/+6 para BRT',
        note: 'XAU, HK50 e JP225: candidatos historicos preservados ate 08/10/2026. Ranking por assertividade, sem repetir ativo no mesmo horario. Outubro parcial. HK50: entrada 0,05 / folga do stop 0,02 em preco. Spreads reais incluidos; resultados antes de comissao e swap. Assertividade mede Take + Virada, nao necessariamente lucro. Selecao retrospectiva; execucao em gaps precisa de validacao na EA.'
      },
      linhas_ouro_alvo_dobrado: { ready: false, detail: 'Aguardando backtest Axi alvo dobrado' },
      fimathe_raiz_pullback: { ready: false, detail: 'Aguardando backtest Axi Fimathe Raiz' }
    }
  },
  exness: {
    name: 'Exness',
    methods: {
      linhas_ouro_lote_dobrado: {
        source: 'data/linhas_ouro_lote_dobrado.csv', ready: true,
        detail: 'Normal - virada no 4.8 | XAU + NAS | Horarios em BRT',
        note: 'Candidatos XAU e NAS preservados, maio a 14/09/2026. Ranking por assertividade, sem repetir ativo no mesmo horario. Fora da cobertura, vazio significa sem dados. Resultados antes de comissao e swap. Assertividade mede Take + Virada, nao necessariamente lucro. Selecao retrospectiva; execucao e parametros precisam de validacao na EA.'
      },
      linhas_ouro_alvo_dobrado: { source: 'data/linhas_ouro_alvo_dobrado.csv', ready: true },
      fimathe_raiz_pullback: { source: 'data/fimathe_raiz_pullback.csv', ready: true }
    }
  },
  hantec: {
    name: 'Hantec',
    methods: {
      linhas_ouro_lote_dobrado: {
        source: 'data/linhas_ouro_hantec_jp225.csv', metadata: 'data/linhas_ouro_hantec_jp225_meta.json', ready: true,
        detail: 'Normal - virada no 4.8 | XAU + JP225 + US30 | Ranking por assertividade historica',
        note: 'JP225 recalculado: servidor BRT+6 fixo conforme informado pelo usuario; fuso historico ainda nao confirmado independentemente. Pausa 18h-19h sem canal. H4M10 exige vela M10 na abertura exata do H4, sem usar vela posterior a pausa. Entrada 0,25 / folga stop 0,15 em preco; alvo principal 6,7 e virada 4,8, lote 2x. Corte 12/10/2026 17:58 BRT. Top 5 historico por assertividade, um TF por ativo/horario; meses mantem os mesmos horarios. RR principal mediano abaixo de 1:1, sem ajustar alvo ou margem. Bid/Ask reais; comissao e swap desconhecidos, nao descontados. Alvo atingido nao significa necessariamente lucro. Datas da tabela sao do canal; detalhes das entradas e saidas nos resultados. Canais sem expiracao; gaps e lote precisam de validacao na EA. XAU preservado, sem recalculo nesta atualizacao. Outubro parcial. Simulacao retrospectiva, nao comprovacao de aprovacao em mesa.'
      },
      linhas_ouro_alvo_dobrado: { source: 'data/linhas_ouro_hantec_alvo_dobrado.csv', ready: true, detail: 'Alvo dobrado - virada no 8.6 | MT5 +6 para BRT' },
      fimathe_raiz_pullback: { ready: false, detail: 'Aguardando backtest Hantec' }
    }
  },
  ftmo: {
    name: 'FTMO',
    methods: {
      linhas_ouro_lote_dobrado: {
        source: 'data/linhas_ouro_ftmo.csv', ready: true,
        detail: 'Normal - virada no 4.8 | XAU | Ranking por assertividade historica',
        note: 'XAU: cinco candidatos fixos anteriores, maio a 18/09/2026 17:49 BRT, sem nova varredura ou auditoria financeira. Um TF por ativo/horario: nao duplicamos 22h para preencher cinco. Fora da cobertura, vazio significa sem dados. Ranking fixo no historico completo; meses recalculam os mesmos horarios. Assertividade mede Take + Virada, nao necessariamente lucro. Resultados antes de comissao e swap. Selecao retrospectiva, nao comprovacao futura ou de regras da mesa.'
      },
      linhas_ouro_alvo_dobrado: { ready: false, detail: 'Aguardando backtest FTMO alvo dobrado' },
      fimathe_raiz_pullback: { ready: false, detail: 'Aguardando backtest FTMO' }
    }
  }
};

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const state = { broker: 'exness', method: 'linhas_ouro_lote_dobrado', rows: [], headers: [], availableMonths: [], rankingMetadata: {} };

const els = {
  brokerFilter: document.getElementById('brokerFilter'),
  assetFilter: document.getElementById('assetFilter'),
  tfFilter: document.getElementById('tfFilter'),
  rankReference: document.getElementById('rankReference'),
  referenceTitle: document.getElementById('referenceTitle'),
  referenceSetups: document.getElementById('referenceSetups'),
  resetTfBtn: document.getElementById('resetTfBtn'),
  tabs: Array.from(document.querySelectorAll('.method-tab')),
  methodName: document.getElementById('methodName'),
  methodMeta: document.getElementById('methodMeta'),
  totalOps: document.getElementById('totalOps'),
  totalWins: document.getElementById('totalWins'),
  winsLabel: document.getElementById('winsLabel'),
  methodNote: document.getElementById('methodNote'),
  methodNoteDisclosure: document.getElementById('methodNoteDisclosure'),
  totalStops: document.getElementById('totalStops'),
  stopsMeta: document.getElementById('stopsMeta'),
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
  barFalhaRow: document.getElementById('barFalhaRow'),
  barFalha: document.getElementById('barFalha'),
  barFalhaText: document.getElementById('barFalhaText'),
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
  if (header === 'XAU H1M1_6V 10H') return 'XAU M1 (6 velas) 10H';
  if (header === 'XAU H1M1 10H' && state.broker === 'hantec' && state.method === 'linhas_ouro_lote_dobrado') return 'XAU M1 (4 velas) 10H';
  return header
    .replace('USTEC', 'NAS')
    .replace(/H1M(\d+)/g, 'M$1');
}

function countResults(rows, setup = 'TODOS') {
  const totals = { Take: 0, Virada: 0, Stop: 0, Falha: 0, empty: 0, ops: 0, wins: 0, accuracy: 0 };
  const setups = Array.isArray(setup) ? setup : (setup === 'TODOS' ? state.headers.slice(1) : [setup]);
  rows.forEach(row => {
    setups.forEach(key => {
      const result = row[key];
      if (!result) { totals.empty += 1; return; }
      if (totals[result] !== undefined) totals[result] += 1;
    });
  });
  totals.ops = totals.Take + totals.Virada + totals.Stop + totals.Falha;
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
  if (months.length) els.monthFilter.value = state.broker === 'axi' || (['exness', 'hantec', 'ftmo'].includes(state.broker) && state.method === 'linhas_ouro_lote_dobrado') ? 'TODOS' : months[0];
}

function renderSetupOptions() {
  const topHeaders = topRankingHeaders(5);
  els.setupFilter.innerHTML = '<option value="TODOS">' + (topHeaders.length ? 'Top ' + topHeaders.length + ' melhores horarios' : 'Nenhum horario elegivel') + '</option>' + topHeaders.map(header => '<option value="' + header + '">' + displayHeader(header) + '</option>').join('');
  els.setupFilter.value = 'TODOS';
}

function setupParts(header) {
  const parts = header.replace('USTEC', 'NAS').split(' ');
  return { asset: parts[0], tf: parts[1].replace(/^H1M/, 'M'), hour: parts.at(-1) };
}

function tfLabel(tf) {
  if (tf === 'M1_6V') return 'M1 (6 velas)';
  if (tf === 'M1' && state.broker === 'hantec' && state.method === 'linhas_ouro_lote_dobrado') return 'M1 (4 velas)';
  return tf;
}

function renderAssetOptions() {
  const assets = [...new Set(state.headers.slice(1).map(h => setupParts(h).asset))].sort();
  els.assetFilter.innerHTML = '<option value="TODOS">Todos os ativos</option>' + assets.map(asset => '<option value="' + asset + '">' + asset + '</option>').join('');
  els.assetFilter.value = 'TODOS';
  renderTfOptions();
}

function renderTfOptions() {
  const asset = els.assetFilter.value || 'TODOS', previous = els.tfFilter.value;
  const order = ['M1', 'M1_6V', 'M2', 'M5', 'M10', 'M15', 'H4M10'];
  const tfs = [...new Set(state.headers.slice(1).map(setupParts).filter(p => asset === 'TODOS' || p.asset === asset).map(p => p.tf))].sort((a,b) => order.indexOf(a)-order.indexOf(b));
  els.tfFilter.innerHTML = '<option value="TODOS">Todos os TFs</option>' + tfs.map(tf => '<option value="' + tf + '">' + tfLabel(tf) + '</option>').join('');
  els.tfFilter.value = tfs.includes(previous) ? previous : 'TODOS';
}

function selectedRankingLabel() {
  const asset = els.assetFilter.value || 'TODOS', tf = els.tfFilter.value || 'TODOS';
  return (asset === 'TODOS' ? 'Todos os ativos' : asset) + ' | ' + (tf === 'TODOS' ? 'Todos os TFs' : tfLabel(tf));
}

function renderSummary(rows) {
  const method = currentMethod();
  els.winsLabel.textContent = state.broker === 'axi' || (['hantec', 'exness', 'ftmo'].includes(state.broker) && state.method === 'linhas_ouro_lote_dobrado') ? 'Alvos atingidos' : 'Gains';
  els.methodNote.textContent = (method.note || '') + (state.broker === 'hantec' && state.method === 'linhas_ouro_lote_dobrado' ? ' US30 M10 08h: entrada 0,00 / folga stop 0,02 em preco; alvos 6,7 e 4,8, virada com lote 2x. MT5: 120 Takes, 39 Viradas, 40 Stops e 5 falhas de execucao apos entrada, todas incluidas nas 204 operacoes (77,94%). Historico de 02/01 a 14/10/2026 17:58 BRT; conversao servidor menos 6h assumida. Oito minutos sem ticks reais em 13/02 tiveram ticks gerados pelo MT5. Classificacao CSV/MT5 coincide em 203 de 204 canais; o painel usa o MT5, inclusive no gap de 10/04. Detalhes US30 incluem comissao e swap; os demais ativos preservam seus criterios anteriores. RR principal mediano bruto 1:0,91; apos comissao estimada 1:0,89, antes de swap e gaps adicionais. Selecao retrospectiva, nao garantia de lucro ou aprovacao.' : '');
  els.methodNote.hidden = !method.note;
  if (state.broker === 'hantec' && state.method === 'linhas_ouro_lote_dobrado') {
    els.methodNote.textContent += ' XAU 10h: mantidos os dois modelos, M1 com 4 velas (historico anterior preservado) e M1 com 6 velas (MT5, 192 ciclos, 109 Takes, 43 Viradas, 40 Stops, 79,17%, ate 07/10/2026). Excecao autorizada a regra de um TF por ativo/horario: ambas as formacoes podem entrar no Top 5. Seis canais nao tiveram entrada por lote minimo acima do risco nominal US$60; MT5 inclui 30/04, ausente no CSV, e gerou ticks em oito minutos sem ticks reais. Por isso as bases de contagem dos dois modelos diferem. Entrada 0,110 / folga stop 0,020 em preco; alvos 6,7 e 4,8; defesa lote 2x; KID=false. Detalhes de 6 velas incluem os custos registrados no MT5; RR principal mediano bruto 1:0,90. Os dois modelos compartilham ativo e horario: as contagens nao sao uma simulacao de carteira nem validacao de risco conjunto.';
  }
  els.methodNoteDisclosure.hidden = !method.note;
  els.methodNoteDisclosure.open = false;
  const setup = els.setupFilter.value || 'TODOS';
  const activeSetup = setup === 'TODOS' ? topRankingHeaders(5) : setup;
  const periodTotals = countResults(rows, activeSetup);
  const overallTotals = countResults(state.rows, activeSetup);
  if (els.methodName) els.methodName.textContent = method.name;
  if (els.methodMeta) els.methodMeta.textContent = currentBroker().name + ' | ' + method.detail + ' | colunas em BRT';
  els.periodMeta.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'top ' + activeSetup.length + ' fixos' : setup);
  els.totalOps.textContent = periodTotals.ops;
  els.totalWins.textContent = periodTotals.wins;
  els.totalStops.textContent = periodTotals.Stop;
  els.stopsMeta.textContent = periodTotals.Falha ? 'perdas fechadas + ' + periodTotals.Falha + ' falhas de execucao' : 'perdas fechadas';
  els.accuracy.textContent = periodTotals.ops ? percent(periodTotals.accuracy) : '-';
  els.overallAccuracy.textContent = overallTotals.ops ? percent(overallTotals.accuracy) : '-';
}

function topRankingItems(limit = 10, ignoreTf = false) {
  const asset = els.assetFilter.value || 'TODOS', tf = ignoreTf ? 'TODOS' : (els.tfFilter.value || 'TODOS');
  const seen = new Set();
  return state.headers.slice(1)
    .filter(header => {
      const p = setupParts(header), meta = state.rankingMetadata[header];
      return (asset === 'TODOS' || p.asset === asset) && (tf === 'TODOS' || p.tf === tf) && (!meta || meta.eligible);
    })
    .map(header => ({ header, ...countResults(state.rows, header) }))
    .filter(item => item.ops > 0)
    .sort((a, b) => b.accuracy - a.accuracy || b.ops - a.ops)
    .filter(item => {
      const p = setupParts(item.header), variant = state.rankingMetadata[item.header]?.rankingVariant || '';
      const identity = p.asset + ' ' + p.hour + ' ' + variant;
      if (seen.has(identity)) return false;
      seen.add(identity); return true;
    })
    .slice(0, limit);
}

function topRankingHeaders(limit = 10) {
  return topRankingItems(limit).map(item => item.header);
}

function renderFinancialReturn(header, rows) {
  const meta = state.rankingMetadata[header];
  if (!meta || !Number.isFinite(meta.pnlR)) return '';
  const value = meta.dailyR ? rows.reduce((sum, row) => sum + (meta.dailyR[parseDateBr(row.DATA).toISOString().slice(0,10)] || 0), 0) : meta.pnlR;
  const label = meta.dailyR ? 'R do periodo, antes de comissao e swap' : 'R geral, antes de comissao e swap';
  return '<small class="rank-return ' + (value < 0 ? 'negative' : 'positive') + '" title="' + label + '">' + (value > 0 ? '+' : '') + value.toFixed(2) + 'R' + (meta.dailyR ? '' : ' geral') + '</small>';
}

function renderPrincipalRR(header, rows) {
  const daily = state.rankingMetadata[header]?.dailyRR;
  if (!daily) return '';
  const values = rows.map(row => daily[parseDateBr(row.DATA).toISOString().slice(0,10)]).filter(Number.isFinite).sort((a,b) => a-b);
  if (!values.length) return '';
  const i = Math.floor(values.length / 2), median = values.length % 2 ? values[i] : (values[i-1]+values[i])/2;
  return '<small title="RR principal mediano das entradas no periodo, antes de comissao e swap">RR mediano 1:' + median.toFixed(2) + '</small>';
}

function renderRanking(rows) {
  const fixedHeaders = topRankingHeaders(5);
  const setups = fixedHeaders.map(header => ({ header, ...countResults(rows, header) }));
  els.rankingLabel.textContent = 'Top ' + fixedHeaders.length + ' | ' + selectedRankingLabel() + ' | ' + selectedPeriodLabel() + ' | BRT';
  els.rankReference.hidden = !els.tfFilter.value || els.tfFilter.value === 'TODOS';
  els.referenceTitle.textContent = 'Ranking geral - ' + (els.assetFilter.value === 'TODOS' ? 'Todos os ativos' : els.assetFilter.value);
  els.referenceSetups.textContent = topRankingItems(5, true).map(item => displayHeader(item.header) + ' (' + percent(item.accuracy) + ')').join(' | ');
  if (!setups.length) { els.ranking.innerHTML = '<div class="empty-state"><strong>Nenhum horario elegivel neste filtro</strong><p>Sem candidatos que cumpram os criterios historicos do ranking.</p></div>'; return; }
  els.ranking.innerHTML = setups.map(item =>
    '<div class="rank-row"><div class="rank-name">' + displayHeader(item.header) + '<small>' + item.Take + 'T / ' + item.Virada + 'V / ' + item.Stop + 'S' + (item.Falha ? ' / ' + item.Falha + ' falhas' : '') + ' | ' + item.ops + ' op.</small>' + renderPrincipalRR(item.header, rows) + '</div><div class="track"><i style="width:' + Math.max(2, item.accuracy) + '%"></i></div><div class="rank-pct">' + percent(item.accuracy) + renderFinancialReturn(item.header, rows) + '</div></div>'
  ).join('');
}

function renderDistribution(rows) {
  const setup = els.setupFilter.value || 'TODOS';
  const activeSetup = setup === 'TODOS' ? topRankingHeaders(5) : setup;
  const totals = countResults(rows, activeSetup);
  const max = Math.max(totals.Take, totals.Virada, totals.Stop, totals.Falha, 1);
  els.distributionLabel.textContent = selectedPeriodLabel() + ' | ' + (setup === 'TODOS' ? 'top ' + activeSetup.length + ' fixos' : setup);
  els.barTake.style.width = (totals.Take / max * 100) + '%';
  els.barVirada.style.width = (totals.Virada / max * 100) + '%';
  els.barStop.style.width = (totals.Stop / max * 100) + '%';
  els.barTakeText.textContent = totals.Take;
  els.barViradaText.textContent = totals.Virada;
  els.barStopText.textContent = totals.Stop;
  els.barFalhaRow.hidden = !totals.Falha;
  els.barFalha.style.width = (totals.Falha / max * 100) + '%';
  els.barFalhaText.textContent = totals.Falha;
}

function renderBadge(result) {
  if (!result || result === 'Sem ativacao') return '<span class="empty-cell" title="Sem entrada nesta sessao">-</span>';
  if (result === 'Aberto') return '<span class="badge Aberto" title="Operacao ainda aberta no corte dos dados">Aberto</span>';
  if (result === 'Falha') return '<span class="badge Falha" title="Falha de execucao apos entrada; incluida na assertividade">Falha</span>';
  return '<span class="badge ' + result + '">' + result + '</span>';
}

function renderOperationCell(header, row) {
  const detail=state.rankingMetadata[header]?.dailyDetails?.[parseDateBr(row.DATA).toISOString().slice(0,10)];
  const badge=renderBadge(row[header]);
  if (!detail) return badge;
  const escaped=detail.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return '<details class="operation-detail"><summary>'+badge+'</summary><small>'+escaped+'</small></details>';
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
  els.tableBody.innerHTML = visibleSetups.length ? visibleRows.map(row => '<tr>' + visibleHeaders.map(header => '<td>' + (header === 'DATA' ? row[header] : renderOperationCell(header,row)) + '</td>').join('') + '</tr>').join('') : '<tr><td>Nenhum horario elegivel neste filtro.</td></tr>';
  els.tableCaption.innerHTML = renderMonthTabs() + '<span>' + (visibleSetups.length ? visibleRows.length + ' datas exibidas' : 'Nenhum horario elegivel') + ' | ' + selectedPeriodLabel() + (setup === 'TODOS' && visibleSetups.length ? ' | top ' + visibleSetups.length + ' fixos dos melhores' : '') + '</span>';
  Array.from(document.querySelectorAll('.month-tab')).forEach(btn => {
    btn.addEventListener('click', () => {
      els.monthFilter.value = btn.dataset.month;
      renderAll();
    });
  });
}

function resetEmpty(method) {
  els.winsLabel.textContent = state.broker === 'axi' ? 'Alvos atingidos' : 'Gains';
  els.methodNote.textContent = '';
  els.methodNote.hidden = true;
  els.methodNoteDisclosure.hidden = true;
  els.methodNoteDisclosure.open = false;
  state.rows = [];
  state.rankingMetadata = {};
  state.headers = ['DATA'];
  state.availableMonths = [];
  if (els.methodName) els.methodName.textContent = method.name;
  if (els.methodMeta) els.methodMeta.textContent = currentBroker().name + ' | ' + method.detail + ' | aguardando dados';
  els.totalOps.textContent = '0';
  els.totalWins.textContent = '0';
  els.totalStops.textContent = '0';
  els.stopsMeta.textContent = 'perdas fechadas';
  els.barFalhaRow.hidden = true;
  els.barFalha.style.width = '0%';
  els.barFalhaText.textContent = '0';
  els.accuracy.textContent = '0.00%';
  els.overallAccuracy.textContent = '0.00%';
  els.periodMeta.textContent = 'sem dados';
  els.monthFilter.innerHTML = '<option value="TODOS">Todos os meses</option>';
  els.setupFilter.innerHTML = '<option value="TODOS">Top 5 melhores horarios</option>';
  renderAssetOptions();
  els.rankReference.hidden = true;
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
  state.rankingMetadata = {};
  if (method.metadata) {
    const metadataResponse = await fetch(method.metadata, { cache: 'no-store' });
    if (!metadataResponse.ok) throw new Error('Nao foi possivel carregar os criterios do ranking.');
    state.rankingMetadata = await metadataResponse.json();
  }
  state.headers = parsed.headers;
  state.rows = parsed.rows.sort((a, b) => parseDateBr(b.DATA) - parseDateBr(a.DATA));
  els.searchInput.value = '';
  els.resultFilter.value = 'TODOS';
  renderMonthOptions();
  els.tfFilter.value = 'TODOS';
  renderAssetOptions();
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
els.assetFilter.addEventListener('change', () => { renderTfOptions(); renderSetupOptions(); renderAll(); });
els.tfFilter.addEventListener('change', () => { renderSetupOptions(); renderAll(); });
els.resetTfBtn.addEventListener('click', () => { els.tfFilter.value = 'TODOS'; renderSetupOptions(); renderAll(); });
els.setupFilter.addEventListener('change', renderAll);
els.resultFilter.addEventListener('change', renderAll);
els.searchInput.addEventListener('input', renderAll);
els.copyBtn.addEventListener('click', () => copyTable().catch(showError));

function showError(error) {
  console.error(error);
  els.ranking.innerHTML = '<div class="empty-state"><strong>Erro ao carregar</strong><p>' + error.message + '</p></div>';
}

const requestedBroker = new URLSearchParams(window.location.search).get('corretora');
if (Object.prototype.hasOwnProperty.call(BROKERS, requestedBroker)) state.broker = requestedBroker;
renderBrokerOptions();
loadMethod(state.method).then(() => {
  const asset = new URLSearchParams(window.location.search).get('ativo');
  if (asset && Array.from(els.assetFilter.options).some(option => option.value === asset)) {
    els.assetFilter.value = asset; renderTfOptions(); renderSetupOptions(); renderAll();
  }
}).catch(showError);







