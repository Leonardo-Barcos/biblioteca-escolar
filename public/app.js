'use strict';
/* =====================================================================
   Biblioteca Escolar — interface (JavaScript puro, sem dependências)
   ===================================================================== */

// ---------- utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const atrasar = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const ICONES = {
  inicio: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  livroAberto: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  alunos: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  aluno: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  equipe: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  historico: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  ajustes: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  editar: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  zap: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  devolver: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  renovar: '<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  salvar: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  codigo: '<path d="M3 5v14M7 5v14M11 5v14M16 5v14M21 5v14"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  ficha: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  imprimir: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  olho: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  seta: '<path d="M5 12h14M12 5l7 7-7 7"/>',
};
const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ''}</svg>`;

// ---------- datas ----------
const hojeISO = () => new Date().toLocaleDateString('sv-SE');
const somarDias = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
// Prazo em dias, mas nunca caindo em sábado/domingo (empurra para segunda)
const prazoLetivo = (iso, n) => { let r = somarDias(iso, n); const dia = new Date(r + 'T12:00:00').getDay(); if (dia === 6) r = somarDias(r, 2); if (dia === 0) r = somarDias(r, 1); return r; };
const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const dataCurta = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '');
const porExtenso = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const dataHoraBR = (s) => { if (!s) return ''; const [d, t] = s.split(' '); return `${dataBR(d)} às ${(t || '').slice(0, 5)}`; };

// ---------- telefone / WhatsApp ----------
function mascaraTel(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function linkWhats(e) {
  let n = String(e.telefone || '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 10 || n.length === 11) n = '55' + n;
  const atrasado = e.situacao === 'atrasado';
  const msg = atrasado
    ? `Olá, ${e.responsavel}! Aqui é da biblioteca da escola ${estado.escola}. O livro "${e.livro_titulo}" que ${e.aluno_nome} pegou emprestado deveria ter sido devolvido em ${dataBR(e.data_prevista)}. Pode pedir para trazer na próxima aula? Obrigado(a)!`
    : `Olá, ${e.responsavel}! Aqui é da biblioteca da escola ${estado.escola}. Lembrando que o livro "${e.livro_titulo}" que ${e.aluno_nome} pegou emprestado deve ser devolvido até ${dataBR(e.data_prevista)}. Obrigado(a)!`;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

// ---------- estado e API ----------
const estado = { escola: '', prazo: 7, usuario: null };

async function api(metodo, url, corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
    credentials: 'same-origin',
  });
  let dados = null;
  try { dados = await r.json(); } catch { /* sem corpo */ }
  if (r.status === 401 && !url.startsWith('/api/login')) { iniciar(); throw new Error(dados?.erro || 'Sessão expirada.'); }
  if (!r.ok) throw new Error(dados?.erro || 'Não foi possível concluir. Verifique se o sistema está ligado.');
  return dados;
}

function aviso(msg, tipo = 'ok', tempo = 4200) {
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.innerHTML = `${ico(tipo === 'erro' || tipo === 'alerta' ? 'alerta' : 'ok')}<span>${h(msg)}</span>`;
  $('#avisos').append(el);
  setTimeout(() => el.remove(), tempo);
}
const falha = (e) => aviso(e.message || String(e), 'erro', 6000);

// ---------- janelas ----------
function janela({ titulo, corpo, rodape = '', pequena = false, aoEnviar }) {
  const d = document.createElement('dialog');
  if (pequena) d.className = 'pequena';
  const miolo = `<div class="janela-corpo">${corpo}</div>${rodape ? `<div class="janela-rodape">${rodape}</div>` : ''}`;
  d.innerHTML = `<div class="janela-topo"><h2>${titulo}</h2>
      <button type="button" class="btn btn-texto btn-quadrado" data-fechar aria-label="Fechar">${ico('x')}</button></div>
    ${aoEnviar ? `<form novalidate>${miolo}</form>` : miolo}`;
  document.body.append(d);
  d.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  if (aoEnviar) {
    const f = $('form', d);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const faltando = $$('[required]', f).find((c) => !c.value.trim());
      $$('[aria-invalid]', f).forEach((c) => c.removeAttribute('aria-invalid'));
      if (faltando) { faltando.setAttribute('aria-invalid', 'true'); faltando.focus(); aviso(`Preencha o campo "${faltando.dataset.rotulo || 'obrigatório'}".`, 'alerta'); return; }
      const btn = $('[type=submit]', f);
      if (btn) btn.disabled = true;
      try { await aoEnviar(Object.fromEntries(new FormData(f)), d, f); }
      catch (e) { falha(e); }
      finally { if (btn) btn.disabled = false; }
    });
  }
  d.showModal();
  const primeiro = $('input:not([type=hidden]), textarea, select', d);
  if (primeiro) setTimeout(() => primeiro.focus(), 30);
  return d;
}

function confirmar({ titulo, texto, botao = 'Confirmar', classe = 'btn-primario' }) {
  return new Promise((resolve) => {
    let ok = false;
    const d = janela({
      titulo, pequena: true,
      corpo: `<p class="confirmar-texto">${texto}</p>`,
      rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="button" class="btn ${classe}" data-ok>${botao}</button>`,
    });
    const b = $('[data-ok]', d);
    b.onclick = () => { ok = true; d.close(); };
    d.addEventListener('close', () => resolve(ok));
    setTimeout(() => b.focus(), 40);
  });
}

function campo({ nome, rotulo, tipo = 'text', valor = '', obrigatorio, opcional, ajuda, inteiro, attrs = '', lista, opcoes }) {
  const id = 'c_' + nome;
  const req = obrigatorio ? `required data-rotulo="${h(rotulo)}"` : '';
  let entrada;
  if (tipo === 'textarea') entrada = `<textarea class="entrada" id="${id}" name="${nome}" ${req} ${attrs}>${h(valor)}</textarea>`;
  else if (tipo === 'select') entrada = `<select class="entrada" id="${id}" name="${nome}" ${req} ${attrs}>${opcoes.map(([v, t]) => `<option value="${h(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${h(t)}</option>`).join('')}</select>`;
  else entrada = `<input class="entrada" id="${id}" name="${nome}" type="${tipo}" value="${h(valor)}" ${req} ${lista ? `list="${id}_l"` : ''} ${attrs}>${lista ? `<datalist id="${id}_l">${lista.map((o) => `<option value="${h(o)}">`).join('')}</datalist>` : ''}`;
  return `<div class="campo ${inteiro ? 'inteiro' : ''}">
    <label for="${id}">${rotulo}${opcional ? ' <span class="opcional">(opcional)</span>' : ''}</label>
    ${entrada}${ajuda ? `<span class="ajuda">${ajuda}</span>` : ''}</div>`;
}

// ---------- etiquetas de situação ----------
function etqSituacao(e) {
  switch (e.situacao) {
    case 'atrasado': return `<span class="etq etq-vermelho">${ico('alerta')} Atrasado há ${plural(-e.faltam, 'dia', 'dias')}</span>`;
    case 'hoje': return `<span class="etq etq-amarelo">${ico('relogio')} Devolver hoje</span>`;
    case 'breve': return `<span class="etq etq-amarelo">${e.faltam === 1 ? 'Devolver amanhã' : `Faltam ${e.faltam} dias`}</span>`;
    case 'em_dia': return `<span class="etq etq-verde">Em dia · faltam ${e.faltam} dias</span>`;
    default: return `<span class="etq etq-cinza">${ico('ok')} Devolvido em ${dataBR(e.data_devolucao)}</span>`;
  }
}

function linhaEmprestimo(e, { simples = false } = {}) {
  const whats = linkWhats(e);
  const aberto = !e.data_devolucao;
  const emails = e.emails ? `<span>${ico('email')} ${plural(e.emails.n, 'lembrete enviado', 'lembretes enviados')}</span>` : '';
  const semEmail = aberto && !e.email ? '<span class="etq etq-cinza">sem e-mail</span>' : '';
  return `<div class="linha ${aberto ? e.situacao : ''}" data-id="${e.id}">
    <div class="linha-info">
      <div class="linha-titulo">${h(e.livro_titulo)}</div>
      <div class="linha-detalhe">
        <span>${ico('aluno')} <b>${h(e.aluno_nome)}</b> · ${h(e.sala)}</span>
        ${simples ? '' : `<span>Responsável: ${h(e.responsavel)}</span>`}
        ${!simples && e.telefone ? `<span>${ico('telefone')} ${h(e.telefone)}</span>` : ''}
      </div>
      <div class="linha-detalhe">
        <span>${ico('calendario')} Pegou em ${dataBR(e.data_emprestimo)}${!simples && e.emprestado_por ? ` (por ${h(e.emprestado_por.split(' ')[0])})` : ''} · devolver até <b>${dataBR(e.data_prevista)}</b></span>
        ${e.renovacoes ? `<span>${ico('renovar')} ${plural(e.renovacoes, 'renovação', 'renovações')}</span>` : ''}
        ${simples ? '' : emails}
      </div>
    </div>
    <div class="linha-acoes">
      ${etqSituacao(e)} ${simples ? '' : semEmail}
      ${aberto ? `<button class="btn btn-verde btn-p" data-acao="devolver">${ico('ok')} Devolvido</button>` : ''}
      ${aberto && !simples ? `<button class="btn btn-claro btn-p" data-acao="renovar">${ico('renovar')} Renovar</button>` : ''}
      ${aberto && whats ? `<a class="btn btn-claro btn-p" href="${whats}" target="_blank" rel="noopener" title="Enviar lembrete pelo WhatsApp">${ico('zap')} WhatsApp</a>` : ''}
      ${!aberto && !simples ? `<button class="btn btn-texto btn-p" data-acao="desfazer">${ico('devolver')} Desfazer devolução</button>` : ''}
      ${!simples ? `<button class="btn btn-texto perigo btn-p btn-quadrado" data-acao="apagar" title="Apagar registro (lançado por engano)" aria-label="Apagar registro">${ico('lixo')}</button>` : ''}
    </div>
  </div>`;
}

function janelaData({ titulo, texto, botao, inicial }) {
  return new Promise((resolve) => {
    let escolhida = null;
    const base = hojeISO();
    const opcoes = [[7, '1 semana'], [14, '2 semanas'], [21, '3 semanas'], [30, '1 mês']];
    const d = janela({
      titulo, pequena: true,
      corpo: `<p style="margin-top:0">${texto}</p>
        <div class="chips">${opcoes.map(([n, t]) => `<button type="button" class="chip" data-dias="${n}">${t}</button>`).join('')}</div>
        <div class="campo" style="margin-top:16px"><label for="nova_data">Ou escolha no calendário</label>
          <input class="entrada" type="date" id="nova_data" min="${base}" value="${inicial}"></div>
        <div class="data-grande" id="data_ext"></div>`,
      rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" data-ok>${ico('ok')} ${botao}</button>`,
    });
    const inp = $('#nova_data', d);
    const mostrar = () => { $('#data_ext', d).textContent = inp.value ? `Nova data: ${porExtenso(inp.value)}` : ''; };
    mostrar();
    inp.oninput = mostrar;
    $$('.chip', d).forEach((c) => (c.onclick = () => { inp.value = prazoLetivo(base, Number(c.dataset.dias)); mostrar(); }));
    $('[data-ok]', d).onclick = () => { if (!inp.value) return aviso('Escolha uma data.', 'alerta'); escolhida = inp.value; d.close(); };
    d.addEventListener('close', () => resolve(escolhida));
  });
}

// Ações compartilhadas para linhas de empréstimo
async function acaoEmprestimo(acao, e, recarregar) {
  try {
    if (acao === 'devolver') {
      if (!(await confirmar({ titulo: 'Confirmar devolução', texto: `O livro <b>"${h(e.livro_titulo)}"</b> foi devolvido por <b>${h(e.aluno_nome)}</b>?`, botao: 'Sim, foi devolvido', classe: 'btn-verde' }))) return;
      await api('POST', `/api/emprestimos/${e.id}/devolver`);
      aviso('Devolução registrada! 📚');
    } else if (acao === 'renovar') {
      const nova = await janelaData({ titulo: 'Renovar empréstimo', texto: `Até quando <b>${h(e.aluno_nome)}</b> pode ficar com <b>"${h(e.livro_titulo)}"</b>?`, botao: 'Renovar', inicial: prazoLetivo(hojeISO() > e.data_prevista ? hojeISO() : e.data_prevista, 7) });
      if (!nova) return;
      await api('POST', `/api/emprestimos/${e.id}/renovar`, { data_prevista: nova });
      aviso(`Prazo renovado para ${dataBR(nova)}.`);
    } else if (acao === 'desfazer') {
      if (!(await confirmar({ titulo: 'Desfazer devolução', texto: `Marcar <b>"${h(e.livro_titulo)}"</b> como ainda emprestado com ${h(e.aluno_nome)}?`, botao: 'Desfazer' }))) return;
      await api('POST', `/api/emprestimos/${e.id}/desfazer-devolucao`);
      aviso('Devolução desfeita.');
    } else if (acao === 'apagar') {
      if (!(await confirmar({ titulo: 'Apagar registro', texto: `Use apenas se o empréstimo foi lançado <b>por engano</b>.<br><br>Apagar o registro de <b>"${h(e.livro_titulo)}"</b> — ${h(e.aluno_nome)}?`, botao: 'Apagar', classe: 'btn-perigo' }))) return;
      await api('DELETE', `/api/emprestimos/${e.id}`);
      aviso('Registro apagado.');
    }
    await recarregar();
    atualizarContador();
  } catch (err) { falha(err); }
}

function ligarLinhas(area, mapa, recarregar) {
  area._emp = { mapa, recarregar };
  if (area._ligado) return; // liga o clique uma única vez, mesmo recarregando a tela
  area._ligado = true;
  area.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-acao]');
    const linha = ev.target.closest('.linha[data-id]');
    const { mapa: m, recarregar: r } = area._emp;
    if (!b || !linha || !m.has(Number(linha.dataset.id))) return;
    acaoEmprestimo(b.dataset.acao, m.get(Number(linha.dataset.id)), r);
  });
}

const vazio = (icone, titulo, texto = '') => `<div class="vazio">${ico(icone)}<p><b>${titulo}</b></p>${texto ? `<p>${texto}</p>` : ''}</div>`;

// =====================================================================
// PÁGINAS
// =====================================================================

// ---------- Início ----------
async function pgInicio(area) {
  const d = await api('GET', '/api/painel');
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const t = d.totais;
  const mapa = new Map([...d.atrasados, ...d.proximos].map((e) => [e.id, e]));
  area.innerHTML = `
    <div class="cabecalho"><div><h1>${saudacao}! 👋</h1><p>Hoje é ${porExtenso(d.hoje)}.</p></div></div>
    <div class="atalhos">
      <a class="atalho azul" href="#/emprestar">${ico('livroAberto')}<span>Emprestar livro<small>Registrar um livro que o aluno vai levar</small></span></a>
      <a class="atalho verde" href="#/emprestimos">${ico('devolver')}<span>Receber devolução<small>Dar baixa em um livro que voltou</small></span></a>
    </div>
    <div class="numeros">
      <a class="numero" href="#/emprestimos"><b>${t.emprestados}</b><span>Livros emprestados</span></a>
      <a class="numero ${t.atrasados ? 'alerta' : ''}" href="#/emprestimos?situacao=atrasados"><b>${t.atrasados}</b><span>Em atraso</span></a>
      <a class="numero" href="#/emprestimos?situacao=hoje"><b>${t.vencemHoje}</b><span>Devolver hoje</span></a>
      <a class="numero" href="#/livros"><b>${t.exemplares}</b><span>Livros no acervo</span></a>
    </div>
    ${t.titulos === 0 || t.alunos === 0 ? `
    <div class="cartao" style="margin-bottom:20px">
      <h2>${ico('info')} Primeiros passos</h2>
      <p class="sub">Para começar a usar a biblioteca:</p>
      <div class="acoes">
        <a class="btn ${t.titulos ? 'btn-claro' : 'btn-primario'}" href="#/livros">${t.titulos ? ico('ok') : '1.'} Cadastrar os livros</a>
        <a class="btn ${t.alunos ? 'btn-claro' : t.titulos ? 'btn-primario' : 'btn-claro'}" href="#/alunos">${t.alunos ? ico('ok') : '2.'} Cadastrar os alunos</a>
        <a class="btn btn-claro" href="#/configuracoes">3. Configurar os e-mails</a>
      </div>
    </div>` : ''}
    <div class="duas-colunas">
      <div class="cartao">
        <h2>${ico('alerta')} Atrasados</h2><p class="sub">Livros que já passaram da data de devolução.</p>
        <div class="lista">${d.atrasados.length ? d.atrasados.map((e) => linhaEmprestimo(e, { simples: true })).join('') : vazio('ok', 'Nenhum livro atrasado!', 'Que beleza. 🎉')}</div>
      </div>
      <div class="cartao">
        <h2>${ico('calendario')} Próximos 7 dias</h2><p class="sub">Livros que devem voltar em breve.</p>
        <div class="lista">${d.proximos.length ? d.proximos.map((e) => linhaEmprestimo(e, { simples: true })).join('') : vazio('calendario', 'Nada vence nesta semana.')}</div>
      </div>
    </div>
    ${d.maisLidos.length ? `<div class="cartao"><h2>${ico('livro')} Livros mais emprestados</h2>
      <div class="chips" style="margin-top:12px">${d.maisLidos.map((l) => `<span class="etq etq-azul">${h(l.titulo)} · ${l.n}×</span>`).join('')}</div></div>` : ''}`;
  ligarLinhas(area, mapa, () => pgInicio(area));
}

// ---------- Emprestar ----------
async function pgEmprestar(area, params) {
  const st = { aluno: null, livro: null, data: prazoLetivo(hojeISO(), estado.prazo), obs: '' };
  if (params.aluno) { try { st.aluno = await api('GET', `/api/alunos/${params.aluno}`); } catch { /* ignora */ } }

  area.innerHTML = `
    <div class="cabecalho"><div><h1>Emprestar livro</h1><p>Siga os 3 passos abaixo.</p></div></div>
    <div class="cartao"><div class="passo" id="p1"></div></div>
    <div class="cartao"><div class="passo" id="p2"></div></div>
    <div class="cartao"><div class="passo" id="p3"></div></div>
    <div class="barra-final"><button class="btn btn-primario btn-g" id="confirmar" disabled>${ico('ok')} Confirmar empréstimo</button></div>`;

  const atualizarBotao = () => { $('#confirmar', area).disabled = !(st.aluno && st.livro && st.data); };

  function passoBusca({ alvo, num, titulo, placeholder, novoTexto, buscar, desenhar, escolher, escolhido, novo }) {
    const el = $(alvo, area);
    if (escolhido()) {
      el.classList.add('feito');
      el.innerHTML = `<div class="passo-num">${ico('ok')}</div><div><h2>${titulo}</h2>
        <div class="escolhido">${escolhido()}<button class="btn btn-claro btn-p" data-trocar>Trocar</button></div></div>`;
      $('[data-trocar]', el).onclick = () => { escolher(null); };
      return;
    }
    el.classList.remove('feito');
    el.innerHTML = `<div class="passo-num">${num}</div><div><h2>${titulo}</h2>
      <div class="com-botao"><div class="busca">${ico('busca')}<input class="entrada" type="search" placeholder="${placeholder}" aria-label="${placeholder}"></div>
      <button class="btn btn-claro" data-novo>${ico('mais')} ${novoTexto}</button></div>
      <div class="resultados"></div></div>`;
    const inp = $('input', el);
    const res = $('.resultados', el);
    const carregar = async () => {
      try {
        const lista = await buscar(inp.value.trim());
        res.innerHTML = lista.length ? lista.map(desenhar).join('') : vazio('busca', 'Nada encontrado.', 'Confira a escrita ou cadastre um novo.');
        $$('.opcao', res).forEach((b, i) => (b.onclick = () => escolher(lista[i])));
      } catch (e) { falha(e); }
    };
    inp.oninput = atrasar(carregar);
    $('[data-novo]', el).onclick = () => novo((criado) => escolher(criado));
    carregar();
  }

  function desenharAluno() {
    passoBusca({
      alvo: '#p1', num: 1, titulo: 'Quem vai levar o livro?', placeholder: 'Digite o nome do aluno ou do responsável', novoTexto: 'Aluno novo',
      buscar: (q) => api('GET', `/api/alunos?q=${encodeURIComponent(q)}`).then((l) => l.slice(0, 40)),
      desenhar: (a) => `<button class="opcao">${ico('aluno')}<span class="linha-info"><span class="linha-titulo">${h(a.nome)}</span>
          <span class="linha-detalhe"><span>${h(a.sala)}</span><span>Responsável: ${h(a.responsavel)}</span></span></span>
          ${a.atrasados ? `<span class="etq etq-vermelho">${plural(a.atrasados, 'atrasado', 'atrasados')}</span>` : a.com_livros ? `<span class="etq etq-azul">com ${plural(a.com_livros, 'livro', 'livros')}</span>` : ''}</button>`,
      escolhido: () => st.aluno && `<span class="linha-info"><span class="linha-titulo">${h(st.aluno.nome)} · ${h(st.aluno.sala)}</span>
          <span class="linha-detalhe"><span>Responsável: ${h(st.aluno.responsavel)}</span>${st.aluno.telefone ? `<span>${h(st.aluno.telefone)}</span>` : ''}
          ${st.aluno.email ? '' : '<span class="etq etq-cinza">sem e-mail para lembretes</span>'}
          ${st.aluno.atrasados ? `<span class="etq etq-vermelho">${ico('alerta')} tem livro atrasado</span>` : ''}</span></span>`,
      escolher: (a) => { st.aluno = a; desenharAluno(); atualizarBotao(); if (a && !st.livro) setTimeout(() => $('#p2 input', area)?.focus(), 30); },
      novo: (pronto) => formAluno(null, pronto),
    });
  }
  function desenharLivro() {
    passoBusca({
      alvo: '#p2', num: 2, titulo: 'Qual livro?', placeholder: 'Digite o título, autor ou ISBN', novoTexto: 'Livro novo',
      buscar: (q) => api('GET', `/api/livros?q=${encodeURIComponent(q)}`).then((l) => l.slice(0, 40)),
      desenhar: (l) => {
        const disp = l.quantidade - l.emprestados;
        return `<button class="opcao" ${disp <= 0 ? 'disabled' : ''}>${ico('livro')}<span class="linha-info"><span class="linha-titulo">${h(l.titulo)}</span>
          <span class="linha-detalhe">${l.autor ? `<span>${h(l.autor)}</span>` : ''}${l.localizacao ? `<span>Estante: ${h(l.localizacao)}</span>` : ''}</span></span>
          ${disp > 0 ? `<span class="etq etq-verde">${plural(disp, 'disponível', 'disponíveis')}</span>` : '<span class="etq etq-vermelho">todos emprestados</span>'}</button>`;
      },
      escolhido: () => st.livro && `<span class="linha-info"><span class="linha-titulo">${h(st.livro.titulo)}</span>
          <span class="linha-detalhe">${st.livro.autor ? `<span>${h(st.livro.autor)}</span>` : ''}</span></span>`,
      escolher: (l) => { st.livro = l; desenharLivro(); atualizarBotao(); },
      novo: (pronto) => formLivro(null, async (id) => { const l = (await api('GET', '/api/livros')).find((x) => x.id === id); pronto(l); }),
    });
  }
  function desenharData() {
    const el = $('#p3', area);
    const base = hojeISO();
    const opcoes = [[7, '1 semana'], [14, '2 semanas'], [21, '3 semanas'], [30, '1 mês']];
    el.innerHTML = `<div class="passo-num">3</div><div><h2>Até quando pode ficar com o livro?</h2>
      <div class="chips">${opcoes.map(([n, t]) => `<button type="button" class="chip" data-dias="${n}" aria-pressed="${prazoLetivo(base, n) === st.data}">${t}</button>`).join('')}</div>
      <div class="campos" style="margin-top:16px">
        <div class="campo"><label for="data_dev">Data de devolução</label><input class="entrada" type="date" id="data_dev" min="${base}" value="${st.data}"></div>
        <div class="campo"><label for="obs">Observação <span class="opcional">(opcional)</span></label><input class="entrada" id="obs" placeholder="Ex.: livro com capa rasgada" value="${h(st.obs)}"></div>
      </div>
      <div class="data-grande">${st.data ? `${ico('calendario')} Devolver ${porExtenso(st.data)}` : ''}</div></div>`;
    $$('.chip', el).forEach((c) => (c.onclick = () => { st.data = prazoLetivo(base, Number(c.dataset.dias)); desenharData(); atualizarBotao(); }));
    $('#data_dev', el).onchange = (ev) => { st.data = ev.target.value; desenharData(); atualizarBotao(); };
    $('#obs', el).oninput = (ev) => { st.obs = ev.target.value; };
  }

  desenharAluno(); desenharLivro(); desenharData(); atualizarBotao();

  $('#confirmar', area).onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    try {
      const r = await api('POST', '/api/emprestimos', { aluno_id: st.aluno.id, livro_id: st.livro.id, data_prevista: st.data, observacao: st.obs });
      if (r.aviso) aviso(r.aviso, 'alerta', 7000);
      area.innerHTML = `<div class="cartao sucesso">
        <div class="circulo">${ico('ok')}</div>
        <h2>Empréstimo registrado!</h2>
        <p style="font-size:1.15rem"><b>"${h(st.livro.titulo)}"</b> com <b>${h(st.aluno.nome)}</b> (${h(st.aluno.sala)}).</p>
        <p class="data-grande">Devolver ${porExtenso(st.data)}</p>
        ${st.aluno.email ? `<p style="color:var(--texto-suave)">${ico('email')} O responsável receberá lembretes por e-mail.</p>` : ''}
        <div class="acoes" style="justify-content:center;margin-top:24px">
          <a class="btn btn-primario btn-g" href="#/emprestar?novo=${Date.now()}">${ico('mais')} Novo empréstimo</a>
          <a class="btn btn-claro btn-g" href="#/inicio">${ico('inicio')} Voltar ao início</a>
        </div></div>`;
      atualizarContador();
    } catch (e) { falha(e); atualizarBotao(); }
  };
}

// ---------- Empréstimos / devoluções ----------
async function pgEmprestimos(area, params) {
  const f = { situacao: params.situacao || 'abertos', q: params.q || '', sala: '' };
  const [painel, salas] = await Promise.all([api('GET', '/api/painel'), api('GET', '/api/salas')]);
  const t = painel.totais;
  const abas = [['abertos', 'Em aberto', t.emprestados], ['atrasados', 'Atrasados', t.atrasados], ['hoje', 'Devolver hoje', t.vencemHoje], ['devolvidos', 'Devolvidos', null]];
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Empréstimos e devoluções</h1><p>Clique em <b>Devolvido</b> quando o livro voltar para a biblioteca.</p></div>
      <div class="acoes"><a class="btn btn-primario" href="#/emprestar">${ico('mais')} Emprestar livro</a></div></div>
    <div class="abas" role="group" aria-label="Filtrar">${abas.map(([v, txt, n]) => `<button class="aba" data-sit="${v}" aria-pressed="${f.situacao === v}">${txt}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}</div>
    <div class="filtros">
      <div class="busca">${ico('busca')}<input class="entrada" type="search" id="q" placeholder="Buscar por aluno, livro ou responsável" value="${h(f.q)}"></div>
      <select class="entrada" id="sala" aria-label="Sala"><option value="">Todas as salas</option>${salas.map((s) => `<option>${h(s)}</option>`).join('')}</select>
    </div>
    <div class="lista" id="lista"><div class="carregando">Carregando…</div></div>`;
  const mapa = new Map();
  const carregar = async () => {
    const lista = await api('GET', `/api/emprestimos?situacao=${f.situacao}&q=${encodeURIComponent(f.q)}&sala=${encodeURIComponent(f.sala)}`);
    mapa.clear(); lista.forEach((e) => mapa.set(e.id, e));
    const msgVazio = { abertos: ['livroAberto', 'Nenhum livro emprestado no momento.'], atrasados: ['ok', 'Nenhum livro atrasado! 🎉'], hoje: ['calendario', 'Nenhum livro para devolver hoje.'], devolvidos: ['historico', 'Nenhuma devolução encontrada.'] }[f.situacao];
    $('#lista', area).innerHTML = lista.length ? lista.map((e) => linhaEmprestimo(e)).join('') : vazio(...msgVazio);
  };
  $$('.aba', area).forEach((b) => (b.onclick = () => { f.situacao = b.dataset.sit; $$('.aba', area).forEach((x) => x.setAttribute('aria-pressed', x === b)); carregar().catch(falha); }));
  $('#q', area).oninput = atrasar((ev) => { f.q = ev.target.value; carregar().catch(falha); });
  $('#sala', area).onchange = (ev) => { f.sala = ev.target.value; carregar().catch(falha); };
  ligarLinhas(area, mapa, carregar);
  await carregar();
}

// ---------- Livros ----------
async function formLivro(livro, depois) {
  const cats = await api('GET', '/api/categorias').catch(() => []);
  const l = livro || { quantidade: 1 };
  const d = janela({
    titulo: livro ? 'Editar livro' : 'Cadastrar livro',
    corpo: `<div class="campos">
      <div class="campo inteiro"><label for="c_isbn">Código ISBN <span class="opcional">(opcional)</span></label>
        <div class="com-botao"><input class="entrada" id="c_isbn" name="isbn" inputmode="numeric" value="${h(l.isbn || '')}" placeholder="Ex.: 9788535914849">
        <button type="button" class="btn btn-claro" data-isbn>${ico('busca')} Buscar dados</button></div>
        <span class="ajuda">Fica no verso do livro, perto do código de barras. Se tiver internet, o sistema preenche o título e o autor sozinho.</span></div>
      ${campo({ nome: 'titulo', rotulo: 'Título do livro', valor: l.titulo, obrigatorio: true, inteiro: true })}
      ${campo({ nome: 'autor', rotulo: 'Autor', valor: l.autor, opcional: true })}
      ${campo({ nome: 'categoria', rotulo: 'Categoria', valor: l.categoria, opcional: true, lista: cats.length ? cats : ['Literatura infantil', 'Contos', 'Poesia', 'Didático', 'Gibi', 'Ciências'], attrs: 'placeholder="Ex.: Literatura infantil"' })}
      ${campo({ nome: 'editora', rotulo: 'Editora', valor: l.editora, opcional: true })}
      ${campo({ nome: 'localizacao', rotulo: 'Estante / prateleira', valor: l.localizacao, opcional: true, attrs: 'placeholder="Ex.: Estante 2"' })}
      <div class="campo"><label for="c_qtd">Quantos exemplares?</label>
        <div><span class="passo-qtd"><button type="button" data-q="-1" aria-label="Diminuir">${ico('menos')}</button>
        <input id="c_qtd" name="quantidade" type="number" min="${livro ? livro.emprestados : 1}" max="999" value="${l.quantidade}" inputmode="numeric">
        <button type="button" data-q="1" aria-label="Aumentar">${ico('mais')}</button></span></div></div>
    </div>`,
    rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">${ico('salvar')} Salvar livro</button>`,
    aoEnviar: async (dados, dlg) => {
      if (livro) { await api('PUT', `/api/livros/${livro.id}`, dados); aviso('Livro atualizado.'); dlg.close(); depois && depois(livro.id); }
      else { const r = await api('POST', '/api/livros', dados); aviso('Livro cadastrado!'); dlg.close(); depois && depois(r.id); }
    },
  });
  const qtd = $('#c_qtd', d);
  $$('[data-q]', d).forEach((b) => (b.onclick = () => { qtd.value = Math.max(Number(qtd.min) || 0, (Number(qtd.value) || 0) + Number(b.dataset.q)); }));
  $('[data-isbn]', d).onclick = async (ev) => {
    const b = ev.currentTarget; b.disabled = true;
    try {
      const r = await api('GET', `/api/isbn/${encodeURIComponent($('#c_isbn', d).value)}`);
      for (const [k, v] of [['titulo', r.titulo], ['autor', r.autor], ['editora', r.editora]]) { const c = $(`[name=${k}]`, d); if (v && !c.value) c.value = v; }
      aviso('Dados encontrados! Confira antes de salvar.');
    } catch (e) { falha(e); } finally { b.disabled = false; }
  };
}

async function pgLivros(area) {
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Livros</h1><p>O acervo da biblioteca.</p></div>
      <div class="acoes"><a class="btn btn-claro" href="/api/exportar/livros">${ico('baixar')} Baixar planilha</a>
      <button class="btn btn-primario" id="novo">${ico('mais')} Cadastrar livro</button></div></div>
    <div class="filtros"><div class="busca">${ico('busca')}<input class="entrada" type="search" id="q" placeholder="Buscar por título, autor, categoria ou ISBN"></div>
      <label class="interruptor"><input type="checkbox" id="disp"> Só disponíveis</label></div>
    <div class="lista" id="lista"><div class="carregando">Carregando…</div></div>`;
  let livros = [];
  const carregar = async () => {
    livros = await api('GET', `/api/livros?q=${encodeURIComponent($('#q', area).value)}&disponiveis=${$('#disp', area).checked ? 1 : 0}`);
    $('#lista', area).innerHTML = livros.length ? livros.map((l) => {
      const disp = l.quantidade - l.emprestados;
      return `<div class="linha" data-id="${l.id}">
        <div class="linha-info"><div class="linha-titulo">${h(l.titulo)}</div>
          <div class="linha-detalhe">${l.autor ? `<span>${h(l.autor)}</span>` : ''}${l.categoria ? `<span>${h(l.categoria)}</span>` : ''}
          ${l.localizacao ? `<span>Estante: ${h(l.localizacao)}</span>` : ''}${l.isbn ? `<span>${ico('codigo')} ${h(l.isbn)}</span>` : ''}</div>
          <div style="margin-top:6px">${disp > 0 ? `<span class="etq etq-verde">${disp} de ${l.quantidade} ${disp === 1 ? 'disponível' : 'disponíveis'}</span>` : `<span class="etq etq-vermelho">Todos os ${l.quantidade} emprestados</span>`}</div></div>
        <div class="linha-acoes">
          <span class="passo-qtd" title="Exemplares"><button data-acao="menos" aria-label="Retirar um exemplar">${ico('menos')}</button><b>${l.quantidade}</b><button data-acao="mais" aria-label="Acrescentar um exemplar">${ico('mais')}</button></span>
          <button class="btn btn-claro btn-p" data-acao="editar">${ico('editar')} Editar</button>
          <button class="btn btn-texto perigo btn-p" data-acao="remover">${ico('lixo')} Remover</button>
        </div></div>`;
    }).join('') : vazio('livro', $('#q', area).value ? 'Nenhum livro encontrado.' : 'Nenhum livro cadastrado ainda.', 'Clique em “Cadastrar livro” para começar.');
  };
  $('#novo', area).onclick = () => formLivro(null, () => carregar().catch(falha));
  $('#q', area).oninput = atrasar(() => carregar().catch(falha));
  $('#disp', area).onchange = () => carregar().catch(falha);
  area.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]'); const linha = ev.target.closest('.linha[data-id]');
    if (!b || !linha) return;
    const l = livros.find((x) => x.id === Number(linha.dataset.id));
    try {
      if (b.dataset.acao === 'editar') return formLivro(l, () => carregar().catch(falha));
      if (b.dataset.acao === 'mais' || b.dataset.acao === 'menos') {
        const r = await api('POST', `/api/livros/${l.id}/quantidade`, { delta: b.dataset.acao === 'mais' ? 1 : -1 });
        aviso(`"${l.titulo}": agora são ${r.quantidade} exemplar(es).`);
      }
      if (b.dataset.acao === 'remover') {
        if (!(await confirmar({ titulo: 'Remover livro', texto: `Remover <b>"${h(l.titulo)}"</b> do acervo?<br><br>O histórico de empréstimos dele continua guardado.`, botao: 'Remover', classe: 'btn-perigo' }))) return;
        await api('DELETE', `/api/livros/${l.id}`); aviso('Livro removido.');
      }
      await carregar();
    } catch (e) { falha(e); }
  });
  await carregar();
}

// ---------- Alunos ----------
async function formAluno(aluno, depois) {
  const salas = await api('GET', '/api/salas').catch(() => []);
  const a = aluno || {};
  const d = janela({
    titulo: aluno ? 'Editar aluno' : 'Cadastrar aluno',
    corpo: `<div class="campos">
      ${campo({ nome: 'nome', rotulo: 'Nome do aluno', valor: a.nome, obrigatorio: true, inteiro: true, attrs: 'autocomplete="off"' })}
      ${campo({ nome: 'sala', rotulo: 'Sala / turma', valor: a.sala, obrigatorio: true, lista: salas, attrs: 'placeholder="Ex.: 3º ano A" autocomplete="off"' })}
      ${campo({ nome: 'turno', rotulo: 'Turno', valor: a.turno || '', tipo: 'select', opcional: true, opcoes: [['', '—'], ['Manhã', 'Manhã'], ['Tarde', 'Tarde'], ['Integral', 'Integral']] })}
      ${campo({ nome: 'responsavel', rotulo: 'Nome do responsável', valor: a.responsavel, obrigatorio: true, inteiro: true, attrs: 'autocomplete="off"' })}
      ${campo({ nome: 'telefone', rotulo: 'Telefone / WhatsApp', valor: a.telefone, tipo: 'tel', attrs: 'placeholder="(91) 98888-7777" inputmode="tel"' })}
      ${campo({ nome: 'email', rotulo: 'E-mail do responsável', valor: a.email, tipo: 'email', ajuda: 'Usado para os lembretes automáticos de devolução.', attrs: 'placeholder="nome@email.com"' })}
      ${campo({ nome: 'endereco', rotulo: 'Endereço', valor: a.endereco, inteiro: true, opcional: true, attrs: 'placeholder="Rua, número, bairro"' })}
      ${campo({ nome: 'observacoes', rotulo: 'Observações', valor: a.observacoes, inteiro: true, opcional: true, tipo: 'textarea', attrs: 'rows="2" style="min-height:80px"' })}
    </div>`,
    rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">${ico('salvar')} Salvar aluno</button>`,
    aoEnviar: async (dados, dlg) => {
      if (aluno) { await api('PUT', `/api/alunos/${aluno.id}`, dados); aviso('Cadastro atualizado.'); dlg.close(); depois && depois(); }
      else {
        const r = await api('POST', '/api/alunos', dados);
        aviso('Aluno cadastrado!'); dlg.close();
        if (depois) depois(await api('GET', `/api/alunos/${r.id}`));
      }
    },
  });
  const tel = $('[name=telefone]', d);
  tel.oninput = () => { tel.value = mascaraTel(tel.value); };
}

async function fichaAluno(id) {
  const a = await api('GET', `/api/alunos/${id}`);
  const d = janela({
    titulo: h(a.nome),
    corpo: `<div class="campos" style="margin-bottom:20px">
        <div><div class="rotulo">Sala</div>${h(a.sala)}${a.turno ? ` · ${h(a.turno)}` : ''}</div>
        <div><div class="rotulo">Responsável</div>${h(a.responsavel)}</div>
        <div><div class="rotulo">Telefone</div>${h(a.telefone || '—')}</div>
        <div><div class="rotulo">E-mail</div>${h(a.email || '—')}</div>
        <div class="campo inteiro"><div class="rotulo">Endereço</div>${h(a.endereco || '—')}</div>
        ${a.observacoes ? `<div class="campo inteiro"><div class="rotulo">Observações</div>${h(a.observacoes)}</div>` : ''}
      </div>
      <h3 style="margin-bottom:12px">Livros que já pegou (${a.emprestimos.length})</h3>
      ${a.emprestimos.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Livro</th><th>Pegou</th><th>Devolver até</th><th>Situação</th></tr></thead><tbody>
        ${a.emprestimos.map((e) => `<tr><td>${h(e.livro_titulo)}</td><td>${dataBR(e.data_emprestimo)}</td><td>${dataBR(e.data_prevista)}</td><td>${etqSituacao(e)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p>Ainda não pegou nenhum livro.</p>'}`,
    rodape: `<button type="button" class="btn btn-claro" data-fechar>Fechar</button><a class="btn btn-primario" href="#/emprestar?aluno=${a.id}">${ico('livroAberto')} Emprestar livro</a>`,
  });
  $('a.btn-primario', d).addEventListener('click', () => d.close());
}

async function pgAlunos(area) {
  const salas = await api('GET', '/api/salas');
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Alunos</h1><p>Alunos e seus responsáveis.</p></div>
      <div class="acoes"><a class="btn btn-claro" href="/api/exportar/alunos">${ico('baixar')} Baixar planilha</a>
      <button class="btn btn-primario" id="novo">${ico('mais')} Cadastrar aluno</button></div></div>
    <div class="filtros"><div class="busca">${ico('busca')}<input class="entrada" type="search" id="q" placeholder="Buscar pelo nome do aluno ou do responsável"></div>
      <select class="entrada" id="sala" aria-label="Sala"><option value="">Todas as salas</option>${salas.map((s) => `<option>${h(s)}</option>`).join('')}</select></div>
    <div class="lista" id="lista"><div class="carregando">Carregando…</div></div>`;
  let alunos = [];
  const carregar = async () => {
    alunos = await api('GET', `/api/alunos?q=${encodeURIComponent($('#q', area).value)}&sala=${encodeURIComponent($('#sala', area).value)}`);
    $('#lista', area).innerHTML = alunos.length ? alunos.map((a) => `<div class="linha" data-id="${a.id}">
        <div class="linha-info"><div class="linha-titulo">${h(a.nome)}</div>
          <div class="linha-detalhe"><span>${h(a.sala)}${a.turno ? ` · ${h(a.turno)}` : ''}</span><span>Responsável: <b>${h(a.responsavel)}</b></span>
          ${a.telefone ? `<span>${ico('telefone')} ${h(a.telefone)}</span>` : ''}
          ${a.email ? `<span>${ico('email')} ${h(a.email)}</span>` : '<span class="etq etq-cinza">sem e-mail</span>'}</div>
          ${a.com_livros || a.atrasados ? `<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
            ${a.com_livros ? `<span class="etq etq-azul">Com ${plural(a.com_livros, 'livro', 'livros')}</span>` : ''}
            ${a.atrasados ? `<span class="etq etq-vermelho">${ico('alerta')} ${plural(a.atrasados, 'atrasado', 'atrasados')}</span>` : ''}</div>` : ''}</div>
        <div class="linha-acoes">
          <a class="btn btn-primario btn-p" href="#/emprestar?aluno=${a.id}">${ico('livroAberto')} Emprestar</a>
          <button class="btn btn-claro btn-p" data-acao="ficha">${ico('ficha')} Ficha</button>
          <button class="btn btn-claro btn-p" data-acao="editar">${ico('editar')} Editar</button>
          <button class="btn btn-texto perigo btn-p btn-quadrado" data-acao="remover" title="Remover aluno" aria-label="Remover aluno">${ico('lixo')}</button>
        </div></div>`).join('') : vazio('alunos', $('#q', area).value || $('#sala', area).value ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado ainda.', 'Clique em “Cadastrar aluno” para começar.');
  };
  $('#novo', area).onclick = () => formAluno(null, () => carregar().catch(falha));
  $('#q', area).oninput = atrasar(() => carregar().catch(falha));
  $('#sala', area).onchange = () => carregar().catch(falha);
  area.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]'); const linha = ev.target.closest('.linha[data-id]');
    if (!b || !linha) return;
    const a = alunos.find((x) => x.id === Number(linha.dataset.id));
    try {
      if (b.dataset.acao === 'ficha') return fichaAluno(a.id);
      if (b.dataset.acao === 'editar') return formAluno(a, () => carregar().catch(falha));
      if (b.dataset.acao === 'remover') {
        if (!(await confirmar({ titulo: 'Remover aluno', texto: `Remover <b>${h(a.nome)}</b> (${h(a.sala)})?<br><br>O histórico de empréstimos continua guardado.`, botao: 'Remover', classe: 'btn-perigo' }))) return;
        await api('DELETE', `/api/alunos/${a.id}`); aviso('Aluno removido.'); await carregar();
      }
    } catch (e) { falha(e); }
  });
  await carregar();
}

// ---------- Histórico ----------
const TIPOS_EMAIL = { antes: 'Aviso antecipado', no_dia: 'No dia da devolução', atraso: 'Atraso', teste: 'Teste' };
const nomeTipoEmail = (t) => t.endsWith('_anterior') ? `${TIPOS_EMAIL[t.replace('_anterior', '')] || t} (prazo antigo)` : (TIPOS_EMAIL[t] || t);
const TIPOS_ATIV = { emprestimo: ['Empréstimo', 'azul'], devolucao: ['Devolução', 'verde'], livro: ['Livro', 'amarelo'], aluno: ['Aluno', 'cinza'], email: ['E-mail', 'azul'], equipe: ['Equipe', 'verde'], sistema: ['Sistema', 'cinza'] };

async function pgHistorico(area, params) {
  let aba = params.aba || 'emprestimos';
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Histórico</h1><p>Tudo o que aconteceu na biblioteca.</p></div>
      <div class="acoes"><button class="btn btn-claro" onclick="window.print()">${ico('imprimir')} Imprimir</button></div></div>
    <div class="abas">${[['emprestimos', 'Empréstimos'], ['atividades', 'Atividades'], ['emails', 'E-mails enviados']].map(([v, t]) => `<button class="aba" data-aba="${v}" aria-pressed="${aba === v}">${t}</button>`).join('')}</div>
    <div id="corpo"></div>`;
  const corpo = $('#corpo', area);

  async function emprestimos() {
    corpo.innerHTML = `<div class="filtros">
        <div class="busca">${ico('busca')}<input class="entrada" type="search" id="q" placeholder="Aluno, livro ou responsável"></div>
        <select class="entrada" id="sit" aria-label="Situação"><option value="todos">Todos</option><option value="abertos">Em aberto</option><option value="devolvidos">Devolvidos</option><option value="atrasados">Atrasados</option></select>
        <label class="frase-campo">De <input class="entrada" type="date" id="de"></label>
        <label class="frase-campo">até <input class="entrada" type="date" id="ate"></label>
        <a class="btn btn-claro" href="/api/exportar/emprestimos">${ico('baixar')} Planilha</a></div>
      <div class="cartao" style="padding:0"><div class="tabela-wrap" id="tab"></div></div>`;
    const carregar = async () => {
      const qs = new URLSearchParams({ situacao: $('#sit', corpo).value, q: $('#q', corpo).value, de: $('#de', corpo).value, ate: $('#ate', corpo).value });
      const l = await api('GET', `/api/emprestimos?${qs}`);
      $('#tab', corpo).innerHTML = l.length ? `<table class="tabela"><thead><tr><th>Livro</th><th>Aluno</th><th>Sala</th><th>Pegou</th><th>Devolver até</th><th>Situação</th><th>Registrado por</th></tr></thead><tbody>
        ${l.map((e) => `<tr><td><b>${h(e.livro_titulo)}</b></td><td>${h(e.aluno_nome)}<br><small>${h(e.responsavel)}</small></td><td>${h(e.sala)}</td><td>${dataBR(e.data_emprestimo)}</td><td>${dataBR(e.data_prevista)}</td><td>${etqSituacao(e)}</td><td>${h(e.emprestado_por || '—')}${e.devolvido_por ? `<br><small>recebido por ${h(e.devolvido_por)}</small>` : ''}</td></tr>`).join('')}
        </tbody></table><p style="padding:0 16px;color:var(--texto-suave)">${plural(l.length, 'registro', 'registros')}</p>` : vazio('historico', 'Nenhum registro encontrado.');
    };
    $('#q', corpo).oninput = atrasar(() => carregar().catch(falha));
    $$('#sit, #de, #ate', corpo).forEach((c) => (c.onchange = () => carregar().catch(falha)));
    await carregar();
  }
  async function atividades() {
    const l = await api('GET', '/api/atividades');
    corpo.innerHTML = `<div class="cartao" style="padding:0"><div class="tabela-wrap">${l.length ? `<table class="tabela"><thead><tr><th style="width:190px">Quando</th><th style="width:140px">Tipo</th><th>O que aconteceu</th><th>Quem</th></tr></thead><tbody>
      ${l.map((a) => { const [n, c] = TIPOS_ATIV[a.tipo] || [a.tipo, 'cinza']; return `<tr><td>${dataHoraBR(a.criado_em)}</td><td><span class="etq etq-${c}">${n}</span></td><td>${h(a.descricao)}</td><td>${h(a.usuario || '—')}</td></tr>`; }).join('')}
      </tbody></table>` : vazio('historico', 'Nada registrado ainda.')}</div></div>`;
  }
  async function emails() {
    const l = await api('GET', '/api/emails');
    corpo.innerHTML = `<div class="cartao" style="padding:0"><div class="tabela-wrap">${l.length ? `<table class="tabela"><thead><tr><th>Quando</th><th>Para</th><th>Sobre</th><th>Tipo</th><th>Resultado</th></tr></thead><tbody>
      ${l.map((m) => `<tr><td>${dataHoraBR(m.enviado_em)}</td><td>${h(m.destinatario)}</td><td>${m.aluno_nome ? `${h(m.aluno_nome)}<br><small>${h(m.livro_titulo)}</small>` : '—'}</td><td>${nomeTipoEmail(m.tipo)}</td>
        <td>${m.status === 'enviado' ? '<span class="etq etq-verde">Enviado</span>' : `<span class="etq etq-vermelho">Erro</span><br><small>${h(m.erro)}</small>`}</td></tr>`).join('')}
      </tbody></table>` : vazio('email', 'Nenhum e-mail enviado ainda.', 'Configure os lembretes em Configurações.')}</div></div>`;
  }
  const abrir = () => ({ emprestimos, atividades, emails })[aba]().catch(falha);
  $$('.aba', area).forEach((b) => (b.onclick = () => { aba = b.dataset.aba; $$('.aba', area).forEach((x) => x.setAttribute('aria-pressed', x === b)); abrir(); }));
  await abrir();
}

// ---------- Configurações ----------
async function pgConfiguracoes(area) {
  const c = await api('GET', '/api/config');
  const sel = (nome, opcoes, valor) => `<select class="entrada" name="${nome}" id="c_${nome}">${opcoes.map(([v, t]) => `<option value="${v}" ${String(v) === String(valor) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  const VARIAVEIS = ['responsavel', 'aluno', 'sala', 'livro', 'data_devolucao', 'data_emprestimo', 'dias_atraso', 'dias_restantes', 'escola'];
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Configurações</h1><p>Ajuste o sistema do jeito da escola.</p></div></div>
    <form id="form" novalidate>
    <div class="cartao">
      <h2>${ico('inicio')} Escola e empréstimos</h2><p class="sub">Regras gerais da biblioteca.</p>
      <div class="campos">
        ${campo({ nome: 'escola_nome', rotulo: 'Nome da escola', valor: c.escola_nome, inteiro: true })}
        <div class="campo"><label for="c_prazo_padrao_dias">Prazo padrão de empréstimo</label>${sel('prazo_padrao_dias', [[7, '1 semana'], [14, '2 semanas'], [21, '3 semanas'], [30, '1 mês']], c.prazo_padrao_dias)}</div>
        <div class="campo"><label for="c_max_livros_por_aluno">Quantos livros cada aluno pode ter ao mesmo tempo</label>${sel('max_livros_por_aluno', [[1, '1 livro'], [2, '2 livros'], [3, '3 livros'], [5, '5 livros'], [0, 'Sem limite']], c.max_livros_por_aluno)}</div>
      </div>
    </div>

    <div class="cartao">
      <h2>${ico('email')} Lembretes automáticos por e-mail</h2><p class="sub">O sistema avisa os responsáveis sozinho sobre a devolução dos livros.</p>
      <label class="interruptor"><input type="checkbox" name="email_ativo" ${c.email_ativo === '1' ? 'checked' : ''}><span>Enviar lembretes automaticamente<small>Ligue depois de configurar o servidor de e-mail (mais abaixo).</small></span></label>
      <div class="grade-lembrete">
        <div class="campo"><label for="c_email_horario">Horário de envio</label><input class="entrada" type="time" name="email_horario" id="c_email_horario" value="${h(c.email_horario)}"></div>
        <div class="campo"><span class="rotulo">Dias de envio</span><label class="interruptor"><input type="checkbox" name="email_somente_dias_uteis" ${c.email_somente_dias_uteis === '1' ? 'checked' : ''}><span>Somente de segunda a sexta</span></label></div>
        <div class="campo"><label for="c_email_dias_antes">Aviso antes do prazo</label>${sel('email_dias_antes', [[0, 'Não avisar antes'], [1, '1 dia antes'], [2, '2 dias antes'], [3, '3 dias antes'], [5, '5 dias antes'], [7, '1 semana antes']], c.email_dias_antes)}</div>
        <div class="campo"><span class="rotulo">No dia da devolução</span><label class="interruptor"><input type="checkbox" name="email_no_dia" ${c.email_no_dia === '1' ? 'checked' : ''}><span>Avisar no próprio dia</span></label></div>
        <div class="campo"><label for="c_email_atraso_intervalo">Se atrasar, reenviar</label>${sel('email_atraso_intervalo', [[0, 'Não reenviar'], [1, 'Todo dia'], [2, 'A cada 2 dias'], [3, 'A cada 3 dias'], [7, 'Uma vez por semana']], c.email_atraso_intervalo)}</div>
        <div class="campo"><label for="c_email_atraso_max">No máximo</label>${sel('email_atraso_max', [[1, '1 vez'], [3, '3 vezes'], [5, '5 vezes'], [10, '10 vezes'], [0, 'Sem limite']], c.email_atraso_max)}</div>
      </div>
      <div class="resumo-lembrete" id="resumo">${ico('info')}<span></span></div>
      <p style="color:var(--texto-suave);margin-bottom:0">${c.email_ultima_execucao ? `Último envio automático: ${dataBR(c.email_ultima_execucao)}.` : 'Nenhum envio automático feito ainda.'}
        ${c.na_nuvem ? 'Os lembretes saem do servidor na nuvem, mesmo com os computadores da escola desligados.'
          : 'O computador com o sistema precisa estar ligado; se estiver desligado no horário, os lembretes saem assim que ele for ligado.'}</p>
      <div class="acoes" style="margin-top:16px">
        <button type="button" class="btn btn-claro" id="previa">${ico('olho')} Ver quem receberia hoje</button>
        <button type="button" class="btn btn-claro" id="agora">${ico('enviar')} Enviar lembretes agora</button>
      </div>
    </div>

    <div class="cartao">
      <h2>${ico('enviar')} Servidor de e-mail</h2><p class="sub">A conta de e-mail que vai enviar os lembretes.</p>
      <div class="campos">
        ${campo({ nome: 'smtp_usuario', rotulo: 'E-mail da biblioteca', valor: c.smtp_usuario, tipo: 'email', attrs: 'placeholder="biblioteca.escola@gmail.com" autocomplete="off"' })}
        ${campo({ nome: 'smtp_senha', rotulo: 'Senha de app', valor: c.smtp_senha, tipo: 'password', ajuda: 'No Gmail, é uma senha especial de 16 letras (veja como criar abaixo).', attrs: 'autocomplete="new-password"' })}
        ${campo({ nome: 'smtp_remetente_nome', rotulo: 'Nome que aparece para os pais', valor: c.smtp_remetente_nome })}
        ${campo({ nome: 'smtp_host', rotulo: 'Servidor (SMTP)', valor: c.smtp_host })}
        ${campo({ nome: 'smtp_porta', rotulo: 'Porta', valor: c.smtp_porta, tipo: 'number' })}
        <div class="campo"><span class="rotulo">Segurança</span><label class="interruptor"><input type="checkbox" name="smtp_seguro" ${c.smtp_seguro === '1' ? 'checked' : ''}><span>Conexão segura (SSL)<small>Ligado para a porta 465; desligado para a 587.</small></span></label></div>
      </div>
      <details class="ajuda-box"><summary>Como configurar com uma conta do Gmail</summary><ol>
        <li>Crie (ou use) uma conta Gmail só da biblioteca, por exemplo <i>biblioteca.armandocorrea@gmail.com</i>.</li>
        <li>Na conta Google, ative a <b>Verificação em duas etapas</b> (Gerenciar conta → Segurança).</li>
        <li>Acesse <b>myaccount.google.com/apppasswords</b>, digite o nome “Biblioteca” e clique em Criar.</li>
        <li>Copie a senha de 16 letras que aparece e cole no campo <b>Senha de app</b> acima.</li>
        <li>Mantenha servidor <b>smtp.gmail.com</b>, porta <b>465</b> e conexão segura ligada. Clique em <b>Salvar</b> e envie um teste.</li>
      </ol></details>
      <div class="com-botao" style="margin-top:18px;flex-wrap:wrap">
        <input class="entrada" type="email" id="email_teste" placeholder="Digite um e-mail para receber o teste" style="min-width:260px">
        <button type="button" class="btn btn-claro" id="teste">${ico('enviar')} Enviar e-mail de teste</button>
      </div>
    </div>

    <div class="cartao">
      <h2>${ico('editar')} Texto das mensagens</h2>
      <p class="sub">Clique em um marcador para inseri-lo no texto. Ele é trocado automaticamente pelos dados do aluno.</p>
      <div class="chips" style="margin-bottom:18px">${VARIAVEIS.map((v) => `<button type="button" class="chip chip-codigo" data-var="${v}">{${v}}</button>`).join('')}</div>
      <div class="campos">
        ${campo({ nome: 'modelo_lembrete_assunto', rotulo: 'Lembrete (antes ou no dia) — assunto', valor: c.modelo_lembrete_assunto, inteiro: true })}
        ${campo({ nome: 'modelo_lembrete_corpo', rotulo: 'Lembrete — mensagem', valor: c.modelo_lembrete_corpo, inteiro: true, tipo: 'textarea', attrs: 'rows="8"' })}
        ${campo({ nome: 'modelo_atraso_assunto', rotulo: 'Atraso — assunto', valor: c.modelo_atraso_assunto, inteiro: true })}
        ${campo({ nome: 'modelo_atraso_corpo', rotulo: 'Atraso — mensagem', valor: c.modelo_atraso_corpo, inteiro: true, tipo: 'textarea', attrs: 'rows="8"' })}
      </div>
    </div>
    <div class="barra-salvar"><button type="submit" class="btn btn-primario btn-g">${ico('salvar')} Salvar configurações</button></div>
    </form>

    <div class="cartao">
      <h2>${ico('baixar')} Cópia de segurança</h2>
      <p class="sub">${c.na_nuvem
        ? 'Os dados ficam guardados no banco de dados na nuvem. Uma vez por semana, baixe uma cópia completa e guarde no Google Drive ou num pen drive.'
        : 'O sistema guarda sozinho uma cópia por dia (as últimas 14) na pasta <b>dados/copias-de-seguranca</b>. Para mais segurança, baixe uma cópia de vez em quando e guarde num pen drive ou no Google Drive.'}
        ${c.backup_ultima_execucao ? `Última cópia: ${dataBR(c.backup_ultima_execucao)}.` : ''}</p>
      <div class="acoes">
        <a class="btn btn-primario" href="/api/backup">${ico('baixar')} Baixar cópia de segurança</a>
        <a class="btn btn-claro" href="/api/exportar/livros">Planilha de livros</a>
        <a class="btn btn-claro" href="/api/exportar/alunos">Planilha de alunos</a>
        <a class="btn btn-claro" href="/api/exportar/emprestimos">Planilha de empréstimos</a>
      </div>
    </div>`;

  const form = $('#form', area);
  // Resumo em linguagem simples
  const resumo = () => {
    const v = (n) => form.elements[n];
    if (!v('email_ativo').checked) { $('#resumo span', area).innerHTML = 'Os lembretes estão <b>desligados</b>. Nenhum e-mail será enviado.'; return; }
    const partes = [];
    const antes = Number(v('email_dias_antes').value);
    if (antes) partes.push(`um aviso <b>${antes === 7 ? '1 semana' : plural(antes, 'dia', 'dias')} antes</b> do prazo`);
    if (v('email_no_dia').checked) partes.push('outro <b>no dia</b> da devolução');
    const int = Number(v('email_atraso_intervalo').value); const max = Number(v('email_atraso_max').value);
    if (int) partes.push(`e, se atrasar, um novo aviso <b>${int === 1 ? 'todo dia' : int === 7 ? 'uma vez por semana' : `a cada ${int} dias`}</b>${max ? ` (até ${plural(max, 'vez', 'vezes')})` : ''}`);
    $('#resumo span', area).innerHTML = `Os e-mails saem às <b>${h(v('email_horario').value || '08:00')}</b>, ${v('email_somente_dias_uteis').checked ? 'de <b>segunda a sexta</b>' : '<b>todos os dias</b>'}. ` +
      (partes.length ? `O responsável recebe ${partes.join(', ').replace(/, e, /, ' e, ')}.` : 'Mas nenhum tipo de aviso está escolhido.');
  };
  form.addEventListener('input', resumo); form.addEventListener('change', resumo); resumo();

  // Marcadores
  let ultimoTexto = $('[name=modelo_lembrete_corpo]', form);
  $$('[name^=modelo_]', form).forEach((t) => t.addEventListener('focus', () => { ultimoTexto = t; }));
  $$('[data-var]', area).forEach((b) => (b.onclick = () => {
    const t = ultimoTexto; const ins = `{${b.dataset.var}}`;
    const i = t.selectionStart ?? t.value.length;
    t.value = t.value.slice(0, i) + ins + t.value.slice(t.selectionEnd ?? i);
    t.focus(); t.selectionStart = t.selectionEnd = i + ins.length;
  }));

  const salvar = async (silencioso) => {
    const dados = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      dados[el.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
    }
    await api('PUT', '/api/config', dados);
    estado.escola = dados.escola_nome; estado.prazo = Number(dados.prazo_padrao_dias) || 7;
    $('.marca small') && ($('.marca small').textContent = estado.escola);
    if (!silencioso) aviso('Configurações salvas!');
  };
  form.onsubmit = async (ev) => { ev.preventDefault(); try { await salvar(); } catch (e) { falha(e); } };

  $('#teste', area).onclick = async (ev) => {
    const b = ev.currentTarget; b.disabled = true;
    try { await salvar(true); await api('POST', '/api/email/teste', { para: $('#email_teste', area).value }); aviso('E-mail de teste enviado! Confira a caixa de entrada (e o spam).', 'ok', 7000); }
    catch (e) { falha(e); } finally { b.disabled = false; }
  };
  $('#previa', area).onclick = async () => {
    try {
      await salvar(true);
      const p = await api('GET', '/api/email/previa');
      const item = (x) => `<tr><td>${h(x.aluno)}<br><small>${h(x.sala)}</small></td><td>${h(x.livro)}</td><td>${nomeTipoEmail(x.tipo)}</td><td>${h(x.email || '—')}</td></tr>`;
      janela({
        titulo: 'Quem receberia lembrete hoje',
        corpo: p.pendentes.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Aluno</th><th>Livro</th><th>Tipo</th><th>E-mail</th></tr></thead><tbody>${p.pendentes.map(item).join('')}</tbody></table></div>`
          : vazio('ok', 'Ninguém para avisar hoje.') +
          (p.semEmail.length ? `<h3 style="margin:24px 0 8px">Sem e-mail cadastrado (${p.semEmail.length})</h3><p style="margin-top:0;color:var(--texto-suave)">Estes responsáveis precisariam de aviso, mas não têm e-mail. Use o botão de WhatsApp na tela de Empréstimos.</p>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Aluno</th><th>Livro</th><th>Tipo</th><th>E-mail</th></tr></thead><tbody>${p.semEmail.map(item).join('')}</tbody></table></div>` : ''),
        rodape: '<button type="button" class="btn btn-claro" data-fechar>Fechar</button>',
      });
    } catch (e) { falha(e); }
  };
  $('#agora', area).onclick = async (ev) => {
    if (!(await confirmar({ titulo: 'Enviar lembretes agora', texto: 'Enviar agora os lembretes que estão pendentes para hoje?<br><br>Ninguém recebe o mesmo aviso duas vezes.', botao: 'Enviar agora' }))) return;
    const b = ev.target.closest('button'); b.disabled = true;
    try { await salvar(true); const r = await api('POST', '/api/email/executar'); aviso(r.mensagem + (r.erros ? ` ${r.erros} com erro — veja em Histórico.` : ''), r.erros ? 'alerta' : 'ok', 7000); }
    catch (e) { falha(e); } finally { b.disabled = false; }
  };
}

// ---------- Equipe (só a direção) ----------
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).filter(Boolean).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
const sugerirLogin = (nome) => {
  const p = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((x) => x.length > 2 || x.length === String(nome).trim().length);
  return p.length > 1 ? `${p[0]}.${p[p.length - 1]}` : (p[0] || '');
};
const senhaProvisoria = () => String(Math.floor(100000 + Math.random() * 900000));
const PERFIL = { direcao: ['Direção', 'azul'], bibliotecario: ['Bibliotecário(a)', 'verde'] };

function entregarSenha(nome, usuario, senha) {
  janela({
    titulo: 'Acesso pronto!', pequena: true,
    corpo: `<p style="margin-top:0">Anote e entregue para <b>${h(nome)}</b>:</p>
      <div class="cartao-senha"><div><span>Nome</span><b>${h(nome)}</b></div>
      <div><span>Usuário (para entrar)</span><b>${h(usuario)}</b></div>
      <div><span>Senha provisória</span><b class="senha-grande">${h(senha)}</b></div></div>
      <p style="color:var(--texto-suave);margin-bottom:0">No primeiro acesso, o sistema pede para a pessoa criar a própria senha.</p>`,
    rodape: `<button type="button" class="btn btn-claro" onclick="window.print()">${ico('imprimir')} Imprimir</button><button type="button" class="btn btn-primario" data-fechar>${ico('ok')} Entendi</button>`,
  });
}

function formUsuario(u, depois) {
  const novo = !u;
  const d = janela({
    titulo: novo ? 'Cadastrar pessoa da equipe' : 'Editar acesso',
    corpo: `<div class="campos">
      ${campo({ nome: 'nome', rotulo: 'Nome completo', valor: u?.nome, obrigatorio: true, inteiro: true, attrs: 'autocomplete="off" placeholder="Ex.: Maria José Souza"' })}
      <div class="campo inteiro"><span class="rotulo">O que essa pessoa pode fazer?</span>
        <div class="opcoes-perfil">
          <label class="cartao-opcao"><input type="radio" name="perfil" value="bibliotecario" ${u?.perfil !== 'direcao' ? 'checked' : ''}>
            <b>${ico('livroAberto')} Bibliotecário(a)</b><span>Empresta, recebe devoluções, cadastra livros e alunos e vê o histórico.</span></label>
          <label class="cartao-opcao"><input type="radio" name="perfil" value="direcao" ${u?.perfil === 'direcao' ? 'checked' : ''}>
            <b>${ico('cadeado')} Direção</b><span>Tudo da bibliotecária e também cadastra a equipe, mexe nas configurações e nos e-mails.</span></label>
        </div></div>
      ${campo({ nome: 'usuario', rotulo: 'Nome de usuário', valor: u?.usuario, obrigatorio: true, ajuda: 'Preenchido sozinho. Sem espaços nem acentos.', attrs: 'autocomplete="off" autocapitalize="none"' })}
      ${novo ? `<div class="campo"><label for="c_senha_p">Senha provisória</label>
        <div class="com-botao"><input class="entrada" id="c_senha_p" name="senha" value="${senhaProvisoria()}" required data-rotulo="Senha provisória" autocomplete="off">
        <button type="button" class="btn btn-claro btn-quadrado" data-gerar title="Gerar outra" aria-label="Gerar outra senha">${ico('renovar')}</button></div>
        <span class="ajuda">A pessoa troca no primeiro acesso.</span></div>` : ''}
    </div>`,
    rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">${ico('salvar')} ${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    aoEnviar: async (dados, dlg) => {
      if (novo) {
        const r = await api('POST', '/api/usuarios', dados);
        dlg.close(); depois && depois();
        entregarSenha(dados.nome, r.usuario, dados.senha);
      } else {
        await api('PUT', `/api/usuarios/${u.id}`, dados);
        aviso('Acesso atualizado.'); dlg.close(); depois && depois();
      }
    },
  });
  const nome = $('[name=nome]', d); const login = $('[name=usuario]', d);
  let mexeu = !novo;
  login.addEventListener('input', () => { mexeu = true; });
  nome.addEventListener('input', () => { if (!mexeu) login.value = sugerirLogin(nome.value); });
  $('[data-gerar]', d)?.addEventListener('click', () => { $('[name=senha]', d).value = senhaProvisoria(); });
}

async function pgEquipe(area) {
  area.innerHTML = `
    <div class="cabecalho"><div><h1>Equipe</h1><p>Quem pode entrar no sistema da biblioteca.</p></div>
      <div class="acoes"><button class="btn btn-primario" id="novo">${ico('mais')} Cadastrar bibliotecária(o)</button></div></div>
    <div class="lista" id="lista"><div class="carregando">Carregando…</div></div>`;
  let pessoas = [];
  const carregar = async () => {
    pessoas = await api('GET', '/api/usuarios');
    $('#lista', area).innerHTML = pessoas.map((p) => {
      const [nomeP, cor] = PERFIL[p.perfil] || PERFIL.bibliotecario;
      const eu = p.id === estado.usuario.id;
      return `<div class="linha ${p.ativo ? '' : 'desativado'}" data-id="${p.id}">
        <div class="avatar ${p.perfil}">${h(iniciais(p.nome))}</div>
        <div class="linha-info"><div class="linha-titulo">${h(p.nome)}${eu ? ' <span class="opcional">(você)</span>' : ''}</div>
          <div class="linha-detalhe"><span>Usuário: ${h(p.usuario)}</span>
            <span>${p.ultimo_acesso ? `Último acesso: ${dataHoraBR(p.ultimo_acesso)}` : 'Ainda não entrou'}</span>
            ${p.emprestimos_feitos ? `<span>${plural(p.emprestimos_feitos, 'empréstimo registrado', 'empréstimos registrados')}</span>` : ''}</div>
          <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
            <span class="etq etq-${cor}">${nomeP}</span>
            ${p.ativo ? '' : '<span class="etq etq-cinza">Acesso desativado</span>'}
            ${p.ativo && p.deve_trocar_senha ? '<span class="etq etq-amarelo">Com senha provisória</span>' : ''}</div></div>
        <div class="linha-acoes">
          ${p.ativo ? `<button class="btn btn-claro btn-p" data-acao="editar">${ico('editar')} Editar</button>
          <button class="btn btn-claro btn-p" data-acao="senha">${ico('cadeado')} Nova senha</button>
          ${eu ? '' : `<button class="btn btn-texto perigo btn-p" data-acao="desativar">${ico('x')} Desativar</button>`}`
          : `<button class="btn btn-claro btn-p" data-acao="reativar">${ico('ok')} Reativar acesso</button>`}
        </div></div>`;
    }).join('') + (pessoas.length === 1 ? `<div class="cartao">${vazio('alunos', 'Só você tem acesso por enquanto.', 'Clique em “Cadastrar bibliotecária(o)” para dar acesso às professoras e professores.')}</div>` : '');
  };
  $('#novo', area).onclick = () => formUsuario(null, () => carregar().catch(falha));
  area.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]'); const linha = ev.target.closest('.linha[data-id]');
    if (!b || !linha) return;
    const p = pessoas.find((x) => x.id === Number(linha.dataset.id));
    try {
      if (b.dataset.acao === 'editar') return formUsuario(p, () => carregar().catch(falha));
      if (b.dataset.acao === 'senha') {
        const eu = p.id === estado.usuario.id;
        if (eu) return minhaSenha();
        const nova = senhaProvisoria();
        if (!(await confirmar({ titulo: 'Nova senha provisória', texto: `Criar uma senha provisória nova para <b>${h(p.nome)}</b>?<br><br>A senha antiga deixa de funcionar e a pessoa cria outra no próximo acesso.`, botao: 'Criar nova senha' }))) return;
        await api('POST', `/api/usuarios/${p.id}/senha`, { senha: nova });
        entregarSenha(p.nome, p.usuario, nova);
      }
      if (b.dataset.acao === 'desativar') {
        if (!(await confirmar({ titulo: 'Desativar acesso', texto: `<b>${h(p.nome)}</b> não vai mais conseguir entrar no sistema.<br><br>Tudo o que essa pessoa registrou continua no histórico. Dá para reativar depois.`, botao: 'Desativar', classe: 'btn-perigo' }))) return;
        await api('POST', `/api/usuarios/${p.id}/ativo`, { ativo: false }); aviso('Acesso desativado.');
      }
      if (b.dataset.acao === 'reativar') { await api('POST', `/api/usuarios/${p.id}/ativo`, { ativo: true }); aviso('Acesso reativado.'); }
      await carregar();
    } catch (e) { falha(e); }
  });
  await carregar();
}

function minhaSenha() {
  janela({
    titulo: 'Trocar minha senha', pequena: true,
    corpo: `<div class="campos" style="grid-template-columns:1fr">
      ${campo({ nome: 'atual', rotulo: 'Senha atual', tipo: 'password', obrigatorio: true, attrs: 'autocomplete="current-password"' })}
      ${campo({ nome: 'nova', rotulo: 'Nova senha', tipo: 'password', obrigatorio: true, ajuda: 'Pelo menos 4 caracteres.', attrs: 'autocomplete="new-password"' })}
      ${campo({ nome: 'nova2', rotulo: 'Repita a nova senha', tipo: 'password', obrigatorio: true, attrs: 'autocomplete="new-password"' })}</div>`,
    rodape: `<button type="button" class="btn btn-claro" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">${ico('cadeado')} Trocar senha</button>`,
    aoEnviar: async (dados, dlg) => {
      if (dados.nova !== dados.nova2) return aviso('As duas senhas novas não são iguais.', 'alerta');
      await api('POST', '/api/minha-senha', { atual: dados.atual, nova: dados.nova });
      aviso('Senha alterada!'); dlg.close();
    },
  });
}

// =====================================================================
// ESTRUTURA, LOGIN E NAVEGAÇÃO
// =====================================================================
const ROTAS = {
  inicio: ['Início', 'inicio', pgInicio],
  emprestar: ['Emprestar', 'livroAberto', pgEmprestar],
  emprestimos: ['Empréstimos', 'devolver', pgEmprestimos],
  livros: ['Livros', 'livro', pgLivros],
  alunos: ['Alunos', 'alunos', pgAlunos],
  historico: ['Histórico', 'historico', pgHistorico],
  equipe: ['Equipe', 'equipe', pgEquipe, true],
  configuracoes: ['Configurações', 'ajustes', pgConfiguracoes, true],
};
const podeVer = (rota) => !ROTAS[rota][3] || estado.usuario?.perfil === 'direcao';

function tamanhoFonte(delta) {
  let t = 0;
  try { t = Number(localStorage.getItem('tamanho')) || 0; } catch { /* sem armazenamento */ }
  if (delta) t = Math.max(0, Math.min(2, t + delta));
  document.documentElement.dataset.tamanho = t;
  try { localStorage.setItem('tamanho', t); } catch { /* ok */ }
}

function montarLayout() {
  const u = estado.usuario;
  $('#raiz').innerHTML = `<div class="app">
    <aside class="lateral">
      <div class="marca"><div class="marca-ico">${ico('livroAberto')}</div><div><strong>Biblioteca</strong><small>${h(estado.escola)}</small></div></div>
      <nav class="nav" aria-label="Menu principal">${Object.keys(ROTAS).filter(podeVer).map((k) => { const [nome, i] = ROTAS[k]; return `<a href="#/${k}" data-rota="${k}">${ico(i)}<span>${nome}</span>${k === 'emprestimos' ? '<span class="contador oculto" id="contador"></span>' : ''}</a>`; }).join('')}</nav>
      <div class="lateral-rodape">
        <div class="quem"><div class="avatar ${u.perfil}">${h(iniciais(u.nome))}</div><div><b>${h(u.nome.split(' ')[0])}</b><small>${PERFIL[u.perfil][0]}</small></div></div>
        <div class="tamanho"><span style="flex:1">Tamanho da letra</span><button id="menor" aria-label="Diminuir letra">A−</button><button id="maior" aria-label="Aumentar letra">A+</button></div>
        <div class="rodape-botoes"><button class="btn btn-texto btn-p" id="minha_senha">${ico('cadeado')} Minha senha</button>
        <button class="btn btn-texto btn-p" id="sair">${ico('sair')} Sair</button></div>
      </div>
    </aside>
    <main class="conteudo" id="conteudo"></main></div>`;
  $('#menor').onclick = () => tamanhoFonte(-1);
  $('#maior').onclick = () => tamanhoFonte(1);
  $('#minha_senha').onclick = minhaSenha;
  $('#sair').onclick = async () => { await api('POST', '/api/logout').catch(() => {}); location.hash = '#/inicio'; iniciar(); };
}

async function atualizarContador() {
  try {
    const d = await api('GET', '/api/painel');
    const el = $('#contador');
    if (!el) return;
    el.textContent = d.totais.atrasados;
    el.classList.toggle('oculto', !d.totais.atrasados);
    el.title = `${d.totais.atrasados} atrasado(s)`;
  } catch { /* ignora */ }
}

async function navegar() {
  if (!$('#conteudo')) return;
  const [caminho, busca] = (location.hash.slice(2) || 'inicio').split('?');
  const rota = ROTAS[caminho] && podeVer(caminho) ? caminho : 'inicio';
  const params = Object.fromEntries(new URLSearchParams(busca || ''));
  $$('.nav a').forEach((a) => a.classList.toggle('ativo', a.dataset.rota === rota));
  document.title = `${ROTAS[rota][0]} — Biblioteca`;
  const area = document.createElement('div');
  area.innerHTML = '<div class="carregando">Carregando…</div>';
  $('#conteudo').replaceChildren(area);
  window.scrollTo(0, 0);
  try { await ROTAS[rota][2](area, params); }
  catch (e) { area.innerHTML = vazio('alerta', 'Não foi possível carregar esta tela.', h(e.message)); }
}

// Telas de entrada (login, primeiro acesso, troca de senha provisória)
function telaEntrada(conteudo) {
  $('#raiz').innerHTML = `<div class="tela-login"><div class="login">
    <div class="marca-ico">${ico('livroAberto')}</div>
    <h1>Biblioteca</h1><p>${h(estado.escola)}</p>${conteudo}</div></div>`;
}

function telaLoginUsuario() {
  telaEntrada(`<form id="login">
      ${campo({ nome: 'usuario', rotulo: 'Usuário', ajuda: 'Ex.: maria.souza', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false"' })}
      ${campo({ nome: 'senha', rotulo: 'Senha', tipo: 'password', attrs: 'autocomplete="current-password"' })}
      <button class="btn btn-primario btn-g" type="submit">${ico('seta')} Entrar</button>
    </form>`);
  const f = $('#login');
  f.usuario.focus();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try { await api('POST', '/api/login', { usuario: f.usuario.value.trim(), senha: f.senha.value }); iniciar(); }
    catch (e) { falha(e); f.senha.select(); }
  };
}

function telaLogin(equipe) {
  if (!equipe.length) return telaLoginUsuario();
  telaEntrada(`<h2 class="login-pergunta">Quem está entrando?</h2>
    <div class="pessoas">${equipe.map((p) => `<button type="button" class="pessoa" data-usuario="${h(p.usuario)}"><span class="avatar">${h(iniciais(p.nome))}</span><span>${h(p.nome)}</span></button>`).join('')}</div>
    <form id="login" class="oculto">
      <input type="hidden" name="usuario">
      ${campo({ nome: 'senha', rotulo: 'Sua senha', tipo: 'password', attrs: 'autocomplete="current-password"' })}
      <button class="btn btn-primario btn-g" type="submit">${ico('seta')} Entrar</button>
      <button class="btn btn-texto" type="button" id="voltar">Não sou eu</button>
    </form>`);
  const f = $('#login');
  const escolher = (b) => {
    $$('.pessoa').forEach((x) => { x.setAttribute('aria-pressed', x === b); x.classList.toggle('oculto', x !== b); });
    f.usuario.value = b.dataset.usuario; f.classList.remove('oculto'); f.senha.value = ''; f.senha.focus();
  };
  $$('.pessoa').forEach((b) => (b.onclick = () => escolher(b)));
  if (equipe.length === 1) escolher($('.pessoa'));
  $('#voltar').onclick = () => { $$('.pessoa').forEach((x) => x.classList.remove('oculto')); f.classList.add('oculto'); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try { await api('POST', '/api/login', { usuario: f.usuario.value, senha: f.senha.value }); iniciar(); }
    catch (e) { falha(e); f.senha.select(); }
  };
}

function telaPrimeiroAcesso() {
  telaEntrada(`<p style="margin:-8px 0 18px"><b>Bem-vinda(o)!</b> Este é o primeiro acesso. Crie a conta da <b>direção</b>; depois você cadastra as bibliotecárias na aba <b>Equipe</b>.</p>
    <form id="login">
      ${campo({ nome: 'nome', rotulo: 'Seu nome', attrs: 'autocomplete="name"' })}
      ${campo({ nome: 'usuario', rotulo: 'Nome de usuário', ajuda: 'Preenchido sozinho. Sem espaços nem acentos.', attrs: 'autocomplete="off" autocapitalize="none"' })}
      ${campo({ nome: 'senha', rotulo: 'Crie uma senha', tipo: 'password', ajuda: 'Pelo menos 4 caracteres.', attrs: 'autocomplete="new-password"' })}
      ${campo({ nome: 'senha2', rotulo: 'Repita a senha', tipo: 'password', attrs: 'autocomplete="new-password"' })}
      <button class="btn btn-primario btn-g" type="submit">${ico('cadeado')} Criar e entrar</button>
    </form>`);
  const f = $('#login');
  let mexeu = false;
  f.usuario.oninput = () => { mexeu = true; };
  f.nome.oninput = () => { if (!mexeu) f.usuario.value = sugerirLogin(f.nome.value); };
  f.nome.focus();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    if (f.senha.value !== f.senha2.value) return aviso('As duas senhas não são iguais.', 'alerta');
    try { await api('POST', '/api/primeiro-acesso', { nome: f.nome.value, usuario: f.usuario.value, senha: f.senha.value }); location.hash = '#/equipe'; iniciar(); }
    catch (e) { falha(e); }
  };
}

function telaTrocarSenha() {
  telaEntrada(`<p style="margin:-8px 0 18px">Olá, <b>${h(estado.usuario.nome.split(' ')[0])}</b>! Você entrou com uma senha provisória.<br>Agora crie a <b>sua senha</b> — só você vai saber.</p>
    <form id="login">
      ${campo({ nome: 'nova', rotulo: 'Nova senha', tipo: 'password', ajuda: 'Pelo menos 4 caracteres.', attrs: 'autocomplete="new-password"' })}
      ${campo({ nome: 'nova2', rotulo: 'Repita a nova senha', tipo: 'password', attrs: 'autocomplete="new-password"' })}
      <button class="btn btn-primario btn-g" type="submit">${ico('ok')} Salvar e entrar</button>
    </form>`);
  const f = $('#login');
  f.nova.focus();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    if (f.nova.value !== f.nova2.value) return aviso('As duas senhas não são iguais.', 'alerta');
    try { await api('POST', '/api/minha-senha', { nova: f.nova.value }); aviso('Senha criada! Bem-vinda(o). 📚'); iniciar(); }
    catch (e) { falha(e); }
  };
}

async function iniciar() {
  tamanhoFonte(0);
  try {
    const s = await api('GET', '/api/sessao');
    estado.escola = s.escola;
    estado.prazo = s.prazo;
    estado.usuario = s.usuario;
    if (s.precisaCriarDirecao) return telaPrimeiroAcesso();
    if (!s.logado) return telaLogin(s.equipe);
    if (s.usuario.deve_trocar_senha) return telaTrocarSenha();
    montarLayout();
    navegar();
    atualizarContador();
  } catch (e) {
    $('#raiz').innerHTML = `<div class="tela-login"><div class="login"><h1>Sistema desligado</h1><p>Não foi possível falar com o servidor da biblioteca. Verifique se a janela do sistema está aberta no computador da escola e recarregue a página.</p>
      <button class="btn btn-primario" onclick="location.reload()">Tentar de novo</button></div></div>`;
  }
}

window.addEventListener('hashchange', () => { navegar(); atualizarContador(); });
iniciar();
