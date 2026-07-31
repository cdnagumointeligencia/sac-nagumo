// ==================== PRODUTIVIDADE ====================
let dadosProdutividade = [];

var _fbTimerProd = null;
var _pendentesProdItem = {};

async function carregarProdutividade() {
  var fbOk = await fbCarregarColecao('produtividade', dadosProdutividade);
  if (!fbOk) {
    dadosProdutividade = (lsGetCd('PRODUTIVIDADE_dados') || []).slice();
  }
  dadosProdutividade = (dadosProdutividade || []).filter(function (r) {
    return r && Number(r.mes) >= 1 && Number(r.mes) <= 12;
  });
  garantirIds(dadosProdutividade);
  if (fbDisponivel() && cdAtual) {
    if (_snapProd) { try { _snapProd(); } catch (e) {} }
    _snapProd = fbOnSnapshotColecao('produtividade', dadosProdutividade);
  }
}

function flushProdutividadeItens() {
  var pendentes = _pendentesProdItem;
  _pendentesProdItem = {};
  for (var id in pendentes) {
    fbSalvarItemColecao('produtividade', pendentes[id]);
  }
}

function salvarProdutividadeItem(item) {
  if (!item) return;
  if (!item.id) item.id = gerarId();
  lsSetCd('PRODUTIVIDADE_dados', dadosProdutividade);
  if (!fbDisponivel() || !cdAtual) return;
  _pendentesProdItem[item.id] = item;
  clearTimeout(_fbTimerProd);
  _fbTimerProd = setTimeout(flushProdutividadeItens, 300);
}

function salvarProdutividade() {
  (dadosProdutividade || []).forEach(function (item) {
    if (!item || !item.mes) return;
    if (!(item.turno1 || item.turno2 || item.turno3)) return;
    if (!item.id) item.id = gerarId();
    if (fbDisponivel() && cdAtual) _pendentesProdItem[item.id] = item;
  });
  lsSetCd('PRODUTIVIDADE_dados', dadosProdutividade);
  flushProdutividadeItens();
  toast('Produtividade salva', 'success');
}

function garantirMesesProdutividade() {
  for (var m = 1; m <= 12; m++) {
    var existe = (dadosProdutividade || []).some(function (r) {
      return r && Number(r.mes) === m;
    });
    if (!existe) {
      dadosProdutividade.push({
        mes: m,
        turno1: '', turno2: '', turno3: '', total: '',
        data: String(anoAtual) + '-' + (m < 10 ? '0' + m : String(m)) + '-01'
      });
    }
  }
  garantirIds(dadosProdutividade);
}

function totalProdutividade(item) {
  if (!item) return 0;
  return (Number(item.turno1) || 0) + (Number(item.turno2) || 0) + (Number(item.turno3) || 0);
}

function atualizarTotaisProdutividade() {
  var soma1 = 0, soma2 = 0, soma3 = 0;
  for (var m = 1; m <= 12; m++) {
    var item = melhorRegistroProdutividade(m);
    if (!item) continue;
    soma1 += Number(item.turno1) || 0;
    soma2 += Number(item.turno2) || 0;
    soma3 += Number(item.turno3) || 0;
  }
  var geral = soma1 + soma2 + soma3;
  var set = function (id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set('prodTotal1', soma1);
  set('prodTotal2', soma2);
  set('prodTotal3', soma3);
  set('prodTotalGeral', geral);
  set('prodSum1', soma1);
  set('prodSum2', soma2);
  set('prodSum3', soma3);
  set('prodSumGeral', geral);
}

function criarCelTurnoProdutividade(item, campo) {
  const td = document.createElement('td');
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.inputMode = 'numeric';
  inp.dataset.noCapitalize = '1';
  inp.value = item[campo] || '';
  inp.placeholder = '0';
  inp.addEventListener('input', function () {
    const v = inp.value.replace(/\D/g, '');
    if (inp.value !== v) inp.value = v;
    if (!item) return;
    item[campo] = v;
    item.total = totalProdutividade(item) ? String(totalProdutividade(item)) : '';
    salvarProdutividadeItem(item);
    const tr = inp.closest('tr');
    if (tr) {
      tr.classList.toggle('empty-row', !(item.turno1 || item.turno2 || item.turno3));
      const totalEl = tr.querySelector('.total-col');
      if (totalEl) totalEl.textContent = item.total;
    }
    atualizarTotaisProdutividade();
  });
  td.appendChild(inp);
  return td;
}

function melhorRegistroProdutividade(mes) {
  var melhor = null;
  (dadosProdutividade || []).forEach(function (r) {
    if (!r || Number(r.mes) !== mes) return;
    if (!melhor) { melhor = r; return; }
    var campos = function (x) { return ((x.turno1 ? 1 : 0) + (x.turno2 ? 1 : 0) + (x.turno3 ? 1 : 0)); };
    var maisCampos = campos(r) > campos(melhor);
    var mesmosCampos = campos(r) === campos(melhor) && totalProdutividade(r) > totalProdutividade(melhor);
    if (maisCampos || mesmosCampos) melhor = r;
  });
  return melhor;
}

function renderizarProdutividade() {
  const elCd = document.getElementById('prodTitleCd');
  if (elCd) elCd.textContent = cdAtual;
  const elMes = document.getElementById('prodTitleMes');
  if (elMes) elMes.textContent = String(anoAtual);

  garantirMesesProdutividade();

  const tbody = document.getElementById('produtividadeBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  for (var m = 1; m <= 12; m++) {
    const item = melhorRegistroProdutividade(m);
    if (!item) continue;
    const vazio = !(item.turno1 || item.turno2 || item.turno3);
    item.total = totalProdutividade(item) ? String(totalProdutividade(item)) : '';

    const tr = document.createElement('tr');
    if (vazio) tr.className = 'empty-row';

    const tdMes = document.createElement('td');
    tdMes.className = 'mes-col';
    tdMes.textContent = MESES[m - 1] || String(m);
    tr.appendChild(tdMes);

    tr.appendChild(criarCelTurnoProdutividade(item, 'turno1'));
    tr.appendChild(criarCelTurnoProdutividade(item, 'turno2'));
    tr.appendChild(criarCelTurnoProdutividade(item, 'turno3'));

    const tdTotal = document.createElement('td');
    tdTotal.className = 'total-col';
    tdTotal.textContent = item.total;
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  }

  atualizarTotaisProdutividade();
}

function gerarPdfProdutividade() {
  document.body.classList.add('prod-printing');
  setTimeout(function () {
    const titleBkp = document.title;
    document.title = 'Produtividade ' + cdAtual + ' - ' + anoAtual;
    window.print();
    document.title = titleBkp;
    setTimeout(function () { document.body.classList.remove('prod-printing'); }, 500);
  }, 300);
}
