// Datas sempre no formato AAAA-MM-DD, no fuso do computador da escola.
function hoje(d = new Date()) {
  return d.toLocaleDateString('sv-SE'); // sv-SE já devolve AAAA-MM-DD
}
function horaAtual(d = new Date()) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}
// Quantos dias de "de" até "ate" (positivo se "ate" é depois)
function diferencaDias(de, ate) {
  const p = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  return Math.round((p(ate) - p(de)) / 86400000);
}
function formatarBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
function ehDiaUtil(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dia !== 0 && dia !== 6;
}
function dataValida(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

module.exports = { hoje, horaAtual, somarDias, diferencaDias, formatarBR, ehDiaUtil, dataValida };
