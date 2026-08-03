# Relatório Técnico de Diagnóstico — Sistema SAC Nagumo

**Data da auditoria:** 31/07/2026
**Escopo:** Consumo de cotas do Firestore (gatilho da análise) + auditoria geral do código-fonte fornecido
**Método:** Leitura completa de `db.js`, `firebase.js`, `chamados.js`, `senhaSac.js`, `notasDev.js`, `mercadorias.js`, `produtividade.js`, `shared.js`, `backup.js`, `login.js`, `SAC1.html`, `SAC2.html`, `firestore.indexes.json` (ambas as pastas `js1/` e `js2/`)
**Natureza deste documento:** Diagnóstico e proposta. Nenhuma alteração foi feita no código.

---

## 1. Resumo executivo

Os números de cota do Firestore que você reportou (63,1% de gravações, 40,1% de leituras em 7 dias) **não são causados por volume real de uso** — são causados por um padrão de escrita no código que regrava dados que não mudaram, toda vez que qualquer campo é editado. Esse padrão está presente em três dos sete módulos que gravam no Firestore. Os outros quatro módulos (Senha SAC, Produtividade CD2, campo individual de Chamados, Configurações) já usam o padrão correto.

Além disso, a auditoria encontrou:
- Um **bug funcional confirmado** na aba Produtividade do CD1 (incompatibilidade entre HTML e JavaScript — botões "Salvar" e "Gerar PDF" não funcionam).
- Uma **condição de corrida (race condition)** na criação de chamados/notas com números duplicados.
- Queries de backup que **leem a coleção inteira sem filtro de ano**, o que fará o custo de leitura crescer indefinidamente a cada ano de uso.
- Código morto/duplicado herdado da migração localStorage → Firestore.

Nenhum desses pontos exige decisão urgente — o sistema está funcionalmente estável, como você constatou nos testes de hoje. São otimizações e correções para tornar o crescimento do sistema sustentável dentro do plano Spark (gratuito) do Firebase.

---

## 2. Contexto sobre os números do Firebase

Você mencionou que o teste de hoje representa uso real (dados de uma planilha real, um dia útil, dois usuários simultâneos). Isso é uma informação importante e muda a leitura dos números: **63,1% de gravações em um único dia de uso real, por dois usuários, em um sistema onde "após o chamado ser aberto são realizadas poucas alterações", é desproporcional ao volume de edições que você descreveu.** Essa desproporção é exatamente o sintoma do problema técnico descrito abaixo — não é um indicativo de que o uso real do sistema é inerentemente pesado.

---

## 3. Causa raiz: reescrita da coleção inteira a cada edição de campo

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

Vale notar que **já existe também** um caminho eficiente e correto rodando em paralelo: `criarCelInput`/`criarCelSelect` em `chamados.js` chamam `fbAtualizarCampoChamado(docId, campo, valor)` a cada edição, que grava só o campo alterado via `.update()`. Ou seja, hoje o sistema faz o trabalho certo **e** o trabalho redundante ao mesmo tempo — a chamada a `fbSalvarChamados()` no debounce de 500ms é inteiramente supérflua.

**Notas de Devolução** (`notasDev.js` → `salvarNotasDev()`):

```javascript
async function salvarNotasDev() {
  lsSetCd('NOTAS_DEV_dados', dadosNotasDev);
  clearTimeout(_fbTimerNotas);
  _fbTimerNotas = setTimeout(function () {
    fbSalvarColecao('notasDevolucao', dadosNotasDev);   // TODA a coleção do ano
  }, 500);
}
```

`fbSalvarColecao()` (em `db.js`) itera **toda a lista `dadosNotasDev`** (não só o item alterado) e grava um `fbDocSet` para cada. Aqui não existe nem o caminho de campo individual — toda edição de célula em qualquer nota regrava todas as notas do ano.

**Mercadorias sem NF** (`mercadorias.js` → `salvarMercadoriasNF()`): mesmo padrão, mesma função `fbSalvarColecao()`, mesmo efeito.

### 3.3 Efeito colateral sobre as leituras

Cada gravação redundante dispara `onSnapshot` de volta para todas as sessões abertas na mesma coleção (inclusive a própria sessão que gravou — "self-read"), o que explica por que a leitura também subiu proporcionalmente à gravação nos seus números. Corrigir a gravação reduz automaticamente boa parte da leitura, sem precisar de mudança separada nos listeners.

### 3.4 Tabela-resumo

| Módulo | Padrão atual | Escritas por edição de 1 campo | Correto? |
|---|---|---|---|
| Chamados | campo individual **+** regravação do mês inteiro (redundante) | 1 útil + N-1 redundantes | Parcialmente — remover a parte redundante |
| Notas de Devolução | regravação da coleção do ano inteira | N gravações | Não |
| Mercadorias sem NF | regravação da coleção do ano inteira | N gravações | Não |
| Senha SAC | item individual via dicionário de pendências | 1 | Sim |
| Produtividade (CD2) | item individual via dicionário de pendências | 1 | Sim |
| Produtividade (CD1) | modelo de dados incompatível com a UI (ver seção 5) | não aplicável | Bug funcional |

---

## 4. Queries de backup sem filtro de ano (crescimento não limitado)

Em `firebase.js`, a função `fbCarregarTudoBackup()` (usada em toda exportação de backup) lê as coleções assim:

```javascript
var chamSnap = await fbDb.collection('chamados').where('ativo', '==', true).get();
```

Sem filtro de `ano` e sem filtro de `cd`. Isso significa que **cada exportação de backup lê todos os chamados ativos de todos os anos e dos dois CDs**, mesmo que o backup seja gerado a partir de uma única página (CD1 ou CD2). O mesmo padrão se repete para `senhasSac`, `notasDevolucao`, `mercadoriasNF`, `produtividade` e `usuarios` dentro da mesma função.

Isso não é grave hoje (pouco tempo de uso, pouco volume acumulado), mas é uma bomba-relógio de custo de leitura: em 2027, 2028 etc., cada exportação de backup vai custar proporcionalmente mais leituras, mesmo que o padrão diário de uso continue igual. Este ponto já havia sido identificado anteriormente como "quatro coleções sem filtro de ano" e foi confirmado nesta auditoria — a origem exata é esta função de backup.

---

## 5. Bug funcional confirmado: Produtividade do CD1 (achado novo)

Este ponto não estava no escopo original da pergunta sobre o Firebase, mas apareceu durante a leitura comparativa dos dois conjuntos de arquivos (`js1/` vs `js2/`) e é importante o suficiente para reportar com prioridade.

**O que a auditoria encontrou:** `SAC1.html` (CD1) e `SAC2.html` (CD2) usam a **mesma estrutura de HTML** na página de Produtividade — uma tabela mensal com colunas "1° Turno / 2° Turno / 3° Turno" (`id="tabelaProdutividade"`, `id="produtividadeBody"`).

Porém, o `js1/produtividade.js` (CD1) implementa um **modelo de dados completamente diferente**: uma grade semanal por usuário/dia (`produtividadeTable`, `produtividadeHeader`, `dadosProdutividade` com `{usuario, data, semana, valor, cor}`), enquanto o `js2/produtividade.js` (CD2) implementa o modelo mensal que de fato corresponde ao HTML (`{mes, turno1, turno2, turno3}`).

**Consequência observável:**
- `renderizarProdutividade()` do CD1 procura por `document.getElementById('produtividadeHeader')`, elemento que não existe em `SAC1.html`. A função retorna sem preencher a tabela — a aba Produtividade do CD1 provavelmente abre vazia.
- O botão "Salvar" em `SAC1.html` tem `onclick="salvarProdutividade()"`, mas essa função **não existe** em `js1/produtividade.js` (só existe no modelo do CD2). Ao clicar, o botão deve gerar um erro de JavaScript no console (`salvarProdutividade is not defined`) e não salvar nada.
- O botão "Gerar PDF" (`onclick="gerarPdfProdutividade()"`) tem o mesmo problema — função inexistente no arquivo do CD1.

**Recomendação:** confirmar em teste manual na aba Produtividade do CD1 especificamente (preencher um valor e clicar em Salvar). Se confirmado, a correção é decidir qual dos dois modelos de dados é o desejado para CD1 (mensal, igual ao CD2, ou semanal/grade) e alinhar HTML + JS de acordo — **não deve ser feito sem sua decisão sobre qual modelo é o correto para o CD1**, já que são conceitualmente diferentes (não é só um ajuste de nomes de `id`).

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

- `_contarLocalChamados()` e `_contarLocalColecao()` existem **duplicadas** em `login.js`, `backup.js` (js1 e js2) e implicitamente reimplementadas com pequenas variações em cada arquivo. Nenhuma delas é mais a fonte primária de verdade desde que o Firestore virou o armazenamento principal — hoje elas só entram como fallback quando o Firestore está indisponível, mas continuam lendo de chaves antigas do localStorage (`SAC_SAC_CD1_dados`, `SAC_CD1_SAC_dados`, etc.) que são resquícios da migração.
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
1. Chamados: remover a chamada a `fbSalvarChamados()` do debounce de `salvarDadosMes()` (o campo individual via `fbAtualizarCampoChamado` já cobre a persistência remota). Manter `salvarDadosMes()` gravando só no `localStorage`.
2. Notas de Devolução: substituir `fbSalvarColecao('notasDevolucao', ...)` pelo padrão de dicionário de pendências + `fbSalvarItemColecao`, igual ao já usado em Senha SAC.
3. Mercadorias sem NF: mesma substituição.

**Prioridade 2 — sustentabilidade de longo prazo**
4. Adicionar filtro de `ano` (e possivelmente `cd`) em `fbCarregarTudoBackup()`, com opção de escolher o período do backup, ou ao menos limitar por padrão ao ano corrente + N anos anteriores configuráveis.

**Prioridade 3 — correção de integridade**
5. Envolver a checagem + criação de chamados/notas de devolução em `fbDb.runTransaction()` para eliminar a janela de corrida.

**Prioridade 4 — decisão de produto, não técnica**
6. Alinhar HTML/JS da Produtividade do CD1 — depende da sua decisão sobre qual modelo de dados (mensal ou semanal) é o desejado para esse CD.

**Prioridade 5 — limpeza (opcional, sem urgência)**
7. Remover funções duplicadas de contagem local (`_contarLocalChamados`/`_contarLocalColecao`) redundantes entre `login.js`, `backup.js` e `shared.js`, mantendo uma única implementação compartilhada.

---

## 10. Impacto esperado

Com as correções de Prioridade 1 aplicadas, o número de gravações por edição de campo deve cair de "1 útil + N-1 redundantes" para exatamente 1 gravação por campo realmente alterado, em todos os módulos — alinhando Chamados, Notas de Devolução e Mercadorias ao padrão que Senha SAC e Produtividade (CD2) já demonstram funcionar bem. Dado que o teste de hoje (63,1% de gravações) foi majoritariamente gerado por esse padrão redundante, a expectativa razoável é uma redução substancial no consumo diário de gravações e, por consequência, de leituras — mas a medição real só pode ser confirmada após a implementação e um novo dia de uso comparável.

---

## 11. Próximos passos sugeridos

Conforme solicitado, nenhuma alteração foi feita. Ficando à disposição para:
- Confirmar com você a prioridade de implementação acima antes de tocar em qualquer arquivo.
- Investigar in loco (com acesso ao console do navegador) se o botão "Salvar" da Produtividade do CD1 de fato lança o erro esperado, para confirmar a seção 5 antes de decidir o que fazer.
- Implementar as correções incrementalmente, uma de cada vez, com teste entre cada etapa — seguindo o mesmo protocolo que já vem sendo usado neste projeto.
