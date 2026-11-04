import { REGRAS } from "./blackjackConfig.js";

export default class MaoBlackjack {

    #cartas;

    get cartas(){return [...this.#cartas];}

    constructor(cartas = []) {
        this.#cartas = [...cartas];
    }

    adicionar(carta) {
        this.#cartas.push(carta);
    }

    // Soma considerando todas as cartas (inclusive as viradas para baixo)
    get pontos(){return MaoBlackjack.calcular(this.#cartas).pontos;}

    // Soma considerando só o que os outros jogadores conseguem ver
    get pontosVisiveis(){
        return MaoBlackjack.calcular(this.#cartas.filter(c => c.estaVisivel)).pontos;
    }

    // "Soft": ainda existe um Ás valendo 11 na soma
    get ehSoft(){return MaoBlackjack.calcular(this.#cartas).soft;}

    get estourou(){return this.pontos > REGRAS.LIMITE_PONTOS;}

    // Blackjack natural: 21 com exatamente duas cartas
    get ehBlackjack(){
        return this.#cartas.length === 2 && this.pontos === REGRAS.LIMITE_PONTOS;
    }

    // Cada Ás começa valendo 11 e vira 1 (um por vez) enquanto a soma passar de 21
    static calcular(cartas) {
        let total = 0;
        let ases = 0;

        for(let carta of cartas){
            total += carta.valor;

            if(carta.ehAs){
                ases++;
            }
        }

        while(total > REGRAS.LIMITE_PONTOS && ases > 0){
            total -= 10;
            ases--;
        }

        return { pontos: total, soft: ases > 0 };
    }
}
