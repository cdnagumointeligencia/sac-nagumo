if (!window._beforeunloadRegistered) {
  window._beforeunloadRegistered = true;
  window.addEventListener('beforeunload', () => {
    fbSalvarAntesSair();
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
    if (typeof dadosProdutividade !== 'undefined' && dadosProdutividade) {
      lsSetCd('PRODUTIVIDADE_dados', dadosProdutividade);
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
  }
});

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

(async function() {
  try {
    await fbInit();
    await iniciarSistema();
  } catch (err) {
    console.error('Erro ao iniciar:', err);
  }
})();
