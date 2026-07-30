# Relatório de Riscos — Sistema SAC Nagumo
> Análise de race conditions, bugs e possibilidade de perda de dados
> Escopo: SAC.html, js/*.js, backup.js, scripts de importação/limpeza Firebase
> Este documento é apenas diagnóstico — nenhuma alteração de código foi feita.

---

## 🔴 CRÍTICO — Risco real e provável de perda de dados

### 1. `fbSubstituirColecao` apaga e recria a coleção inteira (não é atômico)
**Arquivo:** `db.js`

```js
async function fbSubstituirColecao(nome, dados) {
  const existing = await fbDb.collection(nome).get();
  const batch = fbDb.batch();
  existing.forEach(doc => batch.delete(doc.ref));
  dados.forEach(item => batch.set(...));
  await batch.commit();
}
```

Essa função é usada para: **Senha SAC, Notas de Devolução, Mercadorias s/ NF, Produtividade e Usuários**.

O padrão "ler tudo → apagar tudo → recriar a partir do array local em memória" **não é atômico** e cria uma janela de corrida real:

- Usuário A abre a página e carrega Senha SAC (10 registros).
- Usuário B (outro PC/aba) adiciona um novo registro. Esse novo registro é salvo no Firestore.
- Usuário A, que já tinha os 10 registros antigos em memória, faz uma edição qualquer e dispara `salvarSenhasSac()` → `fbSubstituirColecao`.
- A função de A lê a coleção (agora com 11), apaga TODOS os 11 documentos, e recria só os 10 que A tinha em memória.
- **O registro criado por B é apagado silenciosamente**, sem erro, sem aviso.

Isso vale igualmente para `Notas de Devolução`, `Mercadorias s/ NF`, `Produtividade` e principalmente **`usuarios`** (dois admins mexendo em usuários ao mesmo tempo podem se apagar mutuamente).

Este é, isoladamente, **o maior risco de perda de dados do sistema**, porque não depende de bug raro — acontece em qualquer uso simultâneo normal (dois operadores usando o SAC ao mesmo tempo, o que é o caso de uso principal do sistema).

---

### 2. Chamados por mês são salvos como um único array em um único documento (sobrescrita total)
**Arquivos:** `db.js` (`fbSalvarDadosMes`), `chamados.js`

```js
await fbDb.collection('dados').doc(id).set({ cd, mes, registros }, { merge: true });
```

Embora use `merge: true`, o campo `registros` é **o array inteiro**, não incremental. Cada `salvarDadosMes()` reescreve o array completo do mês.

Se dois usuários abrem o mesmo mês (ex: "Julho") e cada um adiciona um chamado diferente:

- Usuário A tem `registros = [x1, x2]` em memória, adiciona `x3` → salva `[x1, x2, x3]`.
- Usuário B, que carregou a página antes de A salvar, ainda tem `[x1, x2]` em memória, adiciona `x4` → salva `[x1, x2, x4]`.
- **O chamado `x3` de A é perdido** porque B sobrescreveu o documento inteiro com sua cópia desatualizada.

Isso acontece em **qualquer edição concorrente no mesmo mês** (adicionar chamado, editar loja, mudar status, excluir linha), não é um caso de borda raro.

---

### 3. Sincronização para Firestore silenciosamente desativada acima de 250 documentos
**Arquivo:** `db.js`

```js
if (existing.size > 250) {
  console.warn('Colecao muito grande para batch, pulando sync:', nome);
  return;
}
```

Quando `SENHAS_SAC_dados_CDx`, `NOTAS_DEV_dados_CDx`, `MERCADORIAS_NF_dados_CDx` ou `usuarios` ultrapassam 250 documentos, a sincronização com o Firestore **para de funcionar completamente**, sem qualquer aviso na tela para o usuário. Os dados continuam sendo salvos só em `localStorage` daquele navegador específico.

Consequência prática: em algum momento (o sistema já parece acumular centenas de senhas/notas ao longo do ano), os dados passam a existir **apenas no computador que os digitou**. Se o usuário limpar o cache, trocar de PC, ou o navegador corromper o localStorage, os dados somem — sem qualquer log visível ao usuário, só um `console.warn` que ninguém vê.

---

### 4. IDs de documento sem o ano — colisão entre anos
**Arquivos:** `db.js` (`docId`), `produtividade.js`, `importar_backup.js`

```js
function docId(cd, mes) { return cd + '_' + mes.replace(/ /g, '_'); }
```

O ID do documento de Chamados é `CD2_Julho`, `CD1_Agosto`, etc. — **sem o ano**. O mesmo vale para Produtividade (`produtividade/{mes}`, ex: `produtividade/Julho`).

Isso significa que **em julho de 2027, os chamados/produtividade de julho de 2026 serão sobrescritos** pelos novos lançamentos, pois usam exatamente o mesmo `documentId`. Não há como recuperar o ano anterior — o documento antigo é substituído, não versionado.

Esse é um problema de arquitetura que só vai se manifestar daqui a alguns meses, mas quando acontecer será perda de dados histórica irreversível (a menos que haja backups externos guardados).

*(Observação: Senha SAC, Notas de Devolução e Mercadorias sem NF têm o campo `data` completo com ano, então não sofrem colisão no armazenamento — mas a navegação por abas de mês mistura anos diferentes na mesma aba "Julho", ver item 14.)*

---

### 5. `beforeunload` não garante que os dados cheguem ao Firestore
**Arquivo:** `app.js`, `db.js`

Todas as gravações no Firestore usam `setTimeout` (debounce de 500ms) e chamadas assíncronas não aguardadas (`salvarDadosMes()`, `fbSubstituirColecao(...)` sem `await` na maioria dos pontos de chamada, como em `oninput`/`onchange`).

Se o usuário fechar a aba, dar F5, ou o navegador travar **dentro dessa janela de até 500ms + tempo de rede**, a gravação pode nunca ser concluída. O `beforeunload` handler só reescreve o `localStorage`, ele **não força/aguarda** a escrita no Firestore. Ou seja, o dado fica salvo só localmente naquele navegador, e some do "banco compartilhado" caso o navegador seja limpo depois.

Este é um risco muito comum em uso real: o operador digita algo, fecha a aba rapidamente (ex: fim de turno) — há uma chance real da última edição não sincronizar.

---

## 🟠 ALTO — Race conditions relevantes

### 6. Re-render por sincronização entre abas apaga edição em andamento
**Arquivo:** `app.js` (listener de `storage`), `senhaSac.js`, `notasDev.js`, `mercadorias.js`

Quando outra aba grava no `localStorage`, o evento `storage` dispara `renderizarSenhasSac()` / `renderizarNotasDevolucao()` / `renderizarMercadoriasNF()`, que fazem `tbody.innerHTML = ''` e reconstroem a tabela inteira.

Se o usuário estiver **digitando em um campo** dessa tabela no momento exato em que o evento chega (por ex. duas abas abertas no mesmo navegador, ou duas pessoas no mesmo perfil), o campo é destruído e recriado com o valor antigo — **o que estava sendo digitado é perdido silenciosamente**, sem qualquer confirmação ou aviso, e o foco do cursor também se perde.

### 7. Debounce de escrita no Firestore não é isolado por CD
**Arquivo:** `db.js` (`_writeTimers`, `_agendarEscritaFirestore`)

O timer de debounce é indexado só pela `chave` (`'SENHAS_SAC_dados'`, etc.), não pelo CD. Como `cdAtual` só muda por login/logout, na prática o risco é baixo hoje, mas é uma fragilidade de design: se em algum fluxo futuro o CD puder mudar sem reload de página (ex: troca de CD sem logout), uma escrita pendente do CD antigo pode acabar gravando na coleção do CD novo.

### 8. Nenhum mecanismo de bloqueio/otimista para edição simultânea da mesma linha
**Arquivos:** `chamados.js`, `senhaSac.js`, `notasDev.js`, `mercadorias.js`

Cada campo dispara `dadosMes[mesAtual][idx][field] = valor; salvarDadosMes()`, mas `salvarDadosMes()` sempre reenvia o **array inteiro do mês**. Se dois usuários editam **colunas diferentes da mesma linha** ao mesmo tempo, o que salvar por último apaga a mudança do outro (last-write-wins sobre o array inteiro, não sobre o campo).

### 9. Falha de gravação no Firestore é só um `console.warn` — usuário nunca é avisado
**Arquivo:** `db.js` (`_tentar`, `fbSalvarDadosMes`, `fbSubstituirColecao`, etc.)

Depois de 3 tentativas com backoff, se a gravação falhar (rede instável, Firestore fora, etc.), o erro é engolido (`catch { console.warn(...) }`). A interface mostra "Salvo com sucesso" (toast otimista) mesmo que a gravação real no Firestore tenha falhado. O usuário confia que salvou e pode fechar a aba, perdendo o dado.

### 10. Verificação de chamado duplicado é só local, não distribuída
**Arquivo:** `chamados.js` (`criarCelInput`)

A checagem de número de chamado duplicado usa apenas `dadosMes[mesAtual]` em memória do navegador atual. Dois usuários em sessões diferentes podem cadastrar o **mesmo número de chamado** simultaneamente sem que o sistema detecte, gerando duplicidade nos dados (e, combinado com o item 2, potencial perda de um dos dois).

### 11. Criação automática de Nota de Devolução também é vulnerável a duplicidade/corrida
**Arquivo:** `chamados.js` (`criarNotaDevAutomatica`)

Mesmo problema: checa duplicidade só no array local (`dadosNotasDev.some(...)`), sujeito a estar desatualizado em relação ao que está no Firestore/outros usuários.

---

## 🟡 MÉDIO — Bugs e inconsistências

### 12. Import de backup usa heurística fraca de "contagem total de registros"
**Arquivo:** `backup.js` (`importarBackupCompletoFile`)

```js
if (registrosBackup < registrosAtuais) { /* bloqueia */ }
```

O bloqueio compara apenas a **soma total** de registros (chamados + senhas + notas + mercadorias). Isso tem dois problemas:
- **Falso positivo:** um backup legítimo mais recente pode ter *menos* registros totais que o atual (ex: registros foram excluídos por limpeza) e será bloqueado indevidamente.
- **Falso negativo:** um backup antigo, desde que tenha uma contagem total igual ou maior (por ter mais chamados acumulados em meses antigos, por exemplo), passa despercebido e **sobrescreve dados mais recentes** de outra coleção (ex: sobrescreve Senha SAC atual com uma versão de dias atrás), mesmo que o total "pareça" maior.

Não há comparação por coleção, nem por data/timestamp do registro mais recente.

### 13. Import de backup em massa também usa `fbSubstituirColecao`
**Arquivo:** `backup.js`

A importação de backup chama `fbSubstituirColecao` para Senha SAC, Notas Devolução, Mercadorias e Produtividade — herdando o mesmo problema do item 1: se alguém estiver usando o sistema durante a importação de um backup, os dados dessa pessoa podem ser apagados no meio do processo.

### 14. Abas de mês misturam anos diferentes (Senha SAC, Notas Devolução, Mercadorias)
**Arquivo:** `shared.js` (`extrairMesDeData`), `senhaSac.js`, `notasDev.js`, `mercadorias.js`

O filtro por mês usa só o **nome do mês**, ignorando o ano (`extrairMesDeData` retorna só `MESES[mesIdx]`). Isso significa que, quando o sistema estiver rodando há mais de 12 meses, a aba "Julho" vai mostrar simultaneamente registros de julho/2026 **e** julho/2027 misturados. Não é perda de dado, mas gera risco de edição no registro errado e confusão visual/operacional que pode levar a erro humano (ex: editar um registro do ano passado pensando que é do mês atual).

### 15. Script `importar_backup.js`: colisão de `documentId` causa descarte silencioso
**Arquivo:** `importar_backup.js`

```js
const id = (m.data || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '_');
await request(`${BASE_URL}/${colMerc}?documentId=${id}`, 'POST', ...);
// em caso de 409 (já existe): resolve({ alreadyExists: true }) — segue em frente
```

Se duas entradas de "Mercadorias s/ NF" tiverem o mesmo campo `data` (o que é comum — várias entregas no mesmo dia), o script gera o mesmo `documentId` para as duas. A segunda recebe 409 (conflito), é tratada como sucesso (`alreadyExists: true`) e **é descartada silenciosamente** — nenhum log de erro, nenhuma indicação de que um registro não foi importado.

O mesmo padrão de "usar campo de negócio como ID sem checar unicidade real" ocorre para `usuarios` (usa `nome` sem `.trim()`/normalização — dois nomes com espaço a mais criam IDs diferentes mas nomes "iguais" visualmente) e para `senhasSac`/`notasDevolucao` (usa `chamado` como ID — se dois registros do backup tiverem o mesmo número de chamado, um se perde no import).

### 16. `dadosMes = {}` durante import de backup V1/V2 pode "esconder" meses não incluídos no backup
**Arquivo:** `backup.js`

Ao importar um backup antigo (formato V1 ou V2), o código faz `dadosMes = {}` e repopula **só com o que veio no backup**. Meses que estavam carregados na sessão atual, mas que não constam no arquivo de backup, desaparecem da tela (mesmo que ainda existam no Firestore) até um reload da página — pode ser interpretado pelo usuário como perda de dado, e se ele editar algo nesse estado e salvar, gera confusão sobre o que está realmente sincronizado.

### 17. Validação do campo "Braço" (1–11) descarta o valor sem restaurar nem salvar
**Arquivo:** `chamados.js` (`inpBraco.onchange`)

Quando o valor digitado é inválido, o código exibe um toast de erro, limpa o campo (`inpBraco.value = ''`) e retorna **sem chamar `salvarDadosMes()`**. O valor em memória (`dadosMes[...].braco`) não é atualizado, então o campo na tela fica vazio mas o dado salvo internamente pode ainda ser o antigo — gerando divergência entre o que aparece na tela e o que está realmente persistido até o próximo re-render.

### 18. Documentação (`projeto.md`) descreve uso de IndexedDB que não existe no código
**Arquivo:** `projeto.md` vs `db.js`

O mapa do projeto afirma "IndexedDB + localStorage para persistência" e lista bancos IndexedDB (`SAC_CD1`, `SAC_USUARIOS`, etc.), mas o código real (`db.js`) usa apenas `localStorage` + Firestore — não há nenhuma chamada IndexedDB em lugar nenhum. Isso é uma inconsistência de documentação que pode levar a decisões erradas em manutenções futuras (alguém pode assumir que existe uma camada de persistência local mais robusta do que realmente existe).

---

## 🔒 Observações de segurança com impacto direto em integridade/perda de dados

Como o projeto está hospedado no GitHub (inclusive com indícios de GitHub Pages configurado) e o Firebase é usado com autenticação anônima, os pontos abaixo pesam diretamente na "possibilidade de perda de dados", não são só "segurança teórica":

### 19. Chave de API do Firebase e senhas de administrador expostas no código-fonte público
**Arquivos:** `SAC.html`, `db.js`, `importar_backup.js`, `limpar_firebase.js`, `config.js`

- A `apiKey` do Firebase está hardcoded e visível a qualquer pessoa que veja o código-fonte da página (isso é esperado para apps client-side do Firebase, **mas só é seguro se as regras de segurança do Firestore restringirem escrita/leitura adequadamente** — regras essas que não estão nos arquivos fornecidos, então não é possível confirmar se estão configuradas corretamente).
- `SENHA_ADMIN = 'lidernagumo'` e `ADMIN_SENHA = 'admin123'` estão em texto plano em `config.js`, que é servido publicamente. Qualquer pessoa que abra o "Ver código-fonte" do site tem a senha de administrador, mesmo sem nunca ter feito login. Isso derruba a proteção de "Acesso Restrito" dos modais de Usuários/Ranking.

### 20. Existência de `limpar_firebase.js` no repositório
**Arquivo:** `limpar_firebase.js`

Esse script apaga **toda a base de dados** (`usuarios`, `dados`, todas as coleções de Senha SAC/Notas/Mercadorias/Produtividade/Config) de forma irreversível. Ele usa a mesma API key exposta publicamente. Mesmo sendo um script Node local (não roda no navegador do usuário final), o fato de estar num repositório acessível junto com a API key significa que, **se as regras de segurança do Firestore não forem restritivas**, qualquer pessoa com acesso ao repositório (ou que copie a API key do código-fonte da página) pode rodar uma requisição equivalente e apagar a base inteira sem precisar de senha alguma do sistema.

Recomendo, no mínimo, confirmar que as regras do Firestore exigem autenticação e limitam o escopo de escrita — isso está fora do escopo dos arquivos analisados aqui.

---

## Resumo priorizado (o que revisar primeiro)

| # | Risco | Impacto | Frequência esperada |
|---|-------|---------|----------------------|
| 1 | `fbSubstituirColecao` (delete-all + recreate) | Perda de dados de outros usuários | Alta — qualquer uso simultâneo |
| 2 | Sobrescrita do array inteiro de chamados por mês | Perda de chamados concorrentes | Alta — qualquer uso simultâneo |
| 3 | Corte silencioso de sync acima de 250 docs | Dados presos só no navegador local | Média/crescente com o tempo |
| 4 | IDs de documento sem ano (chamados/produtividade) | Sobrescrita entre anos | Baixa hoje, certa no futuro |
| 5 | Escrita assíncrona não garantida no fechamento da aba | Perda da última edição | Média |
| 6 | Re-render entre abas apaga digitação em andamento | Perda pontual de digitação | Média (multi-aba) |
| 9 | Falhas de gravação nunca reportadas ao usuário | Falsa sensação de "salvo" | Depende da rede |
| 12/13 | Import de backup com validação fraca + delete-all | Sobrescrita de dados recentes | Baixa, mas alto impacto quando ocorre |
| 19/20 | Segredos expostos publicamente | Possível apagamento total da base | Depende das regras do Firestore (não avaliadas aqui) |

---

*Relatório gerado por análise estática do código-fonte fornecido. Não foram executados testes de carga nem simulação real de concorrência — os cenários acima são inferidos diretamente da lógica implementada.*