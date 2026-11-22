import { randomInt } from "node:crypto";
import CartaEntity from "../entities/cartaEntity.js";

// Baralho local com o mesmo formato de cartas da Deck of Cards API.
// A rodada só precisa de um objeto com o método "async comprar()" que devolve uma CartaEntity,
// Integração com a API pode criar uma classe com esse mesmo método

const VALORES = ["ACE", "2", "3", "4", "5", "6", "7", "8", "9", "10", "JACK", "QUEEN", "KING"];
const NAIPES = ["SPADES", "HEARTS", "DIAMONDS", "CLUBS"];

// Código da API: valor + naipe (AS = Ás de espadas, 0H = 10 de copas)
const LETRA_VALOR = { ACE: "A", "10": "0", JACK: "J", QUEEN: "Q", KING: "K" };
const LETRA_NAIPE = { SPADES: "S", HEARTS: "H", DIAMONDS: "D", CLUBS: "C" };

export default class BaralhoLocal {

    #cartas;
    #quantidadeBaralhos;
    #reabastece;

    // Quantidade de cartas que ainda não foram compradas
    get restantes(){return this.#cartas.length;}

    constructor(quantidadeBaralhos = 1) {
        this.#quantidadeBaralhos = quantidadeBaralhos;
        this.#reabastece = true;
        this.#cartas = BaralhoLocal.#criarEmbaralhado(quantidadeBaralhos);
    }

    // Baralho com ordem definida (ex.: ["AS", "KH"])
    // A primeira carta da lista é a primeira a ser comprada
    static deOrdemFixa(codigos) {
        let baralho = new BaralhoLocal(1);
        baralho.#cartas = codigos.map(codigo => BaralhoLocal.criarCarta(codigo));
        baralho.#reabastece = false;
        return baralho;
    }

    // Monta uma carta a partir do código da API (ex.: "AS", "0H", "KD")
    static criarCarta(codigo) {
        let letraValor = codigo.slice(0, -1);
        let letraNaipe = codigo.slice(-1);

        let valor = VALORES.find(v => (LETRA_VALOR[v] ?? v) === letraValor);
        let naipe = NAIPES.find(n => LETRA_NAIPE[n] === letraNaipe);

        if(!valor || !naipe){
            throw new Error("Código de carta inválido: " + codigo);
        }

        return CartaEntity.fromDeckApi({
            code: codigo,
            image: "https://deckofcardsapi.com/static/img/" + codigo + ".png",
            value: valor,
            suit: naipe
        });
    }

    async comprar() {
        if(this.#cartas.length === 0){
            if(!this.#reabastece){
                throw new Error("O baralho acabou!");
            }

            this.#cartas = BaralhoLocal.#criarEmbaralhado(this.#quantidadeBaralhos);
        }

        return this.#cartas.shift();
    }

    static #criarEmbaralhado(quantidadeBaralhos) {
        let cartas = [];

        for(let i = 0; i < quantidadeBaralhos; i++){
            for(let naipe of NAIPES){
                for(let valor of VALORES){
                    cartas.push(BaralhoLocal.criarCarta((LETRA_VALOR[valor] ?? valor) + LETRA_NAIPE[naipe]));
                }
            }
        }

        // Fisher-Yates com número aleatório seguro
        for(let i = cartas.length - 1; i > 0; i--){
            let j = randomInt(i + 1);
            [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
        }

        return cartas;
    }
}
