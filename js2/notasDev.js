// ==================== NOTAS DE DEVOLUÇÃO ====================
let dadosNotasDev = [];

var _fbTimerNotas = null;
var _pendentesNotasItem = {};

async function carregarNotasDev() {
  var fbOk = await fbCarregarColecao('notasDevolucao', dadosNotasDev);
  if (!fbOk) {
    dadosNotasDev = lsGetCd('NOTAS_DEV_dados') || [];
  }
  garantirIds(dadosNotasDev);
  if (fbDisponivel() && cdAtual) {
    if (_snapNotas) { try { _snapNotas(); } catch (e) {} }
    _snapNotas = fbOnSnapshotColecao('notasDevolucao', dadosNotasDev);
  }
}

function flushNotasDevItens() {
  var pendentes = _pendentesNotasItem;
  _pendentesNotasItem = {};
  for (var id in pendentes) {
    fbSalvarItemColecao('notasDevolucao', pendentes[id]);
  }
}

function salvarNotasDevItem(item) {
  if (!item) return;
  if (!item.id) item.id = gerarId();
  lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
  if (!fbDisponivel() || !cdAtual) return;
  _pendentesNotasItem[item.id] = item;
  clearTimeout(_fbTimerNotas);
  _fbTimerNotas = setTimeout(flushNotasDevItens, 300);
}

function salvarNotasDev() {
  (dadosNotasDev || []).forEach(function (item) {
    if (!item) return;
    if (!item.id) item.id = gerarId();
    if (fbDisponivel() && cdAtual) _pendentesNotasItem[item.id] = item;
  });
  lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
  clearTimeout(_fbTimerNotas);
  flushNotasDevItens();
  toast('Notas salvas', 'success');
}

function renderizarNotasDevolucao() {
  document.getElementById('notasDevTitleCd').textContent = cdAtual;
  const hoje = new Date();
  document.getElementById('notasDevTitleMes').textContent = MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
  document.getElementById('notasDevUserName').textContent = usuarioLogado;
  document.getElementById('notasDevUserCd').textContent = cdAtual;
  const tbody = document.querySelector('#tabelaNotasDev tbody');
  tbody.innerHTML = '';
  const filtrados = dadosNotasDev
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => extrairMesDeData(d.data) === mesAtualNotasDev && extrairAnoDeData(d.data) === anoAtual);
  if (filtrados.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.style.textAlign = 'center';
    td.style.padding = '32px';
    td.style.color = 'var(--text-dim)';
    td.style.fontSize = '13px';
    td.textContent = 'Nenhuma nota de devolu\u00e7\u00e3o neste m\u00eas. Clique em "+ Nota" para come\u00e7ar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  filtrados.forEach(({ d, i }) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = i;

    tr.appendChild(criarCelInputNotaDev('text', d.chamado, i, 'chamado'));
    tr.appendChild(criarCelSelectLoja(d.loja || '', (val) => {
      dadosNotasDev[i].loja = val;
      salvarNotasDevItem(dadosNotasDev[i]);
    }));
    tr.appendChild(criarCelInputNotaDev('text', d.plu, i, 'plu'));
    tr.appendChild(criarCelInputNotaDev('date', d.data, i, 'data'));
    tr.appendChild(criarCelInputNotaDevNota(i, d.nota));
    tr.appendChild(criarCelSelectUsuarioDev(d.usuario, i));
    tr.appendChild(criarCelStatusNF(d.statusNf, d.nota, i));
    tr.appendChild(criarCelInputNotaDev('text', d.observacao, i, 'observacao'));

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'row-actions';
    const btnDel = document.createElement('button');
    btnDel.className = 'icon-btn delete';
    btnDel.textContent = '\uD83D\uDDD1';
    btnDel.title = 'Excluir';
    btnDel.onclick = function () {
      if (!confirm('Excluir esta nota?')) return;
      var item = dadosNotasDev[i];
      var itemId = item && (item.id || item.firestoreId);
      if (itemId) {
        marcarItemColecaoExcluido(itemId);
        delete _pendentesNotasItem[itemId];
      }
      fbExcluirItemColecao('notasDevolucao', item);
      dadosNotasDev.splice(i, 1);
      lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
      renderizarNotasDevolucao();
      toast('Nota exclu\u00edda', 'success');
    };
    tdAcoes.appendChild(btnDel);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function criarCelInputNotaDev(type, value, idx, field) {
  const td = document.createElement('td');
  td.title = value || '';
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value || '';
  inp.placeholder = '-';
  inp.oninput = () => {
    if (type === 'text' && field !== 'nota') {
      const start = inp.selectionStart;
      inp.value = capitalizarPalavras(inp.value);
      if (start != null) inp.setSelectionRange(start, start);
    }
    dadosNotasDev[idx][field] = inp.value;
    td.title = inp.value;
    salvarNotasDevItem(dadosNotasDev[idx]);
  };
  td.appendChild(inp);
  return td;
}

function criarCelInputNotaDevNota(idx, value) {
  const td = document.createElement('td');
  td.title = value || '';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = value || '';
  inp.placeholder = '-';
  inp.oninput = () => {
    dadosNotasDev[idx].nota = inp.value;
    td.title = inp.value;
    if (inp.value.trim()) {
      dadosNotasDev[idx].statusNf = 'Emitida';
    } else {
      dadosNotasDev[idx].statusNf = 'Aguardando';
    }
    const tr = inp.closest('tr');
    if (tr) {
      const statusTds = tr.querySelectorAll('td');
      for (const cell of statusTds) {
        if (cell.textContent === 'Aguardando' || cell.textContent === 'Emitida') {
          if (dadosNotasDev[idx].statusNf === 'Emitida') {
            cell.style.background = '#dcfce7';
            cell.textContent = 'Emitida';
          } else {
            cell.style.background = '#fef9c3';
            cell.textContent = 'Aguardando';
          }
          break;
        }
      }
    }
    salvarNotasDevItem(dadosNotasDev[idx]);
  };
  td.appendChild(inp);
  return td;
}

function criarCelSelectUsuarioDev(value, idx) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  usuarios.forEach(nome => {
    const opt = document.createElement('option');
    opt.value = nome;
    opt.textContent = nome;
    if (nome === value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    dadosNotasDev[idx].usuario = sel.value;
    td.title = sel.value;
    salvarNotasDevItem(dadosNotasDev[idx]);
  };
  td.appendChild(sel);
  return td;
}

function criarCelStatusNF(status, nota, idx) {
  const td = document.createElement('td');
  if (!status || status === 'Aguardando') {
    td.style.background = '#fef9c3';
    td.style.fontWeight = '600';
    td.textContent = 'Aguardando';
  } else {
    td.style.background = '#dcfce7';
    td.style.fontWeight = '600';
    td.textContent = 'Emitida';
  }
  return td;
}

function adicionarNotaDevolucao() {
  const hoje = new Date().toISOString().split('T')[0];
  dadosNotasDev.push({
    chamado: '', loja: '', plu: '', data: hoje,
    nota: '', usuario: '', statusNf: 'Aguardando', observacao: ''
  });
  garantirIds(dadosNotasDev);
  salvarNotasDevItem(dadosNotasDev[dadosNotasDev.length - 1]);
  renderizarNotasDevolucao();
  toast('Nota adicionada', 'success');
}

function exportarNotasDevCSV() {
  if (dadosNotasDev.length === 0) { toast('Nenhum dado para exportar', 'error'); return; }
  let csv = 'CHAMADO;LOJA;PLU;DATA;NOTA;USU\u00c1RIO;STATUS NF;OBSERVA\u00c7\u00c3O\n';
  dadosNotasDev.forEach(d => {
    csv += [d.chamado, d.loja, d.plu, d.data, d.nota, d.usuario, d.statusNf, d.observacao].map(csvEscape).join(';') + '\n';
  });
  baixarArquivo(csv, 'Notas_Devolucao_' + formatDate(new Date()) + '.csv', 'text/csv');
  toast('CSV exportado', 'success');
}
