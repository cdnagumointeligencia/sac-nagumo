# Regras de Negócio — Sistema SAC Nagumo

Sistema de Acompanhamento de Chamados (SAC) dos centros de distribuição **CD1** e **CD2** da CD Nagumo. Este documento descreve o comportamento esperado do sistema do ponto de vista do negócio. A versão de referência é a implementação atual no código-fonte.

---

## 1. Visão Geral

- O sistema possui **duas páginas de trabalho**, uma por CD: **SAC1.html** (CD1) e **SAC2.html** (CD2).
- Existe **uma tela única de login** (`index.html`) usada pelos dois CDs.
- Toda página SAC exige **sessão válida**: sem sessão o usuário é redirecionado para o login.
- A seleção do CD é feita **no momento do login**, por botão (CD1 ou CD2). O CD da página é fixo (hardcoded) — a sessão grava o CD, mas ele não troca a página.

---

## 2. Login e Sessão

1. **Usuário e senha são obrigatórios** para logar. Campos vazios impedem a tentativa com a mensagem "Selecione um usuário e digite a senha!".
2. **Usuário inativo não loga**: o usuário precisa existir e estar `ativo = true`; caso contrário recebe "Usuário não encontrado!". O usuário `admin` nunca pode ser desativado.
3. **Validação da senha por hash SHA-256**: a senha digitada é comparada com o `senhaHash` salvo do usuário. Senha incorreta limpa o campo e mantém o usuário na tela.
4. **Sessão de 8 horas**: ao logar, o sistema grava a sessão no `sessionStorage` (`sac_usuario_logado`, `sac_cd_atual`) e uma sessão persistente no `localStorage` (`SAC_sessao`) com validade de **8 horas** (`expiraEm`). Vencida, a sessão é removida e o acesso é negado.
5. **Fonte da sessão**: ao abrir uma página SAC, o sistema usa primeiro `sessionStorage`; se ausente, tenta a sessão persistente do `localStorage`. Sem nenhuma das duas, redireciona para `index.html`.
6. **Logout**: remove todas as chaves de sessão e volta para a tela de login. Nas páginas SAC existe o fluxo **"Sair com Backup"**: se existirem registros, o sistema pergunta se o usuário quer exportar um backup antes de sair.
7. **Credenciais padrão fixas**:
   - Usuário admin: **`admin` / `admin123`** (sempre ativo, sempre `admin:true`, recriado automaticamente se não existir).
   - Senha padrão de novos usuários: **`123456`**.
8. **Senha de acesso restrito** (configurações de usuários, ranking): **`lidernagumo`**, comparada por hash. A senha da gestão de usuários no login usa a constante `admin123`.

---

## 3. Usuários

1. **Novo usuário**: nome obrigatório e único (case-sensitive); senha opcional, padrão `123456`; nasce `ativo = true` e `admin = false`.
2. **Lista gerenciável**: o usuário `admin` **não aparece** na lista de gestão e **não pode ser desativado nem excluído**.
3. **Desativar/Reativar**: desativa (soma dos selects e do login) ou reativa o usuário. Usuário inativo não loga.
4. **Redefinição de senha**: exige nova senha não vazia; grava o hash SHA-256.
5. **Exclusão**: definitiva, exige confirmação; remove do Firestore (`usuarios/usr_<nome>`) e do localStorage.
6. **Persistência em três lugares**: `localStorage` (chave `SAC_USUARIOS`), chave por CD e Firestore (coleção `usuarios`, documento `usr_<nome>`).
7. **Dropdown de login** lista apenas usuários **ativos**.

---

## 4. Chamados

1. **Abrir Chamado**: a última linha da tabela precisa estar com **Chamado e Loja preenchidos** antes de abrir um novo registro; caso contrário é bloqueado.
2. **Chamado novo nasce fechado no dia atual**: `dataFechamento = hoje` e `usuario = usuário logado`.
3. **Número de chamado é único no mês**: não pode repetir número de chamado no mesmo mês. Renomear um chamado gera um novo documento no Firestore com ID `<CD>_<número>` e remove o documento antigo.
4. **Campos obrigatórios do chamado**: Chamado, Loja, Turno, Setor, Braço (só no setor Sorter), PLU, Divergência, Solução, Observação, Conferente, Usuário, Data de Abertura, Data de Fechamento.
5. **Braço (esteira)**:
   - Campo habilitado **somente no setor `Sorter`**; trocar de setor para um valor diferente de Sorter limpa o braço.
   - Valor válido de **1 a 11**; fora da faixa gera erro e reverte.
   - Ao selecionar a loja (com setor Sorter), o braço é **preenchido automaticamente** conforme o mapeamento Braço → Lojas configurado (padrão com 11 braços).
6. **PLU é numérico** (teclado numérico).
7. **Textos capitalizados automaticamente** (primeira letra de cada palavra em maiúscula) em todos os campos de texto.
8. **Persistência imediata**: qualquer alteração salva em `localStorage` e sincroniza com o Firestore (debounce de 500 ms).
9. **Chamado aberto/fechado**: aberto = sem `dataFechamento`; fechado = com `dataFechamento`.
10. **Totais da tela**: total de registros, abertos (sem data de fechamento) e fechados (com data de fechamento).
11. **Paginação**: 50 registros por página; navegação com indicador "Página X de Y (N registros)".
12. **Filtros**: por usuário, setor, intervalo de datas (data de abertura), número do chamado e loja (busca por trecho). Padrão = 1º dia do mês corrente até hoje. Contador "Mostrando X de Y registros".
13. **Exclusão**: exige confirmação; remove do Firestore (soft-delete) e da lista local.
14. **Trocar o usuário do chamado** propaga para a nota de devolução correspondente (mesmo chamado + loja), somente se a nota ainda não tiver usuário.

---

## 5. Setores, Divergências e Soluções

1. **Setores do CD1** (chamados): `FLV`, `Perecíveis`, `Indevido`.
2. **Setores do CD2** (chamados): `Expedição`, `Indevido`, `Loja Piloto`, `PCO`, `Recebimento`, `Separação`, `Sorter`, entre outros definidos na configuração.
3. **Turnos de chamado**: `Manhã`, `Tarde`, `Noite`.
4. **Divergências do CD1**: `Sobra`, `Falta`, `Inversão`, `Montada`, `Troca de loja`.
5. **Divergências do CD2**: as do CD1 mais `Não Checada`, `Agrupada`, `Aguardando Montagem`.
6. **Soluções/Observações (CD1)**: `Solicitar nota de devolução`, `Devolver`, `Realizar Contagem`, `Pedir saldo lista.estoque`, `Solicitar NFD e devolver inversão`, `Solicitar NFD e Faturar inversão`, `Carregada-Enviar nota por e-mail`, `Faturar a sobra`, `Faturar a inversão`, `Aguardar a próxima entrega`.
7. **Soluções/Observações (CD2)**: mesmas opções, com `Aguardar próxima entrega` no lugar de `Aguardar a próxima entrega`.
8. **Listas customizadas por CD**: o usuário pode editar as opções de Solução e Divergência por CD (configuração). Valores devem ser únicos (sem duplicata case-insensitive).
9. **Regra de notificação de fluxo — nota de devolução automática**: se a Solução/Observação do chamado for uma destas opções, o sistema cria automaticamente uma nota de devolução:
   - `Solicitar nota de devolução`
   - `Solicitar NFD e devolver inversão`
   - `Solicitar NFD e Faturar inversão`
10. **Pré-requisitos da nota automática**: chamado e loja obrigatórios; não pode existir outra nota com o mesmo chamado + loja.

---

## 6. Notas de Devolução

1. **Exibição por mês/ano**: mostra apenas notas do mês/ano da data.
2. **Nova nota**: nasce com `data = hoje`, `statusNf = 'Aguardando'` e campos vazios.
3. **Status NF é derivado do número da nota**:
   - Preencher a Nota ⇒ `statusNf = 'Emitida'`.
   - Esvaziar a Nota ⇒ `statusNf = 'Aguardando'`.
4. **Cores de status**: `Aguardando` = fundo amarelo; `Emitida` = fundo verde; ambos em negrito.
5. **Regra de duplicidade**: não pode existir mais de uma nota com o mesmo **chamado + loja** (verificado no Firestore e local).
6. **ID da nota automática**: `cd_chamado_loja` (ex.: `CD1_1234_20`). Se outra pessoa criar a mesma nota simultaneamente, é exibido aviso de conflito.
7. **Exclusão**: exige confirmação; soft-delete no Firestore + remoção local.

---

## 7. Senha SAC (Call Center)

1. **Exibição por mês/ano** da data.
2. **Busca por texto**: filtra por chamado, loja, senha, divergência, status e observação (ignora maiúsculas/minúsculas).
3. **Próximo número de senha**: `máximo das senhas existentes + 1`, inserido no topo da lista.
4. **Responsável padrão**: novo registro assume o usuário logado.
5. **Campos Senha e Loja são numéricos** (teclado numérico).
6. **Status possíveis**: `Aguardando devolução`, `Recebido do CD`, `Tratado`.
7. **Divergências possíveis**: `Sem cadastro`, `Sobra`, `Falta`, `Inversão`, `Divergência de quantidades`, `Produto danificado`, `Outro`.
8. **Exportar CSV**: delimitador `;`, cabeçalho `CHAMADO;LOJA;SENHA;DIVERGÊNCIA;STATUS;RESPONSÁVEL;OBSERVAÇÃO;DATA`, arquivo `Senhas_SAC_<data>.csv`. Bloqueia exportação com lista vazia.
9. **Imprimir/PDF**: troca o título para `Senha SAC <CD> - <Mês> <ano>` e imprime.
10. **Exclusão**: exige confirmação.

---

## 8. Mercadorias sem NF

1. **Exibição por mês/ano** da data.
2. **Novo registro**: nasce com `data = hoje` e demais campos vazios.
3. **Campos numéricos inteiros não negativos**: Qnt. Notas, Qnt. Paletes, Volume, Qtd. PLU (bloqueiam caracteres não numéricos).
4. **Empresa restrita ao CD**:
   - CD1: `501=Perecíveis`, `503=Importado`, `504=Frutas`, `505=Verduras`.
   - CD2: `502=Importado`, `507=Carga Seca`, `508=Uso Consumo`.
5. **Tipo de volume**: somente `Caixas` ou `Kilo`.
6. **Turno**: somente `1° Turno`, `2° Turno`, `3° Turno`.
7. **Dashboard de Mercadorias**:
   - Considera somente registros do CD e do mês/ano selecionados.
   - KPIs: somam Qnt. Notas, Qnt. Paletes, Volume, Qtd. PLU (produtos distintos).
   - Volume sem tipo informado conta como "Não informado".
   - Percentual por tipo de volume = `(volumeTipo ÷ volumeTotal) × 100`, com 1 casa decimal.
   - **Ranking de conferentes**: soma volume/PLU/notas/paletes por conferente; média = volume ÷ nº de registros; ordenado por volume decrescente. Identificação de conferente ignora maiúsculas e espaços.
   - **Volume por turno**: soma por turno, ordenada decrescente; rótulo de percentual só aparece se > 12%.
   - **Volume por loja**: somente lojas com volume > 0; ordenada decrescente.
   - Unidades exibidas: `Kilo → kg`, `Caixas → cx`, demais → `un.`

---

## 9. Dashboard de Erros

1. **O que conta como erro**: setores de erro do CD. O setor **`Indevido` nunca conta como erro** (contabilizado à parte). No CD2, `Loja Piloto` também é excluído da taxa.
2. **Taxa de erro operacional** = `arredondar(erros ÷ total de chamados × 100)`, exibida como "X% dos chamados". Sem chamados ⇒ taxa 0.
3. **Chamados indevidos**: contados à parte (KPI "Indevidos"), fora da taxa de erro.
4. **Erros por setor**: total de ocorrências por setor; "Predominância" mostra os **2 setores** com mais ocorrências (separados por ` / `); sem ocorrências ⇒ "sem ocorrências".
5. **Divergências por setor**: contagem por divergência e por setor; percentual = `arredondar(qtd ÷ total × 100)`.
6. **Braços por turno (esteira, CD2)**: agrupa erros por braço e turno; rótulos `1°T / 2°T / 3°T`; exclui `Indevido` e `Loja Piloto`; ordenado numericamente.
7. **Layout por CD**: CD1 não exibe a coluna de braços; CD2 exibe.
8. **Copiar para WhatsApp**: monta resumo (chamados | erros % | indevidos) + setores + divergências + braços, copia para a área de transferência e abre o WhatsApp Web.
9. **Exportar PDF**: impressão com título `Dashboard <CD> - <Mês> <ano>`.

---

## 10. Produtividade (semanal)

1. **Exibição por semana**: mostra apenas registros da semana selecionada.
2. **Usuário `Administrador` é excluído** da tabela de produtividade.
3. **Um registro por usuário + dia**: ao salvar, atualiza o registro existente ou cria um novo `{usuario, data, semana, valor, cor}`.
4. **Valores**: numéricos inteiros ≥ 0; campo vazio é bloqueado.
5. **Total por usuário**: soma dos valores da semana; vazio se zero.
6. **Cores de setor fixas (10)**: Pátio, Docas, Expedição, Conferência, Admin, Operação, Manutenção, Qualidade, Segurança, Limpeza. Cor padrão = `Pátio`.
7. **Limpar**: remove o registro do dia (usuário + data) e zera a célula.
8. **Exportar PDF**: `Produtividade <CD> - <Mês> <ano>`.

---

## 11. Ranking de Desempenho

1. **Acesso restrito**: exige a senha `lidernagumo` (hash SHA-256).
2. **Cálculo mensal por usuário**:
   - `total` = número de chamados no mês.
   - `tempoMedio` = soma dos dias úteis entre abertura e fechamento ÷ número de chamados com as duas datas.
   - **"Dias úteis" = todos os dias exceto domingo** (inclusive). Data fim menor que início ⇒ 0.
   - Ordena por total decrescente.
3. **Pódio**: 3 primeiros ganham medalhas 🥇🥈🥉; tempo médio em "dias úteis" (`du`) com 1 casa decimal.
4. **Chamado sem usuário não entra no ranking**.

---

## 12. Lojas e Braços (Configuração)

1. **Lojas**:
   - Lista padrão de **61 lojas** no formato `001-SOLAR`, `002-MOGI 1 MOD`, etc.
   - Cadastro: nome obrigatório, convertido para **MAIÚSCULAS**, sem duplicidade (case-insensitive), lista ordenada alfabeticamente.
   - Edição: novo nome obrigatório, maiúsculas, sem duplicidade.
   - Exclusão: exige confirmação.
   - Exibição: o zero à esquerda do código é ocultado (`001-SOLAR` → `1-SOLAR`).
2. **Braços (esteira CD2)**:
   - Configuração padrão com **11 braços**, cada um com lista fixa de lojas (ex.: `Braço 1 = 26,55,18,36,56,10`).
   - Cadastro: nome e lojas obrigatórios; nome único.
   - Edição: renomear preserva as lojas; novo nome não pode colidir.
   - Exclusão: exige confirmação.
   - O braço do chamado é **preenchido automaticamente pela loja** quando o setor é `Sorter`.

---

## 13. Backup

1. **Formato**: versão `3`, arquivo `SAC_Backup_<data>.json`.
2. **Exporta tudo**: chamados (CD1 e CD2), senhas SAC, notas de devolução, mercadorias sem NF, produtividade, usuários, braços e lojas.
3. **Fonte primária da exportação**: Firestore (somente registros `ativo = true`); sem conexão, usa o localStorage.
4. **Importação — versões aceitas**: v3, v2 e v1 (legados). Qualquer outro formato ⇒ "Arquivo de backup inválido".
5. **Aviso de backup antigo**: se qualquer coleção ou o backup inteiro tiver mais de **90 dias**, exige confirmação explícita antes de importar.
6. **Importação de usuários**: substitui a lista atual; usuários sem hash são migrados para a senha padrão `123456`.
7. **Importação no Firestore**: usa merge com auditoria; registros sem `id`/`firestoreId` são ignorados.
8. **Contagem de registros do sistema**: soma chamados + senhas + notas + mercadorias de **CD1 e CD2** (sem filtro de CD), incluindo chaves legadas.

---

## 14. Persistência e Sincronização

1. **Dupla persistência**: todos os dados são gravados no `localStorage` (funcionamento offline) e no **Firestore** (sincronização).
2. **Prefixo de chaves por CD**: `SAC_<CD>_<dado>` (ex.: `SAC_CD1_dados`). Há migração automática de chaves legadas compartilhadas para a chave do CD.
3. **Estrutura de chamados no localStorage**: `SAC_<CD>_dados` com `[{mes, registros}]`.
4. **Coleções no Firestore**: `chamados`, `senhasSac`, `notasDevolucao`, `mercadoriasNF`, `produtividade`, `usuarios`, `config` (lojas, braços, observacoes, divergencias).
5. **Filtro padrão de leitura**: todo documento é lido com `cd = CD atual`, `ano = ano corrente` e `ativo = true`.
6. **Chamado só é gravado no Firestore se tiver ID natural** `<CD>_<número>` (ex.: `CD1_1234`); registros sem esse prefixo não são persistidos. Docs legados sem o prefixo são limpos ao carregar.
7. **Auditoria**: todo documento gravado recebe `ativo: true`, `alteradoEm` (timestamp), `alteradoPor` (usuário ou "sistema"); na criação também `criadoEm`/`criadoPor`.
8. **Exclusão no Firestore é soft-delete** (`ativo = false`), nunca apaga fisicamente.
9. **Duplicidade no Firestore**: documentos com o mesmo ID já ativos são bloqueados ("Registro duplicado"); documento inativo é reativado.
10. **Sincronização em tempo real**: as páginas ouvem mudanças no Firestore (`onSnapshot`); na falha, mostram "Erro de conexão" e seguem offline.
11. **Autenticação do app**: anônima no startup; o app funciona somente com Firestore disponível e auth anônima resolvida; caso contrário opera offline.
12. **Regras de segurança do Firestore**: qualquer usuário autenticado (incluindo o anônimo) tem leitura/escrita totais; usuário não autenticado é negado. **O controle de acesso real é feito no front-end** (senhas e sessão).

---

## 15. Configurações (tela de login)

1. **A tela de login dá acesso às configurações sem login** (botão de engrenagem).
2. **Módulos**: Usuários (acesso restrito), Backup, Lojas, Braços, Solução, Divergência.
3. As listas de Solução/Divergência editadas pela tela de login são sempre gravadas na configuração **CD1**.

---

## 16. Observações e Regras Transversais

1. **Exibição de mês**: cada tela mostra o mês selecionado; o mês corrente é o padrão; selecionar mês sem dados cria lista vazia.
2. **Formatação**: datas em formato brasileiro (dd/mm/aaaa).
3. **CSV**: valores com `;`, `"` ou quebra de linha são escapados entre aspas duplas.
4. **Sincronização em tempo real das configurações**: alterações em lojas/braços/observações/divergências/usuários refletem nas páginas abertas sem recarregar.
