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

## Projeto acadêmico

Projeto desenvolvido como atividade bimestral da **FIPP/UNOESTE**.
