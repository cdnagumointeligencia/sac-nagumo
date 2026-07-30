// ==================== USUÁRIOS ====================
function abrirModalUsuarios() {
  document.getElementById('senhaArea').style.display = 'block';
  document.getElementById('gestaoArea').style.display = 'none';
  document.getElementById('tituloModalUser').textContent = 'Acesso Restrito';
  document.getElementById('inputSenha').value = '';
  document.getElementById('senhaErro').style.display = 'none';
  abrirModal('modalUsuarios');
  setTimeout(() => document.getElementById('inputSenha').focus(), 100);
}

async function validarSenha() {
  const hashInput = await hashSenha(document.getElementById('inputSenha').value);
  const hashAdmin = await hashSenha(SENHA_ADMIN);
  if (hashInput === hashAdmin) {
    document.getElementById('senhaArea').style.display = 'none';
    document.getElementById('gestaoArea').style.display = 'block';
    document.getElementById('tituloModalUser').textContent = 'Gerenciar Usuários';
    atualizarListaUsuarios();
  } else {
    document.getElementById('senhaErro').style.display = 'block';
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputSenha').focus();
  }
}

function atualizarListaUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  lista.innerHTML = '';
  todosUsuarios.filter(u => u.nome !== ADMIN_USER).forEach(u => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div style="flex:1">
        <span style="font-weight:600">${escapeHtml(u.nome)}</span> ${u.ativo ? '' : '<em style="color:#94a3b8">(inativo)</em>'}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <input type="password" id="senha_${escapeHtml(u.nome)}" placeholder="Nova senha" value=""
          style="width:90px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.7rem;text-align:center">
        <button class="btn" style="padding:4px 8px;font-size:0.65rem" data-action="redefinir-senha" data-nome="${escapeAttr(u.nome)}">Senha</button>
        <button class="btn ${u.ativo ? 'danger' : 'success'}" style="padding:4px 10px;font-size:0.7rem"
          data-action="toggle-usuario" data-nome="${escapeAttr(u.nome)}">${u.ativo ? 'Desativar' : 'Reativar'}</button>
        <button class="btn danger" style="padding:4px 10px;font-size:0.7rem"
          data-action="excluir-usuario" data-nome="${escapeAttr(u.nome)}">Excluir</button>
      </div>`;
    lista.appendChild(div);
  });

  lista.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const nome = btn.dataset.nome;
    if (action === 'redefinir-senha') {
      btn.addEventListener('click', () => redefinirSenha(nome));
    } else if (action === 'toggle-usuario') {
      btn.addEventListener('click', () => toggleUsuario(nome));
    } else if (action === 'excluir-usuario') {
      btn.addEventListener('click', () => excluirUsuario(nome));
    }
  });

  lista.querySelectorAll('input[id^="senha_"]').forEach(inp => {
    inp.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const nome = inp.id.replace('senha_', '');
        redefinirSenha(nome);
      }
    });
  });
}

async function redefinirSenha(nome) {
  const input = document.getElementById('senha_' + nome);
  const novaSenha = input.value.trim();
  if (!novaSenha) {
    toast('Digite uma nova senha', 'error');
    return;
  }
  const u = todosUsuarios.find(function (u) { return u.nome === nome; });
  if (u) {
    u.senhaHash = await hashSenha(novaSenha);
    delete u.senha;
    _isSavingUsuarios = true;
    var docId = 'usr_' + nome;
    await fbDocSet('usuarios', docId, { nome: nome, ativo: u.ativo, admin: u.admin === true, senhaHash: u.senhaHash });
    var novaLista = todosUsuarios.slice();
    lsSetShared('SAC_USUARIOS', novaLista);
    lsSet('usuarios', novaLista);
    _isSavingUsuarios = false;
    input.value = '';
    atualizarListaUsuarios();
    toast('Senha de ' + nome + ' alterada', 'success');
  }
}

async function adicionarUsuario() {
  var nome = document.getElementById('novoUsuario').value.trim();
  var senha = document.getElementById('novaSenhaUsuario').value.trim() || SENHA_PADRAO;
  if (!nome) return;
  if (todosUsuarios.some(function (u) { return u.nome === nome; })) {
    toast('Usuário já existe', 'error');
    return;
  }
  var senhaHash = await hashSenha(senha);
  var novoUser = { nome: nome, ativo: true, senhaHash: senhaHash };
  _isSavingUsuarios = true;
  var docId = 'usr_' + nome;
  await fbDocSet('usuarios', docId, { nome: nome, ativo: true, admin: false, senhaHash: senhaHash });
  if (!todosUsuarios.some(function (u) { return u.nome === nome; })) {
    todosUsuarios.push(novoUser);
    todosUsuarios.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  }
  var novaLista = todosUsuarios.slice();
  lsSetShared('SAC_USUARIOS', novaLista);
  lsSet('usuarios', novaLista);
  _isSavingUsuarios = false;
  document.getElementById('novoUsuario').value = '';
  document.getElementById('novaSenhaUsuario').value = SENHA_PADRAO;
  usuarios = todosUsuarios.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
  atualizarListaUsuarios();
  toast(nome + ' adicionado', 'success');
}

async function toggleUsuario(nome) {
  if (nome === ADMIN_USER) {
    toast('Não é possível desativar o usuário admin', 'error');
    return;
  }
  var u = todosUsuarios.find(function (u) { return u.nome === nome; });
  if (!u) return;
  u.ativo = !u.ativo;
  _isSavingUsuarios = true;
  var docId = 'usr_' + nome;
  await fbDocSet('usuarios', docId, { nome: nome, ativo: u.ativo, admin: u.admin === true, senhaHash: u.senhaHash || '' });
  var novaLista = todosUsuarios.slice();
  lsSetShared('SAC_USUARIOS', novaLista);
  lsSet('usuarios', novaLista);
  _isSavingUsuarios = false;
  usuarios = todosUsuarios.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
  atualizarListaUsuarios();
  renderizarTabela();
  toast(nome + ' ' + (u.ativo ? 'reativado' : 'desativado'), 'success');
}

async function excluirUsuario(nome) {
  if (nome === ADMIN_USER) {
    toast('Não é possível excluir o usuário admin', 'error');
    return;
  }
  if (!confirm('Excluir permanentemente ' + nome + '?')) return;
  _isSavingUsuarios = true;
  var docId = 'usr_' + nome;
  if (typeof fbDisponivel === 'undefined' || fbDisponivel()) {
    try {
      await fbDb.collection('usuarios').doc(docId).delete();
    } catch (e) {
      /* doc pode já não existir */
    }
  }
  var idx = todosUsuarios.findIndex(function (u) { return u.nome === nome; });
  if (idx !== -1) {
    todosUsuarios.splice(idx, 1);
  }
  var novaLista = todosUsuarios.slice();
  lsSetShared('SAC_USUARIOS', novaLista);
  lsSet('usuarios', novaLista);
  _isSavingUsuarios = false;
  usuarios = todosUsuarios.filter(function (u) { return u.ativo; }).map(function (u) { return u.nome; });
  atualizarListaUsuarios();
  renderizarTabela();
  toast(nome + ' excluído', 'success');
}
