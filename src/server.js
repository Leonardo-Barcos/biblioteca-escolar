const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { db, DB_PATH, getConfig, setConfig, registrarAtividade, transacao } = require('./db');
const { hoje, somarDias, diferencaDias, formatarBR, dataValida } = require('./datas');
const lembretes = require('./lembretes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: 'index.html' }));

// ---------------- utilidades ----------------
const txt = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const opt = (v, max = 300) => { const t = txt(v, max); return t || null; };
class Erro extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const JA_RESPONDIDO = Symbol('respondido');
const rota = (fn) => async (req, res) => {
  try { const r = await fn(req, res); if (r !== JA_RESPONDIDO && !res.headersSent) res.json(r ?? { ok: true }); }
  catch (e) {
    if (!e.status) console.error(e);
    res.status(e.status || 500).json({ erro: e.status ? e.message : 'Ocorreu um erro inesperado. Tente novamente.' });
  }
};
const likeQ = (q) => `%${txt(q, 100).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}%`;

// Busca sem acento: registramos uma função SQL "sem_acento"
db.function('sem_acento', { deterministic: true }, (s) =>
  s == null ? '' : String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

// ---------------- senha / sessão ----------------
function hashSenha(senha, sal = crypto.randomBytes(16).toString('hex')) {
  return `${sal}:${crypto.scryptSync(senha, sal, 64).toString('hex')}`;
}
function confereSenha(senha, salvo) {
  if (!salvo) return false;
  const [sal, h] = salvo.split(':');
  const a = Buffer.from(h, 'hex');
  const b = crypto.scryptSync(senha, sal, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function lerCookie(req, nome) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const DOZE_HORAS = 12 * 3600 * 1000;
function criarSessao(res, usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now());
  db.prepare('INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)').run(token, usuarioId, Date.now() + DOZE_HORAS);
  db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now','localtime') WHERE id = ?").run(usuarioId);
  res.setHeader('Set-Cookie', `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DOZE_HORAS / 1000}`);
}
// Devolve o usuário logado (ou null)
function usuarioDaSessao(req) {
  const t = lerCookie(req, 'sessao');
  if (!t) return null;
  return db.prepare(`SELECT u.id, u.nome, u.usuario, u.perfil, u.deve_trocar_senha
                       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
                      WHERE s.token = ? AND s.expira_em > ? AND u.ativo = 1`).get(t, Date.now()) || null;
}
const PERFIS = ['direcao', 'bibliotecario'];
const normalizarLogin = (v) => txt(v, 40).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
const qtdDirecao = () => db.prepare("SELECT COUNT(*) n FROM usuarios WHERE perfil = 'direcao' AND ativo = 1").get().n;
function validarSenha(s) { if (txt(s, 100).length < 4) throw new Erro('A senha precisa ter pelo menos 4 caracteres.'); return txt(s, 100); }

const tentativas = new Map(); // proteção simples contra chute de senha
app.get('/api/sessao', rota((req) => {
  const cfg = getConfig();
  const u = usuarioDaSessao(req);
  const total = db.prepare('SELECT COUNT(*) n FROM usuarios').get().n;
  return {
    logado: !!u, usuario: u, escola: cfg.escola_nome, prazo: Number(cfg.prazo_padrao_dias) || 7,
    precisaCriarDirecao: total === 0,
    // nomes para a tela de entrada (só quem está ativo)
    equipe: u ? [] : db.prepare('SELECT nome, usuario FROM usuarios WHERE ativo = 1 ORDER BY nome COLLATE NOCASE').all(),
  };
}));
app.post('/api/primeiro-acesso', rota((req, res) => {
  if (db.prepare('SELECT COUNT(*) n FROM usuarios').get().n > 0) throw new Erro('O primeiro acesso já foi feito.');
  const nome = txt(req.body.nome, 100);
  const usuario = normalizarLogin(req.body.usuario);
  if (!nome) throw new Erro('Informe seu nome.');
  if (usuario.length < 3) throw new Erro('O nome de usuário precisa ter pelo menos 3 letras.');
  const senha = validarSenha(req.body.senha);
  const r = db.prepare("INSERT INTO usuarios (nome, usuario, senha_hash, perfil) VALUES (?, ?, ?, 'direcao')").run(nome, usuario, hashSenha(senha));
  criarSessao(res, Number(r.lastInsertRowid));
  registrarAtividade('equipe', `Conta da direção criada: ${nome}`, nome);
}));
app.post('/api/login', rota((req, res) => {
  const ip = req.ip;
  const t = tentativas.get(ip) || { n: 0, ate: 0 };
  if (t.ate > Date.now()) throw new Erro('Muitas tentativas. Aguarde 1 minuto e tente de novo.', 429);
  const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(normalizarLogin(req.body.usuario));
  if (u && !u.ativo) throw new Erro('Este acesso foi desativado. Fale com a direção da escola.', 401);
  if (!u || !confereSenha(txt(req.body.senha, 100), u.senha_hash)) {
    t.n++; if (t.n >= 5) { t.n = 0; t.ate = Date.now() + 60_000; }
    tentativas.set(ip, t);
    throw new Erro(u ? 'Senha incorreta.' : 'Usuário não encontrado.', 401);
  }
  tentativas.delete(ip);
  criarSessao(res, u.id);
}));
app.post('/api/logout', rota((req, res) => {
  const t = lerCookie(req, 'sessao');
  if (t) db.prepare('DELETE FROM sessoes WHERE token = ?').run(t);
  res.setHeader('Set-Cookie', 'sessao=; Path=/; Max-Age=0');
}));

// Tudo abaixo exige login
app.use('/api', (req, res, next) => {
  const u = usuarioDaSessao(req);
  if (!u) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  req.usuario = u;
  next();
});
// Trocar a própria senha (qualquer pessoa da equipe)
app.post('/api/minha-senha', rota((req) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!u.deve_trocar_senha && !confereSenha(txt(req.body.atual, 100), u.senha_hash)) throw new Erro('A senha atual está incorreta.');
  const nova = validarSenha(req.body.nova);
  db.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?').run(hashSenha(nova), u.id);
  registrarAtividade('equipe', `${u.nome} trocou a própria senha`, u.nome);
}));

// Daqui para baixo: só a direção
const soDirecao = (req, res, next) => (req.usuario.perfil === 'direcao' ? next()
  : res.status(403).json({ erro: 'Somente a direção pode fazer isso.' }));
app.use(['/api/config', '/api/email', '/api/backup', '/api/usuarios'], soDirecao);

// ---------------- equipe (usuários) ----------------
app.get('/api/usuarios', rota(() => db.prepare(`
  SELECT u.id, u.nome, u.usuario, u.perfil, u.ativo, u.deve_trocar_senha, u.ultimo_acesso, u.criado_em,
         (SELECT COUNT(*) FROM emprestimos e WHERE e.emprestado_por = u.nome) AS emprestimos_feitos
    FROM usuarios u ORDER BY u.ativo DESC, u.nome COLLATE NOCASE`).all()));

function lerUsuario(b) {
  const nome = txt(b.nome, 100);
  const usuario = normalizarLogin(b.usuario);
  const perfil = PERFIS.includes(b.perfil) ? b.perfil : 'bibliotecario';
  if (!nome) throw new Erro('Informe o nome.');
  if (usuario.length < 3) throw new Erro('O nome de usuário precisa ter pelo menos 3 letras (sem espaços).');
  return { nome, usuario, perfil };
}
const loginEmUso = (usuario, id = 0) => !!db.prepare('SELECT 1 FROM usuarios WHERE usuario = ? AND id <> ?').get(usuario, id);
const nomePerfil = (p) => (p === 'direcao' ? 'Direção' : 'Bibliotecário(a)');

app.post('/api/usuarios', rota((req) => {
  const u = lerUsuario(req.body);
  if (loginEmUso(u.usuario)) throw new Erro(`O usuário "${u.usuario}" já existe. Escolha outro.`);
  const senha = validarSenha(req.body.senha);
  const r = db.prepare('INSERT INTO usuarios (nome, usuario, senha_hash, perfil, deve_trocar_senha) VALUES (?, ?, ?, ?, 1)')
    .run(u.nome, u.usuario, hashSenha(senha), u.perfil);
  registrarAtividade('equipe', `Acesso criado para ${u.nome} (${nomePerfil(u.perfil)})`, req.usuario.nome);
  return { id: Number(r.lastInsertRowid) };
}));
app.put('/api/usuarios/:id', rota((req) => {
  const id = Number(req.params.id);
  const atual = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!atual) throw new Erro('Pessoa não encontrada.', 404);
  const u = lerUsuario(req.body);
  if (loginEmUso(u.usuario, id)) throw new Erro(`O usuário "${u.usuario}" já existe. Escolha outro.`);
  if (atual.perfil === 'direcao' && u.perfil !== 'direcao') {
    if (id === req.usuario.id) throw new Erro('Você não pode tirar o seu próprio acesso de direção.');
    if (atual.ativo && qtdDirecao() <= 1) throw new Erro('O sistema precisa ter pelo menos uma pessoa da direção.');
  }
  db.prepare('UPDATE usuarios SET nome = ?, usuario = ?, perfil = ? WHERE id = ?').run(u.nome, u.usuario, u.perfil, id);
  registrarAtividade('equipe', `Acesso de ${u.nome} atualizado (${nomePerfil(u.perfil)})`, req.usuario.nome);
}));
app.post('/api/usuarios/:id/senha', rota((req) => {
  const id = Number(req.params.id);
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!u) throw new Erro('Pessoa não encontrada.', 404);
  const senha = validarSenha(req.body.senha);
  db.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?').run(hashSenha(senha), id === req.usuario.id ? 0 : 1, id);
  if (id !== req.usuario.id) db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(id);
  registrarAtividade('equipe', `Senha de ${u.nome} redefinida pela direção`, req.usuario.nome);
}));
app.post('/api/usuarios/:id/ativo', rota((req) => {
  const id = Number(req.params.id);
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!u) throw new Erro('Pessoa não encontrada.', 404);
  const ativo = req.body.ativo ? 1 : 0;
  if (!ativo) {
    if (id === req.usuario.id) throw new Erro('Você não pode desativar o seu próprio acesso.');
    if (u.perfil === 'direcao' && qtdDirecao() <= 1) throw new Erro('O sistema precisa ter pelo menos uma pessoa da direção.');
    db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(id);
  }
  db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo, id);
  registrarAtividade('equipe', `Acesso de ${u.nome} ${ativo ? 'reativado' : 'desativado'}`, req.usuario.nome);
}));

// ---------------- painel ----------------
const SQL_EMP = `
  SELECT e.*, a.nome AS aluno_nome, a.sala, a.responsavel, a.telefone, a.email,
         l.titulo AS livro_titulo, l.autor AS livro_autor
    FROM emprestimos e
    JOIN alunos a ON a.id = e.aluno_id
    JOIN livros l ON l.id = e.livro_id`;

function enfeitar(e) {
  const h = hoje();
  const faltam = diferencaDias(h, e.data_prevista);
  let situacao = 'devolvido';
  if (!e.data_devolucao) situacao = faltam < 0 ? 'atrasado' : faltam === 0 ? 'hoje' : faltam <= 2 ? 'breve' : 'em_dia';
  return { ...e, faltam, situacao };
}

app.get('/api/painel', rota(() => {
  const h = hoje();
  const um = (sql, ...p) => db.prepare(sql).get(...p).n;
  return {
    hoje: h,
    totais: {
      titulos: um('SELECT COUNT(*) n FROM livros WHERE ativo = 1'),
      exemplares: um('SELECT COALESCE(SUM(quantidade),0) n FROM livros WHERE ativo = 1'),
      alunos: um('SELECT COUNT(*) n FROM alunos WHERE ativo = 1'),
      emprestados: um('SELECT COUNT(*) n FROM emprestimos WHERE data_devolucao IS NULL'),
      atrasados: um('SELECT COUNT(*) n FROM emprestimos WHERE data_devolucao IS NULL AND data_prevista < ?', h),
      vencemHoje: um('SELECT COUNT(*) n FROM emprestimos WHERE data_devolucao IS NULL AND data_prevista = ?', h),
      devolvidosMes: um("SELECT COUNT(*) n FROM emprestimos WHERE data_devolucao >= ?", h.slice(0, 8) + '01'),
    },
    atrasados: db.prepare(`${SQL_EMP} WHERE e.data_devolucao IS NULL AND e.data_prevista < ? ORDER BY e.data_prevista LIMIT 30`).all(h).map(enfeitar),
    proximos: db.prepare(`${SQL_EMP} WHERE e.data_devolucao IS NULL AND e.data_prevista BETWEEN ? AND ? ORDER BY e.data_prevista LIMIT 30`).all(h, somarDias(h, 7)).map(enfeitar),
    maisLidos: db.prepare(`SELECT l.titulo, COUNT(*) n FROM emprestimos e JOIN livros l ON l.id = e.livro_id
                            GROUP BY l.id ORDER BY n DESC LIMIT 5`).all(),
  };
}));

// ---------------- livros ----------------
const SQL_LIVROS = `
  SELECT l.*, (SELECT COUNT(*) FROM emprestimos e WHERE e.livro_id = l.id AND e.data_devolucao IS NULL) AS emprestados
    FROM livros l`;

function lerLivro(b) {
  const titulo = txt(b.titulo, 200);
  if (!titulo) throw new Erro('Informe o título do livro.');
  const quantidade = Math.max(0, Math.min(999, parseInt(b.quantidade, 10) || 0));
  const isbn = opt(String(b.isbn || '').replace(/[^0-9Xx]/g, ''), 13);
  return { titulo, autor: opt(b.autor, 150), isbn, categoria: opt(b.categoria, 80), editora: opt(b.editora, 120),
           localizacao: opt(b.localizacao, 80), quantidade };
}

app.get('/api/livros', rota((req) => {
  const q = txt(req.query.q);
  const where = ['l.ativo = 1'];
  const p = [];
  if (q) { where.push('(sem_acento(l.titulo) LIKE ? OR sem_acento(l.autor) LIKE ? OR l.isbn LIKE ? OR sem_acento(l.categoria) LIKE ?)'); const s = likeQ(q); p.push(s, s, `%${q}%`, s); }
  if (req.query.disponiveis === '1') where.push('l.quantidade > (SELECT COUNT(*) FROM emprestimos e WHERE e.livro_id = l.id AND e.data_devolucao IS NULL)');
  return db.prepare(`${SQL_LIVROS} WHERE ${where.join(' AND ')} ORDER BY l.titulo COLLATE NOCASE LIMIT 500`).all(...p);
}));
app.get('/api/categorias', rota(() =>
  db.prepare("SELECT DISTINCT categoria FROM livros WHERE ativo = 1 AND categoria IS NOT NULL AND categoria <> '' ORDER BY categoria").all().map((r) => r.categoria)));

app.post('/api/livros', rota((req) => {
  const l = lerLivro(req.body);
  if (l.quantidade < 1) l.quantidade = 1;
  const r = db.prepare('INSERT INTO livros (titulo, autor, isbn, categoria, editora, localizacao, quantidade) VALUES (?,?,?,?,?,?,?)')
    .run(l.titulo, l.autor, l.isbn, l.categoria, l.editora, l.localizacao, l.quantidade);
  registrarAtividade('livro', `Livro cadastrado: "${l.titulo}" (${l.quantidade} exemplar(es))`, req.usuario.nome);
  return { id: Number(r.lastInsertRowid) };
}));
app.put('/api/livros/:id', rota((req) => {
  const id = Number(req.params.id);
  const atual = db.prepare(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`).get(id);
  if (!atual) throw new Erro('Livro não encontrado.', 404);
  const l = lerLivro(req.body);
  if (l.quantidade < atual.emprestados) throw new Erro(`Há ${atual.emprestados} exemplar(es) emprestado(s); a quantidade não pode ser menor que isso.`);
  db.prepare('UPDATE livros SET titulo=?, autor=?, isbn=?, categoria=?, editora=?, localizacao=?, quantidade=? WHERE id=?')
    .run(l.titulo, l.autor, l.isbn, l.categoria, l.editora, l.localizacao, l.quantidade, id);
  registrarAtividade('livro', `Livro editado: "${l.titulo}"`, req.usuario.nome);
}));
app.post('/api/livros/:id/quantidade', rota((req) => {
  const id = Number(req.params.id);
  const delta = Math.sign(Number(req.body.delta) || 0) * Math.min(100, Math.abs(Number(req.body.delta) || 0));
  const l = db.prepare(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`).get(id);
  if (!l) throw new Erro('Livro não encontrado.', 404);
  const nova = l.quantidade + delta;
  if (nova < l.emprestados) throw new Erro('Não dá para diminuir: todos os exemplares restantes estão emprestados.');
  if (nova < 0) throw new Erro('A quantidade não pode ficar negativa.');
  db.prepare('UPDATE livros SET quantidade = ? WHERE id = ?').run(nova, id);
  registrarAtividade('livro', `${delta > 0 ? 'Acrescentado(s)' : 'Retirado(s)'} ${Math.abs(delta)} exemplar(es) de "${l.titulo}" — agora ${nova}`, req.usuario.nome);
  return { quantidade: nova };
}));
app.delete('/api/livros/:id', rota((req) => {
  const id = Number(req.params.id);
  const l = db.prepare(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`).get(id);
  if (!l) throw new Erro('Livro não encontrado.', 404);
  if (l.emprestados > 0) throw new Erro('Este livro está emprestado agora. Registre a devolução antes de removê-lo.');
  db.prepare('UPDATE livros SET ativo = 0 WHERE id = ?').run(id); // mantém o histórico
  registrarAtividade('livro', `Livro removido do acervo: "${l.titulo}"`, req.usuario.nome);
}));

// Busca dados pelo ISBN (opcional, precisa de internet) — BrasilAPI, com Open Library como reserva
app.get('/api/isbn/:isbn', rota(async (req) => {
  const isbn = String(req.params.isbn).replace(/[^0-9Xx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) throw new Erro('O ISBN deve ter 10 ou 13 dígitos.');
  const pegar = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); return r.ok ? r.json() : null; };
  try {
    const b = await pegar(`https://brasilapi.com.br/api/isbn/v1/${isbn}`);
    if (b && b.title) return { titulo: [b.title, b.subtitle].filter(Boolean).join(': '), autor: (b.authors || []).join(', '), editora: b.publisher || '' };
  } catch { /* tenta a próxima */ }
  try {
    const o = await pegar(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const d = o && o[`ISBN:${isbn}`];
    if (d) return { titulo: d.title, autor: (d.authors || []).map((a) => a.name).join(', '), editora: (d.publishers || [])[0]?.name || '' };
  } catch { /* sem internet */ }
  throw new Erro('Não encontramos esse ISBN (ou o computador está sem internet). Preencha os dados à mão.', 404);
}));

// ---------------- alunos ----------------
function lerAluno(b) {
  const a = {
    nome: txt(b.nome, 150), sala: txt(b.sala, 40), turno: opt(b.turno, 20), responsavel: txt(b.responsavel, 150),
    telefone: opt(b.telefone, 30), email: opt(b.email, 150), endereco: opt(b.endereco, 250), observacoes: opt(b.observacoes, 500),
  };
  if (!a.nome) throw new Erro('Informe o nome do aluno.');
  if (!a.sala) throw new Erro('Informe a sala do aluno.');
  if (!a.responsavel) throw new Erro('Informe o nome do responsável.');
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) throw new Erro('O e-mail do responsável parece estar incorreto.');
  return a;
}
const SQL_ALUNOS = `
  SELECT a.*, (SELECT COUNT(*) FROM emprestimos e WHERE e.aluno_id = a.id AND e.data_devolucao IS NULL) AS com_livros,
         (SELECT COUNT(*) FROM emprestimos e WHERE e.aluno_id = a.id AND e.data_devolucao IS NULL AND e.data_prevista < ?) AS atrasados
    FROM alunos a`;

app.get('/api/alunos', rota((req) => {
  const where = ['a.ativo = 1'];
  const p = [hoje()];
  const q = txt(req.query.q);
  if (q) { where.push('(sem_acento(a.nome) LIKE ? OR sem_acento(a.responsavel) LIKE ?)'); const s = likeQ(q); p.push(s, s); }
  if (req.query.sala) { where.push('a.sala = ?'); p.push(txt(req.query.sala)); }
  return db.prepare(`${SQL_ALUNOS} WHERE ${where.join(' AND ')} ORDER BY a.nome COLLATE NOCASE LIMIT 500`).all(...p);
}));
app.get('/api/salas', rota(() => db.prepare('SELECT DISTINCT sala FROM alunos WHERE ativo = 1 ORDER BY sala').all().map((r) => r.sala)));
app.get('/api/alunos/:id', rota((req) => {
  const id = Number(req.params.id);
  const a = db.prepare(`${SQL_ALUNOS} WHERE a.id = ?`).get(hoje(), id);
  if (!a) throw new Erro('Aluno não encontrado.', 404);
  a.emprestimos = db.prepare(`${SQL_EMP} WHERE e.aluno_id = ? ORDER BY e.id DESC`).all(id).map(enfeitar);
  return a;
}));
app.post('/api/alunos', rota((req) => {
  const a = lerAluno(req.body);
  const r = db.prepare('INSERT INTO alunos (nome, sala, turno, responsavel, telefone, email, endereco, observacoes) VALUES (?,?,?,?,?,?,?,?)')
    .run(a.nome, a.sala, a.turno, a.responsavel, a.telefone, a.email, a.endereco, a.observacoes);
  registrarAtividade('aluno', `Aluno cadastrado: ${a.nome} (${a.sala})`, req.usuario.nome);
  return { id: Number(r.lastInsertRowid) };
}));
app.put('/api/alunos/:id', rota((req) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM alunos WHERE id = ? AND ativo = 1').get(id)) throw new Erro('Aluno não encontrado.', 404);
  const a = lerAluno(req.body);
  db.prepare('UPDATE alunos SET nome=?, sala=?, turno=?, responsavel=?, telefone=?, email=?, endereco=?, observacoes=? WHERE id=?')
    .run(a.nome, a.sala, a.turno, a.responsavel, a.telefone, a.email, a.endereco, a.observacoes, id);
  registrarAtividade('aluno', `Cadastro atualizado: ${a.nome}`, req.usuario.nome);
}));
app.delete('/api/alunos/:id', rota((req) => {
  const id = Number(req.params.id);
  const a = db.prepare(`${SQL_ALUNOS} WHERE a.id = ? AND a.ativo = 1`).get(hoje(), id);
  if (!a) throw new Erro('Aluno não encontrado.', 404);
  if (a.com_livros > 0) throw new Erro('Este aluno ainda está com livro(s). Registre a devolução antes de remover.');
  db.prepare('UPDATE alunos SET ativo = 0 WHERE id = ?').run(id);
  registrarAtividade('aluno', `Aluno removido: ${a.nome} (${a.sala})`, req.usuario.nome);
}));

// ---------------- empréstimos ----------------
app.get('/api/emprestimos', rota((req) => {
  const h = hoje();
  const where = [];
  const p = [];
  const st = req.query.situacao || 'abertos';
  if (st === 'abertos') where.push('e.data_devolucao IS NULL');
  if (st === 'atrasados') { where.push('e.data_devolucao IS NULL AND e.data_prevista < ?'); p.push(h); }
  if (st === 'hoje') { where.push('e.data_devolucao IS NULL AND e.data_prevista = ?'); p.push(h); }
  if (st === 'devolvidos') where.push('e.data_devolucao IS NOT NULL');
  const q = txt(req.query.q);
  if (q) { where.push('(sem_acento(a.nome) LIKE ? OR sem_acento(l.titulo) LIKE ? OR sem_acento(a.responsavel) LIKE ?)'); const s = likeQ(q); p.push(s, s, s); }
  if (req.query.sala) { where.push('a.sala = ?'); p.push(txt(req.query.sala)); }
  if (dataValida(req.query.de)) { where.push('e.data_emprestimo >= ?'); p.push(req.query.de); }
  if (dataValida(req.query.ate)) { where.push('e.data_emprestimo <= ?'); p.push(req.query.ate); }
  const ordem = st === 'abertos' || st === 'atrasados' || st === 'hoje' ? 'e.data_prevista ASC' : 'e.id DESC';
  const lista = db.prepare(`${SQL_EMP} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${ordem} LIMIT 1000`).all(...p).map(enfeitar);
  const ultimos = db.prepare(`SELECT emprestimo_id, MAX(enviado_em) quando, COUNT(*) n FROM emails_log WHERE status='enviado' AND emprestimo_id IS NOT NULL GROUP BY emprestimo_id`).all();
  const mapa = new Map(ultimos.map((u) => [u.emprestimo_id, u]));
  return lista.map((e) => ({ ...e, emails: mapa.get(e.id) || null }));
}));

app.post('/api/emprestimos', rota((req) => {
  const cfg = getConfig();
  const alunoId = Number(req.body.aluno_id);
  const livroId = Number(req.body.livro_id);
  const prevista = req.body.data_prevista;
  const h = hoje();
  if (!dataValida(prevista)) throw new Erro('Escolha a data de devolução.');
  if (prevista < h) throw new Erro('A data de devolução não pode ser no passado.');
  return transacao(() => {
    const a = db.prepare(`${SQL_ALUNOS} WHERE a.id = ? AND a.ativo = 1`).get(h, alunoId);
    if (!a) throw new Erro('Escolha o aluno.');
    const l = db.prepare(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`).get(livroId);
    if (!l) throw new Erro('Escolha o livro.');
    if (l.emprestados >= l.quantidade) throw new Erro(`Todos os exemplares de "${l.titulo}" já estão emprestados.`);
    const max = Number(cfg.max_livros_por_aluno) || 0;
    if (max && a.com_livros >= max) throw new Erro(`${a.nome} já está com ${a.com_livros} livro(s). O limite é ${max} por aluno (pode ser alterado em Configurações).`);
    const r = db.prepare('INSERT INTO emprestimos (aluno_id, livro_id, data_emprestimo, data_prevista, observacao, emprestado_por) VALUES (?,?,?,?,?,?)')
      .run(alunoId, livroId, h, prevista, opt(req.body.observacao, 300), req.usuario.nome);
    registrarAtividade('emprestimo', `Empréstimo: "${l.titulo}" para ${a.nome} (${a.sala}) — devolver até ${formatarBR(prevista)}`, req.usuario.nome);
    return { id: Number(r.lastInsertRowid), aviso: a.atrasados > 0 ? `Atenção: ${a.nome} tem livro(s) em atraso.` : null };
  });
}));

function pegarEmp(id) {
  const e = db.prepare(`${SQL_EMP} WHERE e.id = ?`).get(Number(id));
  if (!e) throw new Erro('Empréstimo não encontrado.', 404);
  return e;
}
app.post('/api/emprestimos/:id/devolver', rota((req) => {
  const e = pegarEmp(req.params.id);
  if (e.data_devolucao) throw new Erro('Este livro já foi devolvido.');
  db.prepare('UPDATE emprestimos SET data_devolucao = ?, devolvido_por = ? WHERE id = ?').run(hoje(), req.usuario.nome, e.id);
  const atraso = Math.max(0, diferencaDias(e.data_prevista, hoje()));
  registrarAtividade('devolucao', `Devolução: "${e.livro_titulo}" por ${e.aluno_nome}${atraso ? ` (${atraso} dia(s) de atraso)` : ''}`, req.usuario.nome);
}));
app.post('/api/emprestimos/:id/desfazer-devolucao', rota((req) => {
  const e = pegarEmp(req.params.id);
  if (!e.data_devolucao) throw new Erro('Este empréstimo está em aberto.');
  db.prepare('UPDATE emprestimos SET data_devolucao = NULL, devolvido_por = NULL WHERE id = ?').run(e.id);
  registrarAtividade('devolucao', `Devolução desfeita: "${e.livro_titulo}" — ${e.aluno_nome}`, req.usuario.nome);
}));
app.post('/api/emprestimos/:id/renovar', rota((req) => {
  const e = pegarEmp(req.params.id);
  if (e.data_devolucao) throw new Erro('Este livro já foi devolvido.');
  const nova = req.body.data_prevista;
  if (!dataValida(nova) || nova < hoje()) throw new Erro('Escolha uma nova data de devolução (hoje ou depois).');
  db.prepare('UPDATE emprestimos SET data_prevista = ?, renovacoes = renovacoes + 1 WHERE id = ?').run(nova, e.id);
  // reinicia os lembretes para o novo prazo
  db.prepare("DELETE FROM emails_log WHERE emprestimo_id = ? AND tipo IN ('antes','no_dia','atraso') AND status = 'erro'").run(e.id);
  db.prepare("UPDATE emails_log SET tipo = tipo || '_anterior' WHERE emprestimo_id = ? AND tipo IN ('antes','no_dia','atraso')").run(e.id);
  registrarAtividade('emprestimo', `Prazo renovado: "${e.livro_titulo}" (${e.aluno_nome}) — nova data ${formatarBR(nova)}`, req.usuario.nome);
}));
app.delete('/api/emprestimos/:id', rota((req) => {
  const e = pegarEmp(req.params.id);
  db.prepare('DELETE FROM emprestimos WHERE id = ?').run(e.id);
  registrarAtividade('emprestimo', `Registro de empréstimo apagado (lançado por engano): "${e.livro_titulo}" — ${e.aluno_nome}`, req.usuario.nome);
}));

// ---------------- histórico ----------------
app.get('/api/atividades', rota((req) => {
  const lim = Math.min(1000, Number(req.query.limite) || 300);
  return db.prepare('SELECT * FROM atividades ORDER BY id DESC LIMIT ?').all(lim);
}));
app.get('/api/emails', rota(() => db.prepare(`
  SELECT m.*, a.nome AS aluno_nome, l.titulo AS livro_titulo
    FROM emails_log m
    LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
    LEFT JOIN alunos a ON a.id = e.aluno_id
    LEFT JOIN livros l ON l.id = e.livro_id
   ORDER BY m.id DESC LIMIT 500`).all()));

// ---------------- configurações ----------------
const CHAVES_EDITAVEIS = ['escola_nome', 'prazo_padrao_dias', 'max_livros_por_aluno', 'email_ativo', 'email_horario',
  'email_somente_dias_uteis', 'email_dias_antes', 'email_no_dia', 'email_atraso_intervalo', 'email_atraso_max',
  'smtp_host', 'smtp_porta', 'smtp_seguro', 'smtp_usuario', 'smtp_senha', 'smtp_remetente_nome',
  'modelo_lembrete_assunto', 'modelo_lembrete_corpo', 'modelo_atraso_assunto', 'modelo_atraso_corpo'];

app.get('/api/config', rota(() => {
  const cfg = getConfig();
  const out = {};
  for (const k of CHAVES_EDITAVEIS) out[k] = cfg[k];
  out.smtp_senha = cfg.smtp_senha ? '••••••••' : '';
  out.email_ultima_execucao = cfg.email_ultima_execucao;
  out.backup_ultima_execucao = cfg.backup_ultima_execucao;
  return out;
}));
app.put('/api/config', rota((req) => {
  const b = req.body || {};
  if (b.email_horario && !/^\d{2}:\d{2}$/.test(b.email_horario)) throw new Erro('Horário inválido.');
  for (const k of CHAVES_EDITAVEIS) {
    if (!(k in b)) continue;
    if (k === 'smtp_senha' && (b[k] === '••••••••' || b[k] === undefined)) continue;
    let v = b[k];
    if (typeof v === 'boolean') v = v ? '1' : '0';
    if (k === 'smtp_senha') v = String(v).replace(/\s+/g, ''); // senhas de app do Gmail vêm com espaços
    setConfig(k, txt(v, 3000));
  }
  registrarAtividade('sistema', 'Configurações alteradas', req.usuario.nome);
}));
app.get('/api/email/previa', rota(() => {
  const { pendentes, semEmail } = lembretes.calcularPendentes();
  const m = (p) => ({ aluno: p.aluno_nome, sala: p.sala, livro: p.livro_titulo, email: p.email, tipo: p.tipo, prevista: p.data_prevista });
  return { pendentes: pendentes.map(m), semEmail: semEmail.map(m) };
}));
app.post('/api/email/teste', rota(async (req) => {
  const para = txt(req.body.para, 150);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new Erro('Digite um e-mail válido para o teste.');
  try { await lembretes.enviarTeste(para); }
  catch (e) { throw new Erro('Não foi possível enviar: ' + (e.message || e)); }
  return { ok: true };
}));
app.post('/api/email/executar', rota(async (req) => {
  const r = await lembretes.executarEnvio({ manual: true, quem: req.usuario.nome });
  if (!r.ok) throw new Erro(r.mensagem);
  return r;
}));

// ---------------- cópias de segurança e exportação ----------------
app.get('/api/backup', rota((req, res) => {
  const arq = lembretes.fazerBackup();
  res.download(arq, `biblioteca-${hoje()}.db`);
  return JA_RESPONDIDO;
}));

function csv(linhas, colunas) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [colunas.map((c) => c[1]).join(';'), ...linhas.map((l) => colunas.map((c) => esc(l[c[0]])).join(';'))].join('\r\n');
}
app.get('/api/exportar/:tipo', rota((req, res) => {
  let dados, cols;
  if (req.params.tipo === 'livros') {
    dados = db.prepare(`${SQL_LIVROS} WHERE l.ativo = 1 ORDER BY l.titulo`).all();
    cols = [['titulo', 'Título'], ['autor', 'Autor'], ['isbn', 'ISBN'], ['categoria', 'Categoria'], ['editora', 'Editora'], ['localizacao', 'Localização'], ['quantidade', 'Quantidade'], ['emprestados', 'Emprestados']];
  } else if (req.params.tipo === 'alunos') {
    dados = db.prepare(`${SQL_ALUNOS} WHERE a.ativo = 1 ORDER BY a.sala, a.nome`).all(hoje());
    cols = [['nome', 'Aluno'], ['sala', 'Sala'], ['turno', 'Turno'], ['responsavel', 'Responsável'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['endereco', 'Endereço'], ['com_livros', 'Livros em mãos']];
  } else if (req.params.tipo === 'emprestimos') {
    dados = db.prepare(`${SQL_EMP} ORDER BY e.id DESC`).all().map((e) => ({ ...e, data_emprestimo: formatarBR(e.data_emprestimo), data_prevista: formatarBR(e.data_prevista), data_devolucao: formatarBR(e.data_devolucao) }));
    cols = [['aluno_nome', 'Aluno'], ['sala', 'Sala'], ['responsavel', 'Responsável'], ['livro_titulo', 'Livro'], ['data_emprestimo', 'Emprestado em'], ['data_prevista', 'Devolver até'], ['data_devolucao', 'Devolvido em'], ['renovacoes', 'Renovações'], ['emprestado_por', 'Emprestado por'], ['devolvido_por', 'Recebido por']];
  } else throw new Erro('Tipo inválido.', 404);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.tipo}-${hoje()}.csv"`);
  res.send(csv(dados, cols));
}));

// SPA: qualquer outra rota devolve a interface
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// ---------------- iniciar ----------------
const PORTA = Number(process.env.PORT) || 3000;
app.listen(PORTA, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('\n  📚 Biblioteca escolar no ar!\n');
  console.log(`  Neste computador:  http://localhost:${PORTA}`);
  for (const ip of ips) console.log(`  Na rede da escola: http://${ip}:${PORTA}`);
  console.log(`\n  Dados em: ${DB_PATH}\n  (Deixe esta janela aberta enquanto usar o sistema.)\n`);
  lembretes.iniciarAgendador();
});
