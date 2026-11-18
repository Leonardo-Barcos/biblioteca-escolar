# Abre a Biblioteca Escolar numa janela própria, como um programa.
# Se o sistema ainda não estiver ligado, liga em segundo plano (sem janela preta).
#   -SoServidor  → só liga o sistema, sem abrir a janela (usado ao ligar o Windows)
param([switch]$SoServidor)

$pasta = Split-Path -Parent $PSScriptRoot
$porta = 3000
$endereco = "http://localhost:$porta"

function Test-Servidor {
  $cliente = New-Object System.Net.Sockets.TcpClient
  try {
    $tentativa = $cliente.BeginConnect('127.0.0.1', $porta, $null, $null)
    return ($tentativa.AsyncWaitHandle.WaitOne(500) -and $cliente.Connected)
  } catch {
    return $false
  } finally {
    $cliente.Close()
  }
}

function Show-Aviso([string]$texto) {
  if ($SoServidor) { return } # ao ligar o Windows, não interrompe ninguém com avisos
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($texto, 'Biblioteca Escolar', 'OK', 'Warning') | Out-Null
}

if (-not (Test-Servidor)) {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Show-Aviso "O Node.js não está instalado neste computador.`n`nInstale a versão LTS em nodejs.org e depois dê dois cliques em instalar.bat, na pasta da biblioteca."
    exit 1
  }
  if (-not (Test-Path (Join-Path $pasta 'node_modules'))) {
    Show-Aviso "O sistema ainda não foi instalado.`n`nDê dois cliques em instalar.bat, na pasta da biblioteca."
    exit 1
  }

  $dados = Join-Path $pasta 'dados'
  New-Item -ItemType Directory -Force -Path $dados | Out-Null
  $log = Join-Path $dados 'servidor.log'

  # Liga o sistema escondido; as mensagens vão para dados\servidor.log
  $comando = "/c `"`"$($node.Source)`" --disable-warning=ExperimentalWarning src\server.js > `"$log`" 2>&1`""
  Start-Process -FilePath $env:ComSpec -ArgumentList $comando -WorkingDirectory $pasta -WindowStyle Hidden

  $limite = (Get-Date).AddSeconds(30)
  while (-not (Test-Servidor) -and ((Get-Date) -lt $limite)) { Start-Sleep -Milliseconds 400 }
  if (-not (Test-Servidor)) {
    Show-Aviso "Não foi possível ligar o sistema da biblioteca.`n`nReinicie o computador e tente de novo. Se continuar, avise o responsável pela informática (o detalhe do erro fica em dados\servidor.log)."
    exit 1
  }
}

if ($SoServidor) { exit 0 }

# Abre numa janela própria usando o Microsoft Edge; se não encontrar, usa o navegador padrão
$edge = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
  Start-Process -FilePath $edge -ArgumentList "--app=$endereco"
} else {
  Start-Process $endereco
}
