import { REGRAS, STATUS } from "./blackjackConfig.js";
import ErroBlackjack from "./erroBlackjack.js";

// Regras puras do blackjack: não acessam banco, API nem estado da rodada.
// Recebem os dados e devolvem a resposta, por isso são fáceis de testar.
export default class RegrasBlackjack {

    // Apenas participantes com saldo SUPERIOR a 10 podem jogar
    static jogadorPodeJogar(saldo) {
        return Number(saldo) > REGRAS.SALDO_MINIMO;
    }

    // Valida e devolve a aposta já como número com 2 casas (DECIMAL(10,2))
    static validarAposta(saldo, valor) {
        let aposta = Number(valor);

        if(valor === null || valor === undefined || valor === "" || !Number.isFinite(aposta)){
            throw new ErroBlackjack("APOSTA_INVALIDA", "Valor da aposta inválido!", 400);
        }

        if(RegrasBlackjack.arredondar(aposta) !== aposta){
            throw new ErroBlackjack("APOSTA_INVALIDA", "A aposta deve ter no máximo 2 casas decimais!", 400);
        }

        if(aposta < REGRAS.APOSTA_MINIMA){
            throw new ErroBlackjack("APOSTA_INVALIDA", "A aposta mínima é " + REGRAS.APOSTA_MINIMA + "!", 400);
        }

        if(aposta > Number(saldo)){
            throw new ErroBlackjack("SALDO_INSUFICIENTE", "Saldo insuficiente para essa aposta!", 400);
        }

        return aposta;
    }

    // O jogador pode pedir carta enquanto não estourou e não chegou em 21
    static jogadorPodePedirCarta(mao) {
        return !mao.estourou && mao.pontos < REGRAS.LIMITE_PONTOS;
    }

    // Dealer compra com 16 ou menos e para com 17 ou mais (inclusive 17 "soft")
    static dealerDeveComprar(mao) {
        return mao.pontos < REGRAS.DEALER_PARA_EM;
    }

    // Compara a mão do jogador com a do dealer.
    // Devolve STATUS.BLACKJACK, GANHOU, PERDEU ou EMPATOU (vale para o jogador).
    static resolverResultado(maoJogador, maoDealer) {
        // Estourou perde sempre, mesmo que o dealer estoure depois
        if(maoJogador.estourou){
            return STATUS.PERDEU;
        }

        // Blackjack natural vale mais que 21 feito com 3 ou mais cartas
        if(maoJogador.ehBlackjack && maoDealer.ehBlackjack){
            return STATUS.EMPATOU;
        }

        if(maoJogador.ehBlackjack){
            return STATUS.BLACKJACK;
        }

        if(maoDealer.ehBlackjack){
            return STATUS.PERDEU;
        }

        if(maoDealer.estourou){
            return STATUS.GANHOU;
        }

        if(maoJogador.pontos > maoDealer.pontos){
            return STATUS.GANHOU;
        }

        if(maoJogador.pontos < maoDealer.pontos){
            return STATUS.PERDEU;
        }

        return STATUS.EMPATOU;
    }

    // Quanto o saldo do jogador varia no fim da rodada (positivo = ganhou, negativo = perdeu).
    // Empate devolve a aposta, então a variação é 0.
    static calcularLucro(aposta, resultado) {
        if(resultado === STATUS.BLACKJACK){
            return RegrasBlackjack.arredondar(aposta * REGRAS.PAGAMENTO_BLACKJACK);
        }

        if(resultado === STATUS.GANHOU){
            return RegrasBlackjack.arredondar(aposta * REGRAS.PAGAMENTO_NORMAL);
        }

        if(resultado === STATUS.EMPATOU){
            return 0;
        }

        return -aposta;
    }

    // Evita erros de ponto flutuante (ex.: 0.1 + 0.2) mantendo 2 casas decimais
    static arredondar(valor) {
        return Math.round((valor + Number.EPSILON) * 100) / 100;
    }
}
