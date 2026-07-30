// ==================== DASHBOARD DE ERROS ====================
function contarSetores(regs, listaSetores) {
  const contagem = {};
  listaSetores.forEach(s => { contagem[s] = 0; });
  regs.forEach(r => {
    const setor = r.setor || '';
    if (contagem[setor] !== undefined) {
      contagem[setor]++;
    }
  });
  return { contagem };
}

function topSetorLabel(contagem, setores) {
  const ordenado = setores.filter(s => (contagem[s] || 0) > 0).sort((a, b) => contagem[b] - contagem[a]);
  if (ordenado.length === 0) return 'sem ocorrências';
  return ordenado.slice(0, 2).join(' / ');
}

function renderizarSetoresPorCD(setores, contagem, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  setores.forEach(setor => {
    const total = contagem[setor] || 0;
    const card = document.createElement('div');
    card.className = 'dash-setor-card';
    card.innerHTML =
      '<div class="dash-setor-head">' + escapeHtml(setor) + '</div>' +
      '<div class="dash-setor-body">' +
        '<div class="dash-setor-val">' + total + '</div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function renderizarDivergencias(registros) {
  const grid = document.getElementById('dashDivGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const divergencias = getDivergencias().filter(Boolean);
  const setoresErro = cdAtual === 'CD1'
    ? SETORES_CD1.filter(Boolean).filter(s => s !== 'Indevido')
    : SETORES_CD2.filter(Boolean).filter(s => s !== 'Indevido' && s !== 'Loja Piloto');

  const contagem = {};
  const porSetor = {};
  divergencias.forEach(d => { contagem[d] = 0; porSetor[d] = {}; setoresErro.forEach(s => porSetor[d][s] = 0); });

  registros.forEach(r => {
    const div = r.divergencia || '';
    const setor = r.setor || '';
    if (contagem[div] !== undefined) contagem[div]++;
    if (porSetor[div] && porSetor[div][setor] !== undefined) porSetor[div][setor]++;
  });

  const total = registros.length || 1;
  divergencias.forEach(d => {
    const qtd = contagem[d] || 0;
    const pct = Math.round((qtd / total) * 100);
    const setoresLine = setoresErro.map(s => {
      const v = porSetor[d][s] || 0;
      return '<span class="dash-div-setor"><b>' + v + '</b> ' + escapeHtml(s) + '</span>';
    }).join('');
    const card = document.createElement('div');
    card.className = 'dash-div-card';
    card.innerHTML =
      '<div class="dash-div-head">' + escapeHtml(d) + '</div>' +
      '<div class="dash-div-body">' +
        '<div class="dash-div-val">' + qtd + '</div>' +
        '<div class="dash-div-pct">' + pct + '%</div>' +
      '</div>' +
      '<div class="dash-div-setores">' + setoresLine + '</div>';
    grid.appendChild(card);
  });
}

function renderizarBracos(registros) {
  const container = document.getElementById('dashBracosTabela');
  if (!container) return;
  const turnos = ['Manhã', 'Tarde', 'Noite'];
  const turnosLabel = ['1°T', '2°T', '3°T'];
  const bracos = {};
  registros.forEach(r => {
    if (!r.setor || r.setor === 'Indevido' || r.setor === 'Loja Piloto') return;
    const b = r.braco || '';
    if (!b) return;
    if (!bracos[b]) bracos[b] = { Manhã: 0, Tarde: 0, Noite: 0, total: 0 };
    const t = r.turno || '';
    if (bracos[b][t] !== undefined) bracos[b][t]++;
    bracos[b].total++;
  });
  const keys = Object.keys(bracos).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--dash-text-dimmer);font-size:11px">Nenhum erro por braço</div>';
    return;
  }
  let html = '<table><thead><tr><th>Braço</th>';
  turnosLabel.forEach(l => html += '<th>' + l + '</th>');
  html += '<th>Total</th></tr></thead><tbody>';
  keys.forEach(k => {
    const b = bracos[k];
    html += '<tr><td>' + escapeHtml(k) + '</td>';
    turnos.forEach(t => {
      html += '<td class="bco-val">' + (b[t] || 0) + '</td>';
    });
    html += '<td class="bco-total">' + b.total + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function atualizarDashboard() {
  document.getElementById('dashUserName').textContent = usuarioLogado;
  document.getElementById('dashUserCd').textContent = cdAtual;

  const mesFiltro = mesAtualDash;

  const registros = (dadosMes[mesFiltro] || []).slice();
  const setores = cdAtual === 'CD1' ? SETORES_CD1.filter(Boolean) : SETORES_CD2.filter(Boolean);
  const setoresErro = cdAtual === 'CD1' ? setores.filter(s => s !== 'Indevido') : setores.filter(s => s !== 'Indevido' && s !== 'Loja Piloto');

  const { contagem } = contarSetores(registros, setores);
  const erros = setoresErro.reduce((s, k) => s + (contagem[k] || 0), 0);
  const indevido = contagem['Indevido'] || 0;
  const totalChamados = registros.length;
  const taxa = totalChamados > 0 ? Math.round((erros / totalChamados) * 100) : 0;

  document.getElementById('dashKpiChamados').textContent = totalChamados;
  document.getElementById('dashKpiErros').textContent = erros;
  document.getElementById('dashKpiErrosSub').textContent = taxa + '% dos chamados';
  document.getElementById('dashKpiIndevido').textContent = indevido;

  document.getElementById('dashYearLabel').textContent = new Date().getFullYear();
  document.getElementById('dashCdLabel').textContent = cdAtual;
  document.getElementById('dashCdNameUnico').textContent = cdAtual;
  document.getElementById('dashCdTotalUnico').textContent = erros;
  document.getElementById('dashCdTopSetorUnico').textContent = topSetorLabel(contagem, setoresErro);

  renderizarSetoresPorCD(setoresErro, contagem, 'dashGridUnico');
  renderizarDivergencias(registros);
  renderizarBracos(registros);

  const headerEl = document.getElementById('dashCdHeaderUnico');
  headerEl.className = 'dash-cd-header ' + (cdAtual === 'CD1' ? 'cd1' : 'cd2');
  const split = document.getElementById('dashCdSplit');
  if (split) split.style.display = cdAtual === 'CD1' ? 'block' : 'grid';
  const bracosCol = document.getElementById('dashBracosCol');
  if (bracosCol) bracosCol.style.display = cdAtual === 'CD1' ? 'none' : '';
}

function copiarDashboardWhatsApp() {
  const label = document.getElementById('dashCdLabel').textContent;
  const totalChamados = document.getElementById('dashKpiChamados').textContent;
  const totalErros = document.getElementById('dashKpiErros').textContent;
  const subErros = document.getElementById('dashKpiErrosSub')?.textContent || '';
  const indevidos = document.getElementById('dashKpiIndevido').textContent;

  let texto = '🏢 *SAC — Dashboard de Erros*\n';
  texto += '📅 ' + label + '\n\n';
  texto += '📊 ' + totalChamados + ' chamados  |  ' + totalErros + ' erros (' + subErros + ')  |  ' + indevidos + ' indevidos\n\n';

  const setorCards = document.querySelectorAll('#dashGridUnico .dash-setor-card');
  if (setorCards.length) {
    texto += '📋 *Setores:*\n';
    setorCards.forEach(c => {
      const nome = c.querySelector('.dash-setor-head')?.textContent || '';
      const val = c.querySelector('.dash-setor-val')?.textContent || '0';
      texto += '   ' + nome + ': ' + val + '\n';
    });
    texto += '\n';
  }

  const divCards = document.querySelectorAll('#dashDivGrid .dash-div-card');
  if (divCards.length) {
    texto += '🔍 *Divergências:*\n';
    divCards.forEach(c => {
      const nome = c.querySelector('.dash-div-head')?.textContent || '';
      const qtd = c.querySelector('.dash-div-val')?.textContent || '0';
      const pct = c.querySelector('.dash-div-pct')?.textContent || '';
      texto += '   ' + nome + ': ' + qtd + ' (' + pct + ')\n';
    });
    texto += '\n';
  }

  const bracoLinhas = document.querySelectorAll('#dashBracosTabela tbody tr');
  if (bracoLinhas.length) {
    texto += '🔄 *Braços:*\n';
    bracoLinhas.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 4) {
        texto += '   ' + tds[0].textContent.trim() + ' → M: ' + tds[1].textContent.trim() + ' T: ' + tds[2].textContent.trim() + ' N: ' + tds[3].textContent.trim() + '\n';
      }
    });
    texto += '\n';
  }

  texto += '📎 _Copiado do SAC — ' + new Date().toLocaleString() + '_';

  navigator.clipboard.writeText(texto).then(() => {
    window.open('https://web.whatsapp.com', '_blank');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    window.open('https://web.whatsapp.com', '_blank');
  });
}

function gerarPdfDashboard() {
  const paginaAtualBackup = paginaAtual;
  if (paginaAtual !== 'dashboard') mudarPagina('dashboard');
  setTimeout(() => {
    const titleBkp = document.title;
    document.title = 'Dashboard ' + cdAtual + ' - ' + mesAtualDash + ' ' + new Date().getFullYear();
    window.print();
    document.title = titleBkp;
    if (paginaAtualBackup !== 'dashboard') {
      setTimeout(() => mudarPagina(paginaAtualBackup), 500);
    }
  }, 300);
}
