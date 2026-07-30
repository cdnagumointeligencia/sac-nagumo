// ==================== CHAMADOS ====================
let paginaAtual = 'chamados';
let paginaChamados = 0;
let mesAtualSenhasSac = '';
let mesAtualNotasDev = '';
let mesAtualDash = '';
let mesAtualMercadoriasNF = '';

function mudarPagina(pagina) {
  if (pagina === paginaAtual) return;
  paginaAtual = pagina;
  document.getElementById('pageChamados').classList.toggle('active', pagina === 'chamados');
  document.getElementById('pageSenhaSac').classList.toggle('active', pagina === 'senhaSac');
  document.getElementById('pageNotasDevolucao').classList.toggle('active', pagina === 'notasDevolucao');
  document.getElementById('pageProdutividade').classList.toggle('active', pagina === 'produtividade');
  document.getElementById('pageDashboard').classList.toggle('active', pagina === 'dashboard');
  document.getElementById('pageMercadoriasNF').classList.toggle('active', pagina === 'mercadoriasNF');
  document.getElementById('pageDashboardMerc').classList.toggle('active', pagina === 'dashboardMerc');
  document.getElementById('btnNavSenhaSac').classList.toggle('active-toggle', pagina === 'senhaSac');
  document.getElementById('btnNavNotasDev').classList.toggle('active-toggle', pagina === 'notasDevolucao');
  document.getElementById('btnNavDashboard').classList.toggle('active-toggle', pagina === 'dashboard');
  document.getElementById('btnNavMercadoriasNF').classList.toggle('active-toggle', pagina === 'mercadoriasNF');
  document.getElementById('tituloPagina').style.display = (pagina === 'dashboard' || pagina === 'dashboardMerc' || pagina === 'produtividade' || pagina === 'senhaSac' || pagina === 'notasDevolucao' || pagina === 'mercadoriasNF') ? 'none' : '';
  document.body.classList.toggle('dash-active', pagina === 'dashboard' || pagina === 'dashboardMerc');
  document.body.classList.toggle('cd1-active', cdAtual === 'CD1');
  document.body.classList.toggle('cd2-active', cdAtual === 'CD2');
  if (pagina === 'chamados') {
    document.getElementById('tituloPagina').textContent = 'Acompanhamento de Chamados ' + cdAtual;
  } else if (pagina === 'senhaSac') {
    document.getElementById('tituloPagina').textContent = 'Senha SAC';
  } else if (pagina === 'notasDevolucao') {
    document.getElementById('tituloPagina').textContent = 'Notas Devolução';
  } else if (pagina === 'produtividade') {
    document.getElementById('tituloPagina').textContent = 'Produtividade';
    renderizarProdutividade();
  } else if (pagina === 'dashboard') {
    mesAtualDash = mesAtual;
    montarAbasGenerico('tabsMesDash', mesAtualDash, selecionarMesDash);
    atualizarDashboard();
  } else if (pagina === 'dashboardMerc') {
    renderizarDashboardMerc();
  }
  if (pagina === 'senhaSac') {
    if (!mesAtualSenhasSac) mesAtualSenhasSac = mesAtual;
    montarAbasGenerico('tabsMesSenhasSac', mesAtualSenhasSac, selecionarMesSenhasSac);
    renderizarSenhasSac();
  }
  if (pagina === 'notasDevolucao') {
    if (!mesAtualNotasDev) mesAtualNotasDev = mesAtual;
    montarAbasGenerico('tabsMesNotasDev', mesAtualNotasDev, selecionarMesNotasDev);
    renderizarNotasDevolucao();
  }
  if (pagina === 'mercadoriasNF') {
    if (!mesAtualMercadoriasNF) mesAtualMercadoriasNF = mesAtual;
    montarAbasGenerico('tabsMesMercadoriasNF', mesAtualMercadoriasNF, selecionarMesMercadoriasNF);
    renderizarMercadoriasNF();
  }
}

function selecionarMesSenhasSac(mes) {
  mesAtualSenhasSac = mes;
  montarAbasGenerico('tabsMesSenhasSac', mesAtualSenhasSac, selecionarMesSenhasSac);
  renderizarSenhasSac();
}

function filtrarSenhasSac() {
  renderizarSenhasSac();
}

function selecionarMesNotasDev(mes) {
  mesAtualNotasDev = mes;
  montarAbasGenerico('tabsMesNotasDev', mesAtualNotasDev, selecionarMesNotasDev);
  renderizarNotasDevolucao();
}

function selecionarMesDash(mes) {
  mesAtualDash = mes;
  montarAbasGenerico('tabsMesDash', mesAtualDash, selecionarMesDash);
  atualizarDashboard();
}

// ==================== TABELA ====================
function renderizarTabela() {
  const tbody = document.querySelector('#tabela tbody');
  tbody.innerHTML = '';
  const registros = dadosMes[mesAtual] || [];
  if (registros.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 14;
    td.style.textAlign = 'center';
    td.style.padding = '32px';
    td.style.color = 'var(--text-dim)';
    td.style.fontSize = '13px';
    td.textContent = 'Nenhum chamado neste mês. Clique em "+ Chamado" para começar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    document.getElementById('chamadosPaginacao').innerHTML = '';
    return;
  }
  const totalPaginas = Math.ceil(registros.length / CHAMADOS_POR_PAGINA);
  if (paginaChamados >= totalPaginas) paginaChamados = totalPaginas - 1;
  if (paginaChamados < 0) paginaChamados = 0;
  const fim = registros.length - 1 - (paginaChamados * CHAMADOS_POR_PAGINA);
  const inicio = Math.max(-1, fim - CHAMADOS_POR_PAGINA + 1);
  for (let i = fim; i > inicio; i--) {
    tbody.appendChild(criarLinha(registros[i], i));
  }
  const pagEl = document.getElementById('chamadosPaginacao');
  if (totalPaginas > 1) {
    pagEl.innerHTML = '<button class="btn" style="padding:3px 8px;font-size:11px" onclick="paginaChamados=0;renderizarTabela()" ' + (paginaChamados === 0 ? 'disabled' : '') + '>&laquo;</button>' +
      '<button class="btn" style="padding:3px 8px;font-size:11px" onclick="paginaChamados--;renderizarTabela()" ' + (paginaChamados === 0 ? 'disabled' : '') + '>&lsaquo;</button>' +
      '<span>Página ' + (paginaChamados + 1) + ' de ' + totalPaginas + '</span>' +
      '<button class="btn" style="padding:3px 8px;font-size:11px" onclick="paginaChamados++;renderizarTabela()" ' + (paginaChamados >= totalPaginas - 1 ? 'disabled' : '') + '>&rsaquo;</button>' +
      '<button class="btn" style="padding:3px 8px;font-size:11px" onclick="paginaChamados=' + (totalPaginas - 1) + ';renderizarTabela()" ' + (paginaChamados >= totalPaginas - 1 ? 'disabled' : '') + '>&raquo;</button>' +
      '<span style="margin-left:8px">(' + registros.length + ' registros)</span>';
  } else {
    pagEl.innerHTML = '<span>' + registros.length + ' registros</span>';
  }
}

function criarLinha(d, idx) {
  const tr = document.createElement('tr');
  tr.dataset.idx = idx;

  tr.appendChild(criarCelInput('text', d.chamado, 'Chamado', idx, 'chamado'));

  tr.appendChild(criarCelSelectLoja(d.loja || '', (val) => {
    dadosMes[mesAtual][idx].loja = val;
    if (d.setor === 'Sorter') {
      const bracoEncontrado = buscarBracoPorLoja(val);
      if (bracoEncontrado) {
        dadosMes[mesAtual][idx].braco = bracoEncontrado;
        const inpBracoNaRow = tr.querySelector('.col-braco input');
        if (inpBracoNaRow) inpBracoNaRow.value = bracoEncontrado;
      }
    }
    salvarDadosMes();
    atualizarTotais();
  }));

  tr.appendChild(criarCelSelect(TURNOS, d.turno, idx, 'turno'));

  const tdSetor = document.createElement('td');
  tdSetor.title = d.setor || '';
  const selSetor = document.createElement('select');
  getSetores().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'Selecione...';
    if (v === d.setor) opt.selected = true;
    selSetor.appendChild(opt);
  });
  selSetor.onchange = () => {
    dadosMes[mesAtual][idx].setor = selSetor.value;
    tdSetor.title = selSetor.value;
    if (selSetor.value !== 'Sorter') {
      dadosMes[mesAtual][idx].braco = '';
    } else {
      const bracoEncontrado = buscarBracoPorLoja(dadosMes[mesAtual][idx].loja);
      if (bracoEncontrado) {
        dadosMes[mesAtual][idx].braco = bracoEncontrado;
      }
    }
    salvarDadosMes();
    renderizarTabela();
    atualizarTotais();
  };
  tdSetor.appendChild(selSetor);
  tr.appendChild(tdSetor);

  const tdBraco = document.createElement('td');
  tdBraco.className = 'col-braco';
  tdBraco.title = d.braco || '';
  const inpBraco = document.createElement('input');
  inpBraco.type = 'number';
  inpBraco.min = '1';
  inpBraco.max = '11';
  inpBraco.value = d.braco || '';
  inpBraco.placeholder = '-';
  inpBraco.disabled = d.setor !== 'Sorter';
  inpBraco.onchange = function () {
    var v = parseInt(inpBraco.value);
    if (inpBraco.value && (v < 1 || v > 11)) {
      toast('Bra\u00e7o deve ser entre 1 e 11', 'error');
      inpBraco.value = dadosMes[mesAtual][idx].braco || '';
      return;
    }
    dadosMes[mesAtual][idx].braco = inpBraco.value;
    tdBraco.title = inpBraco.value;
    salvarDadosMes();
  };
  tdBraco.appendChild(inpBraco);
  tr.appendChild(tdBraco);

  tr.appendChild(criarCelInput('text', d.plu, 'PLU', idx, 'plu'));
  tr.appendChild(criarCelSelect(getDivergencias(), d.divergencia, idx, 'divergencia'));

  const tdObs = criarCelSelect(getObservacoes(), d.observacao, idx, 'observacao');
  tdObs.className = cdAtual === 'CD1' ? 'col-solucao' : 'col-observacao';
  tr.appendChild(tdObs);

  const tdObsTxt = criarCelInput('text', d.obsTexto || '', 'Observação', idx, 'obsTexto');
  tdObsTxt.className = 'col-observacao-txt';
  tr.appendChild(tdObsTxt);

  const tdConf = criarCelInput('text', d.conferente || '', 'Conferente', idx, 'conferente');
  tdConf.className = 'col-conferente';
  tr.appendChild(tdConf);

  const tdUser = document.createElement('td');
  tdUser.title = d.usuario || '';
  const selUser = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  selUser.appendChild(optVazio);
  usuarios.forEach(nome => {
    const opt = document.createElement('option');
    opt.value = nome;
    opt.textContent = nome;
    if (nome === d.usuario) opt.selected = true;
    selUser.appendChild(opt);
  });
  selUser.onchange = () => {
    dadosMes[mesAtual][idx].usuario = selUser.value;
    tdUser.title = selUser.value;
    salvarDadosMes();
    atualizarTotais();
    if (selUser.value) {
      atualizarUsuarioNotaDev(dadosMes[mesAtual][idx].chamado, dadosMes[mesAtual][idx].loja, selUser.value);
    }
  };
  tdUser.appendChild(selUser);
  tr.appendChild(tdUser);

  tr.appendChild(criarCelInput('date', d.dataAbertura, 'Data Abertura', idx, 'dataAbertura'));
  tr.appendChild(criarCelInput('date', d.dataFechamento, 'Data Fechamento', idx, 'dataFechamento'));

  const tdAcoes = document.createElement('td');
  tdAcoes.className = 'row-actions';
  const btnDel = document.createElement('button');
  btnDel.className = 'icon-btn delete';
  btnDel.textContent = '🗑';
  btnDel.title = 'Excluir';
  btnDel.onclick = function () {
    if (!confirm('Excluir este chamado?')) return;
    var item = dadosMes[mesAtual][idx];
    fbExcluirChamado(item.id);
    dadosMes[mesAtual].splice(idx, 1);
    salvarDadosMes();
    renderizarTabela();
    atualizarTotais();
    toast('Chamado excluído', 'success');
  };
  tdAcoes.appendChild(btnDel);
  tr.appendChild(tdAcoes);

  return tr;
}

function criarCelInput(type, value, label, idx, field) {
  const td = document.createElement('td');
  td.title = value || '';
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value || '';
  inp.placeholder = '-';
  if (field === 'plu') inp.inputMode = 'numeric';
  var salvar = function (isChamado) {
    dadosMes[mesAtual][idx][field] = inp.value;
    td.title = inp.value;
    salvarDadosMes();
    atualizarTotais();
    if (field !== 'chamado' || isChamado) {
      var docId = dadosMes[mesAtual][idx].id;
      if (docId) fbAtualizarCampoChamado(docId, field, inp.value);
    }
  };
  if (field === 'chamado') {
    inp.onblur = async function () {
      if (inp.value.trim()) {
        var chamadoNum = inp.value.trim();
        var localDup = dadosMes[mesAtual].some(function (d, i) { return i !== idx && d.chamado === chamadoNum; });
        if (localDup) {
          toast('N\u00famero de chamado j\u00e1 existe no sistema!', 'error');
          inp.value = dadosMes[mesAtual][idx].chamado || '';
          return;
        }
        var naturalId = cdAtual + '_' + chamadoNum;
        if (dadosMes[mesAtual][idx].id !== naturalId) {
          var oldId = dadosMes[mesAtual][idx].id;
          var criado = await fbDocCreate('chamados', naturalId, {
            id: naturalId, chamado: chamadoNum, loja: '', braco: '', turno: '',
            setor: '', plu: '', divergencia: '', observacao: '', obsTexto: '',
            conferente: '', usuario: usuarioLogado || '', dataAbertura: '', dataFechamento: ''
          }, { cd: cdAtual, ano: anoAtual, mes: MESES.indexOf(mesAtual), mesNome: mesAtual });
          if (!criado) {
            inp.value = dadosMes[mesAtual][idx].chamado || '';
            return;
          }
          var rowIdx = dadosMes[mesAtual].findIndex(function (d) { return d.id === oldId; });
          if (rowIdx !== -1) {
            dadosMes[mesAtual][rowIdx].id = naturalId;
          }
        }
      }
      salvar(true);
    };
  }
  inp.oninput = function() {
    if (type === 'text') {
      const start = inp.selectionStart;
      inp.value = capitalizarPalavras(inp.value);
      if (start != null) inp.setSelectionRange(start, start);
    }
    if (field !== 'chamado') salvar(false);
  };
  td.appendChild(inp);
  return td;
}

function criarCelSelect(options, value, idx, field) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  options.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'Selecione...';
    if (v === value) opt.selected = true;
    sel.appendChild(opt);
  });
  var salvar = async function () {
    dadosMes[mesAtual][idx][field] = sel.value;
    td.title = sel.value;
    salvarDadosMes();
    atualizarTotais();
    var docId = dadosMes[mesAtual][idx].id;
    if (docId) fbAtualizarCampoChamado(docId, field, sel.value);
    if (field === 'observacao' && fbCamposQueGeramNotaDev().includes(sel.value)) {
      await criarNotaDevAutomatica(dadosMes[mesAtual][idx]);
    }
  };
  sel.onchange = salvar;
  td.appendChild(sel);
  return td;
}

async function criarNotaDevAutomatica(chamado) {
  var naturalId = cdAtual + '_' + (chamado.chamado || '') + '_' + (chamado.loja || '');
  if (!chamado.chamado || !chamado.loja) {
    toast('Chamado e loja necess\u00e1rios para criar nota', 'error');
    return;
  }
  var jaExiste = dadosNotasDev.some(function (n) { return n.chamado === chamado.chamado && n.loja === chamado.loja; });
  if (jaExiste) {
    toast('Nota de devolu\u00e7\u00e3o j\u00e1 existe para este chamado', 'error');
    return;
  }
  const hoje = new Date().toISOString().split('T')[0];
  var novaNota = {
    chamado: chamado.chamado || '',
    loja: chamado.loja || '',
    plu: chamado.plu || '',
    data: chamado.dataAbertura || hoje,
    nota: '',
    usuario: chamado.usuario || '',
    statusNf: 'Aguardando',
    observacao: ''
  };
  var criado = await fbDocCreate('notasDevolucao', naturalId, novaNota, { cd: cdAtual, mesNome: mesAtual });
  if (!criado) {
    toast('Nota de devolu\u00e7\u00e3o j\u00e1 existe no sistema (criada por outro usu\u00e1rio)', 'error');
    return;
  }
  novaNota.id = naturalId;
  dadosNotasDev.push(novaNota);
  salvarNotasDev();
  toast('Nota de devolu\u00e7\u00e3o criada automaticamente!', 'success');
}

function atualizarUsuarioNotaDev(chamado, loja, usuario) {
  const nota = dadosNotasDev.find(n => n.chamado === chamado && n.loja === loja);
  if (nota && !nota.usuario) {
    nota.usuario = usuario;
    salvarNotasDev();
  }
}

// ==================== ADICIONAR CHAMADO ====================
function adicionarChamado() {
  const regs = dadosMes[mesAtual] || [];
  if (regs.length > 0) {
    const ultimo = regs[regs.length - 1];
    if (!ultimo.chamado || !ultimo.loja) {
      toast('Preencha o chamado e a loja da linha atual antes de adicionar uma nova.', 'error');
      return;
    }
  }
  const hoje = new Date().toISOString().split('T')[0];
  const id = Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  dadosMes[mesAtual].push({
    id, chamado: '', loja: '', braco: '', turno: '', setor: '',
    plu: '', divergencia: '', observacao: '', obsTexto: '', conferente: '', usuario: usuarioLogado || '',
    dataAbertura: '', dataFechamento: hoje
  });
  salvarDadosMes();
  renderizarTabela();
  atualizarTotais();
  toast('Chamado adicionado', 'success');
  const table = document.querySelector('.table-wrap');
  setTimeout(() => table.scrollTop = 0, 100);
}

// ==================== TOTAIS ====================
function atualizarTotais() {
  const regs = dadosMes[mesAtual] || [];
  const total = regs.length;
  const abertos = regs.filter(r => !r.dataFechamento).length;
  const fechados = regs.filter(r => r.dataFechamento).length;
  const el = document.getElementById('chamadosPaginacao');
  if (!el) return;
  let info = el.querySelector('.totais-info');
  if (!info) {
    info = document.createElement('span');
    info.className = 'totais-info';
    info.style.cssText = 'font-size:11px;color:var(--text-dim);margin-left:8px;';
    el.appendChild(info);
  }
  if (regs.length > 0) {
    info.textContent = `| ${total} total · ${abertos} aberto${abertos !== 1 ? 's' : ''} · ${fechados} fechado${fechados !== 1 ? 's' : ''}`;
    info.style.display = '';
  } else {
    info.textContent = '';
    info.style.display = 'none';
  }
}
