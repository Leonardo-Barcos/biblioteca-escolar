const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const { db, transacao, pronto, getConfig, setConfig, registrarAtividade, NA_NUVEM, TABELAS } = require('./db');
const { hoje, somarDias, diferencaDias, formatarBR, dataValida } = require('./datas');
const lembretes = require('./lembretes');

const app = express();
app.disable('x-powered-by');

// Na nuvem (Vercel) o sistema fica atrás de um proxy HTTPS: confiamos no IP e no protocolo informados por ele
// (necessário para o cookie seguro e o limite de tentativas de senha).
const ATRAS_DE_PROXY = !!process.env.VERCEL || process.env.ATRAS_DE_PROXY === '1';
if (ATRAS_DE_PROXY) app.set('trust proxy', true);
// Na internet, a tela de entrada pede o usuário em vez de listar os nomes da equipe.
const ENTRADA_COM_NOMES = process.env.ENTRADA_COM_NOMES ? process.env.ENTRADA_COM_NOMES !== '0' : !ATRAS_DE_PROXY;

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.use(express.json({ limit: '200kb' }));
// Garante que as tabelas existem antes de qualquer acesso ao banco
app.use(['/api', '/saude'], (req, res, next) => pronto().then(() => next(), next));
// Verificação de saúde usada pela hospedagem (também confere o banco)
app.get('/saude', async (req, res) => {
  try { await db.um('SELECT 1 AS ok'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});
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
async function criarSessao(req, res, usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  (await db.exec('DELETE FROM sessoes WHERE expira_em < ?', Date.now()));
  (await db.exec('INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)', token, usuarioId, Date.now() + DOZE_HORAS));
  (await db.exec("UPDATE usuarios SET ultimo_acesso = agora_local() WHERE id = ?", usuarioId));
  res.setHeader('Set-Cookie', `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DOZE_HORAS / 1000}${req.secure ? '; Secure' : ''}`);
}
// Devolve o usuário logado (ou null)
async function usuarioDaSessao(req) {
  const t = lerCookie(req, 'sessao');
  if (!t) return null;
  return (await db.um(`SELECT u.id, u.nome, u.usuario, u.perfil, u.deve_trocar_senha
                       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
                      WHERE s.token = ? AND s.expira_em > ? AND u.ativo = 1`, t, Date.now())) || null;
}
const PERFIS = ['direcao', 'bibliotecario'];
const normalizarLogin = (v) => txt(v, 40).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
const qtdDirecao = async () => (await db.um("SELECT COUNT(*)::int n FROM usuarios WHERE perfil = 'direcao' AND ativo = 1")).n;
function validarSenha(s) { if (txt(s, 100).length < 4) throw new Erro('A senha precisa ter pelo menos 4 caracteres.'); return txt(s, 100); }

// Proteção contra chute de senha: 5 erros seguidos bloqueiam aquele IP por 1 minuto
async function verificarBloqueio(ip) {
  const t = await db.um('SELECT bloqueado FROM tentativas_login WHERE ip = ?', ip);
  if (t && Number(t.bloqueado) > Date.now()) throw new Erro('Muitas tentativas. Aguarde 1 minuto e tente de novo.', 429);
}
async function registrarErroSenha(ip) {
  const r = await db.um(`INSERT INTO tentativas_login (ip, n) VALUES (?, 1)
                         ON CONFLICT (ip) DO UPDATE SET n = tentativas_login.n + 1 RETURNING n`, ip);
  if (r.n >= 5) await db.exec('UPDATE tentativas_login SET n = 0, bloqueado = ? WHERE ip = ?', Date.now() + 60_000, ip);
}
app.get('/api/sessao', rota(async (req) => {
  const cfg = await getConfig();
  const u = await usuarioDaSessao(req);
  const total = (await db.um('SELECT COUNT(*)::int n FROM usuarios')).n;
  return {
    logado: !!u, usuario: u, escola: cfg.escola_nome, prazo: Number(cfg.prazo_padrao_dias) || 7,
    precisaCriarDirecao: total === 0,
    // nomes para a tela de entrada (só quem está ativo)
    entradaComNomes: ENTRADA_COM_NOMES,
    equipe: u || !ENTRADA_COM_NOMES ? [] : (await db.todos('SELECT nome, usuario FROM usuarios WHERE ativo = 1 ORDER BY lower(nome)')),
  };
}));
app.post('/api/primeiro-acesso', rota(async (req, res) => {
  if ((await db.um('SELECT COUNT(*)::int n FROM usuarios')).n > 0) throw new Erro('O primeiro acesso já foi feito.');
  const nome = txt(req.body.nome, 100);
  const usuario = normalizarLogin(req.body.usuario);
  if (!nome) throw new Erro('Informe seu nome.');
  if (usuario.length < 3) throw new Erro('O nome de usuário precisa ter pelo menos 3 letras.');
  const senha = validarSenha(req.body.senha);
  const r = (await db.exec("INSERT INTO usuarios (nome, usuario, senha_hash, perfil) VALUES (?, ?, ?, 'direcao') RETURNING id", nome, usuario, hashSenha(senha)));
  await criarSessao(req, res, r.rows[0].id);
  await registrarAtividade('equipe', `Conta da direção criada: ${nome}`, nome);
}));
app.post('/api/login', rota(async (req, res) => {
  const ip = req.ip || 'desconhecido';
  await verificarBloqueio(ip);
  const u = (await db.um('SELECT * FROM usuarios WHERE usuario = ?', normalizarLogin(req.body.usuario)));
  if (u && !u.ativo) throw new Erro('Este acesso foi desativado. Fale com a direção da escola.', 401);
  if (!u || !confereSenha(txt(req.body.senha, 100), u.senha_hash)) {
    await registrarErroSenha(ip);
    throw new Erro(u ? 'Senha incorreta.' : 'Usuário não encontrado.', 401);
  }
  await db.exec('DELETE FROM tentativas_login WHERE ip = ?', ip);
  await criarSessao(req, res, u.id);
}));
app.post('/api/logout', rota(async (req, res) => {
  const t = lerCookie(req, 'sessao');
  if (t) (await db.exec('DELETE FROM sessoes WHERE token = ?', t));
  res.setHeader('Set-Cookie', 'sessao=; Path=/; Max-Age=0');
}));

// Agendador: na nuvem, a Vercel chama este endereço a cada 10 minutos (ver vercel.json).
// Só aceita a chamada com o segredo CRON_SECRET, que a própria Vercel envia.
app.get('/api/cron/verificar', async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.authorization !== `Bearer ${segredo}`) return res.status(401).json({ erro: 'Não autorizado.' });
  try { res.json(await lembretes.verificar()); }
  catch (e) { console.error(e); res.status(500).json({ erro: e.message }); }
});

// Tudo abaixo exige login
app.use('/api', async (req, res, next) => {
  try {
    const u = await usuarioDaSessao(req);
    if (!u) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
    req.usuario = u;
    next();
  } catch (e) { next(e); }
});
// Trocar a própria senha (qualquer pessoa da equipe)
app.post('/api/minha-senha', rota(async (req) => {
  const u = (await db.um('SELECT * FROM usuarios WHERE id = ?', req.usuario.id));
  if (!u.deve_trocar_senha && !confereSenha(txt(req.body.atual, 100), u.senha_hash)) throw new Erro('A senha atual está incorreta.');
  const nova = validarSenha(req.body.nova);
  (await db.exec('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?', hashSenha(nova), u.id));
  await registrarAtividade('equipe', `${u.nome} trocou a própria senha`, u.nome);
}));

// Daqui para baixo: só a direção
const soDirecao = (req, res, next) => (req.usuario.perfil === 'direcao' ? next()
  : res.status(403).json({ erro: 'Somente a direção pode fazer isso.' }));
app.use(['/api/config', '/api/email', '/api/backup', '/api/usuarios'], soDirecao);

// ---------------- equipe (usuários) ----------------
app.get('/api/usuarios', rota(async () => (await db.todos(`
  SELECT u.id, u.nome, u.usuario, u.perfil, u.ativo, u.deve_trocar_senha, u.ultimo_acesso, u.criado_em,
         (SELECT COUNT(*)::int FROM emprestimos e WHERE e.emprestado_por = u.nome) AS emprestimos_feitos
    FROM usuarios u ORDER BY u.ativo DESC, lower(u.nome)`))));

function lerUsuario(b) {
  const nome = txt(b.nome, 100);
  const usuario = normalizarLogin(b.usuario);
  const perfil = PERFIS.includes(b.perfil) ? b.perfil : 'bibliotecario';
  if (!nome) throw new Erro('Informe o nome.');
  if (usuario.length < 3) throw new Erro('O nome de usuário precisa ter pelo menos 3 letras (sem espaços).');
  return { nome, usuario, perfil };
}
const loginEmUso = async (usuario, id = 0) => !!(await db.um('SELECT 1 FROM usuarios WHERE usuario = ? AND id <> ?', usuario, id));
const nomePerfil = (p) => (p === 'direcao' ? 'Direção' : 'Bibliotecário(a)');

app.post('/api/usuarios', rota(async (req) => {
  const u = lerUsuario(req.body);
  if (await loginEmUso(u.usuario)) throw new Erro(`O usuário "${u.usuario}" já existe. Escolha outro.`);
  const senha = validarSenha(req.body.senha);
  const r = (await db.exec('INSERT INTO usuarios (nome, usuario, senha_hash, perfil, deve_trocar_senha) VALUES (?, ?, ?, ?, 1) RETURNING id', u.nome, u.usuario, hashSenha(senha), u.perfil));
  await registrarAtividade('equipe', `Acesso criado para ${u.nome} (${nomePerfil(u.perfil)})`, req.usuario.nome);
  return { id: r.rows[0].id, usuario: u.usuario };
}));
app.put('/api/usuarios/:id', rota(async (req) => {
  const id = Number(req.params.id);
  const atual = (await db.um('SELECT * FROM usuarios WHERE id = ?', id));
  if (!atual) throw new Erro('Pessoa não encontrada.', 404);
  const u = lerUsuario(req.body);
  if (await loginEmUso(u.usuario, id)) throw new Erro(`O usuário "${u.usuario}" já existe. Escolha outro.`);
  if (atual.perfil === 'direcao' && u.perfil !== 'direcao') {
    if (id === req.usuario.id) throw new Erro('Você não pode tirar o seu próprio acesso de direção.');
    if (atual.ativo && (await qtdDirecao()) <= 1) throw new Erro('O sistema precisa ter pelo menos uma pessoa da direção.');
  }
  (await db.exec('UPDATE usuarios SET nome = ?, usuario = ?, perfil = ? WHERE id = ?', u.nome, u.usuario, u.perfil, id));
  await registrarAtividade('equipe', `Acesso de ${u.nome} atualizado (${nomePerfil(u.perfil)})`, req.usuario.nome);
}));
app.post('/api/usuarios/:id/senha', rota(async (req) => {
  const id = Number(req.params.id);
  const u = (await db.um('SELECT * FROM usuarios WHERE id = ?', id));
  if (!u) throw new Erro('Pessoa não encontrada.', 404);
  const senha = validarSenha(req.body.senha);
  (await db.exec('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?', hashSenha(senha), id === req.usuario.id ? 0 : 1, id));
  if (id !== req.usuario.id) (await db.exec('DELETE FROM sessoes WHERE usuario_id = ?', id));
  await registrarAtividade('equipe', `Senha de ${u.nome} redefinida pela direção`, req.usuario.nome);
}));
app.post('/api/usuarios/:id/ativo', rota(async (req) => {
  const id = Number(req.params.id);
  const u = (await db.um('SELECT * FROM usuarios WHERE id = ?', id));
  if (!u) throw new Erro('Pessoa não encontrada.', 404);
  const ativo = req.body.ativo ? 1 : 0;
  if (!ativo) {
    if (id === req.usuario.id) throw new Erro('Você não pode desativar o seu próprio acesso.');
    if (u.perfil === 'direcao' && (await qtdDirecao()) <= 1) throw new Erro('O sistema precisa ter pelo menos uma pessoa da direção.');
    (await db.exec('DELETE FROM sessoes WHERE usuario_id = ?', id));
  }
  (await db.exec('UPDATE usuarios SET ativo = ? WHERE id = ?', ativo, id));
  await registrarAtividade('equipe', `Acesso de ${u.nome} ${ativo ? 'reativado' : 'desativado'}`, req.usuario.nome);
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

app.get('/api/painel', rota(async () => {
  const h = hoje();
  // Uma consulta só para os totais (menos idas e voltas ao banco na nuvem)
  const totais = await db.um(`SELECT
      (SELECT COUNT(*)::int FROM livros WHERE ativo = 1) AS titulos,
      (SELECT COALESCE(SUM(quantidade),0)::int FROM livros WHERE ativo = 1) AS exemplares,
      (SELECT COUNT(*)::int FROM alunos WHERE ativo = 1) AS alunos,
      (SELECT COUNT(*)::int FROM emprestimos WHERE data_devolucao IS NULL) AS emprestados,
      (SELECT COUNT(*)::int FROM emprestimos WHERE data_devolucao IS NULL AND data_prevista < ?) AS atrasados,
      (SELECT COUNT(*)::int FROM emprestimos WHERE data_devolucao IS NULL AND data_prevista = ?) AS "vencemHoje",
      (SELECT COUNT(*)::int FROM emprestimos WHERE data_devolucao >= ?) AS "devolvidosMes"`, h, h, h.slice(0, 8) + '01');
  const [atrasados, proximos, maisLidos] = await Promise.all([
    db.todos(`${SQL_EMP} WHERE e.data_devolucao IS NULL AND e.data_prevista < ? ORDER BY e.data_prevista LIMIT 30`, h),
    db.todos(`${SQL_EMP} WHERE e.data_devolucao IS NULL AND e.data_prevista BETWEEN ? AND ? ORDER BY e.data_prevista LIMIT 30`, h, somarDias(h, 7)),
    db.todos(`SELECT l.titulo, COUNT(*)::int n FROM emprestimos e JOIN livros l ON l.id = e.livro_id
               GROUP BY l.id ORDER BY n DESC LIMIT 5`),
  ]);
  return { hoje: h, totais, atrasados: atrasados.map(enfeitar), proximos: proximos.map(enfeitar), maisLidos };
}));

// ---------------- livros ----------------
const SQL_LIVROS = `
  SELECT l.*, (SELECT COUNT(*)::int FROM emprestimos e WHERE e.livro_id = l.id AND e.data_devolucao IS NULL) AS emprestados
    FROM livros l`;

function lerLivro(b) {
  const titulo = txt(b.titulo, 200);
  if (!titulo) throw new Erro('Informe o título do livro.');
  const quantidade = Math.max(0, Math.min(999, parseInt(b.quantidade, 10) || 0));
  const isbn = opt(String(b.isbn || '').replace(/[^0-9Xx]/g, ''), 13);
  return { titulo, autor: opt(b.autor, 150), isbn, categoria: opt(b.categoria, 80), editora: opt(b.editora, 120),
           localizacao: opt(b.localizacao, 80), quantidade };
}

app.get('/api/livros', rota(async (req) => {
  const q = txt(req.query.q);
  const where = ['l.ativo = 1'];
  const p = [];
  if (q) { where.push('(sem_acento(l.titulo) LIKE ? OR sem_acento(l.autor) LIKE ? OR l.isbn LIKE ? OR sem_acento(l.categoria) LIKE ?)'); const s = likeQ(q); p.push(s, s, `%${q}%`, s); }
  if (req.query.disponiveis === '1') where.push('l.quantidade > (SELECT COUNT(*)::int FROM emprestimos e WHERE e.livro_id = l.id AND e.data_devolucao IS NULL)');
  return (await db.todos(`${SQL_LIVROS} WHERE ${where.join(' AND ')} ORDER BY lower(l.titulo) LIMIT 500`, ...p));
}));
app.get('/api/categorias', rota(async () =>
  (await db.todos("SELECT DISTINCT categoria FROM livros WHERE ativo = 1 AND categoria IS NOT NULL AND categoria <> '' ORDER BY categoria")).map((r) => r.categoria)));

app.post('/api/livros', rota(async (req) => {
  const l = lerLivro(req.body);
  if (l.quantidade < 1) l.quantidade = 1;
  const r = (await db.exec('INSERT INTO livros (titulo, autor, isbn, categoria, editora, localizacao, quantidade) VALUES (?,?,?,?,?,?,?) RETURNING id', l.titulo, l.autor, l.isbn, l.categoria, l.editora, l.localizacao, l.quantidade));
  await registrarAtividade('livro', `Livro cadastrado: "${l.titulo}" (${l.quantidade} exemplar(es))`, req.usuario.nome);
  return { id: r.rows[0].id };
}));
app.put('/api/livros/:id', rota(async (req) => {
  const id = Number(req.params.id);
  const atual = (await db.um(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`, id));
  if (!atual) throw new Erro('Livro não encontrado.', 404);
  const l = lerLivro(req.body);
  if (l.quantidade < atual.emprestados) throw new Erro(`Há ${atual.emprestados} exemplar(es) emprestado(s); a quantidade não pode ser menor que isso.`);
  (await db.exec('UPDATE livros SET titulo=?, autor=?, isbn=?, categoria=?, editora=?, localizacao=?, quantidade=? WHERE id=?', l.titulo, l.autor, l.isbn, l.categoria, l.editora, l.localizacao, l.quantidade, id));
  await registrarAtividade('livro', `Livro editado: "${l.titulo}"`, req.usuario.nome);
}));
app.post('/api/livros/:id/quantidade', rota(async (req) => {
  const id = Number(req.params.id);
  const delta = Math.sign(Number(req.body.delta) || 0) * Math.min(100, Math.abs(Number(req.body.delta) || 0));
  const l = (await db.um(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`, id));
  if (!l) throw new Erro('Livro não encontrado.', 404);
  const nova = l.quantidade + delta;
  if (nova < l.emprestados) throw new Erro('Não dá para diminuir: todos os exemplares restantes estão emprestados.');
  if (nova < 0) throw new Erro('A quantidade não pode ficar negativa.');
  (await db.exec('UPDATE livros SET quantidade = ? WHERE id = ?', nova, id));
  await registrarAtividade('livro', `${delta > 0 ? 'Acrescentado(s)' : 'Retirado(s)'} ${Math.abs(delta)} exemplar(es) de "${l.titulo}" — agora ${nova}`, req.usuario.nome);
  return { quantidade: nova };
}));
app.delete('/api/livros/:id', rota(async (req) => {
  const id = Number(req.params.id);
  const l = (await db.um(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1`, id));
  if (!l) throw new Erro('Livro não encontrado.', 404);
  if (l.emprestados > 0) throw new Erro('Este livro está emprestado agora. Registre a devolução antes de removê-lo.');
  (await db.exec('UPDATE livros SET ativo = 0 WHERE id = ?', id)); // mantém o histórico
  await registrarAtividade('livro', `Livro removido do acervo: "${l.titulo}"`, req.usuario.nome);
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
  SELECT a.*, (SELECT COUNT(*)::int FROM emprestimos e WHERE e.aluno_id = a.id AND e.data_devolucao IS NULL) AS com_livros,
         (SELECT COUNT(*)::int FROM emprestimos e WHERE e.aluno_id = a.id AND e.data_devolucao IS NULL AND e.data_prevista < ?) AS atrasados
    FROM alunos a`;

app.get('/api/alunos', rota(async (req) => {
  const where = ['a.ativo = 1'];
  const p = [hoje()];
  const q = txt(req.query.q);
  if (q) { where.push('(sem_acento(a.nome) LIKE ? OR sem_acento(a.responsavel) LIKE ?)'); const s = likeQ(q); p.push(s, s); }
  if (req.query.sala) { where.push('a.sala = ?'); p.push(txt(req.query.sala)); }
  return (await db.todos(`${SQL_ALUNOS} WHERE ${where.join(' AND ')} ORDER BY lower(a.nome) LIMIT 500`, ...p));
}));
app.get('/api/salas', rota(async () => (await db.todos('SELECT DISTINCT sala FROM alunos WHERE ativo = 1 ORDER BY sala')).map((r) => r.sala)));
app.get('/api/alunos/:id', rota(async (req) => {
  const id = Number(req.params.id);
  const a = (await db.um(`${SQL_ALUNOS} WHERE a.id = ?`, hoje(), id));
  if (!a) throw new Erro('Aluno não encontrado.', 404);
  a.emprestimos = (await db.todos(`${SQL_EMP} WHERE e.aluno_id = ? ORDER BY e.id DESC`, id)).map(enfeitar);
  return a;
}));
app.post('/api/alunos', rota(async (req) => {
  const a = lerAluno(req.body);
  const r = (await db.exec('INSERT INTO alunos (nome, sala, turno, responsavel, telefone, email, endereco, observacoes) VALUES (?,?,?,?,?,?,?,?) RETURNING id', a.nome, a.sala, a.turno, a.responsavel, a.telefone, a.email, a.endereco, a.observacoes));
  await registrarAtividade('aluno', `Aluno cadastrado: ${a.nome} (${a.sala})`, req.usuario.nome);
  return { id: r.rows[0].id };
}));
app.put('/api/alunos/:id', rota(async (req) => {
  const id = Number(req.params.id);
  if (!(await db.um('SELECT 1 FROM alunos WHERE id = ? AND ativo = 1', id))) throw new Erro('Aluno não encontrado.', 404);
  const a = lerAluno(req.body);
  (await db.exec('UPDATE alunos SET nome=?, sala=?, turno=?, responsavel=?, telefone=?, email=?, endereco=?, observacoes=? WHERE id=?', a.nome, a.sala, a.turno, a.responsavel, a.telefone, a.email, a.endereco, a.observacoes, id));
  await registrarAtividade('aluno', `Cadastro atualizado: ${a.nome}`, req.usuario.nome);
}));
app.delete('/api/alunos/:id', rota(async (req) => {
  const id = Number(req.params.id);
  const a = (await db.um(`${SQL_ALUNOS} WHERE a.id = ? AND a.ativo = 1`, hoje(), id));
  if (!a) throw new Erro('Aluno não encontrado.', 404);
  if (a.com_livros > 0) throw new Erro('Este aluno ainda está com livro(s). Registre a devolução antes de remover.');
  (await db.exec('UPDATE alunos SET ativo = 0 WHERE id = ?', id));
  await registrarAtividade('aluno', `Aluno removido: ${a.nome} (${a.sala})`, req.usuario.nome);
}));

// ---------------- empréstimos ----------------
app.get('/api/emprestimos', rota(async (req) => {
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
  const lista = (await db.todos(`${SQL_EMP} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${ordem} LIMIT 1000`, ...p)).map(enfeitar);
  const ultimos = (await db.todos(`SELECT emprestimo_id, MAX(enviado_em) quando, COUNT(*)::int n FROM emails_log WHERE status='enviado' AND emprestimo_id IS NOT NULL GROUP BY emprestimo_id`));
  const mapa = new Map(ultimos.map((u) => [u.emprestimo_id, u]));
  return lista.map((e) => ({ ...e, emails: mapa.get(e.id) || null }));
}));

app.post('/api/emprestimos', rota(async (req) => {
  const cfg = await getConfig();
  const alunoId = Number(req.body.aluno_id);
  const livroId = Number(req.body.livro_id);
  const prevista = req.body.data_prevista;
  const h = hoje();
  if (!dataValida(prevista)) throw new Erro('Escolha a data de devolução.');
  if (prevista < h) throw new Erro('A data de devolução não pode ser no passado.');
  return transacao(async (db) => {
    const a = (await db.um(`${SQL_ALUNOS} WHERE a.id = ? AND a.ativo = 1`, h, alunoId));
    if (!a) throw new Erro('Escolha o aluno.');
    // FOR UPDATE trava o livro até o fim da transação: duas pessoas não levam o último exemplar ao mesmo tempo
    const l = (await db.um(`${SQL_LIVROS} WHERE l.id = ? AND l.ativo = 1 FOR UPDATE OF l`, livroId));
    if (!l) throw new Erro('Escolha o livro.');
    if (l.emprestados >= l.quantidade) throw new Erro(`Todos os exemplares de "${l.titulo}" já estão emprestados.`);
    const max = Number(cfg.max_livros_por_aluno) || 0;
    if (max && a.com_livros >= max) throw new Erro(`${a.nome} já está com ${a.com_livros} livro(s). O limite é ${max} por aluno (pode ser alterado em Configurações).`);
    const r = (await db.exec('INSERT INTO emprestimos (aluno_id, livro_id, data_emprestimo, data_prevista, observacao, emprestado_por) VALUES (?,?,?,?,?,?) RETURNING id', alunoId, livroId, h, prevista, opt(req.body.observacao, 300), req.usuario.nome));
    await registrarAtividade('emprestimo', `Empréstimo: "${l.titulo}" para ${a.nome} (${a.sala}) — devolver até ${formatarBR(prevista)}`, req.usuario.nome, db);
    return { id: r.rows[0].id, aviso: a.atrasados > 0 ? `Atenção: ${a.nome} tem livro(s) em atraso.` : null };
  });
}));

async function pegarEmp(id) {
  const e = (await db.um(`${SQL_EMP} WHERE e.id = ?`, Number(id)));
  if (!e) throw new Erro('Empréstimo não encontrado.', 404);
  return e;
}
app.post('/api/emprestimos/:id/devolver', rota(async (req) => {
  const e = await pegarEmp(req.params.id);
  if (e.data_devolucao) throw new Erro('Este livro já foi devolvido.');
  (await db.exec('UPDATE emprestimos SET data_devolucao = ?, devolvido_por = ? WHERE id = ?', hoje(), req.usuario.nome, e.id));
  const atraso = Math.max(0, diferencaDias(e.data_prevista, hoje()));
  await registrarAtividade('devolucao', `Devolução: "${e.livro_titulo}" por ${e.aluno_nome}${atraso ? ` (${atraso} dia(s) de atraso)` : ''}`, req.usuario.nome);
}));
app.post('/api/emprestimos/:id/desfazer-devolucao', rota(async (req) => {
  const e = await pegarEmp(req.params.id);
  if (!e.data_devolucao) throw new Erro('Este empréstimo está em aberto.');
  (await db.exec('UPDATE emprestimos SET data_devolucao = NULL, devolvido_por = NULL WHERE id = ?', e.id));
  await registrarAtividade('devolucao', `Devolução desfeita: "${e.livro_titulo}" — ${e.aluno_nome}`, req.usuario.nome);
}));
app.post('/api/emprestimos/:id/renovar', rota(async (req) => {
  const e = await pegarEmp(req.params.id);
  if (e.data_devolucao) throw new Erro('Este livro já foi devolvido.');
  const nova = req.body.data_prevista;
  if (!dataValida(nova) || nova < hoje()) throw new Erro('Escolha uma nova data de devolução (hoje ou depois).');
  (await db.exec('UPDATE emprestimos SET data_prevista = ?, renovacoes = renovacoes + 1 WHERE id = ?', nova, e.id));
  // reinicia os lembretes para o novo prazo
  (await db.exec("DELETE FROM emails_log WHERE emprestimo_id = ? AND tipo IN ('antes','no_dia','atraso') AND status = 'erro'", e.id));
  (await db.exec("UPDATE emails_log SET tipo = tipo || '_anterior' WHERE emprestimo_id = ? AND tipo IN ('antes','no_dia','atraso')", e.id));
  await registrarAtividade('emprestimo', `Prazo renovado: "${e.livro_titulo}" (${e.aluno_nome}) — nova data ${formatarBR(nova)}`, req.usuario.nome);
}));
app.delete('/api/emprestimos/:id', rota(async (req) => {
  const e = await pegarEmp(req.params.id);
  (await db.exec('DELETE FROM emprestimos WHERE id = ?', e.id));
  await registrarAtividade('emprestimo', `Registro de empréstimo apagado (lançado por engano): "${e.livro_titulo}" — ${e.aluno_nome}`, req.usuario.nome);
}));

// ---------------- histórico ----------------
app.get('/api/atividades', rota(async (req) => {
  const lim = Math.min(1000, Number(req.query.limite) || 300);
  return (await db.todos('SELECT * FROM atividades ORDER BY criado_em DESC, id DESC LIMIT ?', lim));
}));
app.get('/api/emails', rota(async () => (await db.todos(`
  SELECT m.*, a.nome AS aluno_nome, l.titulo AS livro_titulo
    FROM emails_log m
    LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
    LEFT JOIN alunos a ON a.id = e.aluno_id
    LEFT JOIN livros l ON l.id = e.livro_id
   ORDER BY m.enviado_em DESC, m.id DESC LIMIT 500`))));

// ---------------- configurações ----------------
const CHAVES_EDITAVEIS = ['escola_nome', 'prazo_padrao_dias', 'max_livros_por_aluno', 'email_ativo', 'email_horario',
  'email_somente_dias_uteis', 'email_dias_antes', 'email_no_dia', 'email_atraso_intervalo', 'email_atraso_max',
  'smtp_host', 'smtp_porta', 'smtp_seguro', 'smtp_usuario', 'smtp_senha', 'smtp_remetente_nome',
  'modelo_lembrete_assunto', 'modelo_lembrete_corpo', 'modelo_atraso_assunto', 'modelo_atraso_corpo'];

app.get('/api/config', rota(async () => {
  const cfg = await getConfig();
  const out = {};
  for (const k of CHAVES_EDITAVEIS) out[k] = cfg[k];
  out.smtp_senha = cfg.smtp_senha ? '••••••••' : '';
  out.email_ultima_execucao = cfg.email_ultima_execucao;
  out.backup_ultima_execucao = cfg.backup_ultima_execucao;
  out.na_nuvem = NA_NUVEM;
  return out;
}));
app.put('/api/config', rota(async (req) => {
  const b = req.body || {};
  if (b.email_horario && !/^\d{2}:\d{2}$/.test(b.email_horario)) throw new Erro('Horário inválido.');
  for (const k of CHAVES_EDITAVEIS) {
    if (!(k in b)) continue;
    if (k === 'smtp_senha' && (b[k] === '••••••••' || b[k] === undefined)) continue;
    let v = b[k];
    if (typeof v === 'boolean') v = v ? '1' : '0';
    if (k === 'smtp_senha') v = String(v).replace(/\s+/g, ''); // senhas de app do Gmail vêm com espaços
    await setConfig(k, txt(v, 3000));
  }
  await registrarAtividade('sistema', 'Configurações alteradas', req.usuario.nome);
}));
app.get('/api/email/previa', rota(async () => {
  const { pendentes, semEmail } = await lembretes.calcularPendentes();
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
// Cópia completa em JSON (pode ser restaurada com "npm run restaurar -- arquivo.json")
app.get('/api/backup', rota(async (req, res) => {
  const copia = await lembretes.exportarTudo();
  await setConfig('backup_ultima_execucao', hoje());
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="biblioteca-${hoje()}.json"`);
  res.send(JSON.stringify(copia));
  return JA_RESPONDIDO;
}));

function csv(linhas, colunas) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [colunas.map((c) => c[1]).join(';'), ...linhas.map((l) => colunas.map((c) => esc(l[c[0]])).join(';'))].join('\r\n');
}
app.get('/api/exportar/:tipo', rota(async (req, res) => {
  let dados, cols;
  if (req.params.tipo === 'livros') {
    dados = (await db.todos(`${SQL_LIVROS} WHERE l.ativo = 1 ORDER BY l.titulo`));
    cols = [['titulo', 'Título'], ['autor', 'Autor'], ['isbn', 'ISBN'], ['categoria', 'Categoria'], ['editora', 'Editora'], ['localizacao', 'Localização'], ['quantidade', 'Quantidade'], ['emprestados', 'Emprestados']];
  } else if (req.params.tipo === 'alunos') {
    dados = (await db.todos(`${SQL_ALUNOS} WHERE a.ativo = 1 ORDER BY a.sala, a.nome`, hoje()));
    cols = [['nome', 'Aluno'], ['sala', 'Sala'], ['turno', 'Turno'], ['responsavel', 'Responsável'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['endereco', 'Endereço'], ['com_livros', 'Livros em mãos']];
  } else if (req.params.tipo === 'emprestimos') {
    dados = (await db.todos(`${SQL_EMP} ORDER BY e.id DESC`)).map((e) => ({ ...e, data_emprestimo: formatarBR(e.data_emprestimo), data_prevista: formatarBR(e.data_prevista), data_devolucao: formatarBR(e.data_devolucao) }));
    cols = [['aluno_nome', 'Aluno'], ['sala', 'Sala'], ['responsavel', 'Responsável'], ['livro_titulo', 'Livro'], ['data_emprestimo', 'Emprestado em'], ['data_prevista', 'Devolver até'], ['data_devolucao', 'Devolvido em'], ['renovacoes', 'Renovações'], ['emprestado_por', 'Emprestado por'], ['devolvido_por', 'Recebido por']];
  } else throw new Erro('Tipo inválido.', 404);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.tipo}-${hoje()}.csv"`);
  res.send(csv(dados, cols));
}));

// SPA: qualquer outra rota devolve a interface
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Erros que escaparam das rotas
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ erro: 'Ocorreu um erro inesperado. Tente novamente.' });
});

module.exports = app;
