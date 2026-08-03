# Relatório Técnico de Diagnóstico — Sistema SAC Nagumo (v2)

**Data da auditoria:** 31/07/2026
**Escopo:** Consumo de cotas do Firestore (gatilho da análise) + auditoria geral do código-fonte fornecido
**Método:** Leitura completa de `db.js`, `firebase.js`, `chamados.js`, `senhaSac.js`, `notasDev.js`, `mercadorias.js`, `produtividade.js`, `shared.js`, `backup.js`, `login.js`, `SAC1.html`, `SAC2.html`, `firestore.indexes.json` (ambas as pastas `js1/` e `js2/`)
**Natureza deste documento:** Diagnóstico e proposta. Nenhuma alteração foi feita no código.
**Nota de versão:** esta é a v2, revisada após leitura crítica do documento (autor: Big). Seis pontos de divergência foram apurados contra o código-fonte; todos os seis procederam — dois eram erros factuais da v1, três eram omissões/imprecisões. As correções estão incorporadas abaixo e sinalizadas onde relevante.

---

## 1. Resumo executivo

Os números de cota do Firestore que você reportou (63,1% de gravações, 40,1% de leituras em 7 dias) **não são causados por volume real de uso** — são causados por um padrão de escrita no código que regrava dados que não mudaram, toda vez que qualquer campo é editado, ou mesmo quando a aba é fechada. Esse padrão está presente em Chamados (parcialmente), Notas de Devolução, Mercadorias sem NF, e na rotina de salvamento ao sair da página. Senha SAC, Produtividade (CD2) e a maior parte dos campos de Chamados já usam o padrão correto.

Além disso, a auditoria encontrou:
- Um **gap de sincronização real** em três campos de Chamados (Setor, Braço, Usuário), que hoje só persistem no navegador local até a próxima regravação completa do mês — se essa regravação for removida sem cobrir esses três campos antes, a edição deles deixa de sincronizar entre CD1/CD2 silenciosamente.
- Uma rotina de salvamento ao fechar a página (`fbSalvarAntesSair`) que regrava tudo em memória sem verificar o que de fato mudou — provavelmente a maior fonte isolada de gravações no teste de ontem, dado que envolveu trocas de aba e recarregamentos frequentes.
- Uma **condição de corrida (race condition)** na criação de chamados/notas com números duplicados.
- Queries de backup que **leem a coleção inteira sem filtro de ano**, o que fará o custo de leitura crescer indefinidamente a cada ano de uso.
- Código morto correspondente à aba Produtividade do CD1 — **confirmado pelo cliente que este CD não terá essa funcionalidade** (locais físicos diferentes, com setores diferentes), portanto deixa de ser uma decisão pendente e passa a ser um item de limpeza de código.
- Código morto/duplicado herdado da migração localStorage → Firestore, em `login.js` e `backup.js` (js1/js2) — **não em `shared.js`**, correção de um engano da v1.

Nenhum desses pontos exige decisão urgente — o sistema está funcionalmente estável, como você constatou nos testes de hoje. São otimizações e correções para tornar o crescimento do sistema sustentável dentro do plano Spark (gratuito) do Firebase.

---

## 2. Contexto sobre os números do Firebase

Você mencionou que o teste de ontem representa uso real (dados de uma planilha real, um dia útil, dois usuários simultâneos). É importante calibrar essa leitura em dois sentidos:

Primeiro, **63,1% de gravações em um único dia, por dois usuários, em um sistema onde "após o chamado ser aberto são realizadas poucas alterações", é desproporcional** ao volume de edições que você descreveu — isso é o sintoma do problema técnico detalhado abaixo, não um indicativo de que o uso real é inerentemente pesado.

Segundo, o dia de ontem envolveu **abertura e preenchimento de muitos chamados novos** (digitação em massa a partir de uma planilha) — esse é o cenário de maior geração de escrita por unidade de tempo que o sistema tem, bem mais intenso do que o regime esperado em produção (poucos chamados novos por dia, quase nenhuma edição após o fechamento). A expectativa de redução das correções propostas se refere primariamente a esse cenário de pico; o uso normal em regime deve ficar ainda mais folgado depois da correção.

---

## 3. Causa raiz: reescrita de dados que não mudaram

### 3.1 Como o padrão correto funciona hoje (Senha SAC e Produtividade CD2)

Em `senhaSac.js` e `produtividade.js` (pasta `js2/`, CD2), o fluxo de salvamento é:

```
usuário edita 1 célula
  → salvarSenhaSacItem(item) adiciona o item a um dicionário de pendências (_pendentesSenhaItem)
  → debounce de 300ms
  → flushSenhaSacItens() grava SOMENTE os itens pendentes, um fbDocSet por item alterado
```

1 edição de campo → no máximo 1 gravação no Firestore (por item realmente alterado), independente do tamanho da coleção. Esse é o padrão de referência para as correções propostas.

### 3.2 Chamados: correto para a maioria dos campos, com um gap real em três deles

Em `chamados.js`, os campos **Loja, Turno, Divergência, Solução/Observação, PLU, Observação (texto), Conferente, Data de Abertura e Data de Fechamento** passam por `criarCelInput`/`criarCelSelect`/`criarCelSelectLoja`, que sempre terminam chamando `fbAtualizarCampoChamado(docId, campo, valor)` — gravação de campo único, padrão correto.

Porém, **três campos não seguem esse caminho**:

```javascript
// Setor
selSetor.onchange = () => {
  dadosMes[mesAtual][idx].setor = selSetor.value;
  ...
  salvarDadosMes();     // só isso — sem fbAtualizarCampoChamado
  renderizarTabela();
  atualizarTotais();
};

// Braço
inpBraco.onchange = function () {
  ...
  dadosMes[mesAtual][idx].braco = inpBraco.value;
  salvarDadosMes();      // só isso
};

// Usuário
selUser.onchange = () => {
  dadosMes[mesAtual][idx].usuario = selUser.value;
  ...
  salvarDadosMes();      // só isso
};
```

Esses três campos dependem **exclusivamente** da regravação completa do mês (`fbSalvarChamados()`, disparada 500ms depois de `salvarDadosMes()`) para chegar ao Firestore. É por isso que essa regravação completa, apesar de redundante para os demais campos, **não pode ser simplesmente removida** — precisa primeiro ganhar a mesma cobertura de campo único que os outros nove campos já têm.

```javascript
async function salvarDadosMes() {
  ...
  clearTimeout(_fbTimerChamados);
  _fbTimerChamados = setTimeout(fbSalvarChamados, 500);
}

async function fbSalvarChamados() {
  var registros = normalizarRegistros(dadosMes[mesAtual]);   // TODOS os registros do mês
  for (var i = 0; i < registros.length; i++) {
    ...
    await fbDocSet('chamados', c.id, { ... });                // grava TODOS, um por um
  }
}
```

**Efeito prático hoje:** cada campo editado em qualquer chamado agenda uma regravação de **todos os chamados do mês corrente**, 500ms depois — mesmo para os 9 campos que já têm gravação individual eficiente e não precisariam disso. Se o mês tem 40 chamados abertos e você edita 1 campo de 1 chamado, o sistema faz até 40 gravações no Firestore, das quais só 1 (no caso dos 9 campos cobertos) é útil.

### 3.3 `fbSalvarAntesSair`: regravação total a cada saída da página

Em `firebase.js`, registrada no `beforeunload` de `app.js`:

```javascript
function fbSalvarAntesSair() {
  ...
  // itera TODOS os chamados do mês em memória, sem checar o que mudou
  // itera TODAS as senhas SAC em memória
  // itera TODAS as notas de devolução em memória
  // itera TODAS as mercadorias sem NF em memória
  // um fbDb...set() para cada item, sem debounce
}
```

Essa função roda **toda vez** que a aba é fechada, recarregada (F5) ou o usuário navega para fora da página — sem comparar o que realmente mudou desde o último salvamento. Durante os testes de ontem, cada troca de aba ou recarregamento disparou uma regravação completa de quatro coleções inteiras. É plausível que essa função sozinha responda por uma fatia expressiva do pico de gravações observado, dado o padrão de uso intenso e com múltiplas trocas de contexto que um dia de teste normalmente envolve.

**Importante:** esta função existe por um motivo legítimo — é a rede de segurança contra o cenário em que o usuário fecha a aba antes do debounce de 300–500ms dos salvamentos normais disparar, o que causaria perda real de uma edição ainda não sincronizada. A correção recomendada **não é remover a função**, é fazer com que ela também opere por diff — reaproveitando os mesmos dicionários de pendência já usados em Senha SAC e Produtividade CD2 — para que só reenvie o que está genuinamente pendente de sincronização, preservando a proteção contra perda de dados sem a regravação redundante.

### 3.4 Notas de Devolução e Mercadorias sem NF: mesmo padrão redundante, sem exceção de campo

```javascript
// notasDev.js
async function salvarNotasDev() {
  lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
  clearTimeout(_fbTimerNotas);
  _fbTimerNotas = setTimeout(function () {
    fbSalvarColecao('notasDevolucao', dadosNotasDev);   // TODA a coleção do ano
  }, 500);
}
```

O mesmo padrão se repete identicamente em `mercadorias.js` → `salvarMercadoriasNF()`. Diferente de Chamados, aqui **não existe nenhum caminho de campo individual** — toda edição de célula em qualquer nota ou mercadoria regrava toda a coleção do ano correspondente. Não há exceção de campo a preservar aqui; a correção é direta.

### 3.5 Efeito colateral sobre as leituras

Cada gravação redundante dispara `onSnapshot` de volta para todas as sessões abertas na mesma coleção (inclusive a própria sessão que gravou — "self-read"), o que explica por que a leitura também subiu proporcionalmente à gravação nos seus números. Corrigir a gravação reduz automaticamente boa parte da leitura, sem precisar de mudança separada nos listeners.

### 3.6 Tabela-resumo

| Módulo | Padrão atual | Escritas por edição de 1 campo | Correto? |
|---|---|---|---|
| Chamados — 9 campos (loja, turno, divergência, solução, PLU, observação, conferente, datas) | campo individual **+** regravação do mês inteiro (redundante) | 1 útil + N-1 redundantes | Parcialmente — remover a regravação redundante *após* cobrir os 3 campos abaixo |
| Chamados — Setor, Braço, Usuário | dependem exclusivamente da regravação do mês | N gravações, das quais 1 é útil | Não — precisa ganhar gravação de campo individual antes de qualquer remoção |
| Notas de Devolução | regravação da coleção do ano inteira | N gravações | Não |
| Mercadorias sem NF | regravação da coleção do ano inteira | N gravações | Não |
| Salvamento ao sair (`fbSalvarAntesSair`) | regravação total de 4 coleções, sem diff, a cada `beforeunload` | todos os itens em memória | Não — mas a existência da função é necessária, só a lógica interna precisa virar diff |
| Senha SAC | item individual via dicionário de pendências | 1 | Sim |
| Produtividade (CD2) | item individual via dicionário de pendências | 1 | Sim |

---

## 4. Queries de backup sem filtro de ano (crescimento não limitado)

Em `firebase.js`, a função `fbCarregarTudoBackup()` (usada em toda exportação de backup) lê as coleções assim:

```javascript
var chamSnap = await fbDb.collection('chamados').where('ativo', '==', true).get();
```

Sem filtro de `ano` e sem filtro de `cd`. Cada exportação de backup lê todos os chamados ativos de todos os anos e dos dois CDs, mesmo que o backup seja gerado a partir de uma única página (CD1 ou CD2). O mesmo padrão se repete para `senhasSac`, `notasDevolucao`, `mercadoriasNF`, `produtividade` e `usuarios` dentro da mesma função.

Isso não é grave hoje (pouco tempo de uso, pouco volume acumulado), mas é uma bomba-relógio de custo de leitura: em 2027, 2028 etc., cada exportação de backup vai custar proporcionalmente mais leituras, mesmo que o padrão diário de uso continue igual.

---

## 5. Produtividade do CD1 — resolvido: item de limpeza de código, não decisão pendente

**Correção sobre a v1:** a v1 afirmava incorretamente que o botão "Salvar" da Produtividade do CD1 lançaria erro de função inexistente (`salvarProdutividade is not defined`). Isso estava **errado** — a função existe em `js1/produtividade.js`, chamada de dentro do modal de edição do modelo semanal (`abrirModalProdutividade` → `#prodModalSalvar`). Peço desculpa pelo erro de leitura na v1.

O que permanece verdadeiro: o modelo de dados de `js1/produtividade.js` (grade semanal por usuário/dia, com cor por setor) é estruturalmente incompatível com o HTML de `SAC1.html`, que replica a tabela **mensal** usada no CD2 (`tabelaProdutividade`/`produtividadeBody`). `renderizarProdutividade()` do CD1 procura por elementos (`produtividadeHeader`, `produtividadeTable`) que não existem nesse HTML e retorna sem popular nada.

Também é verdade que essa incompatibilidade **não é alcançável pelo usuário** hoje: o botão de navegação para essa página tem `class="btn cd2-only"` em `SAC1.html`, e a regra `.cd1-active .cd2-only { display: none !important; }` (presente em `style1.css`/`style2.css`, ativada porque `js1/db.js` aplica `cd1-active` ao `<body>`) impede que o botão sequer seja exibido no CD1. Não há caminho de UI até essa página no CD1 — por isso os testes de ontem não a pegaram.

**Decisão do cliente (confirmada):** o CD1 **não terá** aba de Produtividade — CD1 e CD2 são locais físicos diferentes, com setores diferentes, e essa funcionalidade não se aplica ao CD1.

**Consequência:** este item deixa de ser uma "decisão de produto pendente" e passa a ser um **item de limpeza de código**. Recomenda-se remover (ou arquivar fora do carregamento ativo) o bloco `<div id="pageProdutividade">` do `SAC1.html`, o botão de navegação correspondente (hoje oculto via CSS, o que já funciona mas deixa marcação morta no HTML) e o arquivo `js1/produtividade.js` inteiro, já que nenhum código dele é alcançável nem deve ser. Isso reduz a superfície de manutenção e elimina a ambiguidade de ter dois modelos de dados de Produtividade coexistindo no repositório sem uso real de um deles.

---

## 6. Condição de corrida (race condition) na criação de documentos

Em `firebase.js`, `fbDocCreate()` implementa a checagem de duplicidade assim:

```javascript
async function fbDocCreate(colecao, id, data, extra) {
  var ref = fbDb.collection(colecao).doc(id);
  var snap = await ref.get();          // 1. lê
  if (snap.exists) { ... return false; }
  await ref.set(fbDataComAuditoria(data, extra));   // 2. grava
  return true;
}
```

Entre o passo 1 (leitura) e o passo 2 (gravação) existe uma janela de tempo em que outro usuário, em outra sessão, pode fazer exatamente a mesma checagem e concluir que o documento não existe ainda. Isso é um **TOCTOU (time-of-check to time-of-use)** clássico. Dentro do mesmo CD, se duas pessoas (ou duas abas) tentarem abrir simultaneamente um chamado com o mesmo número, ambas podem passar pela checagem e uma sobrescrever a outra silenciosamente via `.set()`.

O mesmo padrão de checagem não-atômica aparece em `fbVerificarChamadoDuplicado()` e `fbVerificarNotaDevDuplicada()` (queries de leitura separadas do momento da escrita).

**Correção recomendada:** usar `fbDb.runTransaction()` (mesmo padrão já usado com sucesso em `fbProximaSenhaSac()` para o contador de senhas) para tornar a checagem + escrita atômica.

---

## 7. Código morto / duplicado

As funções `_contarLocalChamados()` e `_contarLocalColecao()` existem duplicadas em **`login.js`, `js1/backup.js` e `js2/backup.js`** — leem chaves antigas do localStorage (`SAC_SAC_CD1_dados`, `SAC_CD1_SAC_dados`, etc.) que são resquícios da migração e hoje só entram como fallback quando o Firestore está indisponível.

*(Correção sobre a v1: a versão anterior citava `shared.js` como um dos arquivos com essas funções duplicadas. Conferido novamente — `shared.js`, tanto CD1 quanto CD2, não contém `_contarLocalChamados` nem `_contarLocalColecao`. `shared.js` removido da lista.)*

Não é urgente, mas reduz a superfície de manutenção quando alguém for revisitar esse código no futuro.

---

## 8. Pontos que já estão corretos (nenhuma ação necessária)

- `fbDb.enablePersistence({ synchronizeTabs: true })` está habilitado em `firebase.js` — o cache local (IndexedDB) já evita reler a coleção inteira a cada abertura de página; o listener `onSnapshot` busca só o delta desde a última sincronização. O consumo de leitura de ontem não veio de "recarregar tudo a cada visita" — veio majoritariamente do efeito de self-read gerado pelas gravações redundantes descritas na seção 3.
- Senha SAC e Produtividade CD2 já implementam o padrão de gravação item-a-item correto.
- Nove dos onze campos de Chamados já têm gravação individual eficiente (`fbAtualizarCampoChamado`).
- Os índices em `firestore.indexes.json` cobrem adequadamente as queries de leitura com escopo por CD/ano usadas no dia a dia. O problema de leitura crescente está nas queries sem escopo (seção 4), que nenhum índice resolve — a solução ali é de escopo de query, não de índice.

---

## 9. Proposta de implementação (para aprovação, sem execução nesta etapa)

**Prioridade 1 — redução de gravações redundantes (maior impacto na cota, menor risco)**
1. Chamados, passo 1: adicionar `fbAtualizarCampoChamado()` aos handlers de Setor, Braço e Usuário (hoje só chamam `salvarDadosMes()`).
2. Chamados, passo 2 (somente após o passo 1 estar em produção e validado): remover a chamada a `fbSalvarChamados()` do debounce de `salvarDadosMes()`, que passa a gravar só no `localStorage`.
3. Notas de Devolução: substituir `fbSalvarColecao('notasDevolucao', ...)` pelo padrão de dicionário de pendências + `fbSalvarItemColecao`, igual ao já usado em Senha SAC.
4. Mercadorias sem NF: mesma substituição.
5. `fbSalvarAntesSair()`: manter a função (rede de segurança necessária), mas alterar sua lógica interna para reenviar apenas itens pendentes/alterados (reaproveitando os dicionários de pendência dos itens 3 e 4 e o equivalente para Chamados), em vez de regravar tudo incondicionalmente.

**Prioridade 2 — sustentabilidade de longo prazo**
6. Adicionar filtro de `ano` (e possivelmente `cd`) em `fbCarregarTudoBackup()`, com opção de escolher o período do backup, ou ao menos limitar por padrão ao ano corrente + N anos anteriores configuráveis.

**Prioridade 3 — correção de integridade**
7. Envolver a checagem + criação de chamados/notas de devolução em `fbDb.runTransaction()` para eliminar a janela de corrida.

**Prioridade 4 — limpeza de código (decisão já tomada: CD1 não terá Produtividade)**
8. Remover o bloco `<div id="pageProdutividade">` de `SAC1.html`, o botão de navegação correspondente e o arquivo `js1/produtividade.js` inteiro.

**Prioridade 5 — limpeza (opcional, sem urgência)**
9. Remover funções duplicadas de contagem local (`_contarLocalChamados`/`_contarLocalColecao`) redundantes entre `login.js` e `backup.js` (js1/js2), mantendo uma única implementação compartilhada.

---

## 10. Impacto esperado

Com as correções de Prioridade 1 aplicadas — incluindo a cobertura dos três campos de Chamados hoje sem gravação individual e a correção do salvamento ao sair para operar por diff — o número de gravações por edição de campo deve cair de "1 útil + N-1 redundantes" para exatamente 1 gravação por campo realmente alterado, em todos os módulos, e o fechamento/recarregamento de página deixa de gerar uma regravação total das quatro coleções. Dado que o teste de ontem (63,1% de gravações) combinou digitação em massa com trocas de aba frequentes — o pior cenário simultâneo para os dois problemas —, a expectativa razoável é uma redução substancial no consumo diário de gravações e, por consequência, de leituras. A medição real só pode ser confirmada após a implementação e um novo dia de uso comparável.

---

## 11. Próximos passos sugeridos

Conforme solicitado, nenhuma alteração foi feita. Ficando à disposição para:
- Confirmar com você a prioridade de implementação acima antes de tocar em qualquer arquivo.
- Implementar as correções incrementalmente, uma de cada vez, com teste entre cada etapa — seguindo o mesmo protocolo já usado neste projeto. Em particular, o passo 1 de Chamados (cobrir Setor/Braço/Usuário) deve ser validado em produção antes do passo 2 (remover a regravação), para evitar a regressão de sincronização identificada na revisão.
