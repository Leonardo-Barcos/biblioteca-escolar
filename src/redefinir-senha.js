// Para quando a direção esquecer a senha (rodar no computador do servidor):
//   npm run redefinir-senha            → lista as pessoas cadastradas
//   npm run redefinir-senha -- maria   → senha da "maria" vira "biblioteca" (troca obrigatória no próximo acesso)
const crypto = require('node:crypto');
const { db, registrarAtividade } = require('./db');
const alvo = (process.argv[2] || '').toLowerCase();
const lista = db.prepare('SELECT usuario, nome, perfil, ativo FROM usuarios ORDER BY nome').all();
if (!alvo) {
  console.log('\n  Pessoas cadastradas:');
  for (const u of lista) console.log(`   - ${u.usuario.padEnd(20)} ${u.nome} (${u.perfil === 'direcao' ? 'Direção' : 'Bibliotecário(a)'})${u.ativo ? '' : ' [desativado]'}`);
  console.log('\n  Use: npm run redefinir-senha -- NOME_DE_USUARIO\n');
  process.exit(0);
}
const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(alvo);
if (!u) { console.log(`\n  Usuário "${alvo}" não encontrado.\n`); process.exit(1); }
const sal = crypto.randomBytes(16).toString('hex');
const hash = `${sal}:${crypto.scryptSync('biblioteca', sal, 64).toString('hex')}`;
db.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 1, ativo = 1 WHERE id = ?').run(hash, u.id);
db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(u.id);
registrarAtividade('equipe', `Senha de ${u.nome} redefinida pelo computador do servidor`, 'Sistema');
console.log(`\n  Pronto! ${u.nome} pode entrar com a senha provisória: biblioteca`);
console.log('  O sistema vai pedir uma senha nova logo depois.\n');
