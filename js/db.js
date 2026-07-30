// ==================== BANCO DE DADOS (localStorage) ====================
let DB_NAME = 'SAC_CD1';
let cdAtual = 'CD1';
document.body.classList.add('cd1-active');

let usuarios = [];
let todosUsuarios = [];
let dadosMes = {};
let mesAtual = '';
let adminMode = false;
let usuarioSelecionado = null;

// ==================== LOCALSTORAGE ====================
function lsKey(chave) { return 'SAC_' + DB_NAME + '_' + chave; }
function lsGet(chave) {
  try { return JSON.parse(localStorage.getItem(lsKey(chave))); } catch { return null; }
}
function lsSet(chave, valor) {
  try { localStorage.setItem(lsKey(chave), JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

// Helpers para chaves compartilhadas (não dependem de CD)
function lsGetShared(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSetShared(key, valor) {
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

// Helpers para dados CD-específicos (com migração automática)
function lsGetCd(chave) {
  const cdKey = 'SAC_' + cdAtual + '_' + chave;
  try {
    const cdDados = JSON.parse(localStorage.getItem(cdKey));
    if (cdDados !== null) return cdDados;
  } catch {}
  const sharedKey = 'SAC_' + chave;
  try {
    const sharedDados = JSON.parse(localStorage.getItem(sharedKey));
    if (sharedDados !== null) {
      localStorage.setItem(cdKey, JSON.stringify(sharedDados));
      return sharedDados;
    }
  } catch {}
  return null;
}

function lsSetCd(chave, valor) {
  const cdKey = 'SAC_' + cdAtual + '_' + chave;
  try { localStorage.setItem(cdKey, JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

// Helpers para dados CD-específicos com chave customizada (sem prefixo SAC_)
function lsGetCdRaw(chave) {
  const cdKey = cdAtual + '_' + chave;
  try {
    const cdDados = JSON.parse(localStorage.getItem(cdKey));
    if (cdDados !== null) return cdDados;
  } catch {}
  try {
    const sharedDados = JSON.parse(localStorage.getItem(chave));
    if (sharedDados !== null) {
      localStorage.setItem(cdKey, JSON.stringify(sharedDados));
      return sharedDados;
    }
  } catch {}
  return null;
}

function lsSetCdRaw(chave, valor) {
  const cdKey = cdAtual + '_' + chave;
  try { localStorage.setItem(cdKey, JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

function normalizarRegistros(registros) {
  if (Array.isArray(registros)) return registros;
  if (registros && typeof registros === 'object') return Object.values(registros);
  return [];
}

// ==================== FIRESTORE SYNC ====================
function gerarId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
}

function garantirIds(arr) {
  var mudou = false;
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].id && !arr[i].firestoreId) {
      arr[i].id = gerarId();
      mudou = true;
    }
  }
  return mudou;
}

// Chamados: carregar de Firestore, fallback localStorage
async function fbCarregarChamados() {
  if (!fbDisponivel() || !cdAtual) return false;
  var ano = new Date().getFullYear();
  var resultados = await fbQuery('chamados', [
    ['cd', '==', cdAtual],
    ['ano', '==', ano],
    ['ativo', '==', true]
  ]);
  if (!resultados || resultados.length === 0) return false;

  var fbDadosMes = {};
  resultados.forEach(function (r) {
    var mesNome = r.mesNome || '';
    if (!mesNome && r.mes !== undefined && r.mes >= 0) mesNome = MESES[r.mes] || '';
    if (!mesNome) return;
    if (!fbDadosMes[mesNome]) fbDadosMes[mesNome] = [];
    var item = {
      id: r.id || r.firestoreId,
      chamado: r.chamado || '',
      loja: r.loja || '',
      braco: r.braco || '',
      turno: r.turno || '',
      setor: r.setor || '',
      plu: r.plu || '',
      divergencia: r.divergencia || '',
      observacao: r.observacao || '',
      obsTexto: r.obsTexto || '',
      conferente: r.conferente || '',
      usuario: r.usuario || '',
      dataAbertura: r.dataAbertura || '',
      dataFechamento: r.dataFechamento || ''
    };
    fbDadosMes[mesNome].push(item);
  });

  dadosMes = fbDadosMes;
  return true;
}

async function fbSalvarChamados() {
  if (!fbDisponivel() || !cdAtual || !mesAtual) return;
  var registros = normalizarRegistros(dadosMes[mesAtual]);
  var ano = new Date().getFullYear();
  var mesIdx = MESES.indexOf(mesAtual);
  if (mesIdx < 0) return;

  for (var i = 0; i < registros.length; i++) {
    var c = registros[i];
    if (!c || !c.id) continue;
    await fbDocSet('chamados', c.id, {
      id: c.id,
      chamado: c.chamado || '',
      loja: c.loja || '',
      braco: c.braco || '',
      turno: c.turno || '',
      setor: c.setor || '',
      plu: c.plu || '',
      divergencia: c.divergencia || '',
      observacao: c.observacao || '',
      obsTexto: c.obsTexto || '',
      conferente: c.conferente || '',
      usuario: c.usuario || '',
      dataAbertura: c.dataAbertura || '',
      dataFechamento: c.dataFechamento || ''
    }, {
      cd: cdAtual,
      ano: ano,
      mes: mesIdx,
      mesNome: mesAtual
    });
  }
}

async function fbExcluirChamado(id) {
  await fbDocDelete('chamados', id);
}

// Coleções genéricas (senhaSac, notasDev, mercadoriasNF)
async function fbCarregarColecao(colecao, alvo) {
  if (!fbDisponivel() || !cdAtual) return false;
  var resultados = await fbQuery(colecao, [
    ['cd', '==', cdAtual],
    ['ativo', '==', true]
  ]);
  if (!resultados || resultados.length === 0) return false;

  alvo.length = 0;
  resultados.forEach(function (r) {
    var item = {};
    for (var k in r) {
      if (k !== 'firestoreId' && k !== 'cd' && k !== 'ano' && k !== 'mes' &&
        k !== 'mesNome' && k !== 'ativo' && k !== 'criadoEm' && k !== 'criadoPor' &&
        k !== 'alteradoEm' && k !== 'alteradoPor') {
        item[k] = r[k];
      }
    }
    if (!item.id && !item.firestoreId) item.id = r.firestoreId;
    alvo.push(item);
  });
  return true;
}

async function fbSalvarColecao(colecao, alvo, extra) {
  if (!fbDisponivel() || !cdAtual) return;
  for (var i = 0; i < alvo.length; i++) {
    var item = alvo[i];
    var docId = item.id || item.firestoreId || gerarId();
    if (!item.id) item.id = docId;
    await fbDocSet(colecao, docId, item, { cd: cdAtual, mesNome: mesAtual });
  }
}

async function fbExcluirItemColecao(colecao, item) {
  var docId = item.id || item.firestoreId;
  await fbDocDelete(colecao, docId);
}

// Produtividade
async function fbCarregarProdutividade() {
  if (!fbDisponivel()) return false;
  var resultados = await fbQuery('produtividade', [
    ['cd', '==', cdAtual],
    ['ativo', '==', true]
  ]);
  if (!resultados || resultados.length === 0) return false;

  dadosProdutividade = {};
  resultados.forEach(function (r) {
    var mesNome = r.mes || '';
    if (mesNome && MESES.indexOf(mesNome) >= 0) {
      dadosProdutividade[mesNome] = {
        t1: r.t1 || 0,
        t2: r.t2 || 0,
        t3: r.t3 || 0
      };
    }
  });
  return true;
}

async function fbSalvarProdutividade() {
  if (!fbDisponivel() || !cdAtual) return;
  var ano = new Date().getFullYear();
  for (var i = 0; i < MESES.length; i++) {
    var mes = MESES[i];
    var d = dadosProdutividade[mes];
    if (!d) continue;
    var docId = cdAtual + '_' + ano + '_' + mes;
    await fbDocSet('produtividade', docId, {
      mes: mes,
      t1: d.t1 || 0,
      t2: d.t2 || 0,
      t3: d.t3 || 0
    }, {
      cd: cdAtual,
      ano: ano
    });
  }
}

// Usuarios
async function fbCarregarUsuarios() {
  if (!fbDisponivel()) return false;
  var resultados = await fbQuery('usuarios', [
    ['ativo', '==', true]
  ]);
  if (!resultados || resultados.length === 0) return false;

  var fbUsuarios = [];
  resultados.forEach(function (r) {
    fbUsuarios.push({
      nome: r.nome || '',
      ativo: r.ativo !== false,
      admin: r.admin === true,
      senhaHash: r.senhaHash || ''
    });
  });
  if (fbUsuarios.length > 0) {
    todosUsuarios = fbUsuarios;
    return true;
  }
  return false;
}

async function fbSalvarUsuarios() {
  if (!fbDisponivel()) return;
  for (var i = 0; i < todosUsuarios.length; i++) {
    var u = todosUsuarios[i];
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
