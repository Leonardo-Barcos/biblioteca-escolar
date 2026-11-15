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

1. Instale o **Node.js LTS** (versão 22.13 ou mais nova) em <https://nodejs.org>.
2. Copie a pasta `biblioteca` para o computador, por exemplo em `C:\Biblioteca`.
3. Dê dois cliques em **`iniciar.bat`**. Na primeira vez ele instala o que precisa e abre o navegador.
4. No primeiro acesso, o sistema pede para criar a **conta da direção**. Depois disso, a direção cadastra as bibliotecárias na aba **Equipe**.
5. Deixe a janela preta aberta enquanto usar o sistema. Pode minimizar, mas não feche.

**Para ligar sozinho com o Windows:** aperte `Win + R`, digite `shell:startup`, Enter, e coloque ali um atalho para o `iniciar.bat`.

**Para usar em outros computadores ou no celular da escola** (mesma rede Wi-Fi): a janela preta mostra um endereço como `http://192.168.0.15:3000`. É só abrir esse endereço no navegador do outro aparelho. Se não abrir, libere a porta 3000 no Firewall do Windows quando ele perguntar.

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
├── iniciar.bat           # liga o sistema com dois cliques
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
