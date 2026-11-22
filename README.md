# FIPP21

Plataforma multiplayer do jogo **21 (Blackjack)**, desenvolvida como projeto bimestral utilizando **Next.js/React** no frontend e **Node.js/Express** no backend.

## Sobre o projeto

O FIPP21 é uma plataforma multiplayer onde usuários podem criar uma conta, realizar login, criar salas de jogo ou entrar em salas existentes através de um código.
Quando uma partida é iniciada, os participantes jogam individualmente contra o dealer seguindo as regras do Blackjack.
O sistema utiliza **WebSocket** para comunicação em tempo real durante as partidas.

## Tecnologias
### Frontend
- Next.js
- React
- Context API
- WebSocket

### Backend
- Node.js
- Express
- API RESTful
- JWT
- Swagger
- WebSocket

### Banco de dados
- MySQL

### API externa
- [Deck of Cards API](https://deckofcardsapi.com/)

## Funcionalidades

### Área pública
- Cadastro de usuário
- Login
- Página institucional da plataforma

### Área restrita
- Criação de salas
- Visualização das salas do usuário
- Entrada em salas através de código
- Saída de salas
- Sistema de apostas
- Partidas multiplayer em tempo real
- Implementação das regras do Blackjack

## Regras principais

- Cada participante inicia com saldo de **1000**.
- Apenas participantes com saldo superior a **10** podem jogar.
- Cada jogador compete individualmente contra o dealer.
- Cada jogador realiza sua própria aposta.
- Os jogadores podem solicitar novas cartas ou parar.
- O jogador que ultrapassar 21 perde automaticamente.
- O dealer compra cartas enquanto possuir **16 pontos ou menos**.
- O dealer para com **17 pontos ou mais**.
- Em caso de empate, o jogador recebe sua aposta de volta.
- Vitórias normais possuem pagamento de **1:1**.
- Blackjack natural possui pagamento de **3:2**.

## Status

🚧 Em desenvolvimento.

## Como executar o backend

1. Use Node.js 18 ou superior e um banco MySQL.
2. Crie o banco e execute [banco.sql](backend/database/banco.sql). Em bancos já existentes, confira o modelo antes de executar qualquer script.
3. Execute também [ajustes_blackjack.sql](backend/database/ajustes_blackjack.sql) no banco. Ele amplia os status de `tb_turno` para registrar empate, blackjack e a parada do dealer. Sem esse ajuste, o backend não inicia novas rodadas.
4. Na pasta `backend`, copie `.env.exemplo` para `.env` e preencha as configurações do banco e `JWT_SECRET`. Para um frontend em outra origem, configure `FRONTEND_ORIGIN`, por exemplo `http://localhost:3000`.
5. Execute `npm install` e `npm start` na pasta `backend`. A API utiliza a porta 5000 e a documentação fica em `http://localhost:5000/docs`.

Para testar o fluxo sem o frontend definitivo, abra `http://localhost:5000/teste`. A página permite cadastrar, entrar, criar ou acessar salas e acompanhar as cartas. Para testar mais de um jogador, use perfis ou navegadores diferentes.

Novos cadastros armazenam a senha com hash. Senhas antigas em texto são convertidas após um login bem-sucedido. O login continua retornando o token e também o envia no cookie HTTP-only `token-pfs2`; `GET /usuario/me` retorna o usuário autenticado sem a senha.

## Fluxo do jogo

- `POST /sala` cria uma sala e retorna `salaId`; `POST /sala/entrar` recebe `{ "codigoSala": 1 }` e inicia a primeira rodada se necessário. Quem entra durante uma rodada aguarda a próxima.
- `POST /blackjack/rodada`, com `{ "salaId": 1 }`, inicia a próxima rodada. O endpoint existente `POST /rodada/:salaId` usa o mesmo fluxo.
- `POST /blackjack/apostar` recebe `salaId` e `valor`. Após todas as apostas, as cartas são distribuídas; `POST /blackjack/iniciar-distribuicao` permite iniciar antes, deixando de fora quem não apostou.
- `POST /blackjack/pedir-carta` e `POST /blackjack/parar` recebem `salaId`. `GET /blackjack/estado/:salaId` consulta a rodada. A carta oculta do dealer não é enviada enquanto estiver escondida.
- `POST /sala/sair` recebe `codigoSala` e informa a saída à rodada. Ao final, apostas, turnos, cartas e saldos são gravados em uma transação. As cartas e o turno do dealer usam `par_id` nulo.
- Cada rodada usa um novo baralho da Deck of Cards API. Se uma compra falhar, `POST /blackjack/continuar` recebe `salaId` para tentar retomar a distribuição ou a jogada do dealer.

Se a entrada na sala for concluída, mas a criação da rodada falhar, a resposta informa o erro e o `participanteId`: o usuário continua na sala e pode tentar `POST /blackjack/rodada` novamente.

As rodadas em andamento permanecem na memória de **uma única instância** do servidor; os resultados são persistidos ao término. Se o servidor reiniciar durante uma rodada, ela não pode ser retomada: um participante pode usar `POST /blackjack/cancelar-interrompida` com `salaId` para encerrá-la sem pagamentos, desde que ainda não haja dados gravados. Em seguida, pode iniciar outra rodada. Uma falha de conexão com a API de cartas também pode exigir nova tentativa.

## WebSocket

Após o login, conecte ao mesmo servidor em `ws://localhost:5000/ws` com o cookie de autenticação e envie:

```json
{"tipo":"entrar","salaId":1}
```

O servidor confirma com `inscrito` apenas se o usuário estiver ativo na sala. Eventos `rodada`, `participante_entrou`, `participante_saiu` e `rodada_cancelada` são enviados aos inscritos daquela sala. Ações do jogo continuam sendo feitas pela API REST. Em navegador, configure `FRONTEND_ORIGIN` para permitir uma origem diferente da API.

## Testes

Na pasta `backend`, execute `npm test`. Para incluir o teste MySQL em tabelas temporárias, configure o `.env` e execute no PowerShell:

```powershell
$env:FIPP21_TEST_DB = "1"
npm test
```

O teste cria tabelas temporárias isoladas na conexão e não altera as tabelas existentes.

## Projeto acadêmico

Projeto desenvolvido como atividade bimestral da **FIPP/UNOESTE**.
