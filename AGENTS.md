# Regras do projeto (SAC Nagumo)

## Branches — toda alteração vai para as duas
- O GitHub Pages publica da branch **`main`** (verificado: fix de UI e otimizações confirmados no site ao vivo).
- A branch **`master`** é mantida como espelho sincronizado (não publica, mas fica alinhada para não confundir).
- **Qualquer alteração deve ser commitada e enviada para `main` E `master`** (mesmo commit nas duas, via fast-forward da `master` para `main`).

## Pastas duplicadas
- `js1/` (CD1) e `js2/` (CD2) são árvores quase idênticas.
- **Qualquer mudança de código deve ser aplicada nas duas pastas**, salvo se o recurso for exclusivo de um CD (ex.: `js2/produtividade.js`).

## Notas
- `regras do negócio.md` é gitignored (não vai para o repo).
- Backup local: pastas `backup_*/` são gitignored.
