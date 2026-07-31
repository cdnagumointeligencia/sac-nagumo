// ==================== SENHA SAC ====================
let dadosSenhasSac = [];

var _fbTimerSenhas = null;

async function carregarSenhasSac() {
  var fbOk = await fbCarregarColecao('senhasSac', dadosSenhasSac);
  if (!fbOk) {
    dadosSenhasSac = (lsGetCd('SENHAS_SAC_dados') || []).sort(function (a, b) { return (a.senha || 0) - (b.senha || 0); });
  }
  garantirIds(dadosSenhasSac);
  if (fbDisponivel() && cdAtual) {
    if (_snapSenhas) { try { _snapSenhas(); } catch (e) {} }
    _snapSenhas = fbOnSnapshotColecao('senhasSac', dadosSenhasSac);
  }
}

async function salvarSenhasSac() {
  lsSetCd('SENHAS_SAC_dados', dadosSenhasSac);
  clearTimeout(_fbTimerSenhas);
  _fbTimerSenhas = setTimeout(function () { fbSalvarColecao('senhasSac', dadosSenhasSac); }, 500);
}

function renderizarSenhasSac() {
  document.getElementById('senhaSacTitleCd').textContent = cdAtual;
  const hoje = new Date();
  document.getElementById('senhaSacTitleMes').textContent = MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
  document.getElementById('senhaSacUserName').textContent = usuarioLogado;
  document.getElementById('senhaSacUserCd').textContent = cdAtual;
  const tbody = document.querySelector('#tabelaSenhaSac tbody');
  tbody.innerHTML = '';
  const busca = (document.getElementById('buscaSenhaSac')?.value || '').toLowerCase();
  const filtrados = dadosSenhasSac
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => {
      if (extrairMesDeData(d.data) !== mesAtualSenhasSac) return false;
      if (extrairAnoDeData(d.data) !== anoAtual) return false;
      if (busca) {
        const texto = ((d.chamado || '') + ' ' + (d.loja || '') + ' ' + (d.senha || '') + ' ' + (d.divergencia || '') + ' ' + (d.status || '') + ' ' + (d.observacao || '')).toLowerCase();
        if (!texto.includes(busca)) return false;
      }
      return true;
    });
  if (filtrados.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.style.textAlign = 'center';
    td.style.padding = '32px';
    td.style.color = 'var(--text-dim)';
    td.style.fontSize = '13px';
    td.textContent = 'Nenhuma senha SAC neste m\u00eas. Clique em "+ Senha" para come\u00e7ar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  filtrados.forEach(({ d, i }) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = i;

    tr.appendChild(criarCelInputSenhaSac('text', d.chamado, i, 'chamado'));
    tr.appendChild(criarCelSelectLoja(d.loja || '', (val) => {
      dadosSenhasSac[i].loja = val;
      salvarSenhasSac();
    }));
    tr.appendChild(criarCelInputSenhaSac('number', d.senha, i, 'senha'));
    tr.appendChild(criarCelSelectSenhaSac(DIVERGENCIAS_SAC, d.divergencia, i, 'divergencia'));
    tr.appendChild(criarCelSelectSenhaSac(STATUS_SAC, d.status, i, 'status'));
    tr.appendChild(criarCelResponsavel(d.responsavel || usuarioLogado, i));
    tr.appendChild(criarCelInputSenhaSac('text', d.observacao, i, 'observacao'));

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'row-actions';
    const btnDel = document.createElement('button');
    btnDel.className = 'icon-btn delete';
    btnDel.textContent = '\uD83D\uDDD1';
    btnDel.title = 'Excluir';
    btnDel.onclick = function () {
      if (!confirm('Excluir esta senha?')) return;
      var item = dadosSenhasSac[i];
      fbExcluirItemColecao('senhasSac', item);
      dadosSenhasSac.splice(i, 1);
      salvarSenhasSac();
      renderizarSenhasSac();
      toast('Senha exclu\u00edda', 'success');
    };
    tdAcoes.appendChild(btnDel);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function criarCelInputSenhaSac(type, value, idx, field) {
  const td = document.createElement('td');
  td.title = value || '';
  const inp = document.createElement('input');
  inp.type = type || 'text';
  inp.value = value || '';
  inp.placeholder = '-';
  if (field === 'senha' || field === 'loja') inp.inputMode = 'numeric';
  inp.dataset.field = field;
  inp.addEventListener('input', () => {
    if (type === 'text') {
      const start = inp.selectionStart;
      inp.value = capitalizarPalavras(inp.value);
      if (start != null) inp.setSelectionRange(start, start);
    }
    dadosSenhasSac[idx][field] = inp.value;
    td.title = inp.value;
    salvarSenhasSac();
  });
  td.appendChild(inp);
  return td;
}

function criarCelSelectSenhaSac(options, value, idx, field) {
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
  sel.addEventListener('change', () => {
    dadosSenhasSac[idx][field] = sel.value;
    td.title = sel.value;
    salvarSenhasSac();
  });
  td.appendChild(sel);
  return td;
}

function criarCelResponsavel(value, idx) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  (usuarios || []).forEach(nome => {
    const opt = document.createElement('option');
    opt.value = nome;
    opt.textContent = nome;
    if (nome === value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    dadosSenhasSac[idx].responsavel = sel.value;
    td.title = sel.value;
    salvarSenhasSac();
  });
  td.appendChild(sel);
  return td;
}

async function fbMaxSenhaSacGlobal() {
  if (!fbDisponivel()) return 0;
  var ano = new Date().getFullYear();
  try {
    var snap = await fbDb.collection('senhasSac').where('ativo', '==', true).where('ano', '==', ano).get();
    var max = 0;
    snap.forEach(function (d) {
      var n = parseInt(d.data().senha, 10) || 0;
      if (n > max) max = n;
    });
    return max;
  } catch (e) {
    return 0;
  }
}

async function fbProximaSenhaSac() {
  if (!fbDisponivel()) return null;
  var ano = new Date().getFullYear();
  var ref = fbDb.collection('contadores').doc('senhasSac_' + ano);
  var alvo = (await fbMaxSenhaSacGlobal()) + 1;
  try {
    return await fbDb.runTransaction(function (tx) {
      return tx.get(ref).then(function (doc) {
        var atual = doc.exists && typeof doc.data().proximo === 'number' ? doc.data().proximo : 0;
        var prox = Math.max(atual, alvo);
        if (!prox) prox = 1;
        tx.set(ref, { proximo: prox + 1 });
        return prox;
      });
    });
  } catch (e) {
    return null;
  }
}

async function adicionarSenhaSac() {
  const hoje = new Date().toISOString().split('T')[0];
  let proxima = await fbProximaSenhaSac();
  if (!proxima) {
    const localMax = dadosSenhasSac.reduce((max, d) => Math.max(max, parseInt(d.senha, 10) || 0), 0);
    const maxGlobal = await fbMaxSenhaSacGlobal();
    proxima = Math.max(localMax, maxGlobal) + 1;
  }
  dadosSenhasSac.unshift({
    chamado: '', loja: '', senha: String(proxima),
    divergencia: '', status: '', responsavel: usuarioLogado || '', observacao: '', data: hoje
  });
  garantirIds(dadosSenhasSac);
  salvarSenhasSac();
  renderizarSenhasSac();
  toast('Senha adicionada', 'success');
}

function exportarSenhasSacCSV() {
  if (dadosSenhasSac.length === 0) { toast('Nenhum dado para exportar', 'error'); return; }
  let csv = 'CHAMADO;LOJA;SENHA;DIVERG\u00caNCIA;STATUS;RESPONS\u00c1VEL;OBSERVA\u00c7\u00c3O;DATA\n';
  dadosSenhasSac.forEach(d => {
    csv += [d.chamado, d.loja, d.senha, d.divergencia, d.status, d.responsavel, d.observacao, d.data].map(csvEscape).join(';') + '\n';
  });
  baixarArquivo(csv, 'Senhas_SAC_' + formatDate(new Date()) + '.csv', 'text/csv');
  toast('CSV exportado', 'success');
}

function gerarPdfSenhaSac() {
  document.body.classList.add('senha-printing');
  setTimeout(() => {
    const titleBkp = document.title;
    document.title = 'Senha SAC ' + cdAtual + ' - ' + MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
    window.print();
    document.title = titleBkp;
    setTimeout(() => document.body.classList.remove('senha-printing'), 500);
  }, 300);
}
