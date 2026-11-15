// Envio automático de lembretes por e-mail + cópia de segurança diária.
const nodemailer = require('nodemailer');
const fs = require('node:fs');
const path = require('node:path');
const { db, getConfig, setConfig, registrarAtividade, DATA_DIR } = require('./db');
const { hoje, horaAtual, diferencaDias, formatarBR, ehDiaUtil } = require('./datas');

function criarTransporte(cfg) {
  if (!cfg.smtp_host || !cfg.smtp_usuario || !cfg.smtp_senha) {
    throw new Error('O servidor de e-mail ainda não foi configurado (Configurações → Servidor de e-mail).');
  }
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_porta) || 465,
    secure: cfg.smtp_seguro === '1',
    auth: { user: cfg.smtp_usuario, pass: cfg.smtp_senha },
    connectionTimeout: 15000,
  });
}

function preencher(modelo, dados) {
  return String(modelo || '').replace(/\{(\w+)\}/g, (m, k) => (k in dados ? dados[k] : m));
}

function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function montarHtml(corpo, escola) {
  const texto = escaparHtml(corpo).replace(/\n/g, '<br>');
  return `<div style="background:#F6EDE4;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:auto;background:#FFFBF7;border-radius:14px;overflow:hidden;border:1px solid #E6D5C7">
    <div style="background:#E8C7B4;padding:18px 24px;color:#2E6F86;font-size:20px;font-weight:bold">📚 Biblioteca — ${escaparHtml(escola)}</div>
    <div style="padding:24px;color:#3A2A21;font-size:16px;line-height:1.6">${texto}</div>
  </div></div>`;
}

function dadosDoEmprestimo(e, cfg) {
  const h = hoje();
  return {
    responsavel: e.responsavel,
    aluno: e.aluno_nome,
    sala: e.sala,
    livro: e.livro_titulo,
    data_devolucao: formatarBR(e.data_prevista),
    data_emprestimo: formatarBR(e.data_emprestimo),
    dias_atraso: Math.max(0, diferencaDias(e.data_prevista, h)),
    dias_restantes: Math.max(0, diferencaDias(h, e.data_prevista)),
    escola: cfg.escola_nome,
  };
}

// Decide quais e-mails estão "devidos" hoje para cada empréstimo em aberto.
function calcularPendentes(cfg = getConfig()) {
  const h = hoje();
  const diasAntes = Number(cfg.email_dias_antes) || 0;
  const noDia = cfg.email_no_dia === '1';
  const intervalo = Number(cfg.email_atraso_intervalo) || 0;
  const maxAtraso = Number(cfg.email_atraso_max) || 0;

  const ativos = db.prepare(`
    SELECT e.*, a.nome AS aluno_nome, a.sala, a.responsavel, a.email,
           l.titulo AS livro_titulo
      FROM emprestimos e
      JOIN alunos a ON a.id = e.aluno_id
      JOIN livros l ON l.id = e.livro_id
     WHERE e.data_devolucao IS NULL`).all();

  const enviados = db.prepare(`SELECT tipo, enviado_em FROM emails_log
                                WHERE emprestimo_id = ? AND status = 'enviado' ORDER BY id`);
  const pendentes = [];
  const semEmail = [];

  for (const e of ativos) {
    const faltam = diferencaDias(h, e.data_prevista); // >0 ainda no prazo, 0 vence hoje, <0 atrasado
    const hist = enviados.all(e.id);
    const ja = (t) => hist.some((x) => x.tipo === t);
    let tipo = null;

    if (faltam > 0 && diasAntes > 0 && faltam <= diasAntes && !ja('antes') && e.data_emprestimo < h) tipo = 'antes';
    else if (faltam === 0 && noDia && !ja('no_dia')) tipo = 'no_dia';
    else if (faltam < 0 && intervalo > 0) {
      const atrasos = hist.filter((x) => x.tipo === 'atraso');
      if (!maxAtraso || atrasos.length < maxAtraso) {
        const ultimo = atrasos.length ? atrasos[atrasos.length - 1].enviado_em.slice(0, 10) : null;
        if (!ultimo || diferencaDias(ultimo, h) >= intervalo) tipo = 'atraso';
      }
    }
    if (!tipo) continue;
    if (!e.email) { semEmail.push({ ...e, tipo }); continue; }
    pendentes.push({ ...e, tipo });
  }
  return { pendentes, semEmail };
}

let rodando = false;
async function executarEnvio({ manual = false, quem = 'Sistema' } = {}) {
  if (rodando) return { ok: false, mensagem: 'Já existe um envio em andamento.' };
  rodando = true;
  try {
    const cfg = getConfig();
    const { pendentes, semEmail } = calcularPendentes(cfg);
    const resumo = { enviados: 0, erros: 0, semEmail: semEmail.length, detalhes: [] };
    if (!pendentes.length) {
      setConfig('email_ultima_execucao', hoje());
      return { ok: true, ...resumo, mensagem: 'Nenhum lembrete para enviar hoje.' };
    }
    const transporte = criarTransporte(cfg);
    const ins = db.prepare(`INSERT INTO emails_log (emprestimo_id, tipo, destinatario, assunto, status, erro)
                            VALUES (?, ?, ?, ?, ?, ?)`);
    for (const p of pendentes) {
      const dados = dadosDoEmprestimo(p, cfg);
      const atraso = p.tipo === 'atraso';
      const assunto = preencher(atraso ? cfg.modelo_atraso_assunto : cfg.modelo_lembrete_assunto, dados);
      const corpo = preencher(atraso ? cfg.modelo_atraso_corpo : cfg.modelo_lembrete_corpo, dados);
      try {
        await transporte.sendMail({
          from: `"${cfg.smtp_remetente_nome || 'Biblioteca'}" <${cfg.smtp_usuario}>`,
          to: p.email,
          subject: assunto,
          text: corpo,
          html: montarHtml(corpo, cfg.escola_nome),
        });
        ins.run(p.id, p.tipo, p.email, assunto, 'enviado', null);
        resumo.enviados++;
      } catch (err) {
        ins.run(p.id, p.tipo, p.email, assunto, 'erro', String(err.message || err).slice(0, 500));
        resumo.erros++;
      }
      resumo.detalhes.push({ aluno: p.aluno_nome, livro: p.livro_titulo, tipo: p.tipo });
    }
    setConfig('email_ultima_execucao', hoje());
    registrarAtividade('email', `${manual ? 'Envio manual' : 'Envio automático'} de lembretes: ${resumo.enviados} enviado(s)` +
      (resumo.erros ? `, ${resumo.erros} com erro` : ''), quem);
    return { ok: true, ...resumo, mensagem: `${resumo.enviados} lembrete(s) enviado(s).` };
  } catch (err) {
    return { ok: false, mensagem: err.message };
  } finally {
    rodando = false;
  }
}

async function enviarTeste(para) {
  const cfg = getConfig();
  const transporte = criarTransporte(cfg);
  const corpo = `Olá!\n\nEste é um e-mail de teste do sistema da biblioteca.\nSe você recebeu esta mensagem, os lembretes automáticos estão prontos para funcionar. 🎉\n\nBiblioteca — ${cfg.escola_nome}`;
  await transporte.sendMail({
    from: `"${cfg.smtp_remetente_nome || 'Biblioteca'}" <${cfg.smtp_usuario}>`,
    to: para,
    subject: 'Teste — Biblioteca escolar',
    text: corpo,
    html: montarHtml(corpo, cfg.escola_nome),
  });
  db.prepare(`INSERT INTO emails_log (emprestimo_id, tipo, destinatario, assunto, status) VALUES (NULL, 'teste', ?, ?, 'enviado')`)
    .run(para, 'Teste — Biblioteca escolar');
}

// ---------- Cópia de segurança diária (mantém as últimas 14) ----------
function fazerBackup() {
  const dir = path.join(DATA_DIR, 'copias-de-seguranca');
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `biblioteca-${hoje()}.db`);
  if (fs.existsSync(destino)) fs.unlinkSync(destino);
  db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.db')).sort();
  while (arquivos.length > 14) fs.unlinkSync(path.join(dir, arquivos.shift()));
  setConfig('backup_ultima_execucao', hoje());
  return destino;
}

// ---------- Relógio: confere a cada 5 minutos ----------
async function verificar() {
  const cfg = getConfig();
  const h = hoje();
  try {
    if (cfg.backup_ultima_execucao !== h) fazerBackup();
  } catch (e) { console.error('Falha na cópia de segurança:', e.message); }

  if (cfg.email_ativo !== '1') return;
  if (cfg.email_ultima_execucao === h) return;
  if (cfg.email_somente_dias_uteis === '1' && !ehDiaUtil(h)) return;
  if (horaAtual() < (cfg.email_horario || '08:00')) return;
  const r = await executarEnvio();
  console.log(`[lembretes ${h}]`, r.mensagem);
}

function iniciarAgendador() {
  setTimeout(verificar, 10_000); // logo após ligar (recupera envios se o PC estava desligado no horário)
  setInterval(verificar, 5 * 60_000);
}

module.exports = { iniciarAgendador, verificar, executarEnvio, enviarTeste, calcularPendentes, fazerBackup, preencher, dadosDoEmprestimo };
