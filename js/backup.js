// ==================== BACKUP ====================
function contarRegistrosBackup(backup) {
  let total = 0;
  let qtdChamados = 0;
  if (backup.dados) {
    if (Array.isArray(backup.dados)) {
      backup.dados.forEach(m => {
        if (Array.isArray(m.registros)) qtdChamados += m.registros.length;
        else if (m.registros && typeof m.registros === 'object') qtdChamados += Object.keys(m.registros).length;
      });
    } else if (typeof backup.dados === 'object') {
      Object.values(backup.dados).forEach(regs => {
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

function _contarLocalChamados(cd) {
  var total = 0;
  var chaves = ['SAC_SAC_' + cd + '_dados', 'SAC_' + cd + '_dados', 'SAC_' + cd + '_SAC_dados'];
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
        return total;
      }
    } catch (e) {}
  }
  return total;
}

function _contarLocalColecao(sufixo) {
  var chaves = ['SAC_' + cdAtual + '_' + sufixo, 'SAC_SAC_' + cdAtual + '_' + sufixo];
  for (var k = 0; k < chaves.length; k++) {
    try {
      var raw = localStorage.getItem(chaves[k]);
      if (raw) return JSON.parse(raw).length || 0;
    } catch (e) {}
  }
  return 0;
}

function contarRegistrosAtuais(cdFiltro) {
  var cds = cdFiltro ? [cdFiltro] : ['CD1', 'CD2'];
  var total = 0;

  for (var i = 0; i < cds.length; i++) {
    total += _contarLocalChamados(cds[i]);
  }

  if (!cdFiltro) {
    for (var i = 0; i < cds.length; i++) {
      total += _contarLocalColecao('SENHAS_SAC_dados');
      total += _contarLocalColecao('NOTAS_DEV_dados');
      total += _contarLocalColecao('MERCADORIAS_NF_dados');
    }
  }

  return total;
}

async function exportarBackupCompleto() {
  let dadosCD = [];
  let senhasSac = [];
  let notasDevolucao = [];
  let mercadoriasNF = [];
  let prodData = [];

  if (fbDisponivel()) {
    const fbDados = await fbCarregarTudoBackup();
    if (fbDados && Object.keys(fbDados.chamados).length > 0) {
      const cds = Object.keys(fbDados.chamados);
      cds.forEach(cd => {
        Object.keys(fbDados.chamados[cd]).forEach(mes => {
          dadosCD.push({ mes, registros: fbDados.chamados[cd][mes] });
        });
      });
    }
    senhasSac = fbDados.senhasSac || [];
    notasDevolucao = fbDados.notasDev || [];
    mercadoriasNF = fbDados.mercadoriasNF || [];
    prodData = fbDados.produtividade || [];
  }

  if (dadosCD.length === 0) {
    try {
      const raw = localStorage.getItem('SAC_' + cdAtual + '_dados');
      if (raw) dadosCD = JSON.parse(raw);
    } catch {}
  }
  if (dadosCD.length === 0) {
    Object.keys(dadosMes).forEach(mes => {
      dadosCD.push({ mes, registros: dadosMes[mes] || [] });
    });
  }

  if (prodData.length === 0 && typeof dadosProdutividade !== 'undefined' && dadosProdutividade) {
    prodData = dadosProdutividade;
  }

  if (senhasSac.length === 0) {
    try { senhasSac = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_SENHAS_SAC_dados')) || []; } catch {}
  }
  if (notasDevolucao.length === 0) {
    try { notasDevolucao = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_NOTAS_DEV_dados')) || []; } catch {}
  }
  if (mercadoriasNF.length === 0) {
    try { mercadoriasNF = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_MERCADORIAS_NF_dados')) || []; } catch {}
  }

  let bracos = {};
  try { bracos = JSON.parse(localStorage.getItem('SAC_brasConfig')) || {}; } catch {}
  let lojas = [];
  try { lojas = JSON.parse(localStorage.getItem('SAC_LOJAS_MERCADORIAS')) || []; } catch {}
  let usuariosData = [];
  try { usuariosData = JSON.parse(localStorage.getItem('SAC_USUARIOS')) || []; } catch {}

  const backup = {
    versao: 3,
    cd: cdAtual,
    dataBackup: new Date().toISOString(),
    usuarios: usuariosData,
    dados: dadosCD,
    senhasSac: senhasSac,
    notasDevolucao: notasDevolucao,
    mercadoriasNF: mercadoriasNF,
    produtividade: prodData,
    bracosConfig: bracos,
    lojasMercadorias: lojas
  };

  const json = JSON.stringify(backup, null, 2);
  baixarArquivo(json, `SAC_Backup_${formatDate(new Date())}.json`, 'application/json');
  fecharModal('modalBackup');
  toast('Backup completo exportado!', 'success');
}

function abrirModalBackup() {
  abrirModal('modalBackup');
}

async function importarBackupCompleto() {
  document.getElementById('jsonInput').click();
}

async function importarBackupCompletoFile() {
  const file = document.getElementById('jsonInput').files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const backup = JSON.parse(e.target.result);

      const isV3 = backup.versao === 3 && backup.cd && backup.dados;
      const isV2 = backup.versao === 2 && backup.dadosCD1;
      const isV1 = !backup.versao && backup.usuarios && backup.dados && !backup.dadosCD1;

      if (!isV1 && !isV2 && !isV3) {
        toast('Arquivo de backup inválido', 'error');
        document.getElementById('jsonInput').value = '';
        return;
      }

      let dadosBackupArr = [];
      if (isV3) dadosBackupArr = backup.dados || [];
      else if (isV2) dadosBackupArr = [...(backup.dadosCD1 || []), ...(backup.dadosCD2 || [])];
      else dadosBackupArr = Object.entries(backup.dados || {}).map(([mes, regs]) => ({ mes, registros: normalizarRegistros(regs) }));

      if (backup.versao === 3 && backup.dataBackup) {
        var dataBackup = new Date(backup.dataBackup);
        var diasAtras = (new Date() - dataBackup) / 86400000;
        if (diasAtras > 90) {
          var confirma = confirm('Este backup tem mais de 90 dias (' + Math.round(diasAtras) + ' dias). Deseja importar mesmo assim?');
          if (!confirma) { document.getElementById('jsonInput').value = ''; return; }
        }
      }

      todosUsuarios = backup.usuarios || [];
      for (const u of todosUsuarios) {
        if (!u.senhaHash) {
          u.senhaHash = await hashSenha(u.senha || SENHA_PADRAO);
        }
        delete u.senha;
      }
      usuarios = todosUsuarios.filter(u => u.ativo).map(u => u.nome);

      if (isV3) {
        const dadosImport = (backup.dados || []).map(d => ({ mes: d.mes, registros: normalizarRegistros(d.registros) }));
        localStorage.setItem('SAC_' + cdAtual + '_dados', JSON.stringify(dadosImport));
        dadosMes = {};
        dadosImport.forEach(d => { dadosMes[d.mes] = d.registros; });
      } else if (isV2) {
        const dadosCD1Import = (backup.dadosCD1 || []).map(d => ({ mes: d.mes, registros: normalizarRegistros(d.registros) }));
        localStorage.setItem('SAC_SAC_CD1_dados', JSON.stringify(dadosCD1Import));
        const dadosCD2Import = (backup.dadosCD2 || []).map(d => ({ mes: d.mes, registros: normalizarRegistros(d.registros) }));
        localStorage.setItem('SAC_SAC_CD2_dados', JSON.stringify(dadosCD2Import));
        dadosMes = {};
        if (cdAtual === 'CD1') dadosCD1Import.forEach(d => { dadosMes[d.mes] = d.registros; });
        else dadosCD2Import.forEach(d => { dadosMes[d.mes] = d.registros; });
      } else {
        dadosMes = {};
        Object.entries(backup.dados || {}).forEach(([mes, regs]) => {
          dadosMes[mes] = normalizarRegistros(regs);
        });
        const lsDadosImport = Object.keys(dadosMes).map(m => ({ mes: m, registros: dadosMes[m] }));
        lsSet('dados', lsDadosImport);
      }

      dadosSenhasSac = backup.senhasSac || [];
      dadosNotasDev = backup.notasDevolucao || [];
      dadosMercadoriasNF = backup.mercadoriasNF || [];
      if (backup.produtividade) dadosProdutividade = backup.produtividade;
      if (backup.bracosConfig) bracosConfig = backup.bracosConfig;
      if (backup.lojasMercadorias) lojasMercadorias = backup.lojasMercadorias;

      await salvarTodosUsuarios();
      lsSetCd('SENHAS_SAC_dados', dadosSenhasSac);
      lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
      lsSetCd('MERCADORIAS_NF_dados', dadosMercadoriasNF);
      if (dadosProdutividade) {
        lsSetCd('PRODUTIVIDADE_dados', dadosProdutividade);
      }
      try { localStorage.setItem('SAC_brasConfig', JSON.stringify(bracosConfig)); } catch {}
      try { localStorage.setItem('SAC_LOJAS_MERCADORIAS', JSON.stringify(lojasMercadorias)); } catch {}

      if (fbDisponivel()) {
        Object.keys(dadosMes).forEach(mes => {
          const regs = normalizarRegistros(dadosMes[mes]);
          regs.forEach(r => {
            if (r && r.id) {
              try {
                fbDb.collection('chamados').doc(r.id).set(
                  fbDataComAuditoria(r, { cd: cdAtual, mesNome: mes }),
                  { merge: true }
                );
              } catch (e) {}
            }
          });
        });
        dadosSenhasSac.forEach(item => {
          const docId = item.id || item.firestoreId;
          if (docId) {
            try { fbDb.collection('senhasSac').doc(docId).set(fbDataComAuditoria(item, { cd: cdAtual }), { merge: true }); } catch (e) {}
          }
        });
        dadosNotasDev.forEach(item => {
          const docId = item.id || item.firestoreId;
          if (docId) {
            try { fbDb.collection('notasDevolucao').doc(docId).set(fbDataComAuditoria(item, { cd: cdAtual }), { merge: true }); } catch (e) {}
          }
        });
        dadosMercadoriasNF.forEach(item => {
          const docId = item.id || item.firestoreId;
          if (docId) {
            try { fbDb.collection('mercadoriasNF').doc(docId).set(fbDataComAuditoria(item, { cd: cdAtual }), { merge: true }); } catch (e) {}
          }
        });
        if (typeof dadosProdutividade !== 'undefined' && dadosProdutividade) {
          dadosProdutividade.forEach(function (item) {
            var docId = item.id || item.firestoreId;
            if (docId) {
              try { fbDb.collection('produtividade').doc(docId).set(fbDataComAuditoria(item, { cd: cdAtual }), { merge: true }); } catch (e) {}
            }
          });
        }
      }

      renderizarTabela();
      atualizarTotais();
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
