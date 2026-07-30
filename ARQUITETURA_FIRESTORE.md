# ARQUITETURA DO SISTEMA SAC NAGUMO — FIRESTORE FIRST (revisado)

> Esta versão parte do princípio de que parte da arquitetura já foi
> implementada em sessões anteriores. Antes de seguir, rode a auditoria do
> `CLAUDE.md` (Passo 0). As seções 1–5 descrevem o alvo; as seções 6–16
> descrevem especificamente o que falta e os pontos que a versão anterior
> deste documento não cobria.

## 1. PRINCÍPIO FUNDAMENTAL

**Firestore é a fonte de dados para tudo que é compartilhado. localStorage
NÃO é fonte primária para dados compartilhados — só cache de cold start.**

- Leitura: Firestore/onSnapshot primeiro; localStorage só se Firestore falhar
  ou ainda não respondeu
- Escrita: discreta (select, exclusão, criação de registro) = imediata.
  Texto livre (oninput) = debounce curto (400–600ms) ou salvar no blur —
  **não confundir "sem perda de dados" com "uma escrita por tecla digitada"**
- onSnapshot mantém navegadores sincronizados em tempo real
- sessionStorage (não localStorage) para sessão do usuário, **decidir com o
  usuário se isso muda a UX atual de sessão de 8h que sobrevive a fechar a aba**

## 2. POR QUE A ARQUITETURA ANTERIOR FALHOU

- localStorage como fonte primária → Chrome e Edge não compartilhavam dados
- `signInAnonymously()` assíncrono não aguardado → tudo caía em localStorage
- Debounce de 3s → fechar a aba antes de estourar o timer perdia o dado
- Config (braços, lojas etc.) só em localStorage → sem sync entre navegadores
- Sessão em localStorage sem expiração efetiva

## 3. ARQUITETURA CORRETA

### 3.1 Inicialização
```
fbInit() → aguardar signInAnonymously() → carregarUsuarios() (Firestore
primeiro, localStorage só fallback de cold start) → verificar sessão →
iniciarSistema() (carrega tudo + configura onSnapshot) ou telaLogin()
```

### 3.2 Salvamento — **regra prática por tipo de campo**
| Tipo de campo | Estratégia |
|---|---|
| Select, checkbox, exclusão, criação de linha | Grava no Firestore imediatamente |
| Input de texto livre (oninput) | Debounce de 400–600ms (não 3000ms), OU salvar só no `onblur` |
| Número de chamado / nota (precisa checar duplicidade) | Ver seção 7 (transação) |

Local storage pode ser atualizado em paralelo, sem `await`, como cache —
nunca é o que bloqueia ou substitui a escrita no Firestore.

### 3.3 Leitura
onSnapshot por coleção, filtrado por CD e, quando a coleção não tem limite
natural de tamanho, também por ano (ver seção 8).

## 4. MODELO DE DADOS — mantém as coleções já descritas na primeira versão
(`config`, `usuarios`, `chamados`, `senhasSac`, `notasDevolucao`,
`mercadoriasNF`, `produtividade`) — sem mudanças aqui.

## 5. FUNÇÕES — mapa completo
Mantém o mapa da primeira versão (`firebase.js`, `db.js`, `shared.js`).
**Antes de criar novas funções, confirme que não existem já duas versões
paralelas da mesma responsabilidade** (ver seção 9 — código morto conhecido).

---

## 6. CHECKLIST DE CORREÇÕES CONCRETAS (o que a versão anterior deste
documento deixou genérico demais)

Estas são as 5 funções que **ainda** usam debounce de 3s e precisam ser
ajustadas para a regra da seção 3.2:

- `shared.js` → `salvarDadosMes()`
- `senhaSac.js` → `salvarSenhasSac()`
- `notasDev.js` → `salvarNotasDev()`
- `mercadorias.js` → `salvarMercadoriasNF()`
- `produtividade.js` → `salvarProdutividade()`

Todas seguem hoje o mesmo padrão:
```javascript
clearTimeout(_fbTimerX);
_fbTimerX = setTimeout(function () { fbSalvarColecao(...); }, 3000);
```
Trocar por: grava local (sem await) + grava Firestore com debounce curto
(400–600ms) por *campo em edição*, ou imediato para ações que não são
digitação contínua.

## 7. VERIFICAÇÃO DE DUPLICIDADE SEM RACE CONDITION

`fbVerificarChamadoDuplicado` e `fbVerificarNotaDevDuplicada` hoje fazem
"consultar → depois gravar", o que permite duas pessoas passarem pela
consulta antes de qualquer uma gravar (mesmo problema do risco #10/#11 do
relatório de riscos). Duas soluções, escolher uma:

**Opção A — Document ID natural (mais simples):**
Usar `cd + '_' + numeroChamado` como Document ID do chamado. O próprio
Firestore rejeita (ou você detecta via `create()` que falha) uma segunda
gravação com o mesmo ID, sem precisar de query prévia.

**Opção B — Transação (`runTransaction`):**
Se o ID natural não for viável (ex.: número de chamado pode mudar), envolver
consulta + gravação numa transação Firestore, que garante atomicidade real.

## 8. COLEÇÕES SEM LIMITE NATURAL DE TAMANHO

`senhasSac`, `notasDevolucao`, `mercadoriasNF` e `produtividade` hoje
carregam/observam a coleção inteira filtrando só por `cd` + `ativo` (sem
ano), diferente de `chamados` que já filtra por `ano`. Isso cresce sem
limite e fica mais caro/lento a cada ano de uso. Adicionar filtro por ano
(campo `ano` no documento, populado na gravação) nas mesmas queries que já
existem para `chamados`.

## 9. CÓDIGO MORTO CONHECIDO — CONFIRMAR ANTES DE MEXER

`db.js` define `fbCarregarProdutividade()` / `fbSalvarProdutividade()` com
Document ID no formato `cd_ano_mes`, mas `produtividade.js` usa as funções
genéricas `fbCarregarColecao()` / `fbSalvarColecao()` (Document ID
aleatório). As duas parecem ser de migrações diferentes e não usadas ao
mesmo tempo. Decidir qual manter (a versão com `cd_ano_mes` evita colisão
melhor) e remover a outra, em vez de empilhar uma terceira versão.

## 10. ÍNDICES COMPOSTOS DO FIRESTORE

Queries com múltiplos `where()` (ex.: `cd` + `ano` + `ativo`) exigem índice
composto criado manualmente no Firebase Console antes de funcionar em
produção — sem isso a query falha com erro `FAILED_PRECONDITION` na
primeira execução. Criar os índices necessários **antes** do primeiro teste
com o novo código, não depois de descobrir o erro em produção.

## 11. VALIDAÇÃO DE BACKUP (risco #12 do relatório de riscos)

A validação atual de import de backup (`backup.js`) compara só a **soma
total** de registros de todas as coleções, o que gera falso bloqueio (backup
legítimo com menos registros por limpeza) e falso positivo (backup antigo
com total maior sobrescreve dados recentes de uma coleção específica).
Trocar por comparação **por coleção** e, se possível, por
`dataBackup`/timestamp do registro mais recente de cada coleção, não pelo
total agregado.

## 12. SEGURANÇA — LIMITAÇÃO CONHECIDA E ACEITA (OU NÃO)

`config.js` continua com `SENHA_ADMIN` e `ADMIN_SENHA` em texto plano no
client, e a regra do Firestore (`allow read, write: if request.auth != null`)
permite qualquer usuário anônimo autenticado ler/escrever tudo. Isso não é
corrigido pela migração para Firestore-first — é uma decisão separada.
Se o sistema é mesmo de uso interno apenas (rede local, sem exposição
pública), documentar isso como risco aceito explicitamente. Se não, evoluir
para autenticação real (não anônima) e regras por usuário/papel.

## 13. FALLBACK OFFLINE — Firebase Persistence
(mantém a seção original: `enablePersistence({synchronizeTabs:true})`,
IndexedDB nativo do SDK — não localStorage manual)

**O sistema pode rodar sem nenhum `localStorage` manual.** A persistência
offline do Firestore (IndexedDB, gerenciada pelo próprio SDK) já cobre o
cenário de queda momentânea de conexão — não é preciso reimplementar isso
com `lsGet`/`lsSet`. O único uso de armazenamento local que ainda faz
sentido manter é a sessão de login, e mesmo essa deve ir em `sessionStorage`,
não `localStorage` (ver seção 1). O único custo de remover o localStorage
manual de cache é uma fração de segundo de tela vazia no primeiro
carregamento, antes do `onSnapshot` inicial responder — não é um bloqueio
funcional para uso 100% online.

---

## 14. VERIFICAÇÃO PÓS-IMPLEMENTAÇÃO (checklist expandido)

Testes da versão anterior (Chrome+Edge simultâneos, criar/editar em um e ver
no outro, limpar localStorage, fechar/reabrir) **mais**:

- [ ] Dois usuários tentando cadastrar o **mesmo número de chamado** ao mesmo
      tempo → só um deve ser aceito, o outro recebe erro claro
- [ ] Dois usuários editando **campos diferentes da mesma linha** ao mesmo
      tempo → ambas as edições devem persistir (não last-write-wins sobre a
      linha inteira)
- [ ] Importar backup enquanto outro usuário está com o sistema aberto e
      editando → dados do usuário ativo não podem ser apagados
- [ ] Editar um campo, ficar offline (DevTools → Network → Offline), voltar
      online → escrita deve chegar ao Firestore (fila do SDK) sem precisar
      de F5
- [ ] Query de coleção grande não trava a query por falta de índice composto
      (testar em ambiente com os índices já criados)

### O que NÃO deve acontecer (mantém da versão anterior):
- ❌ Usuário/config criado em um navegador não aparecer em outro
- ❌ Dados sumirem ao limpar o localStorage
- ❌ Delay de 3s para sincronizar

## 15. ANTES DE COMEÇAR

Ler `CLAUDE.md` Passo 0 (auditoria). Nesta fase (pré-implantação), limpar as
coleções de teste no Firebase Console é seguro e pode ser feito livremente
antes de cada rodada de testes. Isso muda no dia em que CD1/CD2 passarem a
usar o sistema com dados reais — a partir daí, seguir a nota sobre backup e
confirmação antes de qualquer limpeza (ver `CLAUDE.md`).

## 16. STORAGE PROTEGIDO — causa provável da página não funcionar em aba anônima

O código atual assume que `localStorage`/`sessionStorage` sempre funcionam.
Em aba anônima/navegação privada (varia por navegador e configuração), o
storage pode estar bloqueado, e uma chamada não protegida lança exceção e
trava o fluxo em silêncio — sem mensagem de erro visível.

Caso concreto hoje: `sessaoLogin()` em `shared.js` faz
```javascript
localStorage.setItem('SAC_sessao', JSON.stringify(sessao));
```
sem `try/catch`, chamada direto no clique de "Entrar". Se `localStorage`
estiver bloqueado, o clique simplesmente não completa o login, sem qualquer
feedback ao usuário.

**Correções necessárias, independente de manter ou remover o localStorage
manual (seção 13):**

1. **Toda leitura/escrita de storage deve estar em try/catch com fallback em
   memória.** `lsGet`/`lsSet`/`lsGetShared`/`lsSetShared` já fazem isso
   parcialmente (têm try/catch), mas `sessaoLogin()` e `verificarSessao()`
   em `shared.js` acessam `localStorage` direto, sem proteção — corrigir
   esses dois primeiro, por serem o caminho de login.
2. **Se storage estiver indisponível, degradar graciosamente**: manter a
   sessão em uma variável JS em memória para o restante daquela aba (login
   funciona, mas não sobrevive a F5) e avisar o usuário com um `toast`, em
   vez de travar sem explicação.
3. **Configurar explicitamente a persistência do Firebase Auth**, já que por
   padrão o SDK tenta persistir o estado de login via IndexedDB e também
   pode falhar silenciosamente em contextos restritos:
   ```javascript
   await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
   // ou .NONE se decidir não persistir nada entre reloads
   ```
   Chamar isso antes de `signInAnonymously()` em `fbInit()` (`firebase.js`),
   e envolver em try/catch também — se `setPersistence` falhar, seguir com
   auth em memória (`Persistence.NONE`) em vez de travar a inicialização.
4. **Testar explicitamente em aba anônima** como parte da seção 14 (já
   estava na lista original de testes, mas sem ligar ao motivo raiz — agora
   é: login deve funcionar, com ou sem storage disponível, mesmo que a
   sessão não sobreviva a fechar a aba nesse caso).
