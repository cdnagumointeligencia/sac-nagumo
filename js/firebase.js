// ==================== FIREBASE INIT ====================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBA7_8K_kTkW3vRzFPLLiN_TGSQ0Om9oNs",
  authDomain: "sac-nagumo.firebaseapp.com",
  projectId: "sac-nagumo",
  storageBucket: "sac-nagumo.firebasestorage.app",
  messagingSenderId: "158692645615",
  appId: "1:158692645615:web:293f154af1b5b2be914d2c"
};

let fbDb = null;
let fbAuth = null;
let fbUid = null;
let fbInicializado = false;

function fbInit() {
  if (fbInicializado) return;
  if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
    console.warn('Firebase SDK não carregado');
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    fbDb = firebase.firestore();
    fbAuth = firebase.auth();

    fbDb.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: múltiplas abas abertas');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence: navegador não suporta');
      }
    });

    fbAuth.signInAnonymously().catch(function () {});
    fbAuth.onAuthStateChanged(function (user) {
      fbUid = user ? user.uid : null;
      if (user) fbInicializado = true;
    });
  } catch (e) {
    console.warn('Firebase init error:', e);
  }
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
