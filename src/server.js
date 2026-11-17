// Servidor para rodar no computador da escola (Windows, Chromebook/Linux) ou em desenvolvimento.
// Na nuvem (Vercel) quem usa o app é api/index.js e os lembretes são disparados pelo Vercel Cron.
const os = require('node:os');
const app = require('./app');
const { pronto, NA_NUVEM, DATA_DIR } = require('./db');
const lembretes = require('./lembretes');

const PORTA = Number(process.env.PORT) || 3000;

pronto()
  .then(() => {
    app.listen(PORTA, '0.0.0.0', () => {
      const ips = Object.values(os.networkInterfaces()).flat()
        .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
      console.log('\n  📚 Biblioteca escolar no ar!\n');
      console.log(`  Neste computador:  http://localhost:${PORTA}`);
      for (const ip of ips) console.log(`  Na rede da escola: http://${ip}:${PORTA}`);
      console.log(NA_NUVEM ? '\n  Banco: Postgres (DATABASE_URL)\n' : `\n  Dados em: ${DATA_DIR}\n  (Deixe esta janela aberta enquanto usar o sistema.)\n`);
      lembretes.iniciarAgendador();
    });
  })
  .catch((e) => {
    console.error('\n  Não foi possível abrir o banco de dados:', e.message, '\n');
    process.exit(1);
  });
