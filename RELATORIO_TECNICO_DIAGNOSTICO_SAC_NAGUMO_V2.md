# Relatório Técnico de Diagnóstico — Sistema SAC Nagumo (v2)

**Data da auditoria:** 31/07/2026
**Versão do documento:** 2 (revisão da v1 — corrige erros factuais e incorpora um achado omitido)
**Escopo:** Consumo de cotas do Firestore (gatilho da análise) + auditoria geral do código-fonte fornecido
**Método:** Leitura completa de `db.js`, `firebase.js`, `chamados.js`, `senhaSac.js`, `notasDev.js`, `mercadorias.js`, `produtividade.js`, `shared.js`, `backup.js`, `app.js`, `login.js`, `SAC1.html`, `SAC2.html`, `style1.css`, `style2.css`, `firestore.indexes.json` (ambas as pastas `js1/` e `js2/`)
**Natureza deste documento:** Diagnóstico e proposta. Nenhuma alteração foi feita no código.

> **Nota de revisão (v2):** a v1 deste relatório contém duas afirmações incorretas — uma sobre a função `salvarProdutividade()` na seção 5 e outra sobre a superfície das funções de contagem local na seção 7 — e omitia uma fonte relevante de gravações redundantes (`fbSalvarAntesSair()`). Esta v2 corrige esses pontos e ajusta a proposta de implementação em consequência. A v1 fica mantida como registro de estudo.

---

## 1. Resumo executivo

Os números de cota do Firestore que você reportou (63,1% de gravações, 40,1% de leituras em 7 dias) **não são causados por volume real de uso** — são causados por um padrão de escrita no código que regrava dados que não mudaram, toda vez que qualquer campo é editado. Esse padrão está presente em três módulos que gravam no Firestore de forma redundante (Chamados, Notas de Devolução, Mercadorias s/ NF) **e também no salvamento automático que roda ao fechar a página** (`fbSalvarAntesSair`), que regrava tudo que está em memória a cada saída.

Os dois módulos restantes (Senha SAC e Produtividade do CD2) já usam o padrão correto de gravação item-a-item.

Além disso, a auditoria encontrou:
- Um **descompasso de modelo de dados não acessível** na Produtividade do CD1 (código semanal morto vs. HTML mensal), que não afeta o uso atual porque o botão de acesso é oculto no CD1 — ver seção 5.
- Uma **condição de corrida (race condition)** na criação de chamados/notas com números duplicados.
- Queries de backup que **leem a coleção inteira sem filtro de ano**, o que fará o custo de leitura crescer indefinidamente a cada ano de uso.
- Código morto/duplicado herdado da migração localStorage → Firestore.

Nenhum desses pontos exige decisão urgente — o sistema está funcionalmente estável, como você constatou nos testes de hoje. São otimizações e correções para tornar o crescimento do sistema sustentável dentro do plano Spark (gratuito) do Firebase.

---

## 2. Contexto sobre os números do Firebase

Você mencionou que o teste de hoje representa uso real (dados de uma planilha real, um dia útil, dois usuários simultâneos). Isso é uma informação importante e muda a leitura dos números: **63,1% de gravações em um único dia de uso, por dois usuários, em um sistema onde "após o chamado ser aberto são realizadas poucas alterações", é desproporcional ao volume de edições que você descreveu.**

Uma observação importante para calibrar a expectativa: o dia de teste envolveu **digitação em massa de dados de uma planilha** (pior cenário de escrita). Em operação normal, com poucas edições após a abertura do chamado, o consumo será menor do que o observado hoje — as correções propostas aqui reduzirão o custo do dia de teste (e de dias de entrada em lote) para perto do custo de edições reais, que é baixo.

---

## 3. Causa raiz: reescrita redundante a cada edição de campo

### 3.1 Como o padrão correto funciona hoje (Senha SAC e Produtividade CD2)

Em `senhaSac.js` e `produtividade.js` (pasta `js2/`, CD2), o fluxo de salvamento é:

```
usuário edita 1 célula
  → salvarSenhaSacItem(item) adiciona o item a um dicionário de pendências (_pendentesSenhaItem)
  → debounce de 300ms
  → flushSenhaSacItens() grava SOMENTE os itens pendentes, um fbDocSet por item alterado
```

Isso é o padrão correto: 1 edição de campo → no máximo 1 gravação no Firestore (por item realmente alterado), independente do tamanho da coleção.

### 3.2 Onde o padrão está quebrado

**Chamados** (`shared.js` → `salvarDadosMes()` → `db.js` → `fbSalvarChamados()`):

```javascript
async function salvarDadosMes() {
  ...
  clearTimeout(_fbTimerChamados);
  _fbTimerChamados = setTimeout(fbSalvarChamados, 500);
}

async function fbSalvarChamados() {
  ...
  var registros = normalizarRegistros(dadosMes[mesAtual]);   // TODOS os registros do mês
  for (var i = 0; i < registros.length; i++) {
    ...
    await fbDocSet('chamados', c.id, { ... });                // grava TODOS, um por um
  }
}
```

**Efeito prático:** cada campo editado em qualquer chamado agenda uma regravação de **todos os chamados do mês corrente**, 500ms depois. Se o mês tem 40 chamados abertos e você edita 1 campo de 1 chamado, o sistema faz **40 gravações no Firestore**, das quais 39 são idênticas ao que já estava salvo.

**Cobertura parcial do caminho item-a-item (importante para a correção):** os handlers de edição em `chamados.js` chamam `fbAtualizarCampoChamado(docId, campo, valor)` (que grava só o campo alterado via `.update()`) para a maioria dos campos — chamado, loja, turno, PLU, divergência, solução/observação, texto da observação, conferente, data de abertura e data de fechamento. **Porém, três campos NÃO têm esse caminho individual e dependem exclusivamente do `fbSalvarChamados()` para sincronizar remotamente:**

| Campo | Handler | Depende de `fbSalvarChamados`? |
|---|---|---|
| Setor | `chamados.js` (onchange do select de setor) | Sim |
| Braço | `chamados.js` (onchange do input de braço) | Sim |
| Usuário | `chamados.js` (onchange do select de usuário) | Sim |

Isso significa que **não basta remover a chamada a `fbSalvarChamados()`**: é preciso antes adicionar o campo individual a esses três handlers. (Na v1 deste relatório isso foi afirmado como "inteiramente supérflua", o que está incorreto e foi corrigido nesta v2.)

**Notas de Devolução** (`notasDev.js` → `salvarNotasDev()`):

```javascript
async function salvarNotasDev() {
  lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
  clearTimeout(_fbTimerNotas);
  _fbTimerNotas = setTimeout(function () {
    fbSalvarColecao('notasDevolucao', dadosNotasDev);   // TODA a lista carregada do ano
  }, 500);
}
```

`fbSalvarColecao()` (em `db.js`) itera **toda a lista `dadosNotasDev`** (não só o item alterado) e grava um `fbDocSet` para cada. Aqui não existe nem o caminho de campo individual — toda edição de célula em qualquer nota regrava todas as notas do ano.

**Mercadorias sem NF** (`mercadorias.js` → `salvarMercadoriasNF()`): mesmo padrão, mesma função `fbSalvarColecao()`, mesmo efeito.

### 3.3 NOVO (omissão corrigida na v2): reescrita completa ao sair da página

Em `firebase.js`, a função `fbSalvarAntesSair()` é acionada em **todo fechamento/recarregamento de página** (via `window.addEventListener('beforeunload', ...)` em `app.js`) e regrava, sem debounce e sem comparação de mudanças:

- **todos** os chamados do mês corrente (mesmo loop completo do `fbSalvarChamados`);
- **todas** as senhas SAC em memória;
- **todas** as notas de devolução em memória;
- **todas** as mercadorias s/ NF em memória.

Ou seja: **cada troca de aba, cada F5, cada fechamento de navegador = regravação de tudo.** Durante os testes de hoje, com navegação frequente entre abas/páginas, essa função sozinha pode ter gerado uma fração significativa das 13 mil gravações — mesmo sem nenhuma edição. Ela deve entrar na Prioridade 1 junto com os itens da seção 3.2.

### 3.4 Efeito colateral sobre as leituras

Cada gravação redundante dispara `onSnapshot` de volta para todas as sessões abertas na mesma coleção (inclusive a própria sessão que gravou — "self-read"), o que explica por que a leitura subiu proporcionalmente à gravação nos seus números (20 mil leituras vs. 13 mil gravações: com os dois usuários conectados, cada escrita ecoa para dois listeners ativos). Corrigir a gravação reduz automaticamente boa parte da leitura, sem precisar de mudança separada nos listeners.

### 3.5 Tabela-resumo

| Módulo | Padrão atual | Escritas por edição de 1 campo | Correto? |
|---|---|---|---|
| Chamados | campo individual na maioria dos campos **+** regravação do mês inteiro (redundante) | 1 útil + N-1 redundantes | Parcialmente — remover a parte redundante **e** cobrir os 3 campos sem caminho individual (setor, braço, usuário) |
| Notas de Devolução | regravação da lista do ano inteira | N gravações | Não |
| Mercadorias sem NF | regravação da lista do ano inteira | N gravações | Não |
| Senha SAC | item individual via dicionário de pendências | 1 | Sim |
| Produtividade (CD2) | item individual via dicionário de pendências | 1 | Sim |
| **Salvar ao sair (`fbSalvarAntesSair`)** | **regravação de tudo em memória a cada `beforeunload`** | **N chamados + M senhas + N notas + N mercadorias por saída** | **Não (omissa na v1)** |
| Produtividade (CD1) | código morto/incompatível, não acessível na UI (ver seção 5) | não aplicável | Decisão de produto, não bug |

---

## 4. Queries de backup sem filtro de ano (crescimento não limitado)

Em `firebase.js`, a função `fbCarregarTudoBackup()` (usada em toda exportação de backup) lê as coleções assim:

```javascript
var chamSnap = await fbDb.collection('chamados').where('ativo', '==', true).get();
```

Sem filtro de `ano` e sem filtro de `cd`. Isso significa que **cada exportação de backup lê todos os chamados ativos de todos os anos e dos dois CDs**, mesmo que o backup seja gerado a partir de uma única página (CD1 ou CD2). O mesmo padrão se repete para `senhasSac`, `notasDevolucao`, `mercadoriasNF`, `produtividade` e `usuarios` dentro da mesma função.

Isso não é grave hoje (pouco tempo de uso, pouco volume acumulado), mas é uma bomba-relógio de custo de leitura: em 2027, 2028 etc., cada exportação de backup vai custar proporcionalmente mais leituras, mesmo que o padrão diário de uso continue igual. Vale notar que essa função é disparada **apenas em exportações manuais de backup** (ao sair com backup ou pelo menu de configurações) — não é um custo diário automático, mas cresce todo ano.

---

## 5. Produtividade do CD1: descompasso de modelo, mas NÃO acessível na UI (revisado na v2)

**O que a v1 afirmava (incorreto):** que o botão "Salvar" da Produtividade do CD1 geraria erro `salvarProdutividade is not defined`. **Isso está errado** — a função `salvarProdutividade()` existe em `js1/produtividade.js:18` (com o comportamento do modelo semanal).

**O que é verdadeiro:**
- `SAC1.html` (CD1) e `SAC2.html` (CD2) usam a **mesma estrutura de HTML** na página de Produtividade — uma tabela mensal com colunas "Mês / 1° Turno / 2° Turno / 3° Turno / Total" (`id="tabelaProdutividade"`, `id="produtividadeBody"`).
- O `js1/produtividade.js` (CD1) implementa um **modelo de dados completamente diferente**: uma grade semanal por usuário/dia (`produtividadeTable`, `produtividadeHeader`, `dadosProdutividade` com `{usuario, data, semana, valor, cor}`), cujos elementos de DOM (`produtividadeHeader`, `produtividadeTable`) **não existem no HTML** — `renderizarProdutividade()` retorna sem preencher nada.
- O botão "Gerar PDF" (`onclick="gerarPdfProdutividade()"`) chamaria uma função que **de fato não existe** em `js1/produtividade.js` (só existe no modelo do CD2).

**Porém — e isto é decisivo — o descompasso é inacessível na prática:** o botão de navegação "Produtividade" em `SAC1.html` tem a classe `cd2-only` e o CSS o oculta no CD1 (`.cd1-active .cd2-only { display: none !important; }` em `style1.css`). Como o `db.js` do CD1 sempre aplica a classe `cd1-active` ao `<body>`, a aba Produtividade **não é exibida nem acessível na página do CD1**. Por isso seus testes de hoje não encontraram falhas: a aba não existe para o usuário do CD1, e no CD2 (onde o botão aparece) o `js2/produtividade.js` implementa o modelo mensal compatível com o HTML.

**Conclusão corrigida:** não se trata de um bug funcional em produção, mas de **código morto/incompatível** carregado na página do CD1. A correção depende de uma decisão de produto: **o CD1 deve ter Produtividade?**
- **Não:** remover o bloco de Produtividade do CD1 (HTML + `js1/produtividade.js`) para reduzir superfície de manutenção.
- **Sim:** alinhar `js1/produtividade.js` ao modelo mensal do CD2 (ou o inverso) e remover a classe `cd2-only` do botão.

Não deve ser feito sem essa decisão, já que os modelos são conceitualmente diferentes.

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

Entre o passo 1 (leitura) e o passo 2 (gravação) existe uma janela de tempo em que outro usuário, em outra sessão, pode fazer exatamente a mesma checagem e concluir que o documento não existe ainda. Isso é um **TOCTOU (time-of-check to time-of-use)** clássico: com CD1 e CD2 normalmente operados por pessoas diferentes isso é baixo risco na prática (números de chamado são específicos de cada CD), mas dentro do mesmo CD, se duas pessoas abrirem simultaneamente um chamado com o mesmo número (ex.: duas abas do mesmo usuário, ou dois usuários digitando por coincidência o mesmo número no mesmo segundo), ambas podem passar pela checagem e uma sobrescrever a outra silenciosamente via `.set()`.

O mesmo padrão de checagem não-atômica aparece em `fbVerificarChamadoDuplicado()` e `fbVerificarNotaDevDuplicada()` (queries de leitura separadas do momento da escrita).

**Correção recomendada:** usar `fbDb.runTransaction()` (mesmo padrão já usado com sucesso em `fbProximaSenhaSac()` para o contador de senhas) para tornar a checagem + escrita atômica.

---

## 7. Código morto / duplicado

- `_contarLocalChamados()` e `_contarLocalColecao()` existem **duplicadas** em `login.js` e `backup.js` (js1 e js2). **Correção da v1:** a v1 citava `shared.js` entre os arquivos — isso está errado, as funções não existem lá. Elas estão apenas em `login.js`, `js1/backup.js` e `js2/backup.js`, com pequenas variações entre si. Nenhuma delas é mais a fonte primária de verdade desde que o Firestore virou o armazenamento principal — hoje elas só entram como fallback quando o Firestore está indisponível, mas continuam lendo de chaves antigas do localStorage (`SAC_SAC_CD1_dados`, `SAC_CD1_SAC_dados`, etc.) que são resquícios da migração.
- `firebase.js` mantém `fbCarregarTudoBackup()` como única fonte para exportação, mas `backup.js` ainda tenta múltiplos fallbacks de localStorage em sequência (`SAC_CD1_dados`, depois `dadosMes`, depois `SAC_CD1_SENHAS_SAC_dados`...) — funcional, mas é uma superfície grande de código para manter caso algum dia o Firestore for a única fonte confiável.

Não é urgente, mas reduz a superfície de manutenção quando alguém for revisitar esse código no futuro.

---

## 8. Pontos que já estão corretos (nenhuma ação necessária)

- `fbDb.enablePersistence({ synchronizeTabs: true })` está habilitado em `firebase.js` — o cache local (IndexedDB) já evita reler a coleção inteira a cada abertura de página; o listener `onSnapshot` busca só o delta desde a última sincronização. **O consumo de leitura de hoje não veio de "recarregar tudo a cada visita"** — veio majoritariamente do efeito de self-read gerado pelas gravações redundantes descritas na seção 3.
- Senha SAC e Produtividade CD2 já implementam o padrão de gravação item-a-item correto.
- Os índices em `firestore.indexes.json` cobrem adequadamente as queries de leitura com escopo por CD/ano usadas no dia a dia (`fbCarregarColecao`, `fbOnSnapshotColecao`). O problema de leitura crescente está nas queries sem escopo (seção 4), que nenhum índice resolve — a solução ali é de escopo de query, não de índice.

---

## 9. Proposta de implementação (para aprovação, sem execução nesta etapa)

Ordem sugerida por impacto/risco:

**Prioridade 1 — redução de gravações redundantes (maior impacto na cota, menor risco)**
1. Chamados: **primeiro** adicionar `fbAtualizarCampoChamado(docId, campo, valor)` aos handlers de **setor, braço e usuário** em `chamados.js` (que hoje não têm caminho individual); **depois** remover a chamada a `fbSalvarChamados()` do debounce de `salvarDadosMes()` (que passa a gravar só no `localStorage`).
2. Notas de Devolução: substituir `fbSalvarColecao('notasDevolucao', ...)` pelo padrão de dicionário de pendências + `fbSalvarItemColecao`, igual ao já usado em Senha SAC.
3. Mercadorias sem NF: mesma substituição.
4. **`fbSalvarAntesSair()`** (novo item, omisso na v1): reduzir a regravação de tudo em memória a cada `beforeunload` — idealmente reutilizar os mesmos dicionários de pendências/`fbAtualizarCampoChamado` já usados no salvamento incremental, ou gravar apenas itens efetivamente alterados.

**Prioridade 2 — sustentabilidade de longo prazo**
5. Adicionar filtro de `ano` (e possivelmente `cd`) em `fbCarregarTudoBackup()`, com opção de escolher o período do backup, ou ao menos limitar por padrão ao ano corrente + N anos anteriores configuráveis.

**Prioridade 3 — correção de integridade**
6. Envolver a checagem + criação de chamados/notas de devolução em `fbDb.runTransaction()` para eliminar a janela de corrida.

**Prioridade 4 — decisão de produto, não técnica**
7. Decidir se o CD1 deve ter Produtividade. Se sim, alinhar `js1/produtividade.js` ao modelo mensal (igual ao CD2) e liberar o botão; se não, remover o código morto do CD1.

**Prioridade 5 — limpeza (opcional, sem urgência)**
8. Remover funções duplicadas de contagem local (`_contarLocalChamados`/`_contarLocalColecao`) redundantes entre `login.js` e `backup.js` (js1/js2), mantendo uma única implementação compartilhada. (Correção da v1: `shared.js` não contém essas funções.)

---

## 10. Impacto esperado

Com as correções de Prioridade 1 aplicadas, o número de gravações por edição de campo deve cair de "1 útil + N-1 redundantes" para exatamente 1 gravação por campo realmente alterado, em todos os módulos — alinhando Chamados, Notas de Devolução e Mercadorias ao padrão que Senha SAC e Produtividade (CD2) já demonstram funcionar bem. O salvamento ao sair da página (item 4), que hoje regrava tudo em memória, deixaria de contribuir com centenas de gravações por navegação.

Dado que o teste de hoje (63,1% de gravações) foi majoritariamente gerado por esses padrões redundantes — incluindo as regravações de saída durante a navegação entre abas — a expectativa razoável é uma redução substancial no consumo diário de gravações e, por consequência, de leituras. Mas a medição real só pode ser confirmada após a implementação e um novo dia de uso comparável.

---

## 11. Próximos passos sugeridos

Conforme solicitado, nenhuma alteração foi feita. Ficando à disposição para:
- Confirmar com você a prioridade de implementação acima antes de tocar em qualquer arquivo.
- Confirmar a decisão de produto da Produtividade do CD1 (seção 5).
- Implementar as correções incrementalmente, uma de cada vez, com teste entre cada etapa — seguindo o mesmo protocolo que já vem sendo usado neste projeto.
