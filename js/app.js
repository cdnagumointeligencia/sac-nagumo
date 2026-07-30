// Salvar automaticamente antes de fechar a pagina
if (!window._beforeunloadRegistered) {
  window._beforeunloadRegistered = true;
  window.addEventListener('beforeunload', () => {
    for (const mes in dadosMes) {
      const lsDados = lsGet('dados') || [];
      const idxD = lsDados.findIndex(d => d.mes === mes);
      const reg = { mes, registros: dadosMes[mes] };
      if (idxD >= 0) lsDados[idxD] = reg; else lsDados.push(reg);
      lsSet('dados', lsDados);
    }
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
  });
}

// Fechar modal com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
  }
});

// Capitalizar textos em inputs de digitação (exceto search/filter e password)
document.addEventListener('input', function(e) {
  const el = e.target;
  if (el.tagName !== 'INPUT' || el.type !== 'text') return;
  if (el.type === 'password') return;
  if (el.closest('.filter-panel') || el.id === 'buscaSenhaSac') return;
  if (el.dataset.noCapitalize) return;

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const capitalized = capitalizarPalavras(el.value);
  if (capitalized !== el.value) {
    el.value = capitalized;
    if (start != null && el.selectionStart != null) el.setSelectionRange(start, end);
  }
});

// ==================== INICIAR ====================
(async function() {
  try {
    await carregarUsuarios();
    const sessao = verificarSessao();
    if (sessao && todosUsuarios.some(u => u.nome === sessao.nome && u.ativo)) {
      cdAtual = sessao.cd || 'CD1';
      DB_NAME = 'SAC_' + cdAtual;
      await iniciarSistema();
    } else {
      await carregarTudo();
      await carregarSenhasSac();
      await carregarNotasDev();
      await carregarProdutividade();
      await carregarMercadoriasNF();
      carregarBracosConfig();
      carregarLojas();
      carregarObservacoes();
      telaLogin();
    }
  } catch (err) {
    telaLogin();
  }
})();
