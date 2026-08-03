// ==================== MERCADORIAS SEM NF ====================
let dadosMercadoriasNF = [];
let dashMercCD = 'CD1';
let dashMercConferenteFiltro = '';
const norm = s => (s || '').trim().toUpperCase();

var _fbTimerMerc = null;
var _pendentesMercItem = {};

async function carregarMercadoriasNF() {
  dadosMercadoriasNF = lsGetCd('MERCADORIAS_NF_dados') || [];
  garantirIds(dadosMercadoriasNF);
  if (!fbDisponivel() || !cdAtual) return;
  if (_snapMerc) { try { _snapMerc(); } catch (e) {} }
  _snapMerc = fbOnSnapshotColecao('mercadoriasNF', dadosMercadoriasNF);
}

function flushMercadoriasItens() {
  var pendentes = _pendentesMercItem;
  _pendentesMercItem = {};
  for (var id in pendentes) {
    fbSalvarItemColecao('mercadoriasNF', pendentes[id]);
  }
}

function salvarMercadoriasNFItem(item) {
  if (!item) return;
  if (!item.id) item.id = gerarId();
  lsSetCd('MERCADORIAS_NF_dados', dadosMercadoriasNF);
  if (!fbDisponivel() || !cdAtual) return;
  _pendentesMercItem[item.id] = item;
  clearTimeout(_fbTimerMerc);
  _fbTimerMerc = setTimeout(flushMercadoriasItens, 300);
}

function salvarMercadoriasNF() {
  (dadosMercadoriasNF || []).forEach(function (item) {
    if (!item) return;
    if (!item.id) item.id = gerarId();
    if (fbDisponivel() && cdAtual) _pendentesMercItem[item.id] = item;
  });
  lsSetCd('MERCADORIAS_NF_dados', dadosMercadoriasNF);
  clearTimeout(_fbTimerMerc);
  flushMercadoriasItens();
  toast('Mercadorias salvas', 'success');
}

function selecionarMesMercadoriasNF(mes) {
  mesAtualMercadoriasNF = mes;
  montarAbasGenerico('tabsMesMercadoriasNF', mesAtualMercadoriasNF, selecionarMesMercadoriasNF);
  renderizarMercadoriasNF();
}

function renderizarMercadoriasNF() {
  document.getElementById('mercNFTitleCd').textContent = cdAtual;
  const hoje = new Date();
  document.getElementById('mercNFTitleMes').textContent = MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
  document.getElementById('mercNFUserName').textContent = usuarioLogado;
  document.getElementById('mercNFUserCd').textContent = cdAtual;
  const tbody = document.getElementById('mercadoriasNFBody');
  tbody.innerHTML = '';
  const filtrados = dadosMercadoriasNF
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => extrairMesDeData(d.data) === mesAtualMercadoriasNF && extrairAnoDeData(d.data) === anoAtual);
  if (filtrados.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 12;
    td.style.textAlign = 'center';
    td.style.padding = '32px';
    td.style.color = 'var(--text-dim)';
    td.style.fontSize = '13px';
    td.textContent = 'Nenhum registro neste m\u00eas. Clique em "+ Registro" para come\u00e7ar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  filtrados.forEach(({ d, i }) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = i;

    tr.appendChild(criarCelInputMercNF('date', d.data, i, 'data'));
    tr.appendChild(criarCelSelectEmpresaNF(d.empresa, i));
    tr.appendChild(criarCelInputMercNF('text', d.master, i, 'master'));
    tr.appendChild(criarCelInputMercNF('number', d.qntNotas, i, 'qntNotas'));
    tr.appendChild(criarCelInputMercNF('number', d.qntPaletes, i, 'qntPaletes'));
    tr.appendChild(criarCelSelectLojaNF(d.loja, i));
    tr.appendChild(criarCelInputMercNF('number', d.volume, i, 'volume'));
    tr.appendChild(criarCelSelectTipoVolNF(d.tipoVolume || '', i));
    tr.appendChild(criarCelInputMercNF('number', d.qtdPlu, i, 'qtdPlu'));
    tr.appendChild(criarCelInputMercNF('text', d.conferente, i, 'conferente'));
    tr.appendChild(criarCelSelectTurnoNF(d.turno, i));

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'row-actions';
    const btnDel = document.createElement('button');
    btnDel.className = 'icon-btn delete';
    btnDel.textContent = '\uD83D\uDDD1';
    btnDel.title = 'Excluir';
    btnDel.onclick = function () {
      if (!confirm('Excluir este registro?')) return;
      var item = dadosMercadoriasNF[i];
      var itemId = item && (item.id || item.firestoreId);
      if (itemId) {
        marcarItemColecaoExcluido(itemId);
        delete _pendentesMercItem[itemId];
      }
      fbExcluirItemColecao('mercadoriasNF', item);
      dadosMercadoriasNF.splice(i, 1);
      lsSetCd('MERCADORIAS_NF_dados', dadosMercadoriasNF);
      renderizarMercadoriasNF();
      toast('Registro exclu\u00eddo', 'success');
    };
    tdAcoes.appendChild(btnDel);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function criarCelInputMercNF(type, value, idx, field) {
  const td = document.createElement('td');
  td.title = value || '';
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value || '';
  inp.placeholder = '-';
  if (type === 'number') {
    inp.min = '0';
    inp.onkeydown = e => {
      if (e.key === '-' || e.key === 'e') e.preventDefault();
    };
    inp.oninput = () => {
      inp.value = inp.value.replace(/[^0-9]/g, '');
      dadosMercadoriasNF[idx][field] = inp.value;
      td.title = inp.value;
      salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
    };
  } else {
    inp.oninput = () => {
      if (type === 'text') {
        const start = inp.selectionStart;
        inp.value = capitalizarPalavras(inp.value);
        if (start != null) inp.setSelectionRange(start, start);
      }
      dadosMercadoriasNF[idx][field] = inp.value;
      td.title = inp.value;
      salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
    };
  }
  td.appendChild(inp);
  return td;
}

function criarCelSelectEmpresaNF(value, idx) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const todasEmpresas = [
    { label: '501', value: '501', cd: 'CD1' },
    { label: '503', value: '503', cd: 'CD1' },
    { label: '504', value: '504', cd: 'CD1' },
    { label: '505', value: '505', cd: 'CD1' },
    { label: '502', value: '502', cd: 'CD2' },
    { label: '507', value: '507', cd: 'CD2' },
    { label: '508', value: '508', cd: 'CD2' }
  ];
  const empresas = todasEmpresas.filter(e => e.cd === cdAtual);
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  empresas.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.value;
    opt.textContent = e.label;
    if (e.value === value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    dadosMercadoriasNF[idx].empresa = sel.value;
    td.title = sel.value;
    salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
  };
  td.appendChild(sel);
  return td;
}

function criarCelSelectLojaNF(value, idx) {
  return criarCelSelectLoja(value, (val) => {
    dadosMercadoriasNF[idx].loja = val;
    salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
  });
}

function criarCelSelectTurnoNF(value, idx) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  TURNOS_MERCADORIAS.forEach(turno => {
    const opt = document.createElement('option');
    opt.value = turno;
    opt.textContent = turno;
    if (turno === value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    dadosMercadoriasNF[idx].turno = sel.value;
    td.title = sel.value;
    salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
  };
  td.appendChild(sel);
  return td;
}

function criarCelSelectTipoVolNF(value, idx) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  TIPOS_VOLUME.forEach(tipo => {
    const opt = document.createElement('option');
    opt.value = tipo;
    opt.textContent = tipo;
    if (tipo === value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    dadosMercadoriasNF[idx].tipoVolume = sel.value;
    td.title = sel.value;
    salvarMercadoriasNFItem(dadosMercadoriasNF[idx]);
  };
  td.appendChild(sel);
  return td;
}

function adicionarMercadoriaNF() {
  const hoje = new Date().toISOString().split('T')[0];
  dadosMercadoriasNF.push({
    data: hoje, empresa: '', master: '', qntNotas: '', qntPaletes: '',
    loja: '', volume: '', tipoVolume: '', qtdPlu: '', conferente: '', turno: ''
  });
  garantirIds(dadosMercadoriasNF);
  salvarMercadoriasNFItem(dadosMercadoriasNF[dadosMercadoriasNF.length - 1]);
  renderizarMercadoriasNF();
  toast('Registro adicionado', 'success');
}

// ==================== DASHBOARD MERCADORIAS ====================
function abrirDashboardMerc() {
  dashMercCD = cdAtual;
  dashMercConferenteFiltro = '';
  DM_PALETTE = dashMercCD === 'CD2' ? DM_PALETTE_CD2 : ["#3CCBDB", "#D40138", "#5B8DEF", "#E8A33D", "#8BD450", "#C87CE8", "#FF6B6B", "#4ECDC4"];
  mudarPagina('dashboardMerc');
}

function renderizarDashboardMerc() {
  if (!dashMercCD) dashMercCD = cdAtual;
  const empresasCD = getEmpresasPorCD(dashMercCD);
  const registros = (dadosMercadoriasNF || []).filter(d =>
    empresasCD.includes(d.empresa) && extrairMesDeData(d.data) === mesAtualMercadoriasNF && extrairAnoDeData(d.data) === anoAtual
  );
  document.getElementById('dmEmpresaLabel').innerHTML = escapeHtml(dashMercCD) + ' \u00b7 ' + MESES[(new Date()).getMonth()] + ' ' + (new Date()).getFullYear();

  if (registros.length === 0) {
    document.getElementById('dmKpiRow').innerHTML = '';
    document.getElementById('dmEmpresaGrid').innerHTML = '';
    document.getElementById('dmRankList').innerHTML = '<p style="text-align:center;color:var(--dash-text-dimmer);padding:32px">Nenhum registro encontrado para este CD no per\u00edodo selecionado.</p>';
    document.getElementById('dmChipsConferente').innerHTML = '';
    document.getElementById('dmTurnoTrack').innerHTML = '';
    document.getElementById('dmTurnoLegend').innerHTML = '';
    document.getElementById('dmLojaList').innerHTML = '';
    return;
  }

  const empresaGrid = document.getElementById('dmEmpresaGrid');
  if (empresaGrid) {
    empresaGrid.innerHTML = '';
    const empresasInfo = EMPRESAS_MERC.filter(e => e.cd === dashMercCD);
    empresasInfo.forEach(e => {
      const rows = registros.filter(r => r.empresa === e.value);
      const notas = rows.reduce((s, r) => s + (Number(r.qntNotas) || 0), 0);
      const caixas = rows.filter(r => (r.tipoVolume || '').toLowerCase() === 'caixas').reduce((s, r) => s + (Number(r.volume) || 0), 0);
      const kilos = rows.filter(r => (r.tipoVolume || '').toLowerCase() === 'kilo').reduce((s, r) => s + (Number(r.volume) || 0), 0);
      const card = document.createElement('div');
      card.className = 'dm-empresa-card';
      card.innerHTML =
        '<div class="dm-empresa-cod">' + escapeHtml(e.value) + '</div>' +
        '<div class="dm-empresa-info">' +
          '<div class="dm-empresa-nome">' + escapeHtml(e.label) + '</div>' +
          '<div class="dm-empresa-stats">' +
            '<span class="dm-empresa-stat"><b>' + notas + '</b> notas</span>' +
            (caixas ? '<span class="dm-empresa-stat"><b>' + caixas + '</b> cx</span>' : '') +
            (kilos ? '<span class="dm-empresa-stat"><b>' + kilos + '</b> kg</span>' : '') +
          '</div>' +
        '</div>';
      empresaGrid.appendChild(card);
    });
  }

  const conferentes = [...new Set(registros.map(r => norm(r.conferente)).filter(Boolean))];
  const turnos = [...new Set(registros.map(r => r.turno).filter(Boolean))];
  const lojas = [...new Set(registros.map(r => r.loja).filter(Boolean))];

  const filtered = dashMercConferenteFiltro
    ? registros.filter(r => norm(r.conferente) === dashMercConferenteFiltro)
    : registros;

  const totals = filtered.reduce((a, r) => {
    a.notas += Number(r.qntNotas) || 0;
    a.paletes += Number(r.qntPaletes) || 0;
    a.volume += Number(r.volume) || 0;
    a.plu += Number(r.qtdPlu) || 0;
    const tipo = r.tipoVolume || 'N\u00e3o informado';
    a.porTipo[tipo] = (a.porTipo[tipo] || 0) + (Number(r.volume) || 0);
    return a;
  }, { notas: 0, paletes: 0, volume: 0, plu: 0, porTipo: {} });

  const ranking = conferentes.map(c => {
    const rows = registros.filter(r => norm(r.conferente) === c);
    const volume = rows.reduce((s, r) => s + (Number(r.volume) || 0), 0);
    const plu = rows.reduce((s, r) => s + (Number(r.qtdPlu) || 0), 0);
    const notas = rows.reduce((s, r) => s + (Number(r.qntNotas) || 0), 0);
    const paletes = rows.reduce((s, r) => s + (Number(r.qntPaletes) || 0), 0);
    const porTipo = {};
    rows.forEach(r => {
      const tipo = r.tipoVolume || 'N\u00e3o informado';
      porTipo[tipo] = (porTipo[tipo] || 0) + (Number(r.volume) || 0);
    });
    const totalRegistros = rows.length;
    return { conferente: c, volume, plu, notas, paletes, media: totalRegistros ? +(volume / totalRegistros).toFixed(1) : 0, porTipo };
  }).sort((a, b) => b.volume - a.volume);

  const porTurno = turnos.map(t => {
    const rows = filtered.filter(r => r.turno === t);
    const volume = rows.reduce((s, r) => s + (Number(r.volume) || 0), 0);
    const porTipo = {};
    rows.forEach(r => {
      const tipo = r.tipoVolume || 'N\u00e3o informado';
      porTipo[tipo] = (porTipo[tipo] || 0) + (Number(r.volume) || 0);
    });
    return { turno: t, volume, porTipo };
  }).sort((a, b) => b.volume - a.volume);

  const porLoja = lojas.map(l => {
    const rows = filtered.filter(r => r.loja === l);
    const volume = rows.reduce((s, r) => s + (Number(r.volume) || 0), 0);
    const responsaveis = [...new Set(rows.map(r => norm(r.conferente)))];
    const porTipo = {};
    rows.forEach(r => {
      const tipo = r.tipoVolume || 'N\u00e3o informado';
      porTipo[tipo] = (porTipo[tipo] || 0) + (Number(r.volume) || 0);
    });
    return { loja: l, volume, responsaveis, porTipo };
  }).filter(l => l.volume > 0).sort((a, b) => b.volume - a.volume);

  const tipoEntries = Object.entries(totals.porTipo).sort((a, b) => b[1] - a[1]);
  const kpiItems = [
    { lbl: 'Notas enviadas', val: totals.notas, sub: 'total do per\u00edodo' },
    { lbl: 'Total paletes', val: totals.paletes, sub: 'paletes conferidos' },
    ...tipoEntries.map(([tipo, vol]) => ({
      lbl: tipo, val: vol, unit: tipo === 'Kilo' ? 'kg' : tipo === 'Caixas' ? 'cx' : 'un.',
      sub: ((vol / (totals.volume || 1)) * 100).toFixed(1) + '% do total'
    })),
    { lbl: 'Qtd. PLU', val: totals.plu, sub: 'produtos distintos' },
    { lbl: 'Lojas atendidas', val: porLoja.length, sub: registros.length + ' registros' }
  ];
  document.getElementById('dmKpiRow').style.gridTemplateColumns = 'repeat(' + Math.min(kpiItems.length, 8) + ', 1fr)';
  document.getElementById('dmKpiRow').innerHTML = kpiItems.map(function (i) {
    return '<div class="dm-kpi"><div class="lbl">' + i.lbl + '</div><div class="val">' + i.val + (i.unit ? '<span class="unit">' + i.unit + '</span>' : '') + '</div><div class="sub">' + i.sub + '</div></div>';
  }).join('');

  const chipsEl = document.getElementById('dmChipsConferente');
  const allChips = ['', ...conferentes];
  chipsEl.innerHTML = allChips.map(function (c) {
    return '<span class="dm-chip ' + (dashMercConferenteFiltro === c ? 'active' : '') + '" data-c="' + escapeAttr(c) + '">' + (c ? escapeHtml(c) : 'Todos') + '</span>';
  }).join('');
  chipsEl.querySelectorAll('.dm-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      dashMercConferenteFiltro = chip.dataset.c;
      renderizarDashboardMerc();
    });
  });

  const maxVol = Math.max.apply(null, ranking.map(function (r) { return r.volume; }).concat([1]));
  document.getElementById('dmRankList').innerHTML = ranking.map(function (r, i) {
    const color = DM_PALETTE[i % DM_PALETTE.length];
    const pct = Math.max((r.volume / maxVol) * 100, 3);
    const dim = dashMercConferenteFiltro && dashMercConferenteFiltro !== r.conferente ? 'opacity:.35;' : '';
    const tipoDetail = Object.entries(r.porTipo).map(function (e) {
      var t = e[0], v = e[1];
      return '<span style="font-size:10px;color:var(--dash-text-dimmer)">' + v + ' ' + (t === 'Kilo' ? 'kg' : t === 'Caixas' ? 'cx' : 'un.') + '</span>';
    }).join(' \u00b7 ');
    return '<div class="dm-rank-row" style="' + dim + '"><div class="dm-rank-num">#' + (i + 1) + '</div><div class="dm-avatar" style="background:' + color + '">' + escapeHtml(r.conferente.slice(0, 2)) + '</div><div class="dm-rank-body"><div class="name">' + escapeHtml(r.conferente) + '</div><div class="dm-bar-track"><div class="dm-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' + (tipoDetail ? '<div style="margin-top:4px;display:flex;gap:10px">' + tipoDetail + '</div>' : '') + '</div><div class="dm-rank-metrics"><div><span class="m-val">' + r.volume + '</span><span class="m-lbl">VOLUME</span></div><div><span class="m-val">' + r.notas + '</span><span class="m-lbl">NOTAS</span></div></div></div>';
  }).join('');

  const totalTurno = porTurno.reduce(function (s, t) { return s + t.volume; }, 0) || 1;
  document.getElementById('dmTurnoHint').textContent = porTurno.length + ' turno' + (porTurno.length !== 1 ? 's' : '') + ' ativo' + (porTurno.length !== 1 ? 's' : '');
  document.getElementById('dmTurnoTrack').innerHTML = porTurno.map(function (t, i) {
    const pct = (t.volume / totalTurno) * 100;
    return '<div class="dm-turno-seg" style="width:' + pct + '%;background:' + DM_PALETTE[i % DM_PALETTE.length] + '">' + (pct > 12 ? Math.round(pct) + '%' : '') + '</div>';
  }).join('');
  document.getElementById('dmTurnoLegend').innerHTML = porTurno.map(function (t, i) {
    const tipoDetail = Object.entries(t.porTipo).map(function (e) {
      var tipo = e[0], vol = e[1];
      return vol + ' ' + (tipo === 'Kilo' ? 'kg' : tipo === 'Caixas' ? 'cx' : 'un.');
    }).join(' \u00b7 ');
    return '<div class="row"><span><span class="dm-sw" style="background:' + DM_PALETTE[i % DM_PALETTE.length] + '"></span>' + t.turno + '</span><b>' + t.volume + (tipoDetail ? '<span style="font-weight:400;color:var(--dash-text-dimmer);font-size:11px"> (' + tipoDetail + ')</span>' : '') + '</b></div>';
  }).join('');

  const maxLoja = Math.max.apply(null, porLoja.map(function (l) { return l.volume; }).concat([1]));
  document.getElementById('dmLojaHint').textContent = porLoja.length + ' loja' + (porLoja.length !== 1 ? 's' : '');
  document.getElementById('dmLojaList').innerHTML = porLoja.map(function (l) {
    const pct = Math.max((l.volume / maxLoja) * 100, 3);
    return '<div class="dm-loja-row"><div class="dm-loja-top"><span class="name">' + escapeHtml(l.loja) + '</span><span class="vol">' + l.volume + '</span></div><div class="dm-loja-top" style="margin-top:-4px;"><span class="who">' + escapeHtml(l.responsaveis.join(', ')) + '</span><span class="who">' + Object.entries(l.porTipo).map(function (e) { var t = e[0], v = e[1]; return v + ' ' + (t === 'Kilo' ? 'kg' : t === 'Caixas' ? 'cx' : 'un.'); }).join(' \u00b7 ') + '</span></div><div class="dm-loja-bar"><div class="dm-loja-bar-fill" style="width:' + pct + '%"></div></div></div>';
  }).join('');
}

function gerarPdfDashboardMerc() {
  document.body.classList.add('dashmerc-printing');
  setTimeout(() => {
    const titleBkp = document.title;
    document.title = 'Mercadorias NF ' + dashMercCD + ' - ' + mesAtualMercadoriasNF + ' ' + new Date().getFullYear();
    window.print();
    document.title = titleBkp;
    document.body.classList.remove('dashmerc-printing');
  }, 300);
}
