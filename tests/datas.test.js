const { test } = require('node:test');
const assert = require('node:assert/strict');
const { somarDias, diferencaDias, formatarBR, ehDiaUtil, dataValida } = require('../src/datas');

test('somarDias atravessa virada de mês e de ano', () => {
  assert.equal(somarDias('2026-01-30', 3), '2026-02-02');
  assert.equal(somarDias('2026-12-30', 5), '2027-01-04');
  assert.equal(somarDias('2028-02-28', 1), '2028-02-29'); // ano bissexto
});

test('diferencaDias conta dias corridos nos dois sentidos', () => {
  assert.equal(diferencaDias('2026-11-14', '2026-11-21'), 7);
  assert.equal(diferencaDias('2026-11-21', '2026-11-14'), -7);
  assert.equal(diferencaDias('2026-11-14', '2026-11-14'), 0);
});

test('formatarBR devolve dd/mm/aaaa', () => {
  assert.equal(formatarBR('2026-11-05'), '05/11/2026');
  assert.equal(formatarBR(''), '');
});

test('ehDiaUtil ignora sábado e domingo', () => {
  assert.equal(ehDiaUtil('2026-11-13'), true); // sexta
  assert.equal(ehDiaUtil('2026-11-14'), false); // sábado
  assert.equal(ehDiaUtil('2026-11-15'), false); // domingo
});

test('dataValida aceita só AAAA-MM-DD', () => {
  assert.equal(dataValida('2026-11-14'), true);
  assert.equal(dataValida('14/11/2026'), false);
  assert.equal(dataValida(null), false);
});
