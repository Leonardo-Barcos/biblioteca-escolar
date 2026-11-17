#!/usr/bin/env bash
# Instala a Biblioteca Escolar no ambiente Linux do Chromebook (ou em qualquer Debian/Ubuntu).
# Uso, dentro da pasta do projeto:  bash instalar-chromebook.sh
# Pode rodar de novo quando atualizar o sistema: ele só refaz o que for preciso.
set -euo pipefail

PASTA="$(cd "$(dirname "$0")" && pwd)"
PORTA="${PORT:-3000}"
SERVICO="biblioteca"
verde() { printf '\n\033[1;32m%s\033[0m\n' "$1"; }

cd "$PASTA"
[ -f package.json ] && [ -f src/server.js ] || { echo "Rode este script de dentro da pasta do projeto."; exit 1; }

verde "1/4 · Preparando o Linux…"
sudo apt-get update -qq
sudo apt-get install -y -qq curl ca-certificates >/dev/null

# Node.js 22.13 ou mais novo (o Debian do Chromebook vem com uma versão antiga)
precisa_node=1
if command -v node >/dev/null 2>&1; then
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' && precisa_node=0
fi
if [ "$precisa_node" = 1 ]; then
  verde "2/4 · Instalando o Node.js…"
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - >/dev/null
  sudo apt-get install -y -qq nodejs >/dev/null
else
  verde "2/4 · Node.js já instalado ($(node --version))"
fi

verde "3/4 · Instalando as dependências do sistema…"
npm ci --omit=dev --no-audit --no-fund

verde "4/4 · Configurando para ligar sozinho…"
sudo tee /etc/systemd/system/${SERVICO}.service >/dev/null <<EOF
[Unit]
Description=Biblioteca Escolar
After=network-online.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${PASTA}
Environment=PORT=${PORTA}
ExecStart=$(command -v node) --disable-warning=ExperimentalWarning src/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now ${SERVICO} >/dev/null 2>&1
sudo systemctl restart ${SERVICO}
sleep 3

if systemctl is-active --quiet ${SERVICO}; then
  verde "Pronto! A biblioteca está funcionando."
  echo "  Abra no Chrome:  http://localhost:${PORTA}"
  echo "  (se não abrir, tente  http://penguin.linux.test:${PORTA})"
  echo
  echo "  Comandos úteis:"
  echo "    sudo systemctl status ${SERVICO}     → ver se está rodando"
  echo "    sudo systemctl restart ${SERVICO}    → reiniciar"
  echo "    journalctl -u ${SERVICO} -n 50       → ver as últimas mensagens"
else
  echo "Algo deu errado. Veja as mensagens com:  journalctl -u ${SERVICO} -n 50"
  exit 1
fi
