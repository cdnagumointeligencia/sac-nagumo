// ==================== FIREBASE INIT ====================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCnLFg6nmZceNTofGgY9x61BbD1Pb4ugko",
  authDomain: "sac-nagumo.firebaseapp.com",
  projectId: "sac-nagumo",
  storageBucket: "sac-nagumo.firebasestorage.app",
  messagingSenderId: "647170425279",
  appId: "1:647170425279:web:82b83486c48708673a210a"
};

let fbDb = null;
let fbAuth = null;
let fbUid = null;
let fbInicializado = false;

var _fbInitPromise = null;

function fbInit() {
  if (_fbInitPromise) return _fbInitPromise;
  if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
    console.warn('Firebase SDK n\u00e3o carregado');
    return Promise.resolve();
  }
  _fbInitPromise = new Promise(function (resolve) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      fbDb = firebase.firestore();
      fbAuth = firebase.auth();

      try {
        fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      } catch (e) {}

      fbDb.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence: m\u00faltiplas abas abertas');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence: navegador n\u00e3o suporta');
        }
      });

      fbAuth.onAuthStateChanged(function (user) {
        fbUid = user ? user.uid : null;
        if (user) {
          fbInicializado = true;
          fbSyncStatus('ok', 'Sincronizado');
        }
      });

      fbAuth.signInAnonymously().then(function () {
        fbInicializado = true;
        resolve();
      }).catch(function (err) {
        console.warn('Firebase anonymous auth error:', err);
        fbInicializado = false;
        resolve();
      });
    } catch (e) {
      console.warn('Firebase init error:', e);
      fbInicializado = false;
      resolve();
    }
  });
  return _fbInitPromise;
}

function fbDisponivel() {
  return fbDb !== null && fbInicializado;
}

function fbTimestamp() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

function fbDataComAuditoria(data, extra) {
  var doc = {
    ativo: true,
    alteradoEm: fbTimestamp(),
    alteradoPor: usuarioLogado || 'sistema'
  };
  for (var k in data) doc[k] = data[k];
  if (extra) for (var k in extra) doc[k] = extra[k];
  if (!doc.criadoEm) {
    doc.criadoEm = fbTimestamp();
    doc.criadoPor = usuarioLogado || 'sistema';
  }
  return doc;
}

async function fbDocSet(colecao, id, data, extra) {
  if (!fbDisponivel()) return;
  try {
    await fbDb.collection(colecao).doc(id).set(fbDataComAuditoria(data, extra), { merge: true });
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
  }
}

async function fbDocCreate(colecao, id, data, extra) {
  if (!fbDisponivel()) return true;
  try {
    var ref = fbDb.collection(colecao).doc(id);
    var duplicado = false;
    await fbDb.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        if (snap.exists) {
          var existing = snap.data();
          if (existing && existing.ativo === false) {
            tx.set(ref, fbDataComAuditoria(data, extra));
          } else {
            duplicado = true;
          }
        } else {
          tx.set(ref, fbDataComAuditoria(data, extra));
        }
      });
    });
    if (duplicado) {
      toast('Registro duplicado: j\u00e1 existe no sistema!', 'error');
      return false;
    }
    return true;
  } catch (err) {
    toast('Erro ao criar: ' + err.message, 'error');
    return false;
  }
}

async function fbDocAdd(colecao, data, extra) {
  if (!fbDisponivel()) return null;
  try {
    var docData = fbDataComAuditoria(data, extra);
    docData.criadoEm = fbTimestamp();
    docData.criadoPor = usuarioLogado || 'sistema';
    var ref = await fbDb.collection(colecao).add(docData);
    return ref.id;
  } catch (err) {
    toast('Erro ao criar: ' + err.message, 'error');
    return null;
  }
}

async function fbDocDelete(colecao, id) {
  if (!fbDisponivel() || !id) return;
  try {
    await fbDb.collection(colecao).doc(id).update({
      ativo: false,
      alteradoEm: fbTimestamp(),
      alteradoPor: usuarioLogado || 'sistema'
    });
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}

async function fbDocApagar(colecao, id) {
  if (!fbDisponivel() || !id) return;
  try {
    await fbDb.collection(colecao).doc(id).delete();
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}

async function fbQuery(colecao, conditions) {
  if (!fbDisponivel()) return [];
  try {
    var query = fbDb.collection(colecao);
    for (var i = 0; i < conditions.length; i++) {
      query = query.where(conditions[i][0], conditions[i][1], conditions[i][2]);
    }
    var snapshot = await query.get();
    var results = [];
    snapshot.forEach(function (doc) {
      var d = doc.data();
      d.firestoreId = doc.id;
      results.push(d);
    });
    return results;
  } catch (err) {
    toast('Erro ao carregar: ' + err.message, 'error');
    return [];
  }
}

// ==================== SYNC STATUS ====================
var _fbSnapshots = [];

function fbSyncStatus(tipo, msg) {
  var el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status ' + tipo;
  var icon = tipo === 'syncing' ? '&#8635;' : tipo === 'error' ? '&#10007;' : '&#10003;';
  el.innerHTML = icon + ' ' + msg;
}

// ==================== ON SNAPSHOT (tempo real) ====================
function fbOnSnapshot(colecao, conditions, onChange, onError) {
  if (!fbDisponivel()) return null;
  var query = fbDb.collection(colecao);
  for (var i = 0; i < conditions.length; i++) {
    query = query.where(conditions[i][0], conditions[i][1], conditions[i][2]);
  }
  var unsubscribe = query.onSnapshot(function (snapshot) {
    fbSyncStatus('syncing', 'Sincronizando...');
    var results = [];
    snapshot.forEach(function (doc) {
      var d = doc.data();
      d.firestoreId = doc.id;
      results.push(d);
    });
    onChange(results);
    fbSyncStatus('ok', 'Sincronizado');
  }, function (err) {
    fbSyncStatus('error', 'Erro de conex\u00e3o');
    console.warn('Firestore onSnapshot error:', err);
    if (onError) onError(err);
  });
  _fbSnapshots.push(unsubscribe);
  return unsubscribe;
}

function fbPararSnapshots() {
  _fbSnapshots.forEach(function (u) {
    if (typeof u === 'function') try { u(); } catch (e) {}
  });
  _fbSnapshots = [];
}

// ==================== SALVAR ANTES DE SAIR ====================
var _salvandoAntesSair = false;

function fbSalvarAntesSair() {
  if (!fbDisponivel() || _salvandoAntesSair) return;
  _salvandoAntesSair = true;

  clearTimeout(_fbTimerChamados);
  clearTimeout(_fbTimerSenhas);
  clearTimeout(_fbTimerNotas);
  clearTimeout(_fbTimerMerc);
  clearTimeout(_fbTimerProd);

  var erros = [];

  function flushPendentes(pendentes, nome) {
    if (!pendentes) return;
    for (var id in pendentes) {
      try {
        fbSalvarItemColecao(nome, pendentes[id]);
      } catch (e) { erros.push(nome); }
    }
  }

  if (typeof _pendentesSenhaItem !== 'undefined') {
    flushPendentes(_pendentesSenhaItem, 'senhasSac');
    _pendentesSenhaItem = {};
  }
  if (typeof _pendentesNotasItem !== 'undefined') {
    flushPendentes(_pendentesNotasItem, 'notasDevolucao');
    _pendentesNotasItem = {};
  }
  if (typeof _pendentesMercItem !== 'undefined') {
    flushPendentes(_pendentesMercItem, 'mercadoriasNF');
    _pendentesMercItem = {};
  }
  if (typeof _pendentesProdItem !== 'undefined') {
    flushPendentes(_pendentesProdItem, 'produtividade');
    _pendentesProdItem = {};
  }

  if (erros.length > 0) {
    toast('Erro ao salvar: ' + erros.join(', ') + '. Dados salvos localmente.', 'error');
  }
  _salvandoAntesSair = false;
}

// ==================== CONTAGEM LOCAL (fallback) ====================
function _contarLocalChamados(cd) {
  var total = 0;
  var cds = cd ? [cd] : ['CD1', 'CD2'];
  for (var c = 0; c < cds.length; c++) {
    var chaves = ['SAC_SAC_' + cds[c] + '_dados', 'SAC_' + cds[c] + '_dados', 'SAC_' + cds[c] + '_SAC_dados'];
    for (var k = 0; k < chaves.length; k++) {
      try {
        var raw = localStorage.getItem(chaves[k]);
        if (raw) {
          var arr = JSON.parse(raw);
          for (var i = 0; i < arr.length; i++) {
            var d = arr[i];
            if (Array.isArray(d.registros)) total += d.registros.length;
            else if (d.registros && typeof d.registros === 'object') total += Object.keys(d.registros).length;
          }
          break;
        }
      } catch (e) {}
    }
  }
  return total;
}

function _contarLocalColecao(sufixo, cd) {
  var cds = cd ? [cd] : ['CD1', 'CD2'];
  for (var c = 0; c < cds.length; c++) {
    var chaves = ['SAC_' + cds[c] + '_' + sufixo, 'SAC_SAC_' + cds[c] + '_' + sufixo];
    for (var k = 0; k < chaves.length; k++) {
      try {
        var raw = localStorage.getItem(chaves[k]);
        if (raw) return JSON.parse(raw).length || 0;
      } catch (e) {}
    }
  }
  return 0;
}

// ==================== BACKUP via Firestore ====================
async function fbCarregarTudoBackup(opcoes) {
  var resultado = { chamados: {}, senhasSac: [], notasDev: [], mercadoriasNF: [], produtividade: [], usuarios: [] };

  if (!fbDisponivel()) return resultado;

  opcoes = opcoes || {};
  var cds = opcoes.cds || ['CD1', 'CD2'];
  var anos = opcoes.anos;
  if (!anos || anos.length === 0) {
    anos = [];
    var anoCorrente = new Date().getFullYear();
    var qtdAnos = (typeof ANOS_BACKUP === 'number' && ANOS_BACKUP >= 0) ? ANOS_BACKUP : 1;
    for (var i = qtdAnos; i >= 0; i--) anos.push(anoCorrente - i);
  }

  function buscarPeriodo(colecao, onDoc) {
    var promessas = [];
    cds.forEach(function (cd) {
      anos.forEach(function (ano) {
        promessas.push(
          fbDb.collection(colecao)
            .where('cd', '==', cd)
            .where('ano', '==', ano)
            .where('ativo', '==', true)
            .get()
            .then(function (snap) {
              snap.forEach(function (doc) { onDoc(doc.data()); });
            })
            .catch(function () {})
        );
      });
    });
    return Promise.all(promessas);
  }

  try {
    await buscarPeriodo('chamados', function (d) {
      var cd = d.cd || '';
      var mesNome = d.mesNome || '';
      if (!resultado.chamados[cd]) resultado.chamados[cd] = {};
      if (!resultado.chamados[cd][mesNome]) resultado.chamados[cd][mesNome] = [];
      resultado.chamados[cd][mesNome].push(d);
    });
  } catch (e) {}

  try {
    await buscarPeriodo('senhasSac', function (d) { resultado.senhasSac.push(d); });
  } catch (e) {}

  try {
    await buscarPeriodo('notasDevolucao', function (d) { resultado.notasDev.push(d); });
  } catch (e) {}

  try {
    await buscarPeriodo('mercadoriasNF', function (d) { resultado.mercadoriasNF.push(d); });
  } catch (e) {}

  try {
    await buscarPeriodo('produtividade', function (d) {
      var item = {};
      for (var k in d) {
        if (k !== 'cd' && k !== 'ano' && k !== 'ativo' && k !== 'criadoEm' && k !== 'criadoPor' &&
          k !== 'alteradoEm' && k !== 'alteradoPor' && k !== 'firestoreId') {
          item[k] = d[k];
        }
      }
      resultado.produtividade.push(item);
    });
  } catch (e) {}

  try {
    var snap = await fbDb.collection('usuarios').where('ativo', '==', true).get();
    snap.forEach(function (doc) { resultado.usuarios.push(doc.data()); });
  } catch (e) {}

  return resultado;
}

// ==================== CONFIG (documento único por tipo) ====================

var _fbSnapConfigs = {};

function fbCancelarSnapConfigs() {
  for (var k in _fbSnapConfigs) {
    if (typeof _fbSnapConfigs[k] === 'function') _fbSnapConfigs[k]();
  }
  _fbSnapConfigs = {};
}

async function fbCarregarConfig(colecao, docId) {
  if (!fbDisponivel()) return null;
  try {
    var doc = await fbDb.collection(colecao).doc(docId).get();
    if (doc.exists) return doc.data();
  } catch (e) {}
  return null;
}

async function fbSalvarConfig(colecao, docId, dados) {
  if (!fbDisponivel()) return;
  try {
    await fbDb.collection(colecao).doc(docId).set(
      fbDataComAuditoria(dados, {}),
      { merge: true }
    );
  } catch (err) {
    toast('Erro ao salvar config: ' + err.message, 'error');
  }
}

function fbOnSnapshotConfig(colecao, docId, callback) {
  if (!fbDisponivel()) return;
  var chave = colecao + '/' + docId;
  if (_fbSnapConfigs[chave]) return;
  _fbSnapConfigs[chave] = fbDb.collection(colecao).doc(docId).onSnapshot(function (doc) {
    if (doc.exists) {
      callback(doc.data(), true);
    } else {
      callback(null, false);
    }
  }, function () {});
}
