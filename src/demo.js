// Modo demonstração: npm run demo
// Cria um banco SEPARADO (pasta dados-demo/), recriado do zero a cada execução,
// preenche com dados fictícios e liga o sistema. Os dados reais (pasta dados/) não são tocados.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const PASTA = path.join(__dirname, '..', 'dados-demo');
fs.rmSync(PASTA, { recursive: true, force: true });
process.env.DATA_DIR = PASTA;
delete process.env.DATABASE_URL; // a demonstração nunca usa o banco da nuvem

const { db, setConfig, transacao, pronto } = require('./db');
const { hoje, somarDias } = require('./datas');

const SENHA = '1234';
const hashSenha = (s) => { const sal = crypto.randomBytes(16).toString('hex'); return `${sal}:${crypto.scryptSync(s, sal, 64).toString('hex')}`; };
const dia = (n) => somarDias(hoje(), n);
const quando = (n, hora = '09:30:00') => `${dia(n)} ${hora}`;

const equipe = [
  ['Helena Duarte', 'helena.duarte', 'direcao'],
  ['Cláudia Ramos', 'claudia.ramos', 'bibliotecario'],
  ['Sérgio Nunes', 'sergio.nunes', 'bibliotecario'],
  ['Márcia Lopes', 'marcia.lopes', 'bibliotecario'],
];

const livros = [
  // título, autor, quantidade, categoria, estante, isbn
  ['O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 3, 'Literatura infantil', 'Estante 1', '9788595081512'],
  ['Menina Bonita do Laço de Fita', 'Ana Maria Machado', 2, 'Literatura infantil', 'Estante 1', null],
  ['A Bolsa Amarela', 'Lygia Bojunga', 2, 'Literatura infantojuvenil', 'Estante 2', null],
  ['Marcelo, Marmelo, Martelo', 'Ruth Rocha', 4, 'Contos', 'Estante 1', null],
  ['O Menino Maluquinho', 'Ziraldo', 3, 'Literatura infantil', 'Estante 1', null],
  ['Chapeuzinho Amarelo', 'Chico Buarque', 2, 'Poesia', 'Estante 3', null],
  ['Bisa Bia, Bisa Bel', 'Ana Maria Machado', 1, 'Literatura infantojuvenil', 'Estante 2', null],
  ['A Casa Sonolenta', 'Audrey Wood', 2, 'Literatura infantil', 'Estante 3', null],
  ['O Caso da Borboleta Atíria', 'Lúcia Machado de Almeida', 2, 'Literatura infantojuvenil', 'Estante 2', null],
  ['Lendas da Amazônia', 'Coletânea', 3, 'Folclore', 'Estante 4', null],
  ['A Árvore Generosa', 'Shel Silverstein', 1, 'Literatura infantil', 'Estante 3', null],
  ['Ou Isto ou Aquilo', 'Cecília Meireles', 2, 'Poesia', 'Estante 3', null],
  ['Pluft, o Fantasminha', 'Maria Clara Machado', 2, 'Teatro', 'Estante 4', null],
  ['Atlas Escolar do Pará', 'Coletânea', 1, 'Didático', 'Estante 5', null],
];

const alunos = [
  // nome, sala, turno, responsável, telefone, e-mail, endereço
  ['Ana Clara Monteiro', '3º ano A', 'Manhã', 'Patrícia Monteiro', '(91) 98123-4567', 'patricia@exemplo.com', 'Rua Fictícia, 100'],
  ['Davi Lucas Pinheiro', '4º ano B', 'Tarde', 'Rogério Pinheiro', '(91) 99234-5678', 'rogerio@exemplo.com', 'Travessa Exemplo, 22'],
  ['Isabela Cristina Rocha', '2º ano A', 'Manhã', 'Fernanda Rocha', '(91) 98345-6789', null, 'Passagem Modelo, 7'],
  ['Miguel Santos Farias', '5º ano A', 'Tarde', 'Joelma Farias', '(91) 99456-7890', 'joelma@exemplo.com', null],
  ['Laura Beatriz Cunha', '3º ano A', 'Manhã', 'Edson Cunha', '(91) 98567-8901', 'edson@exemplo.com', 'Rua Fictícia, 340'],
  ['Pedro Henrique Alves', '4º ano B', 'Tarde', 'Simone Alves', '(91) 99678-9012', 'simone@exemplo.com', null],
  ['Sofia Gabriela Melo', '1º ano B', 'Manhã', 'Adriana Melo', '(91) 98789-0123', 'adriana@exemplo.com', null],
  ['Arthur Gabriel Sousa', '5º ano A', 'Tarde', 'Marcos Sousa', '(91) 99890-1234', null, 'Travessa Exemplo, 51'],
  ['Valentina Costa Lima', '2º ano A', 'Manhã', 'Juliana Lima', '(91) 98901-2345', 'juliana@exemplo.com', null],
  ['Heitor Nascimento', '3º ano B', 'Tarde', 'Raimunda Nascimento', '(91) 99012-3456', 'raimunda@exemplo.com', null],
  ['Alice Moraes Pantoja', '4º ano A', 'Manhã', 'Carla Pantoja', '(91) 98112-2334', 'carla@exemplo.com', null],
  ['Bernardo Quaresma', '1º ano B', 'Manhã', 'Paulo Quaresma', '(91) 99223-3445', null, null],
];

// Empréstimos: [aluno, livro, pegou há N dias, prazo em dias a partir de hoje, devolvido há N dias (ou null), quem emprestou, quem recebeu]
const emprestimos = [
  // em aberto
  [1, 7, -15, -3, null, 2, null],     // atrasado
  [2, 4, -12, -2, null, 2, null],     // atrasado
  [8, 13, -20, -6, null, 3, null],    // atrasado, sem e-mail
  [3, 2, -7, 0, null, 3, null],       // vence hoje
  [4, 5, -6, 1, null, 2, null],
  [5, 3, -5, 2, null, 3, null],
  [6, 6, -4, 5, null, 4, null],
  [7, 8, -2, 9, null, 2, null],
  [9, 12, -1, 13, null, 4, null],
  [10, 10, -3, 11, null, 1, null],
  // já devolvidos (histórico)
  [1, 5, -30, -23, -24, 2, 2],
  [4, 8, -28, -21, -18, 3, 4],        // devolvido com atraso
  [11, 1, -25, -18, -19, 2, 3],
  [2, 1, -22, -15, -16, 4, 4],
  [12, 11, -20, -13, -13, 3, 3],
  [5, 9, -18, -11, -12, 2, 2],
  [9, 1, -16, -9, -9, 4, 2],
  [6, 12, -14, -7, -8, 3, 3],
  [7, 14, -10, -3, -4, 2, 4],
];

async function preencher() {
 await pronto();
 await transacao(async (db) => {
  const insU = (...p) => db.exec('INSERT INTO usuarios (nome, usuario, senha_hash, perfil, ultimo_acesso) VALUES (?, ?, ?, ?, ?)', ...p);
  for (const [i, [nome, usuario, perfil]] of equipe.entries()) await insU(nome, usuario, hashSenha(SENHA), perfil, quando(-i, '07:45:00'));

  for (const l of livros) await db.exec('INSERT INTO livros (titulo, autor, quantidade, categoria, localizacao, isbn, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)', ...l, quando(-40));
  for (const a of alunos) await db.exec('INSERT INTO alunos (nome, sala, turno, responsavel, telefone, email, endereco, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ...a, quando(-35));

  const insE = { run: (...p) => db.exec(`INSERT INTO emprestimos (aluno_id, livro_id, data_emprestimo, data_prevista, data_devolucao, emprestado_por, devolvido_por)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`, ...p) };
  const insAt = { run: (...p) => db.exec('INSERT INTO atividades (tipo, descricao, usuario, criado_em) VALUES (?, ?, ?, ?)', ...p) };
  const insM = { run: (...p) => db.exec('INSERT INTO emails_log (emprestimo_id, tipo, destinatario, assunto, status, erro, enviado_em) VALUES (?, ?, ?, ?, ?, ?, ?)', ...p) };
  const nomeEquipe = (i) => equipe[i - 1][0];

  await insAt.run('equipe', 'Conta da direção criada: Helena Duarte', 'Helena Duarte', quando(-45, '08:00:00'));
  for (const [nome, , perfil] of equipe.slice(1)) await insAt.run('equipe', `Acesso criado para ${nome} (${perfil === 'direcao' ? 'Direção' : 'Bibliotecário(a)'})`, 'Helena Duarte', quando(-45, '08:10:00'));

  for (const [i, [a, l, pegou, prazo, devolvido, por, recebeu]] of emprestimos.entries()) {
    const aluno = alunos[a - 1];
    const livro = livros[l - 1][0];
    await insE.run(a, l, dia(pegou), dia(prazo), devolvido == null ? null : dia(devolvido), nomeEquipe(por), recebeu ? nomeEquipe(recebeu) : null);
    const id = i + 1;
    await insAt.run('emprestimo', `Empréstimo: "${livro}" para ${aluno[0]} (${aluno[1]}) — devolver até ${dia(prazo).split('-').reverse().join('/')}`, nomeEquipe(por), quando(pegou, '10:15:00'));
    if (devolvido != null) {
      const atraso = Math.max(0, devolvido - prazo);
      await insAt.run('devolucao', `Devolução: "${livro}" por ${aluno[0]}${atraso ? ` (${atraso} dia(s) de atraso)` : ''}`, nomeEquipe(recebeu), quando(devolvido, '10:40:00'));
    }
    // Lembretes já enviados para quem tem e-mail
    const email = aluno[5];
    if (!email) continue;
    const assunto = `Lembrete: devolução do livro "${livro}"`;
    if (prazo - 2 > pegou && prazo - 2 <= 0 && (devolvido == null || devolvido > prazo - 2)) await insM.run(id, 'antes', email, assunto, 'enviado', null, quando(prazo - 2, '08:00:12'));
    if (prazo <= 0 && (devolvido == null || devolvido >= prazo)) await insM.run(id, 'no_dia', email, assunto, 'enviado', null, quando(prazo, '08:00:15'));
    if (prazo < 0 && devolvido == null) await insM.run(id, 'atraso', email, `Livro "${livro}" com devolução atrasada`, 'enviado', null, quando(Math.min(-1, prazo + 1), '08:00:20'));
  }
  // Um envio com erro, para mostrar como aparece no histórico
  await insM.run(5, 'antes', 'joelma@exemplo', 'Lembrete: devolução do livro "O Menino Maluquinho"', 'erro', 'Endereço de e-mail inválido (exemplo de erro)', quando(-1, '08:00:18'));

  await insAt.run('livro', 'Acrescentado(s) 1 exemplar(es) de "O Pequeno Príncipe" — agora 3', 'Helena Duarte', quando(-10, '14:05:00'));
  await insAt.run('aluno', 'Cadastro atualizado: Bernardo Quaresma', 'Márcia Lopes', quando(-5, '09:12:00'));
 });
 await setConfig('email_ultima_execucao', hoje()); // não tenta enviar e-mails de verdade na demonstração
 await setConfig('backup_ultima_execucao', hoje());
}

preencher().then(() => {
console.log('\n  🎭 MODO DEMONSTRAÇÃO — dados fictícios em dados-demo/ (os dados reais não foram tocados)');
console.log(`  Entre como "Helena Duarte" (direção) ou "Cláudia Ramos" (bibliotecária). Senha de todos: ${SENHA}`);

  require('./server');
}).catch((e) => { console.error('Falha ao preparar a demonstração:', e); process.exit(1); });
