// ==================== UTILITÁRIOS ====================
var usuarioLogado = null;
function capitalizarPalavras(str) {
  if (!str) return str;
  return String(str).replace(/(^\s*\w|\s+\w)/g, m => m.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function csvEscape(val) {
  const s = String(val || '');
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// SHA-256 puro em JS — fallback para file:// onde crypto.subtle indisponível
function _sha256Fallback(message) {
  function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = new TextEncoder().encode(message);
  const len = bytes.length;
  const bitLen = len * 8;
  const padLen = (56 - (len + 1) % 64 + 64) % 64 + 1;
  const padded = new Uint8Array(len + padLen + 8);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  for (let i = 0; i < padded.length; i += 64) {
    const W = new Array(64);
    for (let j = 0; j < 16; j++) W[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rr(W[j-15],7) ^ rr(W[j-15],18) ^ (W[j-15]>>>3);
      const s1 = rr(W[j-2],17) ^ rr(W[j-2],19) ^ (W[j-2]>>>10);
      W[j] = (W[j-16] + s0 + W[j-7] + s1) | 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let j = 0; j < 64; j++) {
      const S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
      const ch = (e&f) ^ (~e&g);
      const t1 = (h + S1 + ch + K[j] + W[j]) | 0;
      const S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
      const maj = (a&b) ^ (a&c) ^ (b&c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    H = [(H[0]+a)|0,(H[1]+b)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(v => (v>>>0).toString(16).padStart(8,'0')).join('');
}

async function hashSenha(senha) {
  const enc = new TextEncoder().encode(String(senha));
  if (window.crypto && window.crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* fallback para JS puro abaixo */ }
  }
  return _sha256Fallback(String(senha));
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function baixarArquivo(conteudo, nome, tipo) {
  const blob = new Blob([conteudo], { type: tipo + ';charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function abrirModal(id) { document.getElementById(id).classList.add('show'); }
function fecharModal(id) { document.getElementById(id).classList.remove('show'); }

function toast(msg, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast show ' + tipo;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, 2500);
  setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

function diasUteis(dataIni, dataFim) {
  const d1 = new Date(dataIni);
  const d2 = new Date(dataFim);
  if (d2 < d1) return 0;
  let dias = 0;
  const atual = new Date(d1);
  while (atual <= d2) {
    if (atual.getDay() !== 0) dias++;
    atual.setDate(atual.getDate() + 1);
  }
  return dias;
}

let anoAtual = new Date().getFullYear();
var _temFocoInput = false;
var _renderPendente = null;

function registrarFocoInput() {
  document.addEventListener('focusin', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      _temFocoInput = true;
    }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      _temFocoInput = false;
      if (_renderPendente) {
        var fn = _renderPendente;
        _renderPendente = null;
        fn();
      }
    }
  });
}
registrarFocoInput();

function agendarRenderSePossivel(fnRender) {
  if (_temFocoInput) {
    _renderPendente = fnRender;
    return false;
  }
  fnRender();
  return true;
}

function extrairMesDeData(dataStr) {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length < 2) return '';
  const mesIdx = parseInt(parts[1], 10) - 1;
  return MESES[mesIdx] || '';
}

function extrairAnoDeData(dataStr) {
  if (!dataStr) return new Date().getFullYear();
  const parts = dataStr.split('-');
  return parseInt(parts[0], 10) || new Date().getFullYear();
}

function obterMesAtual() {
  return MESES[new Date().getMonth()];
}

function chaveMesAno(mes, ano) {
  return mes + '/' + (ano || anoAtual);
}

function parseChaveMesAno(chave) {
  if (!chave || !chave.includes('/')) return { mes: chave, ano: anoAtual };
  const p = chave.split('/');
  return { mes: p[0], ano: parseInt(p[1], 10) || anoAtual };
}

// ==================== CELULAS COMPARTILHADAS ====================
function criarCelSelectLoja(value, onChange) {
  const td = document.createElement('td');
  td.title = value || '';
  const sel = document.createElement('select');
  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Selecione...';
  sel.appendChild(optVazio);
  lojasMercadorias.forEach(loja => {
    const opt = document.createElement('option');
    opt.value = loja;
    opt.textContent = loja.replace(/^0(\d{2}-)/, '$1');
    if (loja === value) opt.selected = true;
    sel.appendChild(opt);
  });
  try { sel.value = value; } catch (e) {}
  sel.onchange = () => {
    td.title = sel.value;
    onChange(sel.value);
  };
  td.appendChild(sel);
  return td;
}

// ==================== SESSÃO ====================
var _sessaoMem = null;

function _ssSet(chave, valor) {
  try { sessionStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { _sessaoMem = valor; }
}

function _ssGet(chave) {
  try { return JSON.parse(sessionStorage.getItem(chave)); } catch { return _sessaoMem; }
  return null;
}

function _ssRemove(chave) {
  try { sessionStorage.removeItem(chave); } catch { _sessaoMem = null; }
}

// ==================== SESSÃO PERSISTENTE ====================
function verificarSessao() {
  let raw = null;
  try { raw = localStorage.getItem('SAC_sessao'); } catch (e) {}
  if (!raw) return null;
  try {
    const sessao = JSON.parse(raw);
    const agora = new Date();
    const expira = new Date(sessao.expiraEm);
    if (agora > expira) {
      try { localStorage.removeItem('SAC_sessao'); } catch (e) {}
      return null;
    }
    return { nome: sessao.nome, cd: sessao.cd || 'CD1' };
  } catch {
    try { localStorage.removeItem('SAC_sessao'); } catch (e) {}
    return null;
  }
}

function logout() {
  try { sessionStorage.removeItem('sac_usuario_logado'); } catch (e) {}
  try { sessionStorage.removeItem('sac_cd_atual'); } catch (e) {}
  try { localStorage.removeItem('SAC_sessao'); } catch (e) {}
  usuarioLogado = null;
  window.location.href = 'index.html';
}

// ==================== ABAS MENSIS ====================
function montarAbas() {
  const container = document.getElementById('tabsMes');
  container.innerHTML = '';
  const labelAno = document.createElement('span');
  labelAno.className = 'ano-label';
  labelAno.textContent = anoAtual;
  container.appendChild(labelAno);
  const btnAnoAnt = document.createElement('button');
  btnAnoAnt.className = 'ano-nav';
  btnAnoAnt.textContent = '\u25C0';
  btnAnoAnt.title = 'Ano anterior';
  btnAnoAnt.onclick = function (e) { e.stopPropagation(); alterarAno(-1); };
  container.appendChild(btnAnoAnt);
  const btnAnoProx = document.createElement('button');
  btnAnoProx.className = 'ano-nav';
  btnAnoProx.textContent = '\u25B6';
  btnAnoProx.title = 'Pr\u00f3ximo ano';
  btnAnoProx.onclick = function (e) { e.stopPropagation(); alterarAno(1); };
  container.appendChild(btnAnoProx);
  MESES.forEach(function (mes) {
    const btn = document.createElement('button');
    btn.textContent = mes.slice(0, 3);
    btn.onclick = function () { selecionarMes(mes); };
    if (mes === mesAtual) btn.classList.add('active');
    container.appendChild(btn);
  });
}

async function selecionarMes(mes) {
  mesAtual = mes;
  document.querySelectorAll('#tabsMes button').forEach(b => {
    b.classList.toggle('active', b.textContent === mes.slice(0, 3));
  });
  if (!dadosMes[mesAtual]) {
    dadosMes[mesAtual] = [];
    await salvarDadosMes();
  }
  renderizarTabela();
  atualizarTotais();
  limparFiltros();
}

function montarAbasGenerico(containerId, mesAtualVar, funcaoSelecionar) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const labelAno = document.createElement('span');
  labelAno.className = 'ano-label';
  labelAno.textContent = anoAtual;
  container.appendChild(labelAno);
  const btnAnoAnt = document.createElement('button');
  btnAnoAnt.className = 'ano-nav';
  btnAnoAnt.textContent = '\u25C0';
  btnAnoAnt.title = 'Ano anterior';
  btnAnoAnt.onclick = function (e) { e.stopPropagation(); alterarAno(-1); };
  container.appendChild(btnAnoAnt);
  const btnAnoProx = document.createElement('button');
  btnAnoProx.className = 'ano-nav';
  btnAnoProx.textContent = '\u25B6';
  btnAnoProx.title = 'Pr\u00f3ximo ano';
  btnAnoProx.onclick = function (e) { e.stopPropagation(); alterarAno(1); };
  container.appendChild(btnAnoProx);
  MESES.forEach(function (mes) {
    const btn = document.createElement('button');
    btn.textContent = mes.slice(0, 3);
    btn.onclick = function () { funcaoSelecionar(mes); };
    if (mes === mesAtualVar) btn.classList.add('active');
    container.appendChild(btn);
  });
}

function alterarAno(delta) {
  anoAtual += delta;
  document.querySelectorAll('.ano-label').forEach(function (el) { el.textContent = anoAtual; });
  var page = document.querySelector('.page.active');
  if (page) {
    if (page.id === 'pageSenhaSac') { montarAbasGenerico('tabsMesSenhasSac', mesAtualSenhasSac, selecionarMesSenhasSac); renderizarSenhasSac(); }
    else if (page.id === 'pageNotasDevolucao') { montarAbasGenerico('tabsMesNotasDev', mesAtualNotasDev, selecionarMesNotasDev); renderizarNotasDevolucao(); }
    else if (page.id === 'pageMercadoriasNF') { montarAbasGenerico('tabsMesMercadoriasNF', mesAtualMercadoriasNF, selecionarMesMercadoriasNF); renderizarMercadoriasNF(); }
    else if (page.id === 'pageDashboard') { montarAbasGenerico('tabsMesDash', mesAtualDash, selecionarMesDash); atualizarDashboard(); }
    else if (page.id === 'pageChamados') { montarAbas(); renderizarTabela(); atualizarTotais(); }
  }
}

// ==================== CARREGAMENTO ====================
async function carregarUsuarios() {
  // Firestore primeiro, fallback localStorage
  var fbOk = await fbCarregarUsuarios();
  if (!fbOk) {
    var salvos = lsGetShared('SAC_USUARIOS') || [];
    if (salvos.length === 0) {
      for (var oldCd of ['SAC_CD1', 'SAC_CD2']) {
        try {
          var old = JSON.parse(localStorage.getItem('SAC_' + oldCd + '_usuarios'));
          if (old && old.length > 0) { salvos = old; break; }
        } catch {}
      }
    }
    if (salvos.length === 0) salvos = lsGet('usuarios') || [];

    if (salvos.length > 0) {
      var migracao = false;
      for (var u of salvos) {
        if (u.senhaHash) continue;
        if (u.senha) {
          u.senhaHash = await hashSenha(u.senha);
        } else {
          u.senhaHash = await hashSenha(SENHA_PADRAO);
        }
        delete u.senha;
        migracao = true;
      }
      todosUsuarios = salvos;
      usuarios = salvos.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
      if (migracao || fbDisponivel()) await salvarTodosUsuarios();
    } else {
      await hashSenha(SENHA_PADRAO);
      todosUsuarios = [];
      await salvarTodosUsuarios();
    }
  } else {
    usuarios = todosUsuarios.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
  }

  if (!todosUsuarios.some(function (u) { return u.nome === ADMIN_USER; })) {
    var adminHash = await hashSenha(ADMIN_SENHA);
    todosUsuarios.unshift({ nome: ADMIN_USER, ativo: true, senhaHash: adminHash, admin: true });
    await salvarTodosUsuarios();
  } else {
    var adminUser = todosUsuarios.find(function (u) { return u.nome === ADMIN_USER; });
    if (adminUser && !adminUser.admin) {
      adminUser.admin = true;
      await salvarTodosUsuarios();
    }
  }
  usuarios = todosUsuarios.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
}

async function carregarTudo() {
  mesAtual = obterMesAtual();

  await carregarUsuarios();

  // Firestore primeiro, fallback localStorage
  var fbOk = await fbCarregarChamados();
  await fbLimparChamadosLegado();
  if (!fbOk) {
    var dados = lsGet('dados') || [];
    dadosMes = {};
    dados.forEach(function (d) { dadosMes[d.mes] = normalizarRegistros(d.registros); });
  }
  var mudouIds = false;
  Object.values(dadosMes).forEach(function (regs) {
    regs.forEach(function (r) {
      if (!r.id) {
        r.id = gerarId();
        mudouIds = true;
      }
    });
  });
  if (mudouIds) await salvarDadosMes();
  if (!dadosMes[mesAtual]) {
    dadosMes[mesAtual] = [];
    await salvarDadosMes();
  }
}

var _fbTimerChamados = null;
var _isSavingUsuarios = false;

async function salvarTodosUsuarios() {
  _isSavingUsuarios = true;
  var snapshot = todosUsuarios.slice();
  lsSetShared('SAC_USUARIOS', snapshot);
  lsSet('usuarios', snapshot);
  await fbSalvarUsuarios();
  todosUsuarios = snapshot;
  _isSavingUsuarios = false;
}

async function salvarDadosMes() {
  const registros = normalizarRegistros(dadosMes[mesAtual]);
  dadosMes[mesAtual] = registros;
  const lsDados = lsGet('dados') || [];
  const idx = lsDados.findIndex(d => d.mes === mesAtual);
  const registro = { mes: mesAtual, registros };
  if (idx >= 0) lsDados[idx] = registro; else lsDados.push(registro);
  lsSet('dados', lsDados);
}

function configurarSnapshots() {
  fbOnSnapshotConfig('config', 'bracos', function (data) {
    if (data && data.dados && Object.keys(data.dados).length > 0) {
      bracosConfig = data.dados;
    } else if (fbDisponivel()) {
      fbSalvarConfig('config', 'bracos', { dados: bracosConfig });
    }
    try { renderizarTabela(); } catch (e) {}
  });
  fbOnSnapshotConfig('config', 'lojas', function (data) {
    if (data && Array.isArray(data.dados) && data.dados.length > 0) {
      lojasMercadorias = data.dados;
    } else if (fbDisponivel()) {
      fbSalvarConfig('config', 'lojas', { dados: lojasMercadorias });
    }
    try { renderizarTabela(); } catch (e) {}
  });
  fbOnSnapshotConfig('config', 'observacoes', function (data) {
    if (data && data.dados !== undefined && data.dados !== null) {
      observacoesCustom = normalizarListaConfig(data.dados);
      if (!Array.isArray(data.dados)) {
        fbSalvarConfig('config', 'observacoes', { dados: observacoesCustom });
      }
      try { renderizarTabela(); } catch (e) {}
    }
  });
  fbOnSnapshotConfig('config', 'divergencias', function (data) {
    if (data && data.dados !== undefined && data.dados !== null) {
      divergenciasCustom = normalizarListaConfig(data.dados);
      if (!Array.isArray(data.dados)) {
        fbSalvarConfig('config', 'divergencias', { dados: divergenciasCustom });
      }
      try { renderizarTabela(); } catch (e) {}
    }
  });
}

// ==================== FILTROS ====================
function definirDatasFiltro() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('fDataInicio').value = formatDate(inicio);
  document.getElementById('fDataFim').value = formatDate(hoje);
}

function toggleFiltros() {
  document.getElementById('filterPanel').classList.toggle('show');
  popularFiltros();
}

function popularFiltros() {
  const selUser = document.getElementById('fUsuario');
  const selSetor = document.getElementById('fSetor');
  const valUser = selUser.value;
  const valSetor = selSetor.value;
  selUser.innerHTML = '<option value="">Todos</option>';
  selSetor.innerHTML = '<option value="">Todos</option>';
  usuarios.forEach(u => {
    const o = document.createElement('option');
    o.value = u; o.textContent = u;
    selUser.appendChild(o);
  });
  getSetores().filter(s => s).forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    selSetor.appendChild(o);
  });
  selUser.value = valUser;
  selSetor.value = valSetor;
}

function aplicarFiltros() {
  const fUser = document.getElementById('fUsuario').value;
  const fSetor = document.getElementById('fSetor').value;
  const fDataInicio = document.getElementById('fDataInicio').value;
  const fDataFim = document.getElementById('fDataFim').value;
  const fChamado = document.getElementById('fChamado').value.toLowerCase();
  const fLoja = document.getElementById('fLoja').value.toLowerCase();
  const linhas = document.querySelectorAll('#tabela tbody tr');
  let visiveis = 0;
  linhas.forEach(tr => {
    const idx = parseInt(tr.dataset.idx);
    const d = dadosMes[mesAtual][idx];
    let mostrar = true;
    if (fUser && d.usuario !== fUser) mostrar = false;
    if (fSetor && d.setor !== fSetor) mostrar = false;
    if (fDataInicio && d.dataAbertura && d.dataAbertura < fDataInicio) mostrar = false;
    if (fDataFim && d.dataAbertura && d.dataAbertura > fDataFim) mostrar = false;
    if (fChamado && !(d.chamado || '').toLowerCase().includes(fChamado)) mostrar = false;
    if (fLoja && !(d.loja || '').toLowerCase().includes(fLoja)) mostrar = false;
    tr.style.display = mostrar ? '' : 'none';
    if (mostrar) visiveis++;
  });
  const status = document.getElementById('filterStatus');
  if (visiveis < linhas.length) {
    status.textContent = `Mostrando ${visiveis} de ${linhas.length} registros`;
  } else {
    status.textContent = '';
  }
}

function limparFiltros() {
  document.getElementById('fUsuario').value = '';
  document.getElementById('fSetor').value = '';
  document.getElementById('fChamado').value = '';
  document.getElementById('fLoja').value = '';
  definirDatasFiltro();
  document.getElementById('filterStatus').textContent = '';
  document.querySelectorAll('#tabela tbody tr').forEach(tr => tr.style.display = '');
}

// ==================== BRAÇOS ====================
let bracosConfig = {};

async function carregarBracosConfig() {
  try {
    const raw = localStorage.getItem('SAC_brasConfig');
    if (raw) {
      const salvas = JSON.parse(raw);
      if (salvas && Object.keys(salvas).length > 0) {
        bracosConfig = salvas;
      }
    }
  } catch {}
  if (fbDisponivel()) {
    try {
      const fbData = await fbCarregarConfig('config', 'bracos');
      if (fbData && fbData.dados && Object.keys(fbData.dados).length > 0) {
        bracosConfig = fbData.dados;
        try { localStorage.setItem('SAC_brasConfig', JSON.stringify(bracosConfig)); } catch {}
      }
    } catch {}
  }
  if (!bracosConfig || Object.keys(bracosConfig).length === 0) {
    bracosConfig = {};
    Object.entries(BRACOS_DEFAULT).forEach(([nome, lojas]) => { bracosConfig[nome] = lojas; });
  }
}

function salvarBracosConfigLocalStorage() {
  try { localStorage.setItem('SAC_brasConfig', JSON.stringify(bracosConfig)); } catch {}
  fbSalvarConfig('config', 'bracos', { dados: bracosConfig });
}

function buscarBracoPorLoja(loja) {
  if (!loja) return '';
  const lojaStr = String(loja).trim();
  const numLoja = lojaStr.replace(/^0+/, '').split('-')[0];
  for (const [braco, lojas] of Object.entries(bracosConfig)) {
    const lista = String(lojas).split(',').map(s => s.trim()).filter(Boolean);
    if (lista.some(item => item === lojaStr || item === numLoja || item.replace(/^0+/, '') === numLoja)) {
      const match = braco.match(/\d+/);
      return match ? match[0] : '';
    }
  }
  return '';
}

function abrirModalBracos() {
  atualizarListaBracos();
  abrirModal('modalBracos');
}

function atualizarListaBracos() {
  const lista = document.getElementById('listaBracos');
  lista.innerHTML = '';
  const nomes = Object.keys(bracosConfig);
  nomes.forEach((nome, idx) => {
    const lojas = bracosConfig[nome] || '';
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div style="flex:1">
        <span style="font-weight:600">${escapeHtml(nome)}</span>
        <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px">${escapeHtml(lojas)}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" id="editBracoNome_${idx}" placeholder="Novo nome" value="${escapeHtml(nome)}"
          style="width:90px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"
          onkeypress="if(event.key==='Enter')editarBraco(${idx})">
        <input type="text" id="editBracoLojas_${idx}" placeholder="Lojas" value="${escapeHtml(lojas)}"
          style="width:140px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"
          onkeypress="if(event.key==='Enter')editarBraco(${idx})">
        <button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarBraco(${idx})">Salvar</button>
        <button class="btn danger" style="padding:4px 10px;font-size:0.7rem"
          onclick="excluirBraco(${idx})">Excluir</button>
      </div>`;
    lista.appendChild(div);
  });
}

function adicionarBraco() {
  const inpNome = document.getElementById('novoBracoNome');
  const inpLojas = document.getElementById('novoBracoLojas');
  const nome = inpNome.value.trim();
  const lojas = inpLojas.value.trim();
  if (!nome) {
    toast('Digite o nome do braço', 'error');
    return;
  }
  if (bracosConfig[nome]) {
    toast('Braço já existe', 'error');
    return;
  }
  bracosConfig[nome] = lojas;
  salvarBracosConfigLocalStorage();
  inpNome.value = '';
  inpLojas.value = '';
  atualizarListaBracos();
  renderizarTabela();
  toast(`${nome} adicionado`, 'success');
}

function editarBraco(idx) {
  const nomes = Object.keys(bracosConfig);
  const nomeAntigo = nomes[idx];
  const inpNome = document.getElementById('editBracoNome_' + idx);
  const inpLojas = document.getElementById('editBracoLojas_' + idx);
  const novoNome = inpNome.value.trim();
  const novasLojas = inpLojas.value.trim();
  if (!novoNome) {
    toast('Digite o nome do braço', 'error');
    return;
  }
  if (novoNome !== nomeAntigo && bracosConfig[novoNome]) {
    toast('Braço já existe', 'error');
    return;
  }
  if (novoNome !== nomeAntigo) {
    delete bracosConfig[nomeAntigo];
  }
  bracosConfig[novoNome] = novasLojas;
  salvarBracosConfigLocalStorage();
  atualizarListaBracos();
  renderizarTabela();
  toast('Braço atualizado', 'success');
}

function excluirBraco(idx) {
  const nomes = Object.keys(bracosConfig);
  const nome = nomes[idx];
  if (!confirm(`Excluir "${nome}"?`)) return;
  delete bracosConfig[nome];
  salvarBracosConfigLocalStorage();
  atualizarListaBracos();
  renderizarTabela();
  toast(`${nome} excluído`, 'success');
}

// ==================== GERENCIAR LOJAS ====================
let lojasMercadorias = [];

function normalizarLoja(nome) {
  const m = /^(\d{1,3})\s*-\s*(.+)$/.exec(String(nome).trim().toUpperCase());
  if (!m) return String(nome).trim().toUpperCase();
  return ('00' + m[1]).slice(-3) + '-' + m[2];
}

async function carregarLojas() {
  try {
    const raw = localStorage.getItem('SAC_LOJAS_MERCADORIAS');
    if (raw) {
      const salvas = JSON.parse(raw);
      if (Array.isArray(salvas) && salvas.length > 0) {
        lojasMercadorias = salvas;
      }
    }
  } catch {}
  if (fbDisponivel()) {
    try {
      const fbData = await fbCarregarConfig('config', 'lojas');
      if (fbData && Array.isArray(fbData.dados) && fbData.dados.length > 0) {
        lojasMercadorias = fbData.dados;
        try { localStorage.setItem('SAC_LOJAS_MERCADORIAS', JSON.stringify(lojasMercadorias)); } catch {}
      }
    } catch {}
  }
  if (!lojasMercadorias || lojasMercadorias.length === 0) {
    lojasMercadorias = [...LOJAS_MERCADORIAS_DEFAULT];
  }
}

function salvarLojas() {
  localStorage.setItem('SAC_LOJAS_MERCADORIAS', JSON.stringify(lojasMercadorias));
  fbSalvarConfig('config', 'lojas', { dados: lojasMercadorias });
}

function abrirModalLojas() {
  atualizarListaLojas();
  abrirModal('modalLojas');
}

function atualizarListaLojas() {
  const lista = document.getElementById('listaLojas');
  lista.innerHTML = '';
  lojasMercadorias.forEach((loja, idx) => {
    const display = loja.replace(/^0(\d{2}-)/, '$1');
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div style="flex:1">
        <span style="font-weight:600">${escapeHtml(display)}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" id="editLoja_${idx}" placeholder="Novo nome" value="${escapeHtml(display)}"
          style="width:120px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"
          onkeypress="if(event.key==='Enter')editarLoja(${idx})">
        <button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarLoja(${idx})">Editar</button>
        <button class="btn danger" style="padding:4px 10px;font-size:0.7rem"
          onclick="excluirLoja(${idx})">Excluir</button>
      </div>`;
    lista.appendChild(div);
  });
}

function adicionarLoja() {
  const input = document.getElementById('novaLoja');
  const nome = normalizarLoja(input.value);
  if (!nome) {
    toast('Digite o nome da loja', 'error');
    return;
  }
  if (lojasMercadorias.some(l => l.toUpperCase() === nome)) {
    toast('Loja já existe', 'error');
    return;
  }
  lojasMercadorias.push(nome);
  lojasMercadorias.sort((a, b) => a.localeCompare(b));
  salvarLojas();
  input.value = '';
  atualizarListaLojas();
  renderizarMercadoriasNF();
  toast(`${nome} adicionada`, 'success');
}

function editarLoja(idx) {
  const input = document.getElementById('editLoja_' + idx);
  const novoNome = normalizarLoja(input.value);
  if (!novoNome) {
    toast('Digite o nome da loja', 'error');
    return;
  }
  const lojaAntiga = lojasMercadorias[idx];
  if (lojaAntiga.toUpperCase() === novoNome) return;
  if (lojasMercadorias.some((l, i) => i !== idx && l.toUpperCase() === novoNome)) {
    toast('Loja já existe', 'error');
    return;
  }
  lojasMercadorias[idx] = novoNome;
  lojasMercadorias.sort((a, b) => a.localeCompare(b));
  salvarLojas();
  atualizarListaLojas();
  renderizarMercadoriasNF();
  toast('Loja atualizada', 'success');
}

function excluirLoja(idx) {
  const loja = lojasMercadorias[idx];
  if (!confirm(`Excluir a loja "${loja}"?`)) return;
  lojasMercadorias.splice(idx, 1);
  salvarLojas();
  atualizarListaLojas();
  renderizarMercadoriasNF();
  toast(`${loja} excluída`, 'success');
}

// ==================== GERENCIAR SOLUÇÃO / OBSERVAÇÃO ====================
function normalizarListaConfig(dados) {
  if (Array.isArray(dados)) return dados.slice();
  if (dados && typeof dados === 'object') {
    const lista = [];
    ['CD1', 'CD2'].forEach(key => {
      const arr = dados[key];
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          if (typeof item === 'string' && lista.indexOf(item) === -1) lista.push(item);
        });
      }
    });
    return lista;
  }
  return [];
}

let observacoesCustom = [];

async function carregarObservacoes() {
  observacoesCustom = [];
  try {
    const raw = localStorage.getItem('SAC_OBSERVACOES_CUSTOM');
    if (raw) observacoesCustom = normalizarListaConfig(JSON.parse(raw));
  } catch {}
  if (!fbDisponivel()) return;
  try {
    const fbData = await fbCarregarConfig('config', 'observacoes');
    if (fbData && fbData.dados !== undefined && fbData.dados !== null) {
      observacoesCustom = normalizarListaConfig(fbData.dados);
      try { localStorage.setItem('SAC_OBSERVACOES_CUSTOM', JSON.stringify(observacoesCustom)); } catch {}
    }
  } catch {}
}

function salvarObservacoes() {
  localStorage.setItem('SAC_OBSERVACOES_CUSTOM', JSON.stringify(observacoesCustom));
  fbSalvarConfig('config', 'observacoes', { dados: observacoesCustom });
}

function abrirModalObservacoes() {
  const el = document.getElementById('modalObsCD');
  if (el) el.textContent = cdAtual;
  atualizarListaObservacoes();
  abrirModal('modalObservacoes');
}

function obterObsArray() {
  if (Array.isArray(observacoesCustom) && observacoesCustom.length > 0) return observacoesCustom;
  return cdAtual === 'CD1' ? OBSERVACOES_CD1 : OBSERVACOES_CD2;
}

function atualizarListaObservacoes() {
  const lista = document.getElementById('listaObservacoes');
  if (!lista) return;
  lista.innerHTML = '';
  const arr = obterObsArray();
  arr.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(item || '(vazio)') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editObs_' + idx + '" placeholder="Novo valor" value="' + escapeHtml(item) + '"' +
          ' style="width:180px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarObservacao(' + idx + ')">Editar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirObservacao(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function adicionarObservacao() {
  const input = document.getElementById('novaObservacao');
  const val = input.value.trim();
  if (!val) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  const arr = obterObsArray();
  if (arr.some(a => a.toUpperCase() === val.toUpperCase())) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(observacoesCustom)) observacoesCustom = arr.slice();
  observacoesCustom.push(val);
  salvarObservacoes();
  input.value = '';
  atualizarListaObservacoes();
  renderizarTabela();
  toast('Opção adicionada', 'success');
}

function editarObservacao(idx) {
  const input = document.getElementById('editObs_' + idx);
  const novoVal = input.value.trim();
  if (!novoVal) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  const arr = obterObsArray();
  const antigo = arr[idx];
  if (antigo && antigo.toUpperCase() === novoVal.toUpperCase()) return;
  if (arr.some((a, i) => i !== idx && a.toUpperCase() === novoVal.toUpperCase())) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(observacoesCustom)) observacoesCustom = arr.slice();
  observacoesCustom[idx] = novoVal;
  salvarObservacoes();
  atualizarListaObservacoes();
  renderizarTabela();
  toast('Opção atualizada', 'success');
}

function excluirObservacao(idx) {
  const arr = obterObsArray();
  const item = arr[idx];
  if (!item) return;
  if (!confirm('Excluir "' + item + '"?')) return;
  if (!Array.isArray(observacoesCustom)) observacoesCustom = arr.slice();
  observacoesCustom.splice(idx, 1);
  salvarObservacoes();
  atualizarListaObservacoes();
  renderizarTabela();
  toast(item + ' excluída', 'success');
}

// ==================== GERENCIAR DIVERGÊNCIA ====================
let divergenciasCustom = [];

async function carregarDivergencias() {
  divergenciasCustom = [];
  try {
    const raw = localStorage.getItem('SAC_DIVERGENCIAS_CUSTOM');
    if (raw) divergenciasCustom = normalizarListaConfig(JSON.parse(raw));
  } catch {}
  if (!fbDisponivel()) return;
  try {
    const fbData = await fbCarregarConfig('config', 'divergencias');
    if (fbData && fbData.dados !== undefined && fbData.dados !== null) {
      divergenciasCustom = normalizarListaConfig(fbData.dados);
      try { localStorage.setItem('SAC_DIVERGENCIAS_CUSTOM', JSON.stringify(divergenciasCustom)); } catch {}
    }
  } catch {}
}

function salvarDivergencias() {
  localStorage.setItem('SAC_DIVERGENCIAS_CUSTOM', JSON.stringify(divergenciasCustom));
  fbSalvarConfig('config', 'divergencias', { dados: divergenciasCustom });
}

function abrirModalDivergencias() {
  const el = document.getElementById('modalDivCD');
  if (el) el.textContent = cdAtual;
  atualizarListaDivergencias();
  abrirModal('modalDivergencias');
}

function obterDivArray() {
  if (Array.isArray(divergenciasCustom) && divergenciasCustom.length > 0) return divergenciasCustom;
  return cdAtual === 'CD1' ? DIVERGENCIAS_CD1 : DIVERGENCIAS_CD2;
}

function atualizarListaDivergencias() {
  const lista = document.getElementById('listaDivergencias');
  if (!lista) return;
  lista.innerHTML = '';
  const arr = obterDivArray();
  arr.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(item || '(vazio)') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editDiv_' + idx + '" placeholder="Novo valor" value="' + escapeHtml(item) + '"' +
          ' style="width:180px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarDivergencia(' + idx + ')">Editar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirDivergencia(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function adicionarDivergencia() {
  const input = document.getElementById('novaDivergencia');
  const val = input.value.trim();
  if (!val) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  const arr = obterDivArray();
  if (arr.some(a => a.toUpperCase() === val.toUpperCase())) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(divergenciasCustom)) divergenciasCustom = arr.slice();
  divergenciasCustom.push(val);
  salvarDivergencias();
  input.value = '';
  atualizarListaDivergencias();
  renderizarTabela();
  toast('Opção adicionada', 'success');
}

function editarDivergencia(idx) {
  const input = document.getElementById('editDiv_' + idx);
  const novoVal = input.value.trim();
  if (!novoVal) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  const arr = obterDivArray();
  const antigo = arr[idx];
  if (antigo && antigo.toUpperCase() === novoVal.toUpperCase()) return;
  if (arr.some((a, i) => i !== idx && a.toUpperCase() === novoVal.toUpperCase())) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(divergenciasCustom)) divergenciasCustom = arr.slice();
  divergenciasCustom[idx] = novoVal;
  salvarDivergencias();
  atualizarListaDivergencias();
  renderizarTabela();
  toast('Opção atualizada', 'success');
}

function excluirDivergencia(idx) {
  const arr = obterDivArray();
  const item = arr[idx];
  if (!item) return;
  if (!confirm('Excluir "' + item + '"?')) return;
  if (!Array.isArray(divergenciasCustom)) divergenciasCustom = arr.slice();
  divergenciasCustom.splice(idx, 1);
  salvarDivergencias();
  atualizarListaDivergencias();
  renderizarTabela();
  toast(item + ' excluída', 'success');
}

// ==================== RANKING ====================
function abrirRanking() {
  document.getElementById('rankingSenhaArea').style.display = 'block';
  document.getElementById('rankingConteudo').style.display = 'none';
  document.getElementById('rankingSenha').value = '';
  document.getElementById('rankingSenhaErro').style.display = 'none';
  abrirModal('modalRanking');
  setTimeout(() => document.getElementById('rankingSenha').focus(), 100);
}

async function validarRanking() {
  const senha = document.getElementById('rankingSenha').value;
  const hashInput = await hashSenha(senha);
  const hashAdmin = await hashSenha(SENHA_ADMIN);
  if (hashInput === hashAdmin) {
    document.getElementById('rankingSenhaArea').style.display = 'none';
    document.getElementById('rankingConteudo').style.display = 'block';
    gerarRanking();
  } else {
    document.getElementById('rankingSenhaErro').style.display = 'block';
    document.getElementById('rankingSenha').value = '';
    document.getElementById('rankingSenha').focus();
  }
}

function gerarRanking() {
  const regs = dadosMes[mesAtual] || [];
  const labelMes = mesAtual + ' ' + new Date().getFullYear();
  document.getElementById('rankingMesLabel').textContent = 'Mês: ' + labelMes;

  const stats = {};
  regs.forEach(r => {
    const user = r.usuario;
    if (!user) return;
    if (!stats[user]) stats[user] = { total: 0, tempoSum: 0, tempoCount: 0 };
    stats[user].total++;
    if (r.dataAbertura && r.dataFechamento) {
      const diff = diasUteis(r.dataAbertura, r.dataFechamento);
      if (diff >= 0) {
        stats[user].tempoSum += diff;
        stats[user].tempoCount++;
      }
    }
  });

  const ranking = Object.entries(stats)
    .map(([nome, s]) => ({
      nome,
      total: s.total,
      tempoMedio: s.tempoCount > 0 ? (s.tempoSum / s.tempoCount) : null
    }))
    .sort((a, b) => b.total - a.total);

  const container = document.getElementById('rankingTabela');
  if (ranking.length === 0) {
    container.innerHTML = '<div class="ranking-vazio">Nenhum chamado com usuário definido neste mês.</div>';
    return;
  }

  const totalGeral = ranking.reduce((s, r) => s + r.total, 0);

  let html = '<table class="ranking-table">';
  html += '<thead><tr><th>#</th><th style="text-align:left;padding-left:14px">Usuário</th><th>Chamados</th><th>Média (dias úteis)</th></tr></thead>';
  html += '<tbody>';
  ranking.forEach((r, i) => {
    const pos = i + 1;
    const cls = pos <= 3 ? ' rank-' + pos : '';
    const medalha = pos === 1 ? '&#129351;' : pos === 2 ? '&#129352;' : pos === 3 ? '&#129353;' : pos;
    const tempo = r.tempoMedio !== null ? r.tempoMedio.toFixed(1) + ' du' : '-';
    html += '<tr class="' + cls + '">';
    html += '<td class="rank-pos">' + medalha + '</td>';
    html += '<td class="rank-user">' + escapeHtml(r.nome) + '</td>';
    html += '<td class="rank-count">' + r.total + '</td>';
    html += '<td class="rank-tempo">' + tempo + '</td>';
    html += '</tr>';
  });
  html += '</tbody>';
  html += '<tfoot><tr><td></td><td style="text-align:left;padding-left:14px;font-weight:700">Total</td>';
  html += '<td class="rank-count">' + totalGeral + '</td><td class="rank-tempo">-</td></tr></tfoot>';
  html += '</table>';

  container.innerHTML = html;
}

// ==================== MODAL SAIR COM BACKUP ====================
function logoutComBackup() {
  const registrosAtuais = contarRegistrosAtuais();
  if (registrosAtuais === 0) {
    logout();
    return;
  }
  document.getElementById('modalSairBackupRegistros').textContent = registrosAtuais + ' registros no sistema';
  abrirModal('modalSairBackup');
}

function sairSemBackup() {
  fecharModal('modalSairBackup');
  logout();
}

function sairComBackup() {
  fecharModal('modalSairBackup');
  exportarBackupCompleto();
  setTimeout(() => logout(), 1500);
}

function atualizarBarraUsuario() {
  if (usuarioLogado) {
    document.querySelectorAll('.page-user-info').forEach(el => {
      const nameEl = el.querySelector('span:first-child');
      const cdEl = el.querySelector('span:last-child');
      if (nameEl && cdEl) {
        nameEl.textContent = usuarioLogado;
        cdEl.textContent = cdAtual;
      }
    });
    const chamadosName = document.getElementById('chamadosUserName');
    const chamadosCd = document.getElementById('chamadosUserCd');
    if (chamadosName) chamadosName.textContent = usuarioLogado;
    if (chamadosCd) chamadosCd.textContent = cdAtual;
  }
}

async function iniciarSistema() {
  try { usuarioLogado = sessionStorage.getItem('sac_usuario_logado'); } catch (e) { usuarioLogado = null; }
  if (!usuarioLogado) {
    const sessao = verificarSessao();
    if (sessao) {
      usuarioLogado = sessao.nome;
      try { sessionStorage.setItem('sac_usuario_logado', usuarioLogado); } catch (e) {}
      try { sessionStorage.setItem('sac_cd_atual', sessao.cd); } catch (e) {}
    }
  }
  if (!usuarioLogado) {
    window.location.href = 'index.html';
    return;
  }
  document.body.classList.add('cd1-active');
  await carregarTudo();
  await carregarSenhasSac();
  await carregarNotasDev();
  await carregarMercadoriasNF();
  await carregarBracosConfig();
  await carregarLojas();
  await carregarObservacoes();
  await carregarDivergencias();
  configurarSnapshots();
  mesAtualSenhasSac = mesAtual;
  mesAtualNotasDev = mesAtual;
  mesAtualMercadoriasNF = mesAtual;
  mesAtualDash = mesAtual;
  atualizarBarraUsuario();
  montarAbas();
  selecionarMes(mesAtual);
  montarAbasGenerico('tabsMesDash', mesAtualDash, selecionarMesDash);
  definirDatasFiltro();
  if (paginaAtual !== 'chamados') mudarPagina('chamados');
  document.getElementById('tituloPagina').textContent = 'Acompanhamento de Chamados CD1';
}
