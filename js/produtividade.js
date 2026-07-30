// ==================== PRODUTIVIDADE ====================
let dadosProdutividade = {};
let _prodSaveTimer = null;

async function carregarProdutividade() {
  var fbOk = await fbCarregarProdutividade();
  if (!fbOk) {
    var dados = lsGetShared('SAC_PRODUTIVIDADE_dados') || [];
    dadosProdutividade = {};
    dados.forEach(function (d) { dadosProdutividade[d.mes] = { t1: d.t1 || 0, t2: d.t2 || 0, t3: d.t3 || 0 }; });
  }
  MESES.forEach(function (m) { if (!dadosProdutividade[m]) dadosProdutividade[m] = { t1: 0, t2: 0, t3: 0 }; });
}

function renderizarProdutividade() {
  document.getElementById('prodTitleCd').textContent = cdAtual;
  const hoje = new Date();
  document.getElementById('prodTitleMes').textContent = MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
  const tbody = document.getElementById('produtividadeBody');
  tbody.innerHTML = '';
  let total1 = 0, total2 = 0, total3 = 0;
  MESES.forEach(mes => {
    const d = dadosProdutividade[mes] || { t1: 0, t2: 0, t3: 0 };
    const t1 = d.t1 || 0, t2 = d.t2 || 0, t3 = d.t3 || 0;
    total1 += t1; total2 += t2; total3 += t3;
    const isEmpty = t1 === 0 && t2 === 0 && t3 === 0;
    const tr = document.createElement('tr');
    if (isEmpty) tr.className = 'empty-row';
    tr.innerHTML = '<td class="mes-col">' + mes + '</td>' +
      '<td><input type="text" inputmode="numeric" value="' + (t1 || '') + '" data-mes="' + mes + '" data-turno="t1" oninput="atualizarProdutividade(this)"></td>' +
      '<td><input type="text" inputmode="numeric" value="' + (t2 || '') + '" data-mes="' + mes + '" data-turno="t2" oninput="atualizarProdutividade(this)"></td>' +
      '<td><input type="text" inputmode="numeric" value="' + (t3 || '') + '" data-mes="' + mes + '" data-turno="t3" oninput="atualizarProdutividade(this)"></td>' +
      '<td class="total-col">' + (t1 + t2 + t3).toLocaleString('pt-BR') + '</td>';
    tbody.appendChild(tr);
  });
  document.getElementById('prodTotal1').textContent = total1.toLocaleString('pt-BR');
  document.getElementById('prodTotal2').textContent = total2.toLocaleString('pt-BR');
  document.getElementById('prodTotal3').textContent = total3.toLocaleString('pt-BR');
  document.getElementById('prodTotalGeral').textContent = (total1 + total2 + total3).toLocaleString('pt-BR');
  document.getElementById('prodSum1').textContent = total1.toLocaleString('pt-BR');
  document.getElementById('prodSum2').textContent = total2.toLocaleString('pt-BR');
  document.getElementById('prodSum3').textContent = total3.toLocaleString('pt-BR');
  document.getElementById('prodSumGeral').textContent = (total1 + total2 + total3).toLocaleString('pt-BR');
}

function atualizarProdutividade(inp) {
  const mes = inp.dataset.mes;
  const turno = inp.dataset.turno;
  if (!dadosProdutividade[mes]) dadosProdutividade[mes] = { t1: 0, t2: 0, t3: 0 };
  dadosProdutividade[mes][turno] = parseInt(inp.value) || 0;
  const d = dadosProdutividade[mes];
  const total = (d.t1 || 0) + (d.t2 || 0) + (d.t3 || 0);
  inp.closest('tr').querySelector('.total-col').textContent = total.toLocaleString('pt-BR');
  inp.closest('tr').classList.toggle('empty-row', total === 0);
  let total1 = 0, total2 = 0, total3 = 0;
  MESES.forEach(m => { const dd = dadosProdutividade[m] || { t1: 0, t2: 0, t3: 0 }; total1 += dd.t1 || 0; total2 += dd.t2 || 0; total3 += dd.t3 || 0; });
  document.getElementById('prodTotal1').textContent = total1.toLocaleString('pt-BR');
  document.getElementById('prodTotal2').textContent = total2.toLocaleString('pt-BR');
  document.getElementById('prodTotal3').textContent = total3.toLocaleString('pt-BR');
  document.getElementById('prodTotalGeral').textContent = (total1 + total2 + total3).toLocaleString('pt-BR');
  document.getElementById('prodSum1').textContent = total1.toLocaleString('pt-BR');
  document.getElementById('prodSum2').textContent = total2.toLocaleString('pt-BR');
  document.getElementById('prodSum3').textContent = total3.toLocaleString('pt-BR');
  document.getElementById('prodSumGeral').textContent = (total1 + total2 + total3).toLocaleString('pt-BR');
  clearTimeout(_prodSaveTimer);
  _prodSaveTimer = setTimeout(() => {
    const lsDados = [];
    Object.keys(dadosProdutividade).forEach(m => {
      const d = dadosProdutividade[m];
      lsDados.push({ mes: m, t1: d.t1 || 0, t2: d.t2 || 0, t3: d.t3 || 0 });
    });
    lsSetShared('SAC_PRODUTIVIDADE_dados', lsDados);
  }, 300);
}

async function salvarProdutividade() {
  var lsDados = [];
  MESES.forEach(function (mes) {
    if (dadosProdutividade[mes]) {
      var registro = { mes: mes, t1: dadosProdutividade[mes].t1 || 0, t2: dadosProdutividade[mes].t2 || 0, t3: dadosProdutividade[mes].t3 || 0 };
      lsDados.push(registro);
    }
  });
  lsSetShared('SAC_PRODUTIVIDADE_dados', lsDados);
  await fbSalvarProdutividade();
  toast('Produtividade salva!', 'success');
}

function gerarPdfProdutividade() {
  document.body.classList.add('prod-printing');
  setTimeout(() => {
    const titleBkp = document.title;
    document.title = 'Produtividade ' + cdAtual + ' - ' + MESES[hoje.getMonth()] + ' ' + hoje.getFullYear();
    window.print();
    document.title = titleBkp;
    setTimeout(() => document.body.classList.remove('prod-printing'), 500);
  }, 300);
}
