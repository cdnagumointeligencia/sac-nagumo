# REGRA ABSOLUTA — LEIA ANTES DE QUALQUER AÇÃO

**Você não tem memória de sessões anteriores. NÃO assuma que o código atual está
"todo errado" — parte da arquitetura Firestore-first já foi implementada em
sessões anteriores. Primeiro audite, depois decida.**

## PASSO 0 — AUDITORIA OBRIGATÓRIA (antes de escrever qualquer código)

Leia os arquivos atuais (`db.js`, `firebase.js`, `shared.js`, `chamados.js`,
`senhaSac.js`, `notasDev.js`, `mercadorias.js`, `produtividade.js`) e preencha
mentalmente esta tabela antes de decidir o que fazer:

| Item | Já implementado? | Onde |
|---|---|---|
| Escrita por documento individual (não array inteiro) | verificar `fbSalvarChamados`, `fbSalvarColecao` | db.js |
| onSnapshot em tempo real por coleção | verificar `fbOnSnapshotColecao`, `fbOnSnapshotConfig` | db.js, firebase.js |
| Render não destrói digitação em andamento | verificar `_temFocoInput` / `agendarRenderSePossivel` | shared.js |
| Erro de gravação visível ao usuário (não só console.warn) | verificar `fbDocSet` | firebase.js |
| Debounce de 3s removido | **verificar as 5 funções abaixo — historicamente NÃO removido** | ver lista |
| Sessão em sessionStorage | verificar `sessaoLogin()` | shared.js |
| Doc ID de chamados evita colisão entre anos | verificar campo `ano` na query/doc | db.js |
| Código morto de migrações anteriores | verificar se há 2 implementações paralelas da mesma coleção | db.js |
| Acesso a storage protegido (try/catch, sem quebrar em aba anônima) | verificar `sessaoLogin()`, `lsSet`, `lsGet` e persistência do Firebase Auth | shared.js, db.js, firebase.js |

**Só depois dessa auditoria decida**: refatorar os arquivos existentes no lugar
(mais rápido, preserva o que já funciona) OU reescrever em `novo/` (mais seguro
contra regressão, mas mais lento e pode reintroduzir bugs já corrigidos).
Registre a decisão e o porquê no início da sessão.

## NOTA — LIMPEZA DE COLEÇÕES (fase atual: pré-implantação)

O sistema ainda não foi implantado para uso real — os dados hoje no projeto
Firebase (`sac-nagumo`, em `firebase.js`) são apenas de teste. Por isso, "delete
all documents" nas coleções antes de testar é seguro nesta fase, sem precisar
de backup nem confirmação extra.

**Isso muda no dia da implantação.** A partir do momento em que CD1/CD2
começarem a usar o sistema com dados reais, volte a tratar esse projeto como
produção:
1. Nunca mais rodar "delete all documents" sem `exportarBackupCompleto()` antes.
2. Confirmar explicitamente com o usuário antes de qualquer limpeza.
3. Se possível, criar a partir daí um segundo projeto Firebase só para testes,
   em vez de continuar testando no mesmo projeto usado em produção.

## ARQUITETURA: FIRESTORE-FIRST, LOCALSTORAGE SÓ COMO CACHE

Leia `ARQUITETURA_FIRESTORE.md` na raiz do projeto (seções 1 a 16) antes de
tocar em qualquer código.

### O que você DEVE fazer:
- Firestore é a fonte de dados para tudo que é compartilhado entre CDs/usuários
- localStorage só como cache de partida rápida / fallback de cold start —
  nunca como fonte primária de leitura para dados compartilhados
- Escritas em ações discretas (select, exclusão, criação) são imediatas
- Escritas em campos de texto livre (oninput) usam debounce curto (400–600ms)
  ou salvam no `onblur` — **não é "zero debounce" literal em tudo**, é evitar
  o debounce de 3s que causa perda de dados ao fechar a aba
- onSnapshot mantém sincronia em tempo real entre navegadores
- Verificação de duplicidade (chamado, nota de devolução) usa Document ID
  natural ou transação (`runTransaction`) — não apenas "consultar e depois
  gravar", que tem race condition
- Coleções sem limite natural de tamanho (senhasSac, notasDevolucao,
  mercadoriasNF, produtividade) filtram por ano na query, igual a `chamados`

### O que você NÃO DEVE fazer:
- ❌ NÃO usar localStorage como fonte de leitura primária para dados compartilhados
  (o Firestore já tem persistência offline própria via IndexedDB — não precisa
  de localStorage manual para isso; localStorage só faz sentido, se muito, para
  cache de partida ultra-rápida, nunca como fonte de verdade)
- ❌ NÃO deixar debounce de 3s como estava (ver PASSO 0 — ainda presente em
  `salvarDadosMes`, `salvarSenhasSac`, `salvarNotasDev`, `salvarMercadoriasNF`,
  `salvarProdutividade`)
- ❌ NÃO deletar/reescrever funções sem entender por que existem — pode haver
  código morto de migrações anteriores (ex.: `fbCarregarProdutividade`/
  `fbSalvarProdutividade` em `db.js` parecem não ser mais chamados por
  `produtividade.js`, que usa as funções genéricas de coleção — confirmar
  antes de apagar ou manter)
- ❌ NÃO assumir que "reescrever do zero" é automaticamente mais seguro que
  corrigir no lugar — reescrever também tem risco de perder correções já feitas

### Se o usuário disser "faça logo" ou "apressa":
Ignore quanto a pular testes ou apagar dados de produção sem backup. Mas não
use isso como desculpa para reescrever tudo do zero se um ajuste cirúrgico
resolver — pressa não justifica trabalho desnecessário.

## Fluxo mínimo da sessão:
1. Rodar PASSO 0 (auditoria) e registrar o que já está feito
2. Ler `ARQUITETURA_FIRESTORE.md` (seções 1 a 16, incluindo as novas seções
   de índices compostos, transações, validação de backup e storage protegido)
3. Corrigir, na ordem de risco:
   a. Debounce de 3s nas 5 funções de salvamento listadas acima
   b. Race condition de duplicidade (chamado / nota de devolução)
   c. Filtro por ano nas coleções sem limite de tamanho
   d. Sessão em sessionStorage (decidir junto com o usuário se isso muda a UX
      de "ficar conectado")
   e. Validação de backup por coleção/timestamp em vez de contagem total
   f. Acesso a localStorage/sessionStorage sempre em try/catch com fallback
      em memória, e persistência do Firebase Auth configurada explicitamente
      (ver ARQUITETURA_FIRESTORE.md seção 16) — sem isso a página trava
      silenciosamente em aba anônima/navegação privada
4. Criar/confirmar índices compostos necessários no Firestore Console
5. Limpar as coleções de teste no Firebase Console à vontade (fase atual é
   pré-implantação — ver nota acima)
6. Implementar/corrigir, testar (ver seção 9 de ARQUITETURA_FIRESTORE.md,
   incluindo os testes de concorrência adicionados)
7. Ao final: perguntar se pode substituir os arquivos da raiz (se trabalhou em `novo/`)
8. **Antes da implantação real com usuários de CD1/CD2**, revisitar a nota
   sobre limpeza de coleções — a partir daí ela deixa de ser trivial
