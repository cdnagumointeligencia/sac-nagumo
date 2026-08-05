// ==================== PRODUTIVIDADE ====================
let dadosProdutividade = [];

var _fbTimerProd = null;

async function carregarProdutividade() {
  var fbOk = await fbCarregarColecao('produtividade', dadosProdutividade);
  if (!fbOk) {
    dadosProdutividade = lsGetCd('PRODUTIVIDADE_dados_' + anoAtual) || [];
  }
  garantirIds(dadosProdutividade);
  if (fbDisponivel() && cdAtual) {
    if (_snapProd) { try { _snapProd(); } catch (e) {} }
    _snapProd = fbOnSnapshotColecao('produtividade', dadosProdutividade);
  }
}

async function salvarProdutividade() {
  lsSetCd('PRODUTIVIDADE_dados_' + anoAtual, dadosProdutividade);
  clearTimeout(_fbTimerProd);
  _fbTimerProd = setTimeout(function () { fbSalvarColecao('produtividade', dadosProdutividade); }, 500);
}

function getDataSelecionada() {
  const headerEl = document.getElementById('produtividadeHeader');
  if (!headerEl) return null;
  const ds = headerEl.dataset;
  return ds.dataAtual || null;
}

function getSemanaSelecionada() {
  const headerEl = document.getElementById('produtividadeHeader');
  if (!headerEl) return null;
  const ds = headerEl.dataset;
  return ds.semanaAtual || null;
}

function renderizarProdutividade() {
  const dataAtual = getDataSelecionada();
  const semanaAtual = getSemanaSelecionada();
  if (!dataAtual || !semanaAtual) return;

  const dadosSemana = (dadosProdutividade || []).filter(d => d.semana === semanaAtual);
  const usuariosSemana = usuarios.filter(u => u !== 'Administrador');
  const diasSemana = GERAR_DIAS_SEMANA(dataAtual);

  const table = document.getElementById('produtividadeTable');
  if (!table) return;
  const thead = table.querySelector('thead tr');
  const tbody = table.querySelector('tbody');

  thead.innerHTML = '<th class="th-user">USU\u00c1RIO</th>' +
    diasSemana.map(function (d, i) {
      const isHoje = d.data === new Date().toISOString().slice(0, 10);
      const isSabado = i === 5;
      const style = isHoje ? 'class="th-hoje"' : (isSabado ? 'class="th-sabado"' : '');
      return '<th ' + style + '>' + d.dia + '<br><small>' + d.data.split('-').reverse().slice(0, 2).join('/') + '</small></th>';
    }).join('') +
    '<th class="th-total">TOTAL</th>' +
    '<th class="th-acoes"></th>';

  tbody.innerHTML = '';
  usuariosSemana.forEach(function (user) {
    const tr = document.createElement('tr');
    tr.dataset.user = user;
    const tdUser = document.createElement('td');
    tdUser.className = 'td-user';
    tdUser.textContent = user;
    tr.appendChild(tdUser);

    let totalDias = 0;
    diasSemana.forEach(function (dia) {
      const td = document.createElement('td');
      td.className = 'td-prod';
      td.dataset.user = user;
      td.dataset.data = dia.data;
      td.dataset.semana = semanaAtual;

      const registro = dadosSemana.find(function (r) {
        return r.usuario === user && r.data === dia.data;
      });
      const valor = registro ? registro.valor : '';
      const cor = registro ? (registro.cor || '') : '';

      td.textContent = valor;
      td.style.background = cor || 'transparent';

      td.onclick = function () {
        abrirModalProdutividade(user, dia.data, semanaAtual, td);
      };

      if (dia.data === new Date().toISOString().slice(0, 10)) td.classList.add('hoje');
      if (dia.dia === 'S\u00e1b') td.style.background = '#f8f9fa';

      tr.appendChild(td);
      if (valor) totalDias += Number(valor) || 0;
    });

    const tdTotal = document.createElement('td');
    tdTotal.className = 'td-total';
    tdTotal.textContent = totalDias || '';
    tr.appendChild(tdTotal);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'td-acoes';
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function atualizarProdutividadeNaTabela(user, data, semana, valor, cor) {
  const td = document.querySelector('#produtividadeTable tbody tr[data-user="' + user + '"] td[data-data="' + data + '"]');
  if (td) {
    td.textContent = valor;
    td.style.background = cor || 'transparent';
  }
  // Recalcula totais da linha
  const tr = document.querySelector('#produtividadeTable tbody tr[data-user="' + user + '"]');
  if (tr) {
    const tds = tr.querySelectorAll('.td-prod');
    let total = 0;
    tds.forEach(function (td) {
      var v = Number(td.textContent) || 0;
      total += v;
    });
    var tdTotal = tr.querySelector('.td-total');
    if (tdTotal) tdTotal.textContent = total || '';
  }
}

function abrirModalProdutividade(user, data, semana, tdEl) {
  const registro = (dadosProdutividade || []).find(function (r) {
    return r.usuario === user && r.data === data;
  });
  const valorAtual = registro ? registro.valor : '';
  const corAtual = registro ? (registro.cor || '') : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function () { overlay.remove(); };

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.onclick = function (e) { e.stopPropagation(); };
  modal.innerHTML =
    '<h3 style="margin-bottom:20px">' + escapeHtml(user) + ' \u00b7 ' + formatDateBR(data) + '</h3>' +
    '<div class="prod-modal-body">' +
      '<div class="prod-modal-setors">' +
        '<div class="prod-cor-btn" data-cor="#4CAF50" style="background:#4CAF50">P\u00e1tio</div>' +
        '<div class="prod-cor-btn" data-cor="#2196F3" style="background:#2196F3">Docas</div>' +
        '<div class="prod-cor-btn" data-cor="#FF9800" style="background:#FF9800">Expedi\u00e7\u00e3o</div>' +
        '<div class="prod-cor-btn" data-cor="#9C27B0" style="background:#9C27B0">Confer\u00eancia</div>' +
        '<div class="prod-cor-btn" data-cor="#607D8B" style="background:#607D8B">Admin</div>' +
        '<div class="prod-cor-btn" data-cor="#795548" style="background:#795548">Opera\u00e7\u00e3o</div>' +
        '<div class="prod-cor-btn" data-cor="#E91E63" style="background:#E91E63">Manuten\u00e7\u00e3o</div>' +
        '<div class="prod-cor-btn" data-cor="#00BCD4" style="background:#00BCD4">Qualidade</div>' +
        '<div class="prod-cor-btn" data-cor="#FF5722" style="background:#FF5722">Seguran\u00e7a</div>' +
        '<div class="prod-cor-btn" data-cor="#8BC34A" style="background:#8BC34A">Limpeza</div>' +
      '</div>' +
      '<div class="prod-modal-inputs">' +
        '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600">Valor num\u00e9rico' +
          '<input type="number" id="prodModalValor" class="input-padrao" min="0" step="1" value="' + escapeAttr(valorAtual) + '" placeholder="0">' +
        '</label>' +
        '<div class="prod-modal-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn-padrao btn-secondary" id="prodModalLimpar">Limpar</button>' +
          '<button class="btn-padrao" id="prodModalSalvar">Salvar</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let corSelecionada = corAtual;

  overlay.querySelectorAll('.prod-cor-btn').forEach(function (btn) {
    if (btn.dataset.cor === corSelecionada) btn.classList.add('selected');
    btn.onclick = function () {
      overlay.querySelectorAll('.prod-cor-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      corSelecionada = btn.dataset.cor;
    };
  });

  if (!corSelecionada) {
    const primeiro = overlay.querySelector('.prod-cor-btn');
    if (primeiro) { primeiro.classList.add('selected'); corSelecionada = primeiro.dataset.cor; }
  }

  modal.querySelector('#prodModalLimpar').onclick = function () {
    dadosProdutividade = (dadosProdutividade || []).filter(function (r) {
      return !(r.usuario === user && r.data === data);
    });
    salvarProdutividade();
    atualizarProdutividadeNaTabela(user, data, semana, '', '');
    overlay.remove();
    toast('Valor removido', 'info');
  };

  modal.querySelector('#prodModalSalvar').onclick = function () {
    const valorInput = modal.querySelector('#prodModalValor');
    const val = valorInput.value.trim();
    if (!val) { toast('Informe um valor', 'error'); return; }

    var idx = dadosProdutividade.findIndex(function (r) {
      return r.usuario === user && r.data === data;
    });
    if (idx >= 0) {
      dadosProdutividade[idx].valor = val;
      dadosProdutividade[idx].cor = corSelecionada;
    } else {
      dadosProdutividade.push({
        usuario: user, data: data, semana: semana, valor: val, cor: corSelecionada
      });
    }
    garantirIds(dadosProdutividade);
    salvarProdutividade();
    atualizarProdutividadeNaTabela(user, data, semana, val, corSelecionada);
    overlay.remove();
    toast('Salvo', 'success');
  };
}
