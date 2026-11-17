// Testes de ponta a ponta: sobe o servidor com um banco temporário e usa a API como o navegador usaria.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORTA = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORTA}`;
const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'biblioteca-teste-'));
let servidor;

// Cliente simples que guarda o cookie de sessão
function cliente() {
  let cookie = '';
  return async (metodo, url, corpo) => {
    const r = await fetch(BASE + url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const c = r.headers.get('set-cookie');
    if (c) cookie = c.split(';')[0];
    return { status: r.status, dados: await r.json().catch(() => null) };
  };
}
const daqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toLocaleDateString('sv-SE'); };

before(async () => {
  servidor = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], {
    env: { ...process.env, PORT: String(PORTA), DATA_DIR: DADOS },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('servidor não subiu')), 10000);
    servidor.stdout.on('data', (b) => { if (String(b).includes('no ar')) { clearTimeout(t); ok(); } });
    servidor.on('exit', (c) => falha(new Error('servidor saiu com código ' + c)));
  });
});
after(() => { servidor?.kill(); fs.rmSync(DADOS, { recursive: true, force: true }); });

const direcao = cliente();
const professora = cliente();

test('primeiro acesso cria a conta da direção', async () => {
  let r = await direcao('GET', '/api/sessao');
  assert.equal(r.dados.precisaCriarDirecao, true);
  r = await direcao('POST', '/api/primeiro-acesso', { nome: 'Direção Teste', usuario: 'direcao', senha: 'segredo' });
  assert.equal(r.status, 200);
  r = await direcao('GET', '/api/sessao');
  assert.equal(r.dados.usuario.perfil, 'direcao');
  r = await cliente()('POST', '/api/primeiro-acesso', { nome: 'Intruso', usuario: 'intruso', senha: '1234' });
  assert.equal(r.status, 400, 'não pode haver um segundo primeiro acesso');
});

test('verificação de saúde responde sem login', async () => {
  const r = await fetch(BASE + '/saude');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('sem login a API recusa', async () => {
  const r = await cliente()('GET', '/api/livros');
  assert.equal(r.status, 401);
});

test('direção cadastra bibliotecária, que troca a senha provisória', async () => {
  let r = await direcao('POST', '/api/usuarios', { nome: 'Professora Teste', usuario: 'prof', perfil: 'bibliotecario', senha: '123456' });
  assert.equal(r.status, 200);
  r = await professora('POST', '/api/login', { usuario: 'prof', senha: '123456' });
  assert.equal(r.status, 200);
  r = await professora('GET', '/api/sessao');
  assert.equal(r.dados.usuario.deve_trocar_senha, 1);
  r = await professora('POST', '/api/minha-senha', { nova: 'minhasenha' });
  assert.equal(r.status, 200);
});

test('bibliotecária não acessa equipe nem configurações', async () => {
  for (const url of ['/api/usuarios', '/api/config', '/api/backup']) {
    const r = await professora('GET', url);
    assert.equal(r.status, 403, url);
  }
});

test('fluxo completo de empréstimo e devolução', async () => {
  const livro = (await professora('POST', '/api/livros', { titulo: 'Livro de Teste', quantidade: 1 })).dados.id;
  const aluno = (await professora('POST', '/api/alunos', { nome: 'Aluno Teste', sala: '3º ano A', responsavel: 'Responsável Teste' })).dados.id;

  let r = await professora('POST', '/api/emprestimos', { aluno_id: aluno, livro_id: livro, data_prevista: daqui(7) });
  assert.equal(r.status, 200);
  const id = r.dados.id;

  r = await professora('POST', '/api/emprestimos', { aluno_id: aluno, livro_id: livro, data_prevista: daqui(7) });
  assert.equal(r.status, 400, 'o único exemplar já está emprestado');

  r = await professora('POST', '/api/emprestimos', { aluno_id: aluno, livro_id: livro, data_prevista: daqui(-1) });
  assert.equal(r.status, 400, 'data no passado é recusada');

  r = await professora('DELETE', `/api/livros/${livro}`);
  assert.equal(r.status, 400, 'não remove livro emprestado');

  r = await professora('POST', `/api/emprestimos/${id}/devolver`);
  assert.equal(r.status, 200);

  r = await professora('GET', '/api/emprestimos?situacao=devolvidos');
  const e = r.dados.find((x) => x.id === id);
  assert.equal(e.emprestado_por, 'Professora Teste');
  assert.equal(e.devolvido_por, 'Professora Teste');
});

test('busca ignora acentos', async () => {
  await direcao('POST', '/api/livros', { titulo: 'O Pequeno Príncipe', quantidade: 1 });
  const r = await direcao('GET', '/api/livros?q=principe');
  assert.ok(r.dados.some((l) => l.titulo === 'O Pequeno Príncipe'));
});

test('direção não pode desativar a si mesma', async () => {
  const eu = (await direcao('GET', '/api/sessao')).dados.usuario.id;
  const r = await direcao('POST', `/api/usuarios/${eu}/ativo`, { ativo: false });
  assert.equal(r.status, 400);
});

test('acesso desativado derruba a sessão', async () => {
  const prof = (await direcao('GET', '/api/usuarios')).dados.find((u) => u.usuario === 'prof');
  await direcao('POST', `/api/usuarios/${prof.id}/ativo`, { ativo: false });
  const r = await professora('GET', '/api/painel');
  assert.equal(r.status, 401);
});
