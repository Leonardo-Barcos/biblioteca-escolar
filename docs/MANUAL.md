# Biblioteca Escolar — E.E.E.F. Dep. Armando Corrêa

Manual de instalação e uso para a escola. Sistema de empréstimo de livros feito para ser simples de usar: letras grandes, botões com texto, poucas telas e confirmação antes de qualquer ação importante.

## O que o sistema faz

- **Livros**: cadastrar, editar, remover, acrescentar/retirar exemplares. ISBN é opcional e, se o computador tiver internet, preenche título e autor sozinho.
- **Alunos**: nome, sala, turno, responsável, telefone/WhatsApp, e-mail do responsável e endereço.
- **Empréstimo em 3 passos**: aluno → livro → data de devolução (atalhos de 1 semana, 2 semanas, 1 mês).
- **Devolução e renovação** com um clique, e botão de **WhatsApp** que já abre a mensagem pronta para o responsável.
- **Lembretes automáticos por e-mail**: antes do prazo, no dia e depois do vencimento, com horário, dias e frequência ajustáveis em *Configurações*. Ninguém recebe o mesmo aviso duas vezes.
- **Histórico** de empréstimos, de atividades (quem fez o quê) e dos e-mails enviados, com impressão e exportação para planilha (Excel).
- **Cópia de segurança automática** todos os dias (guarda as últimas 14), mais o download manual.
- **Equipe**: a direção cadastra as bibliotecárias (professoras e professores) que podem entrar no sistema. Cada pessoa tem a própria senha, e o histórico mostra quem registrou cada empréstimo e cada devolução.
- **Entrada simples**: na tela inicial a pessoa clica no próprio nome e digita a senha.
- **Botão A− / A+** para aumentar a letra.

## Tecnologia (leve de propósito)

| Parte | Ferramenta |
|---|---|
| Servidor | Node.js + Express |
| Banco de dados | Postgres: Supabase na nuvem; no computador da escola, PGlite (um Postgres que roda dentro do Node, sem instalar nada) |
| Hospedagem | Vercel (região São Paulo), com tarefa programada para os lembretes |
| E-mail | Nodemailer (Gmail ou qualquer SMTP) |
| Interface | HTML, CSS e JavaScript puros (cerca de 130 KB no total, já contando a fonte), sem framework e sem etapa de build |
| Fonte | Atkinson Hyperlegible (feita para facilitar a leitura), servida localmente e funciona sem internet |

O mesmo código roda na nuvem e no computador da escola. Instalado localmente, funciona sem internet; ela só é usada para enviar e-mails e buscar o ISBN.

## Instalação no computador da escola (Windows)

1. Instale o **Node.js LTS** (versão 22.13 ou mais nova) em <https://nodejs.org>.
2. Copie a pasta `biblioteca` para o computador, por exemplo em `C:\Biblioteca`.
3. Dê dois cliques em **`iniciar.bat`**. Na primeira vez ele instala o que precisa e abre o navegador.
4. No primeiro acesso, o sistema pede para criar a **conta da direção**. Depois disso, a direção cadastra as bibliotecárias na aba **Equipe**.
5. Deixe a janela preta aberta enquanto usar o sistema. Pode minimizar, mas não feche.

**Para ligar sozinho com o Windows:** aperte `Win + R`, digite `shell:startup`, Enter, e coloque ali um atalho para o `iniciar.bat`.

**Para usar em outros computadores ou no celular da escola** (mesma rede Wi-Fi): a janela preta mostra um endereço como `http://192.168.0.15:3000`. É só abrir esse endereço no navegador do outro aparelho. Se não abrir, libere a porta 3000 no Firewall do Windows quando ele perguntar.

## Publicar na internet (Vercel + Supabase)

É o jeito recomendado: o sistema funciona em qualquer navegador, inclusive no Chromebook, sem instalar nada na escola e sem depender de um computador ligado. Cada escola tem **um projeto no Supabase** (o banco) e **um projeto na Vercel** (o site), os dois na região de **São Paulo**.

**1. Banco de dados (Supabase)**
1. Em supabase.com, clique em *New project*. Dê um nome (ex.: `biblioteca-armando-correa`), crie uma senha **só com letras e números** e escolha a região **South America (São Paulo)**.
2. Com o projeto criado, clique em **Connect** (no topo) → aba *Connection string* → **Transaction pooler**. Copie o endereço (começa com `postgresql://` e termina em `:6543/postgres`) e troque `[YOUR-PASSWORD]` pela senha do passo anterior.

As tabelas são criadas sozinhas no primeiro acesso ao sistema.

**2. Site (Vercel)**
1. Em vercel.com: *Add New → Project* e importe o repositório `biblioteca-escolar` do GitHub. O `vercel.json` já define tudo (pasta `public`, região `gru1`, rotas e tarefa programada). Não precisa mudar o *Framework Preset*.
2. Antes de clicar em *Deploy*, abra **Environment Variables** e crie:
   - `DATABASE_URL`: o endereço copiado do Supabase.
   - `CRON_SECRET`: uma senha longa e aleatória. Para gerar uma, rode no terminal `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
3. Clique em **Deploy**. No fim, abra o endereço (`https://….vercel.app`) e **crie a conta da direção**.
4. Endereço próprio (opcional): *Settings → Domains* → adicione, por exemplo, `biblioteca.seudominio.com.br`.

**Como fica na nuvem**
- **Entrada:** a tela pede **usuário e senha**, para não mostrar os nomes da equipe para quem não é da escola.
- **Lembretes:** a Vercel chama o sistema a cada 10 minutos (*Settings → Cron Jobs*). Quando chega o horário configurado, os e-mails saem, mesmo com os computadores da escola desligados.
- **Atualizações:** cada `git push` publica a versão nova automaticamente. Os dados ficam no Supabase e não são afetados.
- **Cópia de segurança:** baixe toda semana em *Configurações → Baixar cópia de segurança* (arquivo `.json`) e guarde no Google Drive.

**Chromebook da escola:** abra o endereço no Chrome → menu ⋮ → *Transmitir, salvar e compartilhar* → *Criar atalho* → **Abrir como janela**. Fixe o ícone na barra.

**Outra escola:** crie outro projeto no Supabase e outro projeto na Vercel a partir do mesmo repositório, cada um com a sua `DATABASE_URL`. Os dados de cada escola ficam separados.

## Instalação em Chromebook (Chrome OS)

Prefira a publicação na internet (seção anterior). Use este caminho só se o sistema precisar rodar dentro do próprio Chromebook, sem internet: o Chrome OS não roda o Node diretamente, então o sistema funciona dentro do **ambiente Linux** que vem no Chromebook.

1. **Ative o Linux:** Configurações → Avançado → Desenvolvedores → *Ambiente de desenvolvimento do Linux* → **Ativar**. Reserve pelo menos 10 GB. Se a opção não aparecer ou estiver bloqueada, o Chromebook é gerenciado pela secretaria e o Linux foi desativado pelo administrador (veja o fim desta seção).
2. **Leve o projeto para o Linux:** coloque o `.zip` do projeto na pasta **Arquivos do Linux** (pelo app Arquivos). No **Terminal**, rode:
   ```
   sudo apt-get install -y unzip
   unzip biblioteca-escolar-main.zip
   cd biblioteca-escolar-main
   ```
3. **Instale com um comando só:**
   ```
   bash instalar-chromebook.sh
   ```
   O script instala o Node.js, as dependências e deixa o sistema configurado para ligar sozinho junto com o Linux.
4. **Abra no Chrome:** `http://localhost:3000`. Para os professores, crie um atalho: menu ⋮ do Chrome → *Transmitir, salvar e compartilhar* → *Criar atalho* → marque **Abrir como janela**. Depois fixe o ícone na barra.

**No dia a dia**
- O Linux não liga sozinho quando o Chromebook liga. Depois de entrar na conta, **abra o app Terminal uma vez** e pode fechar a janela: o sistema continua rodando.
- Para os lembretes saírem no horário, desative a suspensão com a tampa fechada (Configurações → Dispositivo → Energia). Se o Chromebook estiver dormindo no horário, os e-mails saem quando ele acordar.
- **Outros aparelhos na rede** (celular, outro computador): Configurações → Desenvolvedores → Linux → *Encaminhamento de portas* → adicionar a porta **3000** (TCP). O endereço é o IP do Chromebook, por exemplo `http://192.168.0.20:3000`.

**Cópias de segurança no Chromebook.** Os dados ficam dentro do Linux. Se o Chromebook for formatado (*Powerwash*) ou o Linux for removido, eles se perdem. Uma vez por semana, copie a pasta `dados/copias-de-seguranca` para o Google Drive pelo app Arquivos, ou use Configurações → Linux → *Backup e restauração*.

**Para atualizar o sistema:** substitua os arquivos pelos da versão nova, mantendo a pasta `dados`, e rode de novo `bash instalar-chromebook.sh`.

**Se o Linux estiver bloqueado:** peça ao responsável pelos Chromebooks da escola para liberar o *Ambiente de desenvolvimento do Linux* no Google Admin. Se não for possível, rode o sistema em outro computador da escola (Windows) ou num servidor na internet.

## Equipe e permissões

| | Bibliotecário(a) | Direção |
|---|:---:|:---:|
| Emprestar, receber devoluções, renovar | ✔ | ✔ |
| Cadastrar livros e alunos | ✔ | ✔ |
| Ver o histórico | ✔ | ✔ |
| Cadastrar e desativar pessoas da equipe | | ✔ |
| Configurações, e-mails e cópias de segurança | | ✔ |

Ao cadastrar alguém, o sistema gera uma **senha provisória** de 6 números para anotar ou imprimir e entregar. No primeiro acesso, a pessoa cria a própria senha. Se alguém esquecer a senha, a direção clica em **Nova senha** na aba Equipe. Quando alguém sai da escola, use **Desativar**: o histórico dessa pessoa continua guardado.

## Configurar os e-mails (Gmail)

1. Crie uma conta Gmail só da biblioteca.
2. Ative a **Verificação em duas etapas** na conta Google.
3. Gere uma **senha de app** em <https://myaccount.google.com/apppasswords>.
4. No sistema: *Configurações → Servidor de e-mail*. Coloque o e-mail e a senha de app e clique em **Salvar**. Depois use **Enviar e-mail de teste**.
5. Em *Lembretes automáticos*, ligue o envio e escolha horário e frequência. O quadro azul resume em português simples o que vai acontecer.

Na nuvem, os lembretes saem sozinhos no horário. Instalado no computador da escola, ele precisa estar ligado: se estiver desligado no horário marcado, os lembretes saem assim que o sistema for aberto.

## Dados e cópias de segurança

- **Na nuvem:** os dados ficam no Supabase. Baixe uma cópia por semana em *Configurações → Baixar cópia de segurança*.
- **No computador da escola:** os dados ficam na pasta `dados/banco`, e uma cópia diária vai para `dados/copias-de-seguranca/` (as últimas 14).
- **Para restaurar uma cópia (`.json`)** num banco novo e vazio:
  ```
  npm run restaurar -- caminho\biblioteca-AAAA-MM-DD.json
  ```
  Para restaurar na nuvem, defina antes a `DATABASE_URL` no terminal (veja a próxima seção). A restauração só funciona num banco vazio, para nunca sobrescrever dados por engano.

## A direção esqueceu a senha

Se for uma bibliotecária, a direção resolve pela aba **Equipe → Nova senha**. Se for a própria direção, abra o terminal na pasta do projeto e rode:

```
npm run redefinir-senha                       (mostra os nomes de usuário)
npm run redefinir-senha -- rosangela.ferreira
```

Para o sistema na nuvem, rode antes, no mesmo terminal (PowerShell), com o endereço do Supabase:

```
$env:DATABASE_URL="postgresql://…:6543/postgres"
```

A senha vira **biblioteca** e o sistema pede uma nova no próximo acesso. Nenhum dado é apagado.

## Estrutura

```
biblioteca/
├── iniciar.bat           # liga o sistema com dois cliques (Windows)
├── instalar-chromebook.sh  # instalação no Chromebook / Linux
├── vercel.json           # publicação na Vercel (região, rotas, lembretes)
├── api/index.js          # entrada do sistema na Vercel
├── Dockerfile            # opcional: rodar em qualquer serviço com Docker
├── src/
│   ├── app.js            # rotas da API, login e permissões
│   ├── server.js         # servidor para rodar no computador da escola
│   ├── db.js             # banco (Supabase ou PGlite) e configurações padrão
│   ├── lembretes.js      # lembretes por e-mail e cópias de segurança
│   ├── datas.js
│   ├── restaurar.js
│   └── redefinir-senha.js
├── public/               # interface (index.html, app.js, estilo.css, fontes/)
├── tests/                # testes automatizados (npm test)
└── dados/                # criado automaticamente (banco + cópias)
```

Para mudar a porta: `set PORT=8080` antes do `npm start`.
