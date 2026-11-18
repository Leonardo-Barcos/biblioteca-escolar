# Instala a Biblioteca Escolar neste computador (rode pelo instalar.bat).
# Pode rodar de novo a qualquer momento: ele só refaz o que for preciso e não apaga dados.

$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $PSScriptRoot
Set-Location $pasta

function Write-Passo([string]$texto) { Write-Host "`n  $texto" -ForegroundColor Cyan }
function Stop-ComErro([string]$texto) {
  Write-Host "`n  $texto`n" -ForegroundColor Red
  Read-Host '  Pressione Enter para fechar'
  exit 1
}

Write-Host "`n  ==============================================="
Write-Host "     Biblioteca Escolar - instalação"
Write-Host "  ===============================================`n"

# 1. Node.js 22.13 ou mais novo
Write-Passo '1/4 · Conferindo o Node.js...'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Start-Process 'https://nodejs.org'
  Stop-ComErro 'O Node.js não está instalado. Abri o site nodejs.org: baixe a versão LTS (botão verde), instale e rode este instalador de novo.'
}
$versao = (& node -p "process.versions.node").Trim()
$partes = $versao.Split('.') | ForEach-Object { [int]$_ }
if (($partes[0] -lt 22) -or (($partes[0] -eq 22) -and ($partes[1] -lt 13))) {
  Start-Process 'https://nodejs.org'
  Stop-ComErro "O Node.js deste computador é antigo ($versao). Instale a versão LTS em nodejs.org e rode este instalador de novo."
}
Write-Host "     Node.js $versao - ok"

# 2. Dependências
Write-Passo '2/4 · Instalando o sistema (pode levar um minuto)...'
& npm.cmd install --omit=dev --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Stop-ComErro 'Não foi possível instalar. Confira se o computador está conectado à internet e tente de novo.' }

# 3. Atalhos
Write-Passo '3/4 · Criando os atalhos...'
$abrir = Join-Path $pasta 'windows\abrir.ps1'
$icone = Join-Path $pasta 'windows\biblioteca.ico'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shell = New-Object -ComObject WScript.Shell

function New-Atalho([string]$arquivo, [string]$argumentos, [string]$descricao) {
  $a = $shell.CreateShortcut($arquivo)
  $a.TargetPath = $powershell
  $a.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$abrir`" $argumentos"
  $a.WorkingDirectory = $pasta
  $a.IconLocation = "$icone,0"
  $a.WindowStyle = 7  # minimizado: evita piscar uma janela ao clicar
  $a.Description = $descricao
  $a.Save()
}

$areaDeTrabalho = [Environment]::GetFolderPath('Desktop')
$menuIniciar = [Environment]::GetFolderPath('Programs')
$inicializar = [Environment]::GetFolderPath('Startup')
New-Atalho (Join-Path $areaDeTrabalho 'Biblioteca.lnk') '' 'Abrir a Biblioteca Escolar'
New-Atalho (Join-Path $menuIniciar 'Biblioteca.lnk') '' 'Abrir a Biblioteca Escolar'
New-Atalho (Join-Path $inicializar 'Biblioteca (ligar sistema).lnk') '-SoServidor' 'Liga o sistema da biblioteca junto com o Windows'
Write-Host '     Ícone "Biblioteca" na Área de Trabalho e no menu Iniciar - ok'
Write-Host '     Ligar junto com o Windows - ok'

# 4. Abre pela primeira vez
Write-Passo '4/4 · Abrindo a biblioteca...'
& $powershell -NoProfile -ExecutionPolicy Bypass -File $abrir

Write-Host "`n  Pronto! A partir de agora, é só clicar no ícone ""Biblioteca"" na Área de Trabalho.`n" -ForegroundColor Green
Write-Host '  Se o Windows perguntar sobre o Firewall, pode clicar em Cancelar:'
Write-Host '  o sistema funciona normalmente neste computador.'
Write-Host ''
Read-Host '  Pressione Enter para fechar'
