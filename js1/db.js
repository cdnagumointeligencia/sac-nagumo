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

function lsGetShared(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSetShared(key, valor) {
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { console.warn('localStorage save error:', e); }
}

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

function normalizarRegistros(registros) {
  if (Array.isArray(registros)) return registros;
  if (registros && typeof registros === 'object') return Object.values(registros);
  return [];
}

// ==================== FIRESTORE SYNC HELPERS ====================
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

// ==================== CHAMADOS: onSnapshot + Write ====================
var _fbTimerChamados = null;
var _snapChamados = null;
var _chamadosInicialResolve = null;

function fbMontarDadosMes(resultados) {
  var fbDadosMes = {};
  var currentYear = new Date().getFullYear();
  resultados.forEach(function (r) {
    var mesNome = r.mesNome || '';
    if (!mesNome && r.mes !== undefined && r.mes >= 0) mesNome = MESES[r.mes] || '';
    if (!mesNome) return;
    if (!fbDadosMes[mesNome]) fbDadosMes[mesNome] = [];
    var obj = {
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
      dataFechamento: r.dataFechamento || '',
      ano: r.ano !== undefined ? r.ano : (r.dataAbertura ? extrairAnoDeData(r.dataAbertura) : currentYear)
    };
    fbDadosMes[mesNome].push(obj);
  });
  return fbDadosMes;
}

async function fbCarregarChamados() {
  if (!fbDisponivel() || !cdAtual) return new Promise(function (r) { r(false); });

  if (_snapChamados) { try { _snapChamados(); } catch (e) {} _snapChamados = null; }

  var ano = new Date().getFullYear();
  var p = new Promise(function (resolve) {
    _chamadosInicialResolve = resolve;

    _snapChamados = fbOnSnapshot('chamados', [
      ['cd', '==', cdAtual],
      ['ano', '==', ano],
      ['ativo', '==', true]
    ], function (resultados) {
      var fbDadosMes = fbMontarDadosMes(resultados);
      var excluidos = idsChamadosExcluidos();
      for (var mes in fbDadosMes) {
        if (!dadosMes[mes]) {
          dadosMes[mes] = fbDadosMes[mes].filter(function (fb) { return excluidos.indexOf(fb.id) === -1; });
        } else {
          dadosMes[mes] = dadosMes[mes].filter(function (d) { return excluidos.indexOf(d.id) === -1; });
          var porId = {};
          dadosMes[mes].forEach(function (d) { if (d.id) porId[d.id] = d; });
          fbDadosMes[mes].forEach(function (fb) {
            if (excluidos.indexOf(fb.id) !== -1) return;
            if (fb.id && porId[fb.id]) {
              for (var k in fb) {
                if (k === 'id' || k === 'firestoreId') continue;
                if (!fb[k] && porId[fb.id][k]) continue;
                porId[fb.id][k] = fb[k];
              }
            } else {
              dadosMes[mes].push(fb);
            }
          });
        }
      }

      if (_chamadosInicialResolve) {
        var r = _chamadosInicialResolve;
        _chamadosInicialResolve = null;
        r(Object.keys(fbDadosMes).length > 0);
      } else {
        if (paginaAtual === 'chamados') {
          agendarRenderSePossivel(function () { renderizarTabela(); atualizarTotais(); });
        }
      }
    });
  });

  var ok = await p;
  return ok;
}

function _idNatural(id) {
  return id && id.indexOf(cdAtual + '_') === 0;
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
    if (!_idNatural(c.id)) continue;
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

// ==================== EXCLUSÃO DE CHAMADOS ====================
var _idsChamadosExcluidos = null;
function idsChamadosExcluidos() {
  if (!_idsChamadosExcluidos) {
    var salvos = lsGet('chamadosExcluidos');
    _idsChamadosExcluidos = Array.isArray(salvos) ? salvos : [];
  }
  return _idsChamadosExcluidos;
}
function marcarChamadoExcluido(id) {
  if (!id) return;
  var lista = idsChamadosExcluidos();
  if (lista.indexOf(id) === -1) {
    lista.push(id);
    if (lista.length > 1000) lista.splice(0, lista.length - 1000);
    lsSet('chamadosExcluidos', lista);
  }
}
function desmarcarChamadoExcluido(id) {
  if (!id) return;
  var lista = idsChamadosExcluidos();
  var i = lista.indexOf(id);
  if (i !== -1) {
    lista.splice(i, 1);
    lsSet('chamadosExcluidos', lista);
  }
}

async function fbExcluirChamado(id) {
  if (!id) return;
  marcarChamadoExcluido(id);
  await fbDocApagar('chamados', id);
}

async function fbLimparChamadosLegado() {
  if (!fbDisponivel() || !cdAtual) return;
  var ano = new Date().getFullYear();
  var resultados = await fbQuery('chamados', [
    ['cd', '==', cdAtual],
    ['ano', '==', ano],
    ['ativo', '==', true]
  ]);
  if (!resultados) return;
  var prefixo = cdAtual + '_';
  var promises = [];
  for (var i = 0; i < resultados.length; i++) {
    var r = resultados[i];
    var docId = r.firestoreId || r.id;
    if (docId && docId.indexOf(prefixo) !== 0) {
      marcarChamadoExcluido(docId);
      promises.push(fbDocApagar('chamados', docId));
    }
  }
  await Promise.all(promises);
}

// ==================== COLEÇÕES GENÉRICAS: onSnapshot + Write ====================
var _snapSenhas = null;
var _snapNotas = null;
var _snapMerc = null;
var _snapProd = null;

function fbOnSnapshotColecao(colecao, alvo, extraConditions) {
  var ano = new Date().getFullYear();
  var conditions = [['cd', '==', cdAtual], ['ano', '==', ano], ['ativo', '==', true]];
  if (extraConditions) conditions = conditions.concat(extraConditions);

  return fbOnSnapshot(colecao, conditions, function (resultados) {
    var qtdAntes = alvo.length;
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
    if (resultados.length > 0) {
      var pageMap = { senhasSac: 'senhaSac', notasDevolucao: 'notasDevolucao', mercadoriasNF: 'mercadoriasNF' };
      var pagina = pageMap[colecao];
      if (pagina && paginaAtual === pagina) {
        if (pagina === 'senhaSac') agendarRenderSePossivel(renderizarSenhasSac);
        else if (pagina === 'notasDevolucao') agendarRenderSePossivel(renderizarNotasDevolucao);
        else if (pagina === 'mercadoriasNF') agendarRenderSePossivel(renderizarMercadoriasNF);
      }
    }
    return qtdAntes !== alvo.length;
  });
}

async function fbCarregarColecao(colecao, alvo) {
  if (!fbDisponivel() || !cdAtual) return false;
  var ano = new Date().getFullYear();
  var resultados = await fbQuery(colecao, [
    ['cd', '==', cdAtual],
    ['ano', '==', ano],
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
    await fbDocSet(colecao, docId, item, { cd: cdAtual, ano: new Date().getFullYear(), mesNome: mesAtual });
  }
}

async function fbExcluirItemColecao(colecao, item) {
  var docId = item.id || item.firestoreId;
  await fbDocDelete(colecao, docId);
}

// ==================== FIELD-LEVEL UPDATE ====================
function fbAtualizarCampoChamado(id, campo, valor) {
  if (!fbDisponivel() || !id) return;
  try {
    fbDb.collection('chamados').doc(id).update({
      [campo]: valor,
      alteradoEm: fbTimestamp(),
      alteradoPor: usuarioLogado || 'sistema'
    }).catch(function () {});
  } catch (e) {}
}

function fbCamposQueGeramNotaDev() {
  return ['Solicitar nota de devolu\u00e7\u00e3o', 'Solicitar NFD e devolver invers\u00e3o', 'Solicitar NFD e Faturar invers\u00e3o'];
}

// ==================== DUPLICATA CHECK ====================
async function fbVerificarChamadoDuplicado(numero, cd, mes) {
  if (!numero || !fbDisponivel()) return false;
  try {
    var a = await fbDb.collection('chamados').where('chamado', '==', numero).where('cd', '==', cd).where('ativo', '==', true).get();
    if (!a.empty) return true;
    if (dadosMes[mes]) return dadosMes[mes].some(function (d) { return d.chamado === numero; });
    return false;
  } catch (e) { return false; }
}

async function fbVerificarNotaDevDuplicada(chamado, loja) {
  if (!chamado || !fbDisponivel()) return false;
  try {
    var a = await fbDb.collection('notasDevolucao').where('chamado', '==', chamado).where('loja', '==', loja).where('ativo', '==', true).get();
    if (!a.empty) return true;
    return dadosNotasDev.some(function (n) { return n.chamado === chamado && n.loja === loja; });
  } catch (e) { return false; }
}

// ==================== USUARIOS ====================
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
  var lista = todosUsuarios.slice();
  for (var i = 0; i < lista.length; i++) {
    var u = lista[i];
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
