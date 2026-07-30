// ==================== CONFIGURAÇÕES ====================
const SENHA_ADMIN = 'lidernagumo';
const SENHA_PADRAO = '123456';
const ADMIN_USER = 'admin';
const ADMIN_SENHA = 'admin123';

const SETORES_CD1 = ['', 'FLV', 'Perecíveis', 'Indevido'];
function getSetores() { return SETORES_CD1; }
const TURNOS = ['', 'Manhã', 'Tarde', 'Noite'];
const DIVERGENCIAS_CD1 = ['', 'Sobra', 'Falta', 'Inversão', 'Montada', 'Troca de loja'];
function getDivergencias() {
  const key = 'CD1';
  if (typeof divergenciasCustom !== 'undefined' && divergenciasCustom[key] && Array.isArray(divergenciasCustom[key]) && divergenciasCustom[key].length > 0) return divergenciasCustom[key];
  return DIVERGENCIAS_CD1;
}
const OBSERVACOES_CD1 = ['', 'Solicitar nota de devolução', 'Devolver', 'Realizar Contagem', 'Pedir saldo lista.estoque', 'Solicitar NFD e devolver inversão', 'Solicitar NFD e Faturar inversão', 'Carregada-Enviar nota por e-mail', 'Faturar a sobra', 'Faturar a inversão', 'Aguardar a próxima entrega'];
function getObservacoes() {
  const key = 'CD1';
  if (typeof observacoesCustom !== 'undefined' && observacoesCustom[key] && Array.isArray(observacoesCustom[key]) && observacoesCustom[key].length > 0) {
    return observacoesCustom[key];
  }
  return OBSERVACOES_CD1;
}
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EMPRESAS_MERC = [
  { value: '501', cd: 'CD1', label: 'Perecíveis' },
  { value: '503', cd: 'CD1', label: 'Importado' },
  { value: '504', cd: 'CD1', label: 'Frutas' },
  { value: '505', cd: 'CD1', label: 'Verduras' }
];
function getEmpresasPorCD(cd) { return EMPRESAS_MERC.filter(e => e.cd === 'CD1').map(e => e.value); }
function getEmpresasLabel(cd) { return getEmpresasPorCD(cd).join(', '); }

const DIVERGENCIAS_SAC = ['', 'Sem cadastro', 'Sobra', 'Falta', 'Inversão', 'Divergência de quantidades', 'Produto danificado', 'Outro'];
const STATUS_SAC = ['', 'Aguardando devolução', 'Recebido do CD', 'Tratado'];
const STATUS_NF = ['', 'Aguardando', 'Emitida'];
const TURNOS_MERCADORIAS = ['1° Turno', '2° Turno', '3° Turno'];
const TIPOS_VOLUME = ['Caixas', 'Kilo'];
const SETORES_DASH = ['Sorter', 'Expedição', 'FLV', 'Perecíveis', 'Recebimento', 'Transporte', 'Separação', 'PCO', 'Indevido'];
const SETORES_ERRO = ['Sorter', 'Expedição', 'FLV', 'Perecíveis', 'Recebimento', 'Transporte', 'Separação', 'PCO'];
const CHAMADOS_POR_PAGINA = 50;
const LOJAS_MERCADORIAS_DEFAULT = [
  '001-SOLAR', '002-MOGI 1 MOD', '003-MADALENA', '004-GRIMALDI', '006-IGUATEMI',
  '007-TIBURCIO', '008-JUREMA', '009-COLONIAL', '010-MORUMBI', '011-V,VERDE',
  '012-BONSUCESSO', '013-CURUCA', '014-CUMBICA', '015-UIRAPURU', '016-RAGUEB',
  '017-PIRES RIO', '018-OL,FREIRE', '019-MOGI2', '020-AIMORE', '021-BARREIRA',
  '022-CALMON', '023-D,BENTA', '024-PIMENTAS', '025-TAUBATE1', '026-STO AND2',
  '027-V,MAZZA', '028-TAUBATE2', '029-VL DIVA2', '030-ITAQUA', '031-MERC,ATI',
  '032-ATIBAIA', '033-ATIBAIA', '034-ATIBAIA', '035-ATIBAIA', '036-V,REDONDA',
  '037-PARANAGUA', '038-MAUA', '039-ITAQUA2', '040-BIRITIBA', '041-MERC,BON',
  '042-CUMBICA2', '043-OLFREIRE2', '044-TIBURCIO2', '045-POA 2', '046-OSASCO',
  '047-SHOP,ITA', '048-LORENA', '049-SHOP,PIMENTAS', '050-CAMILOPO', '051-PQ CONTI',
  '052-MOGI3', '053-V,REDON2', '054-LAVRAS', '055-BONSUCESSO', '056-ELENCO',
  '057-ANELVIAR', '058-PRAIAGDE', '059-VILA VELHA', '060-PRAIAGDE2', '061-PQ ALVORADA'
];
const BRACOS_DEFAULT = {
  'Braço 1': '26,55,18,36,56,10',
  'Braço 2': '50,45,34,44,53,06',
  'Braço 3': '11,48,35,40,04,33',
  'Braço 4': '61,51,09,28,22,52',
  'Braço 5': '21,07,31,41,32',
  'Braço 6': '01,02,29,37,42',
  'Braço 7': '57,59,13,20,39',
  'Braço 8': '17,46,43,47,16',
  'Braço 9': '30,38,03,24,12,25',
  'Braço 10': '60,23,58,15,14',
  'Braço 11': '08,49,27,54,19'
};

let DM_PALETTE = ["#3CCBDB", "#D40138", "#5B8DEF", "#E8A33D", "#8BD450", "#C87CE8", "#FF6B6B", "#4ECDC4"];
