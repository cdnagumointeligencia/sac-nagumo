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

function contarRegistrosAtuais(cdFiltro) {
  let total = 0;

  const cds = cdFiltro ? [cdFiltro.replace('SAC_', '').replace('_dados', '')] : ['SAC_CD1', 'SAC_CD2'];
  for (const cd of cds) {
    try {
      const raw = localStorage.getItem('SAC_' + cd + '_dados');
      if (raw) {
        const arr = JSON.parse(raw);
        arr.forEach(d => {
          if (Array.isArray(d.registros)) total += d.registros.length;
          else if (d.registros && typeof d.registros === 'object') total += Object.keys(d.registros).length;
        });
      }
    } catch {}
  }

  if (!cdFiltro) {
    try { total += (JSON.parse(localStorage.getItem('SAC_CD1_SENHAS_SAC_dados')) || []).length; } catch {}
    try { total += (JSON.parse(localStorage.getItem('SAC_CD2_SENHAS_SAC_dados')) || []).length; } catch {}
    try { total += (JSON.parse(localStorage.getItem('SAC_CD1_NOTAS_DEV_dados')) || []).length; } catch {}
    try { total += (JSON.parse(localStorage.getItem('SAC_CD2_NOTAS_DEV_dados')) || []).length; } catch {}
    try { total += (JSON.parse(localStorage.getItem('SAC_CD1_MERCADORIAS_NF_dados')) || []).length; } catch {}
    try { total += (JSON.parse(localStorage.getItem('SAC_CD2_MERCADORIAS_NF_dados')) || []).length; } catch {}
  }

  return total;
}

async function exportarBackupCompleto() {
  let dadosCD = [];
  try {
    const raw = localStorage.getItem('SAC_' + cdAtual + '_dados');
    if (raw) dadosCD = JSON.parse(raw);
  } catch {}
  if (dadosCD.length === 0) {
    Object.keys(dadosMes).forEach(mes => {
      dadosCD.push({ mes, registros: dadosMes[mes] || [] });
    });
  }

  let prodData = {};
  try {
    const rawProd = localStorage.getItem('SAC_PRODUTIVIDADE_dados');
    if (rawProd) {
      const arr = JSON.parse(rawProd);
      arr.forEach(p => { prodData[p.mes] = { t1: p.t1 || 0, t2: p.t2 || 0, t3: p.t3 || 0 }; });
    }
  } catch {}
  if (Object.keys(prodData).length === 0) {
    prodData = { ...dadosProdutividade };
  }

  let senhasSac = [];
  try { senhasSac = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_SENHAS_SAC_dados')) || []; } catch {}
  let notasDevolucao = [];
  try { notasDevolucao = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_NOTAS_DEV_dados')) || []; } catch {}
  let mercadoriasNF = [];
  try { mercadoriasNF = JSON.parse(localStorage.getItem('SAC_' + cdAtual + '_MERCADORIAS_NF_dados')) || []; } catch {}
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

      const registrosBackup = contarRegistrosBackup({
        dados: dadosBackupArr,
        senhasSac: backup.senhasSac || [],
        notasDevolucao: backup.notasDevolucao || [],
        mercadoriasNF: backup.mercadoriasNF || []
      });
      const registrosAtuais = isV3 ? contarRegistrosAtuais(backup.cd) : contarRegistrosAtuais();

      if (registrosBackup < registrosAtuais) {
        toast(
          'BLOQUEADO: Backup tem ' + registrosBackup + ' registros, sistema atual tem ' + registrosAtuais + '. ' +
          'Importe um backup igual ou maior.',
          'error'
        );
        document.getElementById('jsonInput').value = '';
        return;
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
        const lsProd = [];
        Object.keys(dadosProdutividade).forEach(m => {
          const d = dadosProdutividade[m];
          lsProd.push({ mes: m, t1: d.t1 || 0, t2: d.t2 || 0, t3: d.t3 || 0 });
        });
        lsSetShared('SAC_PRODUTIVIDADE_dados', lsProd);
      }
      try { localStorage.setItem('SAC_brasConfig', JSON.stringify(bracosConfig)); } catch {}
      try { localStorage.setItem('SAC_LOJAS_MERCADORIAS', JSON.stringify(lojasMercadorias)); } catch {}

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
