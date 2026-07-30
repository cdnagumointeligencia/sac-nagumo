# Anchored Summary — SAC Offline

## Mission
Corrigir bugs de persistência de usuários (adicionar, excluir, toggle) no sistema SAC Offline para produção.

## Context
- Repo: `cdnagumointeligencia/sac-nagumo` branch `master`
- Pages: `https://cdnagumointeligencia.github.io/sac-nagumo/SAC.html`
- Firebase: `sac-nagumo` (v8.10.1, anonymous auth)
- Último commit: `2047ff2` (Pages rebuild trigger)

## Fixed Bugs
### Bug 1 — `ReferenceError: usuarioLogado is not defined`
**Root cause:** `fbDataComAuditoria()` em `firebase.js` era chamada antes de `usuarioLogado` ser declarado em `shared.js`.  
**Fix:** Adicionar `var usuarioLogado = null` no topo de `shared.js`.  
**Commit:** `dc49857`

### Bug 2 — onSnapshot race condition in bulk save
**Root cause:** `fbSalvarUsuarios()` iterava `todosUsuarios` enquanto o onSnapshot sobrescrevia o mesmo array.  
**Fix:** `var lista = todosUsuarios.slice()` para isolar iteração.  
**Commit:** `e621d8a`

### Bug 3 — Bulk save sobrescrevia mutações individuais
**Root cause:** `adicionarUsuario`, `toggleUsuario`, `excluirUsuario`, `redefinirSenha` chamavam `salvarTodosUsuarios()` que reescrevia toda a coleção, causando race com onSnapshot.  
**Fix:** Mutação individual agora faz operação Firestore direta (`fbDocSet` ou `delete()`) + flag `_isSavingUsuarios` para suprimir onSnapshot durante a operação.  
**Commit:** `6e83a6e`

### Bug 4 — GitHub Pages stale (código não deployado)
**Root cause:** Pages não havia rebuildado automaticamente após o push.  
**Fix:** Commit trivial `2047ff2` para forçar rebuild.

## Verified Working (Pages em produção)
- ✅ `adicionarUsuario` — usuário aparece na lista do modal e no dropdown de login
- ✅ `toggleUsuario` — ativo/inativo persiste entre sessões
- ✅ `excluirUsuario` — remove do Firestore, não reaparece no dropdown
- ✅ `redefinirSenha` — nova senha funciona no próximo login

## Files Modified
- `js/shared.js`: `_isSavingUsuarios` flag, `salvarTodosUsuarios` com flag
- `js/usuarios.js`: mutações via fbDocSet/delete direto
- `js/db.js`: `fbSalvarUsuarios` com `slice()`
- `js/firebase.js`: `fbDocSet`, `fbOnSnapshot` (base mechanics)
- `SAC.html`: comment trivial para forçar Pages rebuild

## Next
1. Aguardar feedback do usuário após testes em produção
2. Se tudo ok, considerar próximo item da arquitetura Firestore-first (debounce 500ms nas 5 funções de salvamento, etc.)
