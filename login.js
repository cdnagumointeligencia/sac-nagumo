// ==================== CONSTANTES ====================
const ADMIN_SENHA = 'admin123';
const ADMIN_USER = 'admin';
const SENHA_PADRAO = '123456';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const DIVERGENCIAS_CD1 = ['', 'Sobra', 'Falta', 'Inversão', 'Montada', 'Troca de loja'];
const DIVERGENCIAS_CD2 = ['', 'Sobra', 'Falta', 'Inversão', 'Montada', 'Troca de loja', 'Não Checada', 'Agrupada', 'Aguardando Montagem'];
const OBSERVACOES_CD1 = ['', 'Solicitar nota de devolução', 'Devolver', 'Realizar Contagem', 'Pedir saldo lista.estoque', 'Solicitar NFD e devolver inversão', 'Solicitar NFD e Faturar inversão', 'Carregada-Enviar nota por e-mail', 'Faturar a sobra', 'Faturar a inversão', 'Aguardar próxima entrega'];
const OBSERVACOES_CD2 = ['', 'Solicitar nota de devolução', 'Devolver', 'Realizar Contagem', 'Pedir saldo lista.estoque', 'Solicitar NFD e devolver inversão', 'Solicitar NFD e Faturar inversão', 'Carregada-Enviar nota por e-mail', 'Faturar a sobra', 'Faturar a inversão', 'Aguardar próxima entrega'];

const BRACOS_DEFAULT = {
  'Braço 1': '26,55,18,36,56,10',
  'Braço 2': '50,45,34,44,53,06',
  'Braço 3': '11,48,35,40,04,33',
  'Braço 4': '61,51,09,28,22,52',
  'Braço 5': '21,07,31,41,32',
  'Braço 6': '01,02,29,37,42',
  'Braço 7': '57,59,13,20,39',
  'Braço 8': '17,46,43,47,16',
  'Braço 9': '30,38,03,24,12,25',
  'Braço 10': '60,23,58,15,14',
  'Braço 11': '08,49,27,54,19'
};

const LOJAS_MERCADORIAS_DEFAULT = [
  '001-SOLAR', '002-MOGI 1 MOD', '003-MADALENA', '004-GRIMALDI', '006-IGUATEMI',
  '007-TIBURCIO', '008-JUREMA', '009-COLONIAL', '010-MORUMBI', '011-V,VERDE',
  '012-BONSUCESSO', '013-CURUCA', '014-CUMBICA', '015-UIRAPURU', '016-RAGUEB',
  '017-PIRES RIO', '018-OL,FREIRE', '019-MOGI2', '020-AIMORE', '021-BARREIRA',
  '022-CALMON', '023-D,BENTA', '024-PIMENTAS', '025-TAUBATE1', '026-STO AND2',
  '027-V,MAZZA', '028-TAUBATE2', '029-VL DIVA2', '030-ITAQUA', '031-MERC,ATI',
  '032-ATIBAIA', '033-ATIBAIA', '034-ATIBAIA', '035-ATIBAIA', '036-V,REDONDA',
  '037-PARANAGUA', '038-MAUA', '039-ITAQUA2', '040-BIRITIBA', '041-MERC,BON',
  '042-CUMBICA2', '043-OLFREIRE2', '044-TIBURCIO2', '045-POA 2', '046-OSASCO',
  '047-SHOP,ITA', '048-LORENA', '049-SHOP,PIMENTAS', '050-CAMILOPO', '051-PQ CONTI',
  '052-MOGI3', '053-V,REDON2', '054-LAVRAS', '055-BONSUCESSO', '056-ELENCO',
  '057-ANELVIAR', '058-PRAIAGDE', '059-VILA VELHA', '060-PRAIAGDE2', '061-PQ ALVORADA'
];

// ==================== DADOS GLOBAIS ====================
var usuarioLogado = null;
var todosUsuariosLogin = [];
var lojasMercadoriasLogin = [];
var bracosConfigLogin = {};
var observacoesCustomLogin = [];
var divergenciasCustomLogin = [];

// ==================== NORMALIZAÇÃO DE LISTAS DE CONFIG ====================
function normalizarListaConfig(dados) {
  if (Array.isArray(dados)) return dados.slice();
  if (dados && typeof dados === 'object') {
    var lista = [];
    ['CD1', 'CD2'].forEach(function (key) {
      var arr = dados[key];
      if (Array.isArray(arr)) {
        arr.forEach(function (item) {
          if (typeof item === 'string' && lista.indexOf(item) === -1) lista.push(item);
        });
      }
    });
    return lista;
  }
  return [];
}

function mesclarListasPadrao(lista1, lista2) {
  var out = [];
  [lista1, lista2].forEach(function (arr) {
    (arr || []).forEach(function (item) {
      if (out.indexOf(item) === -1) out.push(item);
    });
  });
  return out;
}

function ordenarListaConfig(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.sort(function (a, b) {
    return String(a).localeCompare(String(b), 'pt-BR');
  });
}

// ==================== LOCALSTORAGE HELPERS ====================
function lsGetShared(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function lsSetShared(key, valor) {
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// ==================== TOAST ====================
function toast(msg, tipo) {
  if (tipo === undefined) tipo = 'success';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast show ' + tipo;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, 2500);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

// ==================== MODAIS ====================
function abrirModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function fecharModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ==================== NAVEGAÇÃO ====================
function navegarCD(cd) {
  var url = cd === 'CD1' ? 'SAC1.html' : 'SAC2.html';
  window.location.href = url;
}

// ==================== ABRIR MODAIS ESPECÍFICOS ====================
function abrirModalUsuarios() {
  renderizarListaUsuarios();
  abrirModal('modalUsuarios');
}
function abrirModalBackup() { abrirModal('modalBackup'); }
function abrirModalLojas() { renderizarListaLojas(); abrirModal('modalLojas'); }
function abrirModalBracos() { renderizarListaBracos(); abrirModal('modalBracos'); }
function abrirModalObservacoes() { renderizarListaObservacoes(); abrirModal('modalObservacoes'); }
function abrirModalDivergencias() { renderizarListaDivergencias(); abrirModal('modalDivergencias'); }

// ==================== SHA-256 HASH ====================
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
  return H.map(function (v) { return (v>>>0).toString(16).padStart(8,'0'); }).join('');
}

async function hashSenha(senha) {
  const enc = new TextEncoder().encode(String(senha));
  if (window.crypto && window.crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { /* fallback */ }
  }
  return _sha256Fallback(String(senha));
}

// ==================== USUÁRIOS ====================
async function carregarUsuariosLogin() {
  todosUsuariosLogin = [];
  if (fbDisponivel()) {
    try {
      var resultados = await fbQuery('usuarios', []);
      if (resultados && resultados.length > 0) {
        var fbUsuarios = [];
        resultados.forEach(function (r) {
          fbUsuarios.push({
            nome: r.nome || '',
            ativo: r.ativo !== false,
            admin: r.admin === true,
            senhaHash: r.senhaHash || ''
          });
        });
        todosUsuariosLogin = fbUsuarios;
      }
    } catch (e) {}
    await garantirAdminLogin();
    return;
  }
  var salvos = lsGetShared('SAC_USUARIOS') || [];
  if (salvos.length > 0) {
    for (var u of salvos) {
      if (!u.senhaHash) {
        u.senhaHash = await hashSenha(u.senha || SENHA_PADRAO);
        delete u.senha;
      }
    }
    todosUsuariosLogin = salvos;
  }
  await garantirAdminLogin();
}

async function garantirAdminLogin() {
  var adminEncontrado = false;
  for (var i = 0; i < todosUsuariosLogin.length; i++) {
    if (todosUsuariosLogin[i].nome === ADMIN_USER) {
      todosUsuariosLogin[i].senhaHash = await hashSenha(ADMIN_SENHA);
      todosUsuariosLogin[i].admin = true;
      todosUsuariosLogin[i].ativo = true;
      adminEncontrado = true;
      break;
    }
  }
  if (!adminEncontrado) {
    var adminHash = await hashSenha(ADMIN_SENHA);
    todosUsuariosLogin.unshift({ nome: ADMIN_USER, ativo: true, senhaHash: adminHash, admin: true });
    if (fbDisponivel()) {
      try {
        await fbDocSet('usuarios', 'usr_' + ADMIN_USER, { nome: ADMIN_USER, ativo: true, admin: true, senhaHash: adminHash });
      } catch (e) {}
    }
  }
}

async function salvarUsuariosLogin() {
  if (!fbDisponivel()) return;
  var snapshot = todosUsuariosLogin.slice();
  for (var i = 0; i < snapshot.length; i++) {
    var u = snapshot[i];
    if (!u.nome) continue;
    var docId = 'usr_' + u.nome;
    await fbDocSet('usuarios', docId, {
      nome: u.nome,
      ativo: u.ativo !== false,
      admin: u.admin === true,
      senhaHash: u.senhaHash || ''
    });
  }
}

function renderizarListaUsuarios() {
  var lista = document.getElementById('listaUsuarios');
  if (!lista) return;
  lista.innerHTML = '';
  todosUsuariosLogin.filter(function (u) { return u.nome !== ADMIN_USER; }).forEach(function (u) {
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(u.nome) + '</span>' + (u.ativo ? '' : '<em style="color:#94a3b8"> (inativo)</em>') +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<input type="password" id="senha_' + escapeAttr(u.nome) + '" placeholder="Nova senha" value=""' +
          ' style="width:90px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" data-action="redefinir-senha" data-nome="' + escapeAttr(u.nome) + '">Senha</button>' +
        '<button class="btn ' + (u.ativo ? 'danger' : 'success') + '" style="padding:4px 10px;font-size:0.7rem"' +
          ' data-action="toggle-usuario" data-nome="' + escapeAttr(u.nome) + '">' + (u.ativo ? 'Desativar' : 'Reativar') + '</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem"' +
          ' data-action="excluir-usuario" data-nome="' + escapeAttr(u.nome) + '">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });

  lista.querySelectorAll('[data-action]').forEach(function (btn) {
    var action = btn.dataset.action;
    var nome = btn.dataset.nome;
    if (action === 'redefinir-senha') {
      btn.addEventListener('click', function () { resetarSenhaUsuario(nome); });
    } else if (action === 'toggle-usuario') {
      btn.addEventListener('click', function () { toggleUsuarioAtivo(nome); });
    } else if (action === 'excluir-usuario') {
      btn.addEventListener('click', function () { excluirUsuarioLogin(nome); });
    }
  });

  lista.querySelectorAll('input[id^="senha_"]').forEach(function (inp) {
    inp.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        var nome = inp.id.replace('senha_', '');
        resetarSenhaUsuario(nome);
      }
    });
  });
}

async function adicionarUsuario() {
  var nome = document.getElementById('novoUsuario').value.trim();
  var senha = document.getElementById('novaSenhaUsuario').value.trim() || SENHA_PADRAO;
  if (!nome) { toast('Digite o nome do usuário', 'error'); return; }
  if (todosUsuariosLogin.some(function (u) { return u.nome === nome; })) {
    toast('Usuário já existe', 'error');
    return;
  }
  var senhaHash = await hashSenha(senha);
  var novoUser = { nome: nome, ativo: true, senhaHash: senhaHash };
  if (fbDisponivel()) {
    var docId = 'usr_' + nome;
    await fbDocSet('usuarios', docId, { nome: nome, ativo: true, admin: false, senhaHash: senhaHash });
  }
  if (!todosUsuariosLogin.some(function (u) { return u.nome === nome; })) {
    todosUsuariosLogin.push(novoUser);
    todosUsuariosLogin.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  }
  document.getElementById('novoUsuario').value = '';
  document.getElementById('novaSenhaUsuario').value = SENHA_PADRAO;
  renderizarListaUsuarios();
  popularDropdownUsuarios();
  toast(nome + ' adicionado', 'success');
}

async function toggleUsuarioAtivo(nome) {
  if (nome === ADMIN_USER) {
    toast('Não é possível desativar o usuário admin', 'error');
    return;
  }
  var u = todosUsuariosLogin.find(function (u) { return u.nome === nome; });
  if (!u) return;
  u.ativo = !u.ativo;
  if (fbDisponivel()) {
    var docId = 'usr_' + nome;
    await fbDocSet('usuarios', docId, { nome: nome, ativo: u.ativo, admin: u.admin === true, senhaHash: u.senhaHash || '' });
  }
  renderizarListaUsuarios();
  popularDropdownUsuarios();
  toast(nome + ' ' + (u.ativo ? 'reativado' : 'desativado'), 'success');
}

async function resetarSenhaUsuario(nome) {
  var input = document.getElementById('senha_' + nome);
  var novaSenha = input.value.trim();
  if (!novaSenha) {
    toast('Digite uma nova senha', 'error');
    return;
  }
  var u = todosUsuariosLogin.find(function (u) { return u.nome === nome; });
  if (u) {
    u.senhaHash = await hashSenha(novaSenha);
    delete u.senha;
    if (fbDisponivel()) {
      var docId = 'usr_' + nome;
      await fbDocSet('usuarios', docId, { nome: nome, ativo: u.ativo, admin: u.admin === true, senhaHash: u.senhaHash });
    }
    input.value = '';
    renderizarListaUsuarios();
    popularDropdownUsuarios();
    toast('Senha de ' + nome + ' alterada', 'success');
  }
}

async function excluirUsuarioLogin(nome) {
  if (nome === ADMIN_USER) {
    toast('Não é possível excluir o usuário admin', 'error');
    return;
  }
  if (!confirm('Excluir permanentemente ' + nome + '?')) return;
  if (fbDisponivel()) {
    var docId = 'usr_' + nome;
    try {
      await fbDb.collection('usuarios').doc(docId).delete();
    } catch (e) {}
  }
  var idx = todosUsuariosLogin.findIndex(function (u) { return u.nome === nome; });
  if (idx !== -1) {
    todosUsuariosLogin.splice(idx, 1);
  }
  renderizarListaUsuarios();
  popularDropdownUsuarios();
  toast(nome + ' excluído', 'success');
}

// ==================== ESCAPE HTML ====================
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

// ==================== GERENCIAR LOJAS ====================
function normalizarLoja(nome) {
  var m = /^(\d{1,3})\s*-\s*(.+)$/.exec(String(nome).trim().toUpperCase());
  if (!m) return String(nome).trim().toUpperCase();
  return ('00' + m[1]).slice(-3) + '-' + m[2];
}

async function carregarLojasLogin() {
  lojasMercadoriasLogin = LOJAS_MERCADORIAS_DEFAULT.slice();
  if (!fbDisponivel()) return;
  try {
    var fbData = await fbCarregarConfig('config', 'lojas');
    if (fbData && Array.isArray(fbData.dados) && fbData.dados.length > 0) {
      lojasMercadoriasLogin = fbData.dados;
    } else {
      await fbSalvarConfig('config', 'lojas', { dados: lojasMercadoriasLogin });
    }
  } catch (e) {}
}

function salvarLojasLogin() {
  fbSalvarConfig('config', 'lojas', { dados: lojasMercadoriasLogin });
}

function renderizarListaLojas() {
  var lista = document.getElementById('listaLojas');
  if (!lista) return;
  lista.innerHTML = '';
  lojasMercadoriasLogin.forEach(function (loja, idx) {
    var display = loja.replace(/^0(\d{2}-)/, '$1');
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(display) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editLoja_' + idx + '" placeholder="Novo nome" value="' + escapeHtml(display) + '"' +
          ' style="width:120px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"' +
          ' onkeypress="if(event.key===\'Enter\')editarLoja(' + idx + ')">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarLoja(' + idx + ')">Editar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirLoja(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function adicionarLoja() {
  var input = document.getElementById('novaLoja');
  var nome = normalizarLoja(input.value);
  if (!nome) {
    toast('Digite o nome da loja', 'error');
    return;
  }
  if (lojasMercadoriasLogin.some(function (l) { return l.toUpperCase() === nome; })) {
    toast('Loja já existe', 'error');
    return;
  }
  lojasMercadoriasLogin.push(nome);
  lojasMercadoriasLogin.sort(function (a, b) { return a.localeCompare(b); });
  salvarLojasLogin();
  input.value = '';
  renderizarListaLojas();
  toast(nome + ' adicionada', 'success');
}

function editarLoja(idx) {
  var input = document.getElementById('editLoja_' + idx);
  var novoNome = normalizarLoja(input.value);
  if (!novoNome) {
    toast('Digite o nome da loja', 'error');
    return;
  }
  var lojaAntiga = lojasMercadoriasLogin[idx];
  if (lojaAntiga.toUpperCase() === novoNome) return;
  if (lojasMercadoriasLogin.some(function (l, i) { return i !== idx && l.toUpperCase() === novoNome; })) {
    toast('Loja já existe', 'error');
    return;
  }
  lojasMercadoriasLogin[idx] = novoNome;
  lojasMercadoriasLogin.sort(function (a, b) { return a.localeCompare(b); });
  salvarLojasLogin();
  renderizarListaLojas();
  toast('Loja atualizada', 'success');
}

function excluirLoja(idx) {
  var loja = lojasMercadoriasLogin[idx];
  if (!confirm('Excluir a loja "' + loja + '"?')) return;
  lojasMercadoriasLogin.splice(idx, 1);
  salvarLojasLogin();
  renderizarListaLojas();
  toast(loja + ' excluída', 'success');
}

// ==================== GERENCIAR BRAÇOS ====================
async function carregarBracosLogin() {
  bracosConfigLogin = {};
  Object.entries(BRACOS_DEFAULT).forEach(function (entry) {
    bracosConfigLogin[entry[0]] = entry[1];
  });
  if (!fbDisponivel()) return;
  try {
    var fbData = await fbCarregarConfig('config', 'bracos');
    if (fbData && fbData.dados && typeof fbData.dados === 'object' && Object.keys(fbData.dados).length > 0) {
      bracosConfigLogin = fbData.dados;
    } else {
      await fbSalvarConfig('config', 'bracos', { dados: bracosConfigLogin });
    }
  } catch (e) {}
}

function salvarBracosLogin() {
  fbSalvarConfig('config', 'bracos', { dados: bracosConfigLogin });
}

function renderizarListaBracos() {
  var lista = document.getElementById('listaBracos');
  if (!lista) return;
  lista.innerHTML = '';
  var nomes = Object.keys(bracosConfigLogin);
  nomes.forEach(function (nome, idx) {
    var lojas = bracosConfigLogin[nome] || '';
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(nome) + '</span>' +
        '<span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px">' + escapeHtml(lojas) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editBracoNome_' + idx + '" placeholder="Novo nome" value="' + escapeHtml(nome) + '"' +
          ' style="width:90px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"' +
          ' onkeypress="if(event.key===\'Enter\')editarBraco(' + idx + ')">' +
        '<input type="text" id="editBracoLojas_' + idx + '" placeholder="Lojas" value="' + escapeHtml(lojas) + '"' +
          ' style="width:140px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"' +
          ' onkeypress="if(event.key===\'Enter\')editarBraco(' + idx + ')">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarBraco(' + idx + ')">Salvar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirBraco(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function adicionarBraco() {
  var inpNome = document.getElementById('novoBracoNome');
  var inpLojas = document.getElementById('novoBracoLojas');
  var nome = inpNome.value.trim();
  var lojas = inpLojas.value.trim();
  if (!nome) {
    toast('Digite o nome do braço', 'error');
    return;
  }
  if (bracosConfigLogin[nome]) {
    toast('Braço já existe', 'error');
    return;
  }
  bracosConfigLogin[nome] = lojas;
  salvarBracosLogin();
  inpNome.value = '';
  inpLojas.value = '';
  renderizarListaBracos();
  toast(nome + ' adicionado', 'success');
}

function editarBraco(idx) {
  var nomes = Object.keys(bracosConfigLogin);
  var nomeAntigo = nomes[idx];
  var inpNome = document.getElementById('editBracoNome_' + idx);
  var inpLojas = document.getElementById('editBracoLojas_' + idx);
  var novoNome = inpNome.value.trim();
  var novasLojas = inpLojas.value.trim();
  if (!novoNome) {
    toast('Digite o nome do braço', 'error');
    return;
  }
  if (novoNome !== nomeAntigo && bracosConfigLogin[novoNome]) {
    toast('Braço já existe', 'error');
    return;
  }
  if (novoNome !== nomeAntigo) {
    delete bracosConfigLogin[nomeAntigo];
  }
  bracosConfigLogin[novoNome] = novasLojas;
  salvarBracosLogin();
  renderizarListaBracos();
  toast('Braço atualizado', 'success');
}

function excluirBraco(idx) {
  var nomes = Object.keys(bracosConfigLogin);
  var nome = nomes[idx];
  if (!confirm('Excluir "' + nome + '"?')) return;
  delete bracosConfigLogin[nome];
  salvarBracosLogin();
  renderizarListaBracos();
  toast(nome + ' excluído', 'success');
}

// ==================== GERENCIAR SOLUÇÃO / OBSERVAÇÕES ====================
async function carregarObservacoesLogin() {
  observacoesCustomLogin = normalizarListaConfig(null);
  if (!fbDisponivel()) return;
  try {
    var fbData = await fbCarregarConfig('config', 'observacoes');
    if (fbData && fbData.dados !== undefined && fbData.dados !== null) {
      observacoesCustomLogin = ordenarListaConfig(normalizarListaConfig(fbData.dados));
      if (!Array.isArray(fbData.dados)) {
        await fbSalvarConfig('config', 'observacoes', { dados: observacoesCustomLogin });
      }
    } else {
      observacoesCustomLogin = ordenarListaConfig(mesclarListasPadrao(OBSERVACOES_CD1, OBSERVACOES_CD2));
      await fbSalvarConfig('config', 'observacoes', { dados: observacoesCustomLogin });
    }
  } catch (e) {}
}

function salvarObservacoesLogin() {
  fbSalvarConfig('config', 'observacoes', { dados: observacoesCustomLogin });
}

function renderizarListaObservacoes() {
  var lista = document.getElementById('listaObservacoes');
  if (!lista) return;
  lista.innerHTML = '';
  var arr = obterObsArrayLogin();
  arr.forEach(function (item, idx) {
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(item || '(vazio)') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editObs_' + idx + '" placeholder="Novo valor" value="' + escapeHtml(item) + '"' +
          ' style="width:180px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"' +
          ' onkeypress="if(event.key===\'Enter\')editarObservacao(' + idx + ')">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarObservacao(' + idx + ')">Editar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirObservacao(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function obterObsArrayLogin() {
  if (Array.isArray(observacoesCustomLogin) && observacoesCustomLogin.length > 0) {
    return ordenarListaConfig(observacoesCustomLogin);
  }
  return ordenarListaConfig(OBSERVACOES_CD1.slice());
}

function adicionarObservacao() {
  var input = document.getElementById('novaObservacao');
  var val = input.value.trim();
  if (!val) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  var arr = obterObsArrayLogin();
  if (arr.some(function (a) { return a.toUpperCase() === val.toUpperCase(); })) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(observacoesCustomLogin)) observacoesCustomLogin = arr.slice();
  observacoesCustomLogin.push(val);
  ordenarListaConfig(observacoesCustomLogin);
  salvarObservacoesLogin();
  input.value = '';
  renderizarListaObservacoes();
  toast('Opção adicionada', 'success');
}

function editarObservacao(idx) {
  var input = document.getElementById('editObs_' + idx);
  var novoVal = input.value.trim();
  if (!novoVal) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  var arr = obterObsArrayLogin();
  var antigo = arr[idx];
  if (antigo && antigo.toUpperCase() === novoVal.toUpperCase()) return;
  if (arr.some(function (a, i) { return i !== idx && a.toUpperCase() === novoVal.toUpperCase(); })) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(observacoesCustomLogin)) observacoesCustomLogin = arr.slice();
  observacoesCustomLogin[idx] = novoVal;
  ordenarListaConfig(observacoesCustomLogin);
  salvarObservacoesLogin();
  renderizarListaObservacoes();
  toast('Opção atualizada', 'success');
}

function excluirObservacao(idx) {
  var arr = obterObsArrayLogin();
  var item = arr[idx];
  if (!item) return;
  if (!confirm('Excluir "' + item + '"?')) return;
  if (!Array.isArray(observacoesCustomLogin)) observacoesCustomLogin = arr.slice();
  observacoesCustomLogin.splice(idx, 1);
  salvarObservacoesLogin();
  renderizarListaObservacoes();
  toast(item + ' excluída', 'success');
}

// ==================== GERENCIAR DIVERGÊNCIAS ====================
async function carregarDivergenciasLogin() {
  divergenciasCustomLogin = normalizarListaConfig(null);
  if (!fbDisponivel()) return;
  try {
    var fbData = await fbCarregarConfig('config', 'divergencias');
    if (fbData && fbData.dados !== undefined && fbData.dados !== null) {
      divergenciasCustomLogin = ordenarListaConfig(normalizarListaConfig(fbData.dados));
      if (!Array.isArray(fbData.dados)) {
        await fbSalvarConfig('config', 'divergencias', { dados: divergenciasCustomLogin });
      }
    } else {
      divergenciasCustomLogin = ordenarListaConfig(mesclarListasPadrao(DIVERGENCIAS_CD1, DIVERGENCIAS_CD2));
      await fbSalvarConfig('config', 'divergencias', { dados: divergenciasCustomLogin });
    }
  } catch (e) {}
}

function salvarDivergenciasLogin() {
  fbSalvarConfig('config', 'divergencias', { dados: divergenciasCustomLogin });
}

function renderizarListaDivergencias() {
  var lista = document.getElementById('listaDivergencias');
  if (!lista) return;
  lista.innerHTML = '';
  var arr = obterDivArrayLogin();
  arr.forEach(function (item, idx) {
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1">' +
        '<span style="font-weight:600">' + escapeHtml(item || '(vazio)') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="editDiv_' + idx + '" placeholder="Novo valor" value="' + escapeHtml(item) + '"' +
          ' style="width:180px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center"' +
          ' onkeypress="if(event.key===\'Enter\')editarDivergencia(' + idx + ')">' +
        '<button class="btn" style="padding:4px 8px;font-size:0.65rem" onclick="editarDivergencia(' + idx + ')">Editar</button>' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirDivergencia(' + idx + ')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

function obterDivArrayLogin() {
  if (Array.isArray(divergenciasCustomLogin) && divergenciasCustomLogin.length > 0) {
    return ordenarListaConfig(divergenciasCustomLogin);
  }
  return ordenarListaConfig(DIVERGENCIAS_CD1.slice());
}

function adicionarDivergencia() {
  var input = document.getElementById('novaDivergencia');
  var val = input.value.trim();
  if (!val) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  var arr = obterDivArrayLogin();
  if (arr.some(function (a) { return a.toUpperCase() === val.toUpperCase(); })) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(divergenciasCustomLogin)) divergenciasCustomLogin = arr.slice();
  divergenciasCustomLogin.push(val);
  ordenarListaConfig(divergenciasCustomLogin);
  salvarDivergenciasLogin();
  input.value = '';
  renderizarListaDivergencias();
  toast('Opção adicionada', 'success');
}

function editarDivergencia(idx) {
  var input = document.getElementById('editDiv_' + idx);
  var novoVal = input.value.trim();
  if (!novoVal) {
    toast('Digite o texto da opção', 'error');
    return;
  }
  var arr = obterDivArrayLogin();
  var antigo = arr[idx];
  if (antigo && antigo.toUpperCase() === novoVal.toUpperCase()) return;
  if (arr.some(function (a, i) { return i !== idx && a.toUpperCase() === novoVal.toUpperCase(); })) {
    toast('Opção já existe', 'error');
    return;
  }
  if (!Array.isArray(divergenciasCustomLogin)) divergenciasCustomLogin = arr.slice();
  divergenciasCustomLogin[idx] = novoVal;
  ordenarListaConfig(divergenciasCustomLogin);
  salvarDivergenciasLogin();
  renderizarListaDivergencias();
  toast('Opção atualizada', 'success');
}

function excluirDivergencia(idx) {
  var arr = obterDivArrayLogin();
  var item = arr[idx];
  if (!item) return;
  if (!confirm('Excluir "' + item + '"?')) return;
  if (!Array.isArray(divergenciasCustomLogin)) divergenciasCustomLogin = arr.slice();
  divergenciasCustomLogin.splice(idx, 1);
  salvarDivergenciasLogin();
  renderizarListaDivergencias();
  toast(item + ' excluída', 'success');
}

// ==================== GERENCIAR SENHAS SAC ====================
var senhasSACLogin = [];

function abrirModalSenhasSAC() {
  renderizarListaSenhasSAC();
  abrirModal('modalSenhasSAC');
  carregarSenhasSACLogin();
}

async function carregarSenhasSACLogin() {
  senhasSACLogin = [];
  if (!fbDisponivel()) { toast('Firebase indispon\u00edvel', 'error'); return; }
  try {
    var snap = await fbDb.collection('senhasSac').where('ativo', '==', true).get();
    snap.forEach(function (d) {
      var doc = d.data();
      doc.id = d.id;
      senhasSACLogin.push(doc);
    });
    senhasSACLogin.sort(function (a, b) {
      return (Number(b.criado) || 0) - (Number(a.criado) || 0);
    });
    renderizarListaSenhasSAC();
  } catch (err) {
    toast('Erro ao carregar senhas: ' + err.message, 'error');
  }
}

function renderizarListaSenhasSAC() {
  var lista = document.getElementById('listaSenhasSAC');
  if (!lista) return;
  var buscaEl = document.getElementById('buscaSenhaSAC');
  var filtroEl = document.getElementById('filtroCdSenhaSAC');
  var busca = (buscaEl && buscaEl.value || '').toLowerCase();
  var filtroCd = (filtroEl && filtroEl.value) || '';
  var filtrados = senhasSACLogin.filter(function (s) {
    if (!s) return false;
    if (filtroCd && s.cd !== filtroCd) return false;
    if (busca) {
      var texto = ((s.senha || '') + ' ' + (s.chamado || '') + ' ' + (s.loja || '') + ' ' +
        (s.divergencia || '') + ' ' + (s.responsavel || '') + ' ' + (s.data || '')).toLowerCase();
      if (texto.indexOf(busca) === -1) return false;
    }
    return true;
  });
  lista.innerHTML = '';
  if (filtrados.length === 0) {
    var vazio = document.createElement('div');
    vazio.style.cssText = 'padding:24px;text-align:center;color:var(--text-dim);font-size:13px';
    vazio.textContent = 'Nenhuma senha encontrada.';
    lista.appendChild(vazio);
    return;
  }
  filtrados.forEach(function (s) {
    var div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML =
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:600">' + escapeHtml('#' + (s.senha || '')) +
          ' <span style="font-weight:400;color:var(--text-dim)">\u00b7 ' + escapeHtml(s.cd || '') + '</span></div>' +
        '<div style="font-size:0.7rem;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          escapeHtml((s.chamado || '\u2014') + ' \u00b7 ' + (s.loja || '\u2014') + ' \u00b7 ' + (s.data || '')) +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<button class="btn danger" style="padding:4px 10px;font-size:0.7rem" onclick="excluirSenhaSAC(\'' + escapeAttr(s.id) + '\')">Excluir</button>' +
      '</div>';
    lista.appendChild(div);
  });
}

async function excluirSenhaSAC(id) {
  var s = senhasSACLogin.find(function (x) { return x.id === id; });
  if (!s) return;
  if (!confirm('Excluir a senha #' + s.senha + ' de ' + (s.cd || '?') + '?')) return;
  await fbDocDelete('senhasSac', id);
  senhasSACLogin = senhasSACLogin.filter(function (x) { return x.id !== id; });
  renderizarListaSenhasSAC();
  toast('Senha #' + s.senha + ' exclu\u00edda', 'success');
}

async function resetarContadorSenhaSAC() {
  if (!fbDisponivel()) { toast('Firebase indispon\u00edvel', 'error'); return; }
  var ano = new Date().getFullYear();
  var max = 0;
  (senhasSACLogin || []).forEach(function (s) {
    if (!s) return;
    var sAno = Number(s.ano) || parseInt(String(s.data || '').split('-')[0], 10) || ano;
    if (sAno !== ano) return;
    var n = parseInt(s.senha, 10) || 0;
    if (n > max) max = n;
  });
  var prox = max + 1;
  if (!confirm('Reajustar a numera\u00e7\u00e3o das senhas SAC do ano ' + ano + '?\n\nA pr\u00f3xima senha criada ser\u00e1 ' + prox + '.')) return;
  try {
    await fbDb.collection('contadores').doc('senhasSac_' + ano).set({ proximo: prox });
    toast('Numera\u00e7\u00e3o reajustada (pr\u00f3xima senha: ' + prox + ')', 'success');
  } catch (err) {
    toast('Erro ao reajustar: ' + err.message, 'error');
  }
}

async function zerarSenhasSAC() {
  if (!fbDisponivel()) { toast('Firebase indispon\u00edvel', 'error'); return; }
  if (!confirm('Apagar TODAS as senhas SAC de CD1 e CD2 (todos os anos) e zerar a numera\u00e7\u00e3o?')) return;
  if (!confirm('Tem certeza? Esta a\u00e7\u00e3o \u00e9 permanente e n\u00e3o pode ser desfeita.')) return;
  try {
    var senhas = [];
    var snap = await fbDb.collection('senhasSac').get();
    snap.forEach(function (d) { senhas.push(d.ref); });

    var batch = fbDb.batch();
    var i = 0;
    for (; i < senhas.length; i++) {
      batch.delete(senhas[i]);
      if ((i + 1) % 400 === 0) {
        await batch.commit();
        batch = fbDb.batch();
      }
    }
    if (i % 400 !== 0) await batch.commit();

    var contadores = await fbDb.collection('contadores').get();
    var batchCont = fbDb.batch();
    var j = 0;
    contadores.forEach(function (d) {
      if (d.id.indexOf('senhasSac_') !== 0) return;
      batchCont.set(d.ref, { proximo: 1 });
      j++;
      if (j % 400 === 0) {
        batchCont.commit();
        batchCont = fbDb.batch();
      }
    });
    if (j % 400 !== 0) await batchCont.commit();

    senhasSACLogin = [];
    renderizarListaSenhasSAC();
    toast('Banco de senhas SAC zerado. Pr\u00f3xima senha: #1', 'success');
  } catch (err) {
    toast('Erro ao zerar: ' + err.message, 'error');
  }
}

// ==================== BACKUP ====================
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

function contarRegistrosBackup(backup) {
  var total = 0;
  var qtdChamados = 0;
  if (backup.dados) {
    if (Array.isArray(backup.dados)) {
      backup.dados.forEach(function (m) {
        if (Array.isArray(m.registros)) qtdChamados += m.registros.length;
        else if (m.registros && typeof m.registros === 'object') qtdChamados += Object.keys(m.registros).length;
      });
    } else if (typeof backup.dados === 'object') {
      Object.values(backup.dados).forEach(function (regs) {
        if (Array.isArray(regs)) qtdChamados += regs.length;
        else if (regs && typeof regs === 'object') qtdChamados += Object.keys(regs).length;
      });
    }
  }
  total = qtdChamados;
  if (backup.senhasSac) total += backup.senhasSac.length;
  if (backup.notasDevolucao) total += backup.notasDevolucao.length;
  if (backup.mercadoriasNF) total += backup.mercadoriasNF.length;
  return total;
}

function contarRegistrosAtuais() {
  var total = 0;
  total += _contarLocalChamados();
  total += _contarLocalColecao('SENHAS_SAC_dados');
  total += _contarLocalColecao('NOTAS_DEV_dados');
  total += _contarLocalColecao('MERCADORIAS_NF_dados');
  return total;
}

async function exportarBackupCompleto() {
  var dadosCD = [];
  var senhasSac = [];
  var notasDevolucao = [];
  var mercadoriasNF = [];
  var prodData = [];

  if (fbDisponivel()) {
    try {
      var fbDados = await fbCarregarTudoBackup();
      if (fbDados && Object.keys(fbDados.chamados).length > 0) {
        var cds = Object.keys(fbDados.chamados);
        cds.forEach(function (cd) {
          Object.keys(fbDados.chamados[cd]).forEach(function (mes) {
            dadosCD.push({ mes: mes, registros: fbDados.chamados[cd][mes] });
          });
        });
      }
      senhasSac = fbDados.senhasSac || [];
      notasDevolucao = fbDados.notasDev || [];
      mercadoriasNF = fbDados.mercadoriasNF || [];
      prodData = fbDados.produtividade || [];
    } catch (e) {}
  }

  if (dadosCD.length === 0) {
    var dadosPorMesLogin = {};
    ['CD1', 'CD2'].forEach(function (cd) {
      try {
        var raw = localStorage.getItem('SAC_' + cd + '_dados');
        if (raw) {
          var itens = JSON.parse(raw);
          for (var i = 0; i < itens.length; i++) {
            var item = itens[i];
            if (!item || !item.mes) continue;
            if (!dadosPorMesLogin[item.mes]) dadosPorMesLogin[item.mes] = [];
            dadosPorMesLogin[item.mes] = dadosPorMesLogin[item.mes].concat(item.registros || []);
          }
        }
      } catch {}
    });
    Object.keys(dadosPorMesLogin).forEach(function (mes) {
      dadosCD.push({ mes: mes, registros: dadosPorMesLogin[mes] });
    });
  }

  if (senhasSac.length === 0) {
    ['CD1', 'CD2'].forEach(function (cd) {
      try { senhasSac = senhasSac.concat(JSON.parse(localStorage.getItem('SAC_' + cd + '_SENHAS_SAC_dados')) || []); } catch {}
    });
  }
  if (notasDevolucao.length === 0) {
    ['CD1', 'CD2'].forEach(function (cd) {
      try { notasDevolucao = notasDevolucao.concat(JSON.parse(localStorage.getItem('SAC_' + cd + '_NOTAS_DEV_dados')) || []); } catch {}
    });
  }
  if (mercadoriasNF.length === 0) {
    ['CD1', 'CD2'].forEach(function (cd) {
      try { mercadoriasNF = mercadoriasNF.concat(JSON.parse(localStorage.getItem('SAC_' + cd + '_MERCADORIAS_NF_dados')) || []); } catch {}
    });
  }

  var bracos = {};
  try { bracos = JSON.parse(localStorage.getItem('SAC_brasConfig')) || {}; } catch {}
  var lojas = [];
  try { lojas = JSON.parse(localStorage.getItem('SAC_LOJAS_MERCADORIAS')) || []; } catch {}

  if (fbDisponivel()) {
    try {
      var fbLojas = await fbCarregarConfig('config', 'lojas');
      if (fbLojas && Array.isArray(fbLojas.dados)) lojas = fbLojas.dados;
    } catch {}
    try {
      var fbBracos = await fbCarregarConfig('config', 'bracos');
      if (fbBracos && fbBracos.dados) bracos = fbBracos.dados;
    } catch {}
  }

  var usuariosData = todosUsuariosLogin.slice();

  var agorats = new Date().toISOString();
  var timestampsPorColecao = {
    chamados: agorats,
    senhasSac: agorats,
    notasDevolucao: agorats,
    mercadoriasNF: agorats,
    produtividade: agorats,
    usuarios: agorats
  };

  var backup = {
    versao: 3,
    cd: 'CD1',
    dataBackup: agorats,
    timestampsPorColecao: timestampsPorColecao,
    usuarios: usuariosData,
    dados: dadosCD,
    senhasSac: senhasSac,
    notasDevolucao: notasDevolucao,
    mercadoriasNF: mercadoriasNF,
    produtividade: prodData,
    bracosConfig: bracos,
    lojasMercadorias: lojas
  };

  var json = JSON.stringify(backup, null, 2);
  baixarArquivo(json, 'SAC_Backup_' + formatDate(new Date()) + '.json', 'application/json');
  fecharModal('modalBackup');
  toast('Backup completo exportado!', 'success');
}

function importarBackupCompleto() {
  document.getElementById('jsonInput').click();
}

function importarBackupCompletoFile() {
  var file = document.getElementById('jsonInput').files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = async function (e) {
    try {
      var backup = JSON.parse(e.target.result);

      var isV3 = backup.versao === 3 && backup.cd && backup.dados;
      var isV2 = backup.versao === 2 && backup.dadosCD1;
      var isV1 = !backup.versao && backup.usuarios && backup.dados && !backup.dadosCD1;

      if (!isV1 && !isV2 && !isV3) {
        toast('Arquivo de backup inválido', 'error');
        document.getElementById('jsonInput').value = '';
        return;
      }

      var dadosBackupArr = [];
      if (isV3) dadosBackupArr = backup.dados || [];
      else if (isV2) dadosBackupArr = [].concat(backup.dadosCD1 || []).concat(backup.dadosCD2 || []);
      else dadosBackupArr = Object.entries(backup.dados || {}).map(function (entry) {
        return { mes: entry[0], registros: normalizarRegistros(entry[1]) };
      });

      if (backup.versao === 3 && backup.timestampsPorColecao) {
        var colecoesAntigas = [];
        for (var colecao in backup.timestampsPorColecao) {
          var tsBackup = new Date(backup.timestampsPorColecao[colecao]);
          var diasAtras = (new Date() - tsBackup) / 86400000;
          if (diasAtras > 90) {
            colecoesAntigas.push(colecao + ' (' + Math.round(diasAtras) + 'd)');
          }
        }
        if (colecoesAntigas.length > 0) {
          var confirma = confirm('Coleções com mais de 90 dias: ' + colecoesAntigas.join(', ') + '. Deseja importar mesmo assim?');
          if (!confirma) { document.getElementById('jsonInput').value = ''; return; }
        }
      } else if (backup.versao === 3 && backup.dataBackup) {
        var dataBackup = new Date(backup.dataBackup);
        var diasAtras = (new Date() - dataBackup) / 86400000;
        if (diasAtras > 90) {
          var confirma = confirm('Este backup tem mais de 90 dias (' + Math.round(diasAtras) + ' dias). Deseja importar mesmo assim?');
          if (!confirma) { document.getElementById('jsonInput').value = ''; return; }
        }
      }

      // Importar usuários
      todosUsuariosLogin = backup.usuarios || [];
      for (var u of todosUsuariosLogin) {
        if (!u.senhaHash) {
          u.senhaHash = await hashSenha(u.senha || SENHA_PADRAO);
        }
        delete u.senha;
      }
      var usuariosSnapshot = todosUsuariosLogin.slice();
      lsSetShared('SAC_USUARIOS', usuariosSnapshot);
      if (fbDisponivel()) {
        for (var i = 0; i < usuariosSnapshot.length; i++) {
          var usr = usuariosSnapshot[i];
          if (!usr.nome) continue;
          var docId = 'usr_' + usr.nome;
          await fbDocSet('usuarios', docId, {
            nome: usr.nome,
            ativo: usr.ativo !== false,
            admin: usr.admin === true,
            senhaHash: usr.senhaHash || ''
          });
        }
      }

      // Importar dados de chamados para localStorage
      if (isV3) {
        var dadosImport = (backup.dados || []).map(function (d) {
          return { mes: d.mes, registros: normalizarRegistros(d.registros) };
        });
        var cdsParaImportar = ['CD1', 'CD2'];
        for (var c = 0; c < cdsParaImportar.length; c++) {
          try { localStorage.setItem('SAC_' + cdsParaImportar[c] + '_dados', JSON.stringify(dadosImport)); } catch {}
        }
      } else if (isV2) {
        var dadosCD1Import = (backup.dadosCD1 || []).map(function (d) {
          return { mes: d.mes, registros: normalizarRegistros(d.registros) };
        });
        try { localStorage.setItem('SAC_SAC_CD1_dados', JSON.stringify(dadosCD1Import)); } catch {}
        var dadosCD2Import = (backup.dadosCD2 || []).map(function (d) {
          return { mes: d.mes, registros: normalizarRegistros(d.registros) };
        });
        try { localStorage.setItem('SAC_SAC_CD2_dados', JSON.stringify(dadosCD2Import)); } catch {}
      }

      // Importar coleções para localStorage
      if (backup.senhasSac) {
        try { localStorage.setItem('SAC_CD1_SENHAS_SAC_dados', JSON.stringify(backup.senhasSac)); } catch {}
        try { localStorage.setItem('SAC_CD2_SENHAS_SAC_dados', JSON.stringify(backup.senhasSac)); } catch {}
      }
      if (backup.notasDevolucao) {
        try { localStorage.setItem('SAC_CD1_NOTAS_DEV_dados', JSON.stringify(backup.notasDevolucao)); } catch {}
        try { localStorage.setItem('SAC_CD2_NOTAS_DEV_dados', JSON.stringify(backup.notasDevolucao)); } catch {}
      }
      if (backup.mercadoriasNF) {
        try { localStorage.setItem('SAC_CD1_MERCADORIAS_NF_dados', JSON.stringify(backup.mercadoriasNF)); } catch {}
        try { localStorage.setItem('SAC_CD2_MERCADORIAS_NF_dados', JSON.stringify(backup.mercadoriasNF)); } catch {}
      }
      if (backup.bracosConfig) {
        try { localStorage.setItem('SAC_brasConfig', JSON.stringify(backup.bracosConfig)); } catch {}
        bracosConfigLogin = backup.bracosConfig;
      }
      if (backup.lojasMercadorias) {
        try { localStorage.setItem('SAC_LOJAS_MERCADORIAS', JSON.stringify(backup.lojasMercadorias)); } catch {}
        lojasMercadoriasLogin = backup.lojasMercadorias;
      }

      // Importar para o Firestore
      if (fbDisponivel()) {
        var importPromises = [];

        if (backup.versao === 3) {
          (backup.dados || []).forEach(function (mesItem) {
            var regs = normalizarRegistros(mesItem.registros);
            regs.forEach(function (r) {
              if (r && r.id) {
                importPromises.push(
                  fbDb.collection('chamados').doc(r.id).set(
                    fbDataComAuditoria(r, { cd: 'CD1', mesNome: mesItem.mes }),
                    { merge: true }
                  ).catch(function () {})
                );
              }
            });
          });
        }

        (backup.senhasSac || []).forEach(function (item) {
          var docId = item.id || item.firestoreId;
          if (docId) {
            importPromises.push(
              fbDb.collection('senhasSac').doc(docId).set(
                fbDataComAuditoria(item, { cd: 'CD1' }),
                { merge: true }
              ).catch(function () {})
            );
          }
        });

        (backup.notasDevolucao || []).forEach(function (item) {
          var docId = item.id || item.firestoreId;
          if (docId) {
            importPromises.push(
              fbDb.collection('notasDevolucao').doc(docId).set(
                fbDataComAuditoria(item, { cd: 'CD1' }),
                { merge: true }
              ).catch(function () {})
            );
          }
        });

        (backup.mercadoriasNF || []).forEach(function (item) {
          var docId = item.id || item.firestoreId;
          if (docId) {
            importPromises.push(
              fbDb.collection('mercadoriasNF').doc(docId).set(
                fbDataComAuditoria(item, { cd: 'CD1' }),
                { merge: true }
              ).catch(function () {})
            );
          }
        });

        if (backup.produtividade) {
          (backup.produtividade || []).forEach(function (item) {
            var docId = item.id || item.firestoreId;
            if (docId) {
              importPromises.push(
                fbDb.collection('produtividade').doc(docId).set(
                  fbDataComAuditoria(item, { cd: 'CD1' }),
                  { merge: true }
                ).catch(function () {})
              );
            }
          });
        }

        // Salvar configs
        if (backup.lojasMercadorias) {
          importPromises.push(fbSalvarConfig('config', 'lojas', { dados: backup.lojasMercadorias }));
        }
        if (backup.bracosConfig) {
          importPromises.push(fbSalvarConfig('config', 'bracos', { dados: backup.bracosConfig }));
        }

        await Promise.all(importPromises);
      }

      fecharModal('modalBackup');
      toast('Backup importado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      toast('Erro ao processar arquivo de backup', 'error');
    }
  };
  reader.readAsText(file);
  document.getElementById('jsonInput').value = '';
}

function normalizarRegistros(registros) {
  if (Array.isArray(registros)) return registros;
  if (registros && typeof registros === 'object') return Object.values(registros);
  return [];
}

// ==================== LOGIN ====================
function popularDropdownUsuarios() {
  var sel = document.getElementById('loginUsuario');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecione —</option>';
  todosUsuariosLogin.forEach(function (u) {
    if (!u.ativo) return;
    var opt = document.createElement('option');
    opt.value = u.nome;
    opt.textContent = u.nome;
    sel.appendChild(opt);
  });
}

async function fazerLogin(cd) {
  var sel = document.getElementById('loginUsuario');
  var senhaInput = document.getElementById('loginSenha');
  var erroEl = document.getElementById('loginErro');
  if (!sel || !senhaInput || !erroEl) return;

  var nome = sel.value;
  var senha = senhaInput.value.trim();
  if (!nome || !senha) {
    erroEl.style.display = 'block';
    erroEl.textContent = 'Selecione um usuário e digite a senha!';
    senhaInput.focus();
    return;
  }

  var usuario = null;
  for (var i = 0; i < todosUsuariosLogin.length; i++) {
    if (todosUsuariosLogin[i].nome === nome && todosUsuariosLogin[i].ativo) {
      usuario = todosUsuariosLogin[i];
      break;
    }
  }
  if (!usuario) {
    erroEl.style.display = 'block';
    erroEl.textContent = 'Usuário não encontrado!';
    sel.focus();
    return;
  }

  var senhaHash = await hashSenha(senha);
  if (senhaHash !== usuario.senhaHash) {
    erroEl.style.display = 'block';
    erroEl.textContent = 'Senha incorreta!';
    senhaInput.value = '';
    senhaInput.focus();
    return;
  }

  erroEl.style.display = 'none';
  try { sessionStorage.setItem('sac_usuario_logado', nome); } catch (e) {}
  try { sessionStorage.setItem('sac_cd_atual', cd); } catch (e) {}
  try {
    localStorage.setItem('SAC_sessao', JSON.stringify({
      nome: nome,
      cd: cd,
      timestamp: new Date().toISOString(),
      expiraEm: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    }));
  } catch (e) {}

  var url = cd === 'CD1' ? 'SAC1.html' : 'SAC2.html';
  window.location.href = url;
}

// ==================== FIREBASE AUTO-INIT ====================
(async function () {
  await fbInit();

  await Promise.all([
    carregarUsuariosLogin(),
    carregarLojasLogin(),
    carregarBracosLogin(),
    carregarObservacoesLogin(),
    carregarDivergenciasLogin()
  ]);

  registrarSnapshotsConfigLogin();
  popularDropdownUsuarios();
})();

// ==================== SNAPSHOTS DAS CONFIGS (tempo real) ====================
function registrarSnapshotsConfigLogin() {
  if (!fbDisponivel()) return;
  fbOnSnapshotConfig('config', 'lojas', function (data) {
    if (data && Array.isArray(data.dados) && data.dados.length > 0) {
      lojasMercadoriasLogin = data.dados;
    }
    reRenderizarModalConfigAberto();
  });
  fbOnSnapshotConfig('config', 'bracos', function (data) {
    if (data && data.dados && typeof data.dados === 'object' && Object.keys(data.dados).length > 0) {
      bracosConfigLogin = data.dados;
    }
    reRenderizarModalConfigAberto();
  });
  fbOnSnapshotConfig('config', 'observacoes', function (data) {
    if (data && data.dados !== undefined && data.dados !== null) {
      observacoesCustomLogin = normalizarListaConfig(data.dados);
    }
    reRenderizarModalConfigAberto();
  });
  fbOnSnapshotConfig('config', 'divergencias', function (data) {
    if (data && data.dados !== undefined && data.dados !== null) {
      divergenciasCustomLogin = normalizarListaConfig(data.dados);
    }
    reRenderizarModalConfigAberto();
  });
}

function reRenderizarModalConfigAberto() {
  ['modalLojas', 'modalBracos', 'modalObservacoes', 'modalDivergencias'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || !el.classList.contains('show')) return;
    if (id === 'modalLojas') renderizarListaLojas();
    else if (id === 'modalBracos') renderizarListaBracos();
    else if (id === 'modalObservacoes') renderizarListaObservacoes();
    else if (id === 'modalDivergencias') renderizarListaDivergencias();
  });
}
