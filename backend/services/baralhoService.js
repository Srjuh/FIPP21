import CartaEntity from "../entities/cartaEntity.js";

export default class BaralhoService {
    async criarBaralho(){
        let baralho = await this.#requisitar("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");

        if(!baralho.success || !baralho.deck_id){
            throw new ErroBaralho("A Deck of Cards API não retornou um baralho válido.");
        }

        return baralho.deck_id;
    }

    async comprarCartas(deckId, quantidade){
        let query = new URLSearchParams({ count: String(quantidade) });
        let resultado = await this.#requisitar(`https://deckofcardsapi.com/api/deck/${encodeURIComponent(deckId)}/draw/?${query}`);

        if(!resultado.success || !Array.isArray(resultado.cards) || resultado.cards.length !== quantidade){
            throw new ErroBaralho("A Deck of Cards API não conseguiu comprar as cartas solicitadas.");
        }

        return resultado;
    }

    criarBaralhoDaRodada(codigo){
        return {
            comprar: async () => (await this.#cartasDaApi(codigo, 1))[0],
            comprarVarias: quantidade => this.#cartasDaApi(codigo, quantidade)
        };
    }

    async #cartasDaApi(codigo, quantidade){
        const resultado = await this.comprarCartas(codigo, quantidade);
        try {
            return resultado.cards.map(carta => {
                if(typeof carta.code !== "string" || typeof carta.image !== "string" ||
                    !["SPADES", "HEARTS", "DIAMONDS", "CLUBS"].includes(carta.suit)){
                    throw new Error("Dados da carta inválidos.");
                }
                return CartaEntity.fromDeckApi(carta);
            });
        } catch(erro) {
            throw new ErroBaralho("A Deck of Cards API retornou cartas inválidas.", { cause: erro });
        }
    }

    async #requisitar(url){
        try {
            let resposta = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if(!resposta.ok){
                throw new Error(`HTTP ${resposta.status}`);
            }
            return await resposta.json();
        } catch(erro) {
            throw new ErroBaralho("Não foi possível acessar a Deck of Cards API.", { cause: erro });
        }
    }
}

export class ErroBaralho extends Error {}
