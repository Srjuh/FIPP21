import MaoBlackjack from "./maoBlackjack.js";
import RegrasBlackjack from "./regrasBlackjack.js";
import ErroBlackjack from "./erroBlackjack.js";
import { FASES, STATUS, REGRAS } from "./blackjackConfig.js";

// Controla UMA rodada de blackjack de uma sala (fica em memória enquanto a rodada acontece).
//
// Fluxo:  APOSTAS -> JOGADORES -> FINALIZADA
//   1. APOSTAS: cada participante aposta (apostar). Quando todos apostam a distribuição começa sozinha,
//      ou o controle externo chama iniciarDistribuicao() (ex.: tempo esgotado).
//   2. JOGADORES: cada um, na sua ordem, pede carta ou para.
//   3. Quando o último jogador termina, o dealer joga e os pagamentos são calculados sozinhos.
//
// "baralho" é qualquer objeto com "async comprar()" que devolve uma CartaEntity (BaralhoLocal ou a Deck of Cards API).
// "participantes" é uma lista de { parId, saldo, ordem } (ordem é opcional, se faltar vale a posição na lista).
export default class RodadaBlackjack {

    #rodId;
    #baralho;
    #fase;
    #jogadores;
    #dealer;
    #fila;

    get rodId(){return this.#rodId;}
    get fase(){return this.#fase;}

    constructor(rodId, baralho, participantes) {
        this.#rodId = rodId;
        this.#baralho = baralho;
        this.#fase = FASES.APOSTAS;
        this.#fila = Promise.resolve();
        this.#dealer = { mao: new MaoBlackjack(), proximaOrdem: 1 };
        this.#jogadores = [];

        participantes.forEach((p, indice) => {
            // Quem não tem saldo suficiente não entra na rodada
            if(!RegrasBlackjack.jogadorPodeJogar(p.saldo)){
                return;
            }

            this.#jogadores.push({
                parId: p.parId,
                ordem: p.ordem ?? indice + 1,
                saldo: Number(p.saldo),     // o mysql2 devolve DECIMAL como texto
                aposta: 0,
                lucro: 0,
                status: STATUS.AGUARDANDO,
                mao: new MaoBlackjack(),
                proximaOrdem: 1
            });
        });

        this.#jogadores.sort((a, b) => a.ordem - b.ordem);

        if(this.#jogadores.length === 0){
            throw new ErroBlackjack("SEM_JOGADORES", "Nenhum participante com saldo suficiente para jogar!", 400);
        }
    }

    // ---------------------------------------------------------------
    // Ações dos jogadores (todas devolvem o estado atualizado da rodada)
    // ---------------------------------------------------------------

    apostar(parId, valor) {
        return this.#executar(async () => {
            if(this.#fase !== FASES.APOSTAS){
                throw new ErroBlackjack("FASE_INVALIDA", "As apostas dessa rodada já foram encerradas!", 409);
            }

            let jogador = this.#buscarJogador(parId);

            if(jogador.status !== STATUS.AGUARDANDO){
                throw new ErroBlackjack("JA_APOSTOU", "O participante já apostou nessa rodada!", 409);
            }

            jogador.aposta = RegrasBlackjack.validarAposta(jogador.saldo, valor);
            jogador.status = STATUS.APOSTOU;

            if(this.#todosApostaram()){
                await this.#distribuir();
            }

            return this.obterEstado();
        });
    }

    // Encerra a fase de apostas mesmo que alguém não tenha apostado (esses ficam de fora)
    iniciarDistribuicao() {
        return this.#executar(async () => {
            if(this.#fase !== FASES.APOSTAS){
                throw new ErroBlackjack("FASE_INVALIDA", "A distribuição dessa rodada já aconteceu!", 409);
            }

            await this.#distribuir();
            return this.obterEstado();
        });
    }

    pedirCarta(parId) {
        return this.#executar(async () => {
            let jogador = this.#validarVez(parId);

            await this.#darCarta(jogador);

            if(jogador.mao.estourou){
                jogador.status = STATUS.ESTOUROU;
            } else if(!RegrasBlackjack.jogadorPodePedirCarta(jogador.mao)){
                // Chegou em 21: não há mais o que fazer, para automaticamente
                jogador.status = STATUS.PAROU;
            }

            await this.#avancar();
            return this.obterEstado();
        });
    }

    parar(parId) {
        return this.#executar(async () => {
            let jogador = this.#validarVez(parId);

            jogador.status = STATUS.PAROU;

            await this.#avancar();
            return this.obterEstado();
        });
    }

    // Participante saiu da sala (ou caiu a conexão) no meio da rodada:
    // - nas apostas: sai da rodada e a aposta dele é cancelada
    // - jogando: a mão dele para na hora e o resultado é calculado normalmente no fim
    sairDaRodada(parId) {
        return this.#executar(async () => {
            let jogador = this.#buscarJogador(parId);

            if(this.#fase === FASES.APOSTAS){
                this.#jogadores = this.#jogadores.filter(j => j !== jogador);

                if(this.#todosApostaram()){
                    await this.#distribuir();
                }
            } else if(this.#fase === FASES.JOGADORES && jogador.status === STATUS.JOGANDO){
                jogador.status = STATUS.PAROU;
                await this.#avancar();
            }

            return this.obterEstado();
        });
    }

    // ---------------------------------------------------------------
    // Consultas
    // ---------------------------------------------------------------

    // Estado que pode ser enviado para TODOS os jogadores da sala:
    // a carta virada do dealer não revela código, imagem nem valor.
    obterEstado() {
        let jogadorDaVez = this.#jogadorDaVez();

        return {
            rodId: this.#rodId,
            fase: this.#fase,
            jogadorDaVez: jogadorDaVez ? jogadorDaVez.parId : null,
            dealer: {
                pontos: this.#dealer.mao.pontosVisiveis,
                cartas: this.#dealer.mao.cartas.map(c => this.#cartaParaJson(c))
            },
            jogadores: this.#jogadores.map(j => ({
                parId: j.parId,
                ordem: j.ordem,
                aposta: j.aposta,
                saldo: j.saldo,
                lucro: j.lucro,
                status: j.status,
                pontos: j.mao.pontos,
                cartas: j.mao.cartas.map(c => this.#cartaParaJson(c))
            }))
        };
    }

    // Dados finais para gravar no banco (tb_turno e tb_participante) quando a rodada terminar
    obterResultados() {
        if(this.#fase !== FASES.FINALIZADA){
            throw new ErroBlackjack("RODADA_EM_ANDAMENTO", "A rodada ainda não terminou!", 409);
        }

        return {
            dealerPontos: this.#dealer.mao.pontos,
            jogadores: this.#jogadores
                .filter(j => j.status !== STATUS.FORA)
                .map(j => ({
                    parId: j.parId,
                    aposta: j.aposta,
                    somaCartas: j.mao.pontos,
                    status: j.status,
                    lucro: j.lucro,
                    saldoFinal: j.saldo
                }))
        };
    }

    // Todas as cartas distribuídas na rodada (dealer tem parId nulo), prontas para gravar em tb_carta
    get cartasDaRodada() {
        return [
            ...this.#dealer.mao.cartas,
            ...this.#jogadores.flatMap(j => j.mao.cartas)
        ];
    }

    // ---------------------------------------------------------------
    // Internos
    // ---------------------------------------------------------------

    // Executa uma ação de cada vez. Sem isso, dois cliques rápidos (ou duas mensagens do WebSocket)
    // poderiam comprar duas cartas porque a compra é assíncrona (pode ser uma chamada de API).
    #executar(acao) {
        let execucao = this.#fila.then(acao);
        this.#fila = execucao.catch(() => {});
        return execucao;
    }

    #buscarJogador(parId) {
        let jogador = this.#jogadores.find(j => Number(j.parId) === Number(parId));

        if(!jogador){
            throw new ErroBlackjack("PARTICIPANTE_NAO_ENCONTRADO",
                "O participante não está nessa rodada ou não tem saldo suficiente!", 404);
        }

        return jogador;
    }

    #todosApostaram() {
        return this.#jogadores.length > 0 && this.#jogadores.every(j => j.status === STATUS.APOSTOU);
    }

    // Primeiro jogador (pela ordem) que ainda está jogando
    #jogadorDaVez() {
        if(this.#fase !== FASES.JOGADORES){
            return null;
        }

        return this.#jogadores.find(j => j.status === STATUS.JOGANDO) ?? null;
    }

    #validarVez(parId) {
        if(this.#fase !== FASES.JOGADORES){
            throw new ErroBlackjack("FASE_INVALIDA", "Não é possível jogar agora!", 409);
        }

        let jogador = this.#buscarJogador(parId);

        if(this.#jogadorDaVez() !== jogador){
            throw new ErroBlackjack("NAO_E_SUA_VEZ", "Não é a vez desse participante!", 409);
        }

        return jogador;
    }

    // "alvo" é um jogador ou o dealer (os dois têm "mao" e "proximaOrdem")
    async #darCarta(alvo, visivel = true) {
        let carta = await this.#baralho.comprar();

        carta.rodId = this.#rodId;
        carta.parId = alvo.parId ?? null;
        carta.ordem = alvo.proximaOrdem++;
        carta.visivel = visivel ? "S" : "N";

        alvo.mao.adicionar(carta);
        return carta;
    }

    async #distribuir() {
        let apostadores = this.#jogadores.filter(j => j.status === STATUS.APOSTOU);

        if(apostadores.length === 0){
            throw new ErroBlackjack("SEM_APOSTAS", "Ninguém apostou nessa rodada!", 409);
        }

        // Quem não apostou fica de fora
        this.#jogadores
            .filter(j => j.status === STATUS.AGUARDANDO)
            .forEach(j => j.status = STATUS.FORA);

        this.#fase = FASES.JOGADORES;

        // Ordem padrão: 1ª carta de cada jogador, 1ª do dealer (aberta), 2ª de cada jogador, 2ª do dealer (virada)
        for(let jogador of apostadores){
            await this.#darCarta(jogador);
        }

        await this.#darCarta(this.#dealer, true);

        for(let jogador of apostadores){
            await this.#darCarta(jogador);
        }

        await this.#darCarta(this.#dealer, false);

        // Blackjack natural não precisa jogar
        for(let jogador of apostadores){
            jogador.status = jogador.mao.ehBlackjack ? STATUS.BLACKJACK : STATUS.JOGANDO;
        }

        // Dealer com blackjack natural: ninguém joga, a rodada vai direto para o pagamento
        if(REGRAS.DEALER_ESPIA_BLACKJACK && this.#dealer.mao.ehBlackjack){
            await this.#finalizar();
            return;
        }

        await this.#avancar();
    }

    // Se ainda tem alguém jogando, espera. Se não, é a vez do dealer.
    async #avancar() {
        if(this.#jogadorDaVez()){
            return;
        }

        await this.#finalizar();
    }

    async #finalizar() {
        let dealer = this.#dealer;

        // Revela a carta virada
        dealer.mao.cartas.forEach(c => c.visivel = "S");

        // O dealer só compra se existir alguém que parou sem estourar (naturais e estourados já estão decididos)
        if(this.#jogadores.some(j => j.status === STATUS.PAROU)){
            while(RegrasBlackjack.dealerDeveComprar(dealer.mao)){
                await this.#darCarta(dealer);
            }
        }

        for(let jogador of this.#jogadores){
            if(jogador.status === STATUS.FORA){
                continue;
            }

            let resultado = RegrasBlackjack.resolverResultado(jogador.mao, dealer.mao);

            jogador.lucro = RegrasBlackjack.calcularLucro(jogador.aposta, resultado);
            jogador.saldo = RegrasBlackjack.arredondar(jogador.saldo + jogador.lucro);

            // Quem estourou continua com o status "Estourou" (que já significa derrota)
            if(jogador.status !== STATUS.ESTOUROU){
                jogador.status = resultado;
            }
        }

        this.#fase = FASES.FINALIZADA;
    }

    #cartaParaJson(carta) {
        if(!carta.estaVisivel){
            return { visivel: false };
        }

        return {
            visivel: true,
            codigo: carta.codigo,
            imagem: carta.imagem,
            valor: carta.valor,
            naipe: carta.naipe
        };
    }
}
