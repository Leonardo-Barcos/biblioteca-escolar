// Para quando a direção esquecer a senha.
//   npm run redefinir-senha            → lista as pessoas cadastradas
//   npm run redefinir-senha -- maria   → senha da "maria" vira "biblioteca" (troca obrigatória no próximo acesso)
// Para mexer no banco da nuvem, rode com a DATABASE_URL do Supabase no terminal (veja o manual).
const crypto = require('node:crypto');
const { db, pronto, registrarAtividade } = require('./db');

(async () => {
  await pronto();
  const alvo = (process.argv[2] || '').toLowerCase();
  if (!alvo) {
    console.log('\n  Pessoas cadastradas:');
    for (const u of await db.todos('SELECT usuario, nome, perfil, ativo FROM usuarios ORDER BY nome')) {
      console.log(`   - ${u.usuario.padEnd(20)} ${u.nome} (${u.perfil === 'direcao' ? 'Direção' : 'Bibliotecário(a)'})${u.ativo ? '' : ' [desativado]'}`);
    }
    console.log('\n  Use: npm run redefinir-senha -- NOME_DE_USUARIO\n');
    process.exit(0);
  }
  const u = await db.um('SELECT * FROM usuarios WHERE usuario = ?', alvo);
  if (!u) { console.log(`\n  Usuário "${alvo}" não encontrado.\n`); process.exit(1); }
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = `${sal}:${crypto.scryptSync('biblioteca', sal, 64).toString('hex')}`;
  await db.exec('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 1, ativo = 1 WHERE id = ?', hash, u.id);
  await db.exec('DELETE FROM sessoes WHERE usuario_id = ?', u.id);
  await registrarAtividade('equipe', `Senha de ${u.nome} redefinida pelo terminal`, 'Sistema');
  console.log(`\n  Pronto! ${u.nome} pode entrar com a senha provisória: biblioteca`);
  console.log('  O sistema vai pedir uma senha nova logo depois.\n');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
