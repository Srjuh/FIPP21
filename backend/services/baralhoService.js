export default class BaralhoService {
    async criarBaralho(){
        let resposta = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/");

        if(!resposta.ok){
            throw new Error("Não foi possível criar um baralho na Deck of Cards API.");
        }

        let baralho = await resposta.json();

        if(!baralho.success || !baralho.deck_id){
            throw new Error("A Deck of Cards API não retornou um baralho válido.");
        }

        return baralho.deck_id;
    }

    async comprarCartas(deckId, quantidade){
        let query = new URLSearchParams({ count: String(quantidade) });
        let resposta = await fetch(`https://www.deckofcardsapi.com/api/deck/${encodeURIComponent(deckId)}/draw/?${query}`);

        if(!resposta.ok){
            throw new Error("Não foi possível comprar cartas na Deck of Cards API.");
        }

        let resultado = await resposta.json();

        if(!resultado.success){
            throw new Error("A Deck of Cards API não conseguiu comprar as cartas.");
        }

        return resultado;
    }
}
