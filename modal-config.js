(function () {
  var HTML = `
  <!-- Modal Configurações -->
  <div id="modalConfig" class="modal">
    <div class="modal-box">
      <span class="modal-close" onclick="fecharModal('modalConfig')">&times;</span>
      <h3>Configurações</h3>
      <div id="configSenhaArea">
        <p class="config-lock-hint">Acesso restrito ao administrador</p>
        <input type="password" id="configSenhaInput" class="modal-input" placeholder="Senha do administrador"
          onkeypress="if(event.key==='Enter')validarSenhaConfig()">
        <div id="configSenhaErro" style="color:var(--danger);text-align:center;display:none">Senha incorreta!</div>
        <div class="modal-btns">
          <button class="btn danger" onclick="fecharModal('modalConfig')">Cancelar</button>
          <button class="btn success" onclick="validarSenhaConfig()">Acessar</button>
        </div>
      </div>
      <div id="configGridArea" style="display:none">
        <div class="config-grid">
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalUsuarios()">
            <span class="config-icon">&#128100;</span>
            <span class="config-label">Usuários</span>
            <span class="config-desc">Adicionar, editar, excluir e redefinir senhas</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalBackup()">
            <span class="config-icon">&#128190;</span>
            <span class="config-label">Backup</span>
            <span class="config-desc">Exportar e importar backup completo do sistema</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirRanking()">
            <span class="config-icon">&#127942;</span>
            <span class="config-label">Ranking</span>
            <span class="config-desc">Desempenho dos usuários por chamados</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalLojas()">
            <span class="config-icon">&#127970;</span>
            <span class="config-label">Lojas</span>
            <span class="config-desc">Gerenciar lista de lojas usada em todas as abas</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalBracos()">
            <span class="config-icon">&#9881;</span>
            <span class="config-label">Braços</span>
            <span class="config-desc">Configurar lojas atendidas por braço (CD2)</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalObservacoes()">
            <span class="config-icon">&#9997;</span>
            <span class="config-label">Solução</span>
            <span class="config-desc">Editar opções da coluna Solução de ambas as páginas</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalDivergencias()">
            <span class="config-icon">&#9881;</span>
            <span class="config-label">Divergência</span>
            <span class="config-desc">Editar opções da coluna Divergência de cada CD</span>
          </div>
          <div class="config-card" onclick="fecharModal('modalConfig');abrirModalSenhasSAC()">
            <span class="config-icon">&#128273;</span>
            <span class="config-label">Senha SAC</span>
            <span class="config-desc">Excluir senhas SAC e reajustar a numeração</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  function injetarModalConfig() {
    if (document.getElementById('modalConfig')) return;
    document.body.insertAdjacentHTML('beforeend', HTML);
  }

  if (document.body) injetarModalConfig();
  else document.addEventListener('DOMContentLoaded', injetarModalConfig);

  window.abrirModalConfig = function () {
    injetarModalConfig();
    var grid = document.getElementById('configGridArea');
    var senhaArea = document.getElementById('configSenhaArea');
    var erro = document.getElementById('configSenhaErro');
    var inp = document.getElementById('configSenhaInput');
    if (grid && senhaArea) {
      grid.style.display = 'none';
      senhaArea.style.display = 'block';
      if (erro) erro.style.display = 'none';
      if (inp) inp.value = '';
    }
    abrirModal('modalConfig');
    setTimeout(function () {
      if (inp) inp.focus();
    }, 100);
  };

  window.validarSenhaConfig = async function () {
    var inp = document.getElementById('configSenhaInput');
    var grid = document.getElementById('configGridArea');
    var senhaArea = document.getElementById('configSenhaArea');
    var erro = document.getElementById('configSenhaErro');
    if (!inp || !grid || !senhaArea || !erro) return;
    var hashInput = await hashSenha(inp.value);
    var hashAdmin = await hashSenha(ADMIN_SENHA);
    if (hashInput === hashAdmin) {
      senhaArea.style.display = 'none';
      grid.style.display = 'block';
    } else {
      erro.style.display = 'block';
      inp.value = '';
      inp.focus();
    }
  };
})();
