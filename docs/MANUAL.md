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
| Banco de dados | SQLite embutido no Node (`node:sqlite`), um único arquivo, sem instalar nada a mais |
| E-mail | Nodemailer (Gmail ou qualquer SMTP) |
| Interface | HTML, CSS e JavaScript puros (cerca de 130 KB no total, já contando a fonte), sem framework e sem etapa de build |
| Fonte | Atkinson Hyperlegible (feita para facilitar a leitura), servida localmente e funciona sem internet |

São só 2 dependências. Funciona offline; a internet só é usada para enviar e-mails e buscar o ISBN.

## Instalação no computador da escola (Windows)

**Uma vez só**
1. Instale o **Node.js LTS** (o botão verde em <https://nodejs.org>), clicando em *Avançar* até o fim.
2. Copie a pasta do sistema para **`C:\Biblioteca`**. Evite a Área de Trabalho e pastas do OneDrive.
3. Dê dois cliques em **`instalar.bat`**. Ele confere o Node, instala o sistema, cria os atalhos e abre a biblioteca.
4. No primeiro acesso, crie a **conta da direção**. Depois, cadastre as bibliotecárias na aba **Equipe**.

O instalador cria:
- **"Biblioteca" na Área de Trabalho e no menu Iniciar:** abre o sistema numa janela própria, como um programa. Se o sistema estiver desligado, o ícone liga sozinho.
- **"Biblioteca (ligar sistema)" na inicialização do Windows:** liga o sistema em segundo plano assim que o computador é ligado, para os lembretes saírem no horário.

Não fica nenhuma janela preta aberta. O sistema roda escondido, e as mensagens técnicas ficam em `dados\servidor.log`.

**No dia a dia:** clicar no ícone **Biblioteca** → clicar no próprio nome → digitar a senha.

**Recomendado:** em Configurações → Sistema → Energia, deixe a suspensão em **Nunca** quando o computador estiver ligado na tomada, para os lembretes saírem no horário.

**Se algo não abrir:** reinicie o computador. Se continuar, dê dois cliques em `iniciar.bat`: ele abre o sistema numa janela preta que mostra a mensagem de erro.

**Para usar em outros aparelhos da escola** (mesma rede): quando o Windows perguntar sobre o Firewall, marque *Redes privadas* e permita. O endereço é o IP do computador, por exemplo `http://192.168.0.15:3000`.

## Instalação em Chromebook (Chrome OS)

O Chrome OS não roda o Node diretamente. O sistema funciona dentro do **ambiente Linux** que vem no Chromebook.

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

O computador precisa estar ligado para enviar. Se estiver desligado no horário marcado, os lembretes saem assim que o sistema for aberto.

## Dados e cópias de segurança

- Tudo fica em `dados/biblioteca.db`.
- Cópias automáticas diárias ficam em `dados/copias-de-seguranca/`.
- Para restaurar: feche o sistema, troque o `biblioteca.db` por uma cópia (renomeando para `biblioteca.db`) e abra de novo.
- Recomendação: de vez em quando, baixe uma cópia em *Configurações → Cópia de segurança* e guarde fora do computador.

## A direção esqueceu a senha

Se for uma bibliotecária, a direção resolve pela aba **Equipe → Nova senha**. Se for a própria direção, feche o sistema, abra o Prompt de Comando na pasta e rode:

```
npm run redefinir-senha                       (mostra os nomes de usuário)
npm run redefinir-senha -- rosangela.ferreira
```

A senha vira **biblioteca** e o sistema pede uma nova no próximo acesso. Nenhum dado é apagado.

## Estrutura

```
biblioteca/
├── instalar.bat          # instalação no Windows (atalhos e início automático)
├── iniciar.bat           # liga o sistema mostrando a janela (para diagnosticar problemas)
├── windows/              # scripts e ícone usados pelo instalador do Windows
├── instalar-chromebook.sh  # instalação no Chromebook / Linux
├── src/
│   ├── server.js         # rotas da API
│   ├── db.js             # banco SQLite e configurações padrão
│   ├── lembretes.js      # envio automático de e-mails e cópia diária
│   ├── datas.js
│   └── redefinir-senha.js
├── public/               # interface (index.html, app.js, estilo.css, fontes/)
├── tests/                # testes automatizados (npm test)
└── dados/                # criado automaticamente (banco + cópias)
```

Para mudar a porta: `set PORT=8080` antes do `npm start`.
