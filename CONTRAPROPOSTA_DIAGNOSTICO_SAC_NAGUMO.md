# Contraproposta de Correções — Relatório de Diagnóstico SAC Nagumo

**Documento:** revisão das correções aplicadas entre a v1 e a v2 do relatório técnico
**Autor da revisão:** Big (revisor)
**Data:** 31/07/2026

Este documento lista **apenas os pontos que foram modificados ou alterados** em relação à v1 original. Cada item segue o formato: ponto original (v1) → ponto corrigido (v2) → justificativa técnica.

---

## 1. Campo individual de Chamados: "supérfluo" → necessário complementar

**v1 (como estava):**
> "a chamada a `fbSalvarChamados()` no debounce de 500ms é inteiramente supérflua" — e, por consequência, a proposta P1.1 era apenas "remover a chamada a `fbSalvarChamados()` do debounce".

**v2 (como ficou):**
> Remover o `fbSalvarChamados()` do debounce **somente depois** de adicionar o caminho individual (`fbAtualizarCampoChamado`) aos handlers de **setor, braço e usuário**, que hoje dependem exclusivamente da regravação completa para sincronizar remotamente.

**Justificativa:** a v1 afirmava que "o campo individual já cobre a persistência remota" e, portanto, a regravação do mês inteiro seria "inteiramente supérflua". Isso está **incorreto** para três campos do chamado, cujos handlers em `chamados.js` chamam apenas `salvarDadosMes()` e não `fbAtualizarCampoChamado()`:
- Setor (onchange do select de setor)
- Braço (onchange do input de braço)
- Usuário (onchange do select de usuário)

Se a v1 fosse aplicada como estava, essas três alterações **deixariam de ser sincronizadas no Firestore** (só ficariam no localStorage), causando perda silenciosa de dados na sincronização entre CD1 e CD2. A correção é condicionada: primeiro cobrir os 3 campos, depois remover a regravação.

---

## 2. Achado novo (omissão da v1): `fbSalvarAntesSair()`

**v1 (como estava):**
> Não mencionava o salvamento automático ao sair da página. A seção 3 listava apenas Chamados, Notas e Mercadorias como fontes de gravação redundante.

**v2 (como ficou):**
> Nova seção 3.3: `fbSalvarAntesSair()` roda em **todo `beforeunload`** (registrado em `app.js`) e regrava, sem debounce e sem comparação de mudanças, todos os chamados do mês + todas as senhas SAC + todas as notas de devolução + todas as mercadorias s/ NF em memória. Entra como item **4 da Prioridade 1**.

**Justificativa:** a v1 deixou de fora a segunda maior fonte de gravações redundantes. Cada troca de aba, F5 ou fechamento de navegador durante os testes de hoje regravou tudo em memória. Isso é um multiplicador de escritas independente de edições, e a proposta da v1 não o endereçava.

---

## 3. Produtividade do CD1: "bug funcional confirmado" → código morto inacessível

**v1 (como estava):**
> Seção 5 intitulada "Bug funcional confirmado: Produtividade do CD1", afirmando que o botão "Salvar" lançaria `salvarProdutividade is not defined` e que a aba "provavelmente abre vazia".

**v2 (como ficou):**
> Seção 5 reescrita: `salvarProdutividade()` **existe** em `js1/produtividade.js:18`. O descompasso de modelo (HTML mensal × JS semanal) é real, porém o botão de navegação é `cd2-only` e o CSS o oculta no CD1 (`.cd1-active .cd2-only { display: none !important; }`). Portanto a aba **não é acessível na UI do CD1** — não é um bug em produção, é código morto/incompatível. Reclassificada como **decisão de produto** (item 7 da Prioridade 4).

**Justificativa:** a v1 continha uma afirmação factualmente incorreta (`salvarProdutividade is not defined`) e classificou como bug confirmado algo que o usuário não consegue acessar — o que contradiz o próprio resultado dos testes de hoje ("todas as abas funcionando"), pois a aba não existe para o usuário do CD1. A correção muda a natureza do item: não é uma correção de bug urgente, é uma decisão de produto (manter Produtividade no CD1 ou remover o código morto).

---

## 4. Código duplicado: lista de arquivos corrigida

**v1 (como estava):**
> Seção 7: "existem duplicadas em `login.js`, `backup.js` (js1 e js2) e implicitamente reimplementadas com pequenas variações em cada arquivo" — e a Prioridade 5 citava `login.js`, `backup.js` e `shared.js`.

**v2 (como ficou):**
> As funções `_contarLocalChamados()`/`_contarLocalColecao()` estão **apenas** em `login.js`, `js1/backup.js` e `js2/backup.js`. `shared.js` foi removido da lista. Prioridade 5 corrigida para "entre `login.js` e `backup.js` (js1/js2)".

**Justificativa:** a v1 citou `shared.js` como contendo essas funções duplicadas, o que é **falso** — a varredura do código não encontrou nenhuma delas nesse arquivo. A lista correta evita trabalho de limpeza em arquivo errado.

---

## 5. Resumo executivo e expectativa de redução recalibrados

**v1 (como estava):**
> Seção 1: "Os outros quatro módulos (Senha SAC, Produtividade CD2, campo individual de Chamados, Configurações) já usam o padrão correto." Seção 2 sem observação sobre a natureza do dia de teste.

**v2 (como ficou):**
> Seção 1 corrigida: Chamados é "parcialmente" correto (não "já usa o padrão correto"), e o resumo passa a citar `fbSalvarAntesSair`. Seção 2 acrescenta a observação de que o dia de teste foi de **digitação em massa** (pior cenário), portanto a redução esperada se refere a esse cenário, e o uso normal já seria menor.

**Justificativa:** o resumo executivo da v1 listava Chamados entre os módulos que "já usam o padrão correto", em contradição com a própria seção 3 (que o classifica como "Parcialmente"). A v2 alinha o resumo ao corpo do relatório e evita prometer redução medida sobre um dia que inclui regravações de saída.

---

## 6. Proposta de implementação reordenada e complementada

**v1 (como estava):**
> Prioridade 1 com 3 itens (chamados em 1 passo, notas, mercadorias). Prioridade 4 como "correção técnica". Prioridade 5 citando `shared.js`.

**v2 (como ficou):**
> Prioridade 1 com 4 itens — chamados em **2 passos** (primeiro cobrir setor/braço/usuário, depois remover o debounce) + notas + mercadorias + **`fbSalvarAntesSair`**. Prioridade 4 reformulada como **decisão de produto**. Prioridade 5 com a lista de arquivos corrigida.

**Justificativa:** reflexo direto das correções 1 a 5 acima — a proposta da v1 teria causado perda de sincronização (item 1), não tratava a regravação de saída (item 2), tratava código inacessível como bug (item 3) e mirava limpeza em arquivo errado (item 4).

---

## Resumo das alterações (delta v1 → v2)

| # | Local na v1 | Tipo de alteração | Resumo |
|---|---|---|---|
| 1 | Seção 3.2 + P1.1 | **Correção** | `fbSalvarChamados()` não é "inteiramente supérflua" — 3 campos (setor, braço, usuário) dependem dela; correção em 2 passos |
| 2 | Seção 3 (nova 3.3) + P1 | **Adição** | `fbSalvarAntesSair()` regrava tudo a cada `beforeunload`; entrou na Prioridade 1 |
| 3 | Seção 5 + P4 | **Correção** | `salvarProdutividade()` existe; não é bug acessível, é código morto (`cd2-only`) → decisão de produto |
| 4 | Seção 7 + P5 | **Correção** | `shared.js` não contém `_contarLocal*`; remover da lista de arquivos |
| 5 | Seções 1 e 2 | **Correção** | Chamados não está entre os "já corretos"; dia de teste foi digitação em massa (pior cenário) |
| 6 | Seção 9 | **Reflexo das acima** | P1 reordenada/complementada; P4 como decisão de produto; P5 com arquivos corretos |

Nenhuma alteração de código foi feita — este documento e a v2 são apenas revisões do diagnóstico.
