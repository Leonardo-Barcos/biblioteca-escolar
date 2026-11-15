// Banco de dados SQLite embutido no próprio Node (node:sqlite) — sem instalação extra.
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'dados');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'biblioteca.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS livros (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo      TEXT NOT NULL,
  autor       TEXT,
  isbn        TEXT,
  categoria   TEXT,
  editora     TEXT,
  localizacao TEXT,
  quantidade  INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  ativo       INTEGER NOT NULL DEFAULT 1,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS alunos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  sala        TEXT NOT NULL,
  turno       TEXT,
  responsavel TEXT NOT NULL,
  telefone    TEXT,
  email       TEXT,
  endereco    TEXT,
  observacoes TEXT,
  ativo       INTEGER NOT NULL DEFAULT 1,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS emprestimos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id        INTEGER NOT NULL REFERENCES alunos(id),
  livro_id        INTEGER NOT NULL REFERENCES livros(id),
  data_emprestimo TEXT NOT NULL,
  data_prevista   TEXT NOT NULL,
  data_devolucao  TEXT,
  renovacoes      INTEGER NOT NULL DEFAULT 0,
  observacao      TEXT,
  criado_em       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_emp_ativos ON emprestimos(data_devolucao, data_prevista);
CREATE INDEX IF NOT EXISTS idx_emp_aluno ON emprestimos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_emp_livro ON emprestimos(livro_id);

CREATE TABLE IF NOT EXISTS emails_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  emprestimo_id  INTEGER REFERENCES emprestimos(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL,   -- antes | no_dia | atraso | teste
  destinatario   TEXT NOT NULL,
  assunto        TEXT,
  status         TEXT NOT NULL,   -- enviado | erro
  erro           TEXT,
  enviado_em     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_email_emp ON emails_log(emprestimo_id, tipo, status);

CREATE TABLE IF NOT EXISTS atividades (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo      TEXT NOT NULL,
  descricao TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  usuario           TEXT NOT NULL UNIQUE,
  senha_hash        TEXT NOT NULL,
  perfil            TEXT NOT NULL DEFAULT 'bibliotecario', -- direcao | bibliotecario
  ativo             INTEGER NOT NULL DEFAULT 1,
  deve_trocar_senha INTEGER NOT NULL DEFAULT 0,
  ultimo_acesso     TEXT,
  criado_em         TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  token      TEXT PRIMARY KEY,
  usuario_id INTEGER,
  expira_em  INTEGER NOT NULL
);
`);

// Atualiza bancos criados por versões anteriores
function garantirColuna(tabela, coluna, definicao) {
  const existe = db.prepare(`PRAGMA table_info(${tabela})`).all().some((c) => c.name === coluna);
  if (!existe) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
}
garantirColuna('sessoes', 'usuario_id', 'INTEGER');
garantirColuna('atividades', 'usuario', 'TEXT');
garantirColuna('emprestimos', 'emprestado_por', 'TEXT');
garantirColuna('emprestimos', 'devolvido_por', 'TEXT');
db.exec('DELETE FROM sessoes WHERE usuario_id IS NULL');

// Configurações padrão (só são gravadas se ainda não existirem)
const PADROES = {
  escola_nome: 'E.E.E.F. Dep. Armando Corrêa',
  prazo_padrao_dias: '7',
  max_livros_por_aluno: '2',

  email_ativo: '0',
  email_horario: '08:00',
  email_somente_dias_uteis: '1',
  email_dias_antes: '2',
  email_no_dia: '1',
  email_atraso_intervalo: '3',
  email_atraso_max: '5',

  smtp_host: 'smtp.gmail.com',
  smtp_porta: '465',
  smtp_seguro: '1',
  smtp_usuario: '',
  smtp_senha: '',
  smtp_remetente_nome: 'Biblioteca Escolar',

  modelo_lembrete_assunto: 'Lembrete: devolução do livro "{livro}"',
  modelo_lembrete_corpo:
    'Olá, {responsavel}!\n\n' +
    'Lembramos que o(a) aluno(a) {aluno} ({sala}) está com o livro "{livro}" da biblioteca da escola.\n' +
    'A data combinada para devolução é {data_devolucao}.\n\n' +
    'Contamos com vocês para incentivar a leitura e cuidar bem do livro!\n\n' +
    'Atenciosamente,\nBiblioteca — {escola}',
  modelo_atraso_assunto: 'Livro "{livro}" com devolução atrasada',
  modelo_atraso_corpo:
    'Olá, {responsavel}!\n\n' +
    'O livro "{livro}", emprestado para {aluno} ({sala}), deveria ter sido devolvido em {data_devolucao} ' +
    '— já são {dias_atraso} dia(s) de atraso.\n\n' +
    'Por favor, peça para o(a) aluno(a) trazer o livro na próxima aula. Se o livro foi perdido ou danificado, ' +
    'procure a escola para conversarmos.\n\n' +
    'Atenciosamente,\nBiblioteca — {escola}',

  email_ultima_execucao: '',
  backup_ultima_execucao: '',
};
const insPadrao = db.prepare('INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)');
for (const [k, v] of Object.entries(PADROES)) insPadrao.run(k, v);

function getConfig() {
  const out = {};
  for (const r of db.prepare('SELECT chave, valor FROM config').all()) out[r.chave] = r.valor;
  return out;
}
function setConfig(chave, valor) {
  db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor')
    .run(chave, valor == null ? '' : String(valor));
}

function registrarAtividade(tipo, descricao, quem = null) {
  db.prepare('INSERT INTO atividades (tipo, descricao, usuario) VALUES (?, ?, ?)').run(tipo, descricao, quem);
}

function transacao(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { db, DB_PATH, DATA_DIR, getConfig, setConfig, registrarAtividade, transacao, PADROES };
