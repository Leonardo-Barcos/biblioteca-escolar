// Restaura uma cópia de segurança (.json baixada em Configurações → Cópia de segurança).
//   npm run restaurar -- caminho/para/biblioteca-AAAA-MM-DD.json
// Só funciona num banco vazio (recém-criado), para nunca misturar ou sobrescrever dados por engano.
// Para restaurar na nuvem, rode com a DATABASE_URL do Supabase no terminal (veja o manual).
const fs = require('node:fs');
const { db, transacao, pronto, TABELAS, NA_NUVEM } = require('./db');

(async () => {
  const arquivo = process.argv[2];
  if (!arquivo) { console.log('\n  Use: npm run restaurar -- arquivo.json\n'); process.exit(1); }
  const copia = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (copia.sistema !== 'biblioteca-escolar' || !copia.tabelas) throw new Error('Este arquivo não é uma cópia de segurança da biblioteca.');

  await pronto();
  const ocupado = await db.um('SELECT (SELECT COUNT(*)::int FROM usuarios) + (SELECT COUNT(*)::int FROM livros) AS n');
  if (ocupado.n > 0) throw new Error('O banco de destino já tem dados. A restauração só é feita num banco vazio.');

  await transacao(async (tx) => {
    for (const t of TABELAS) {
      const linhas = copia.tabelas[t] || [];
      for (const linha of linhas) {
        const cols = Object.keys(linha);
        const sql = `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})` +
          (t === 'config' ? ' ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor' : '');
        await tx.exec(sql, ...cols.map((c) => linha[c]));
      }
      // acerta o contador de ids para continuar depois do maior id restaurado
      if (t !== 'config' && linhas.length) {
        await tx.exec(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}))`);
      }
      console.log(`  ${t}: ${linhas.length} registro(s)`);
    }
  });
  console.log(`\n  Cópia restaurada com sucesso ${NA_NUVEM ? 'no banco da nuvem' : 'na pasta dados/'}.\n`);
  process.exit(0);
})().catch((e) => { console.error('\n  ' + e.message + '\n'); process.exit(1); });
