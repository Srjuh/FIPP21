export default class CartaEntity {

    #id; #codigo; #imagem; #ordem; #visivel; #valor; #naipe; #parId; #rodId;

    get id(){return this.#id;}
    set id(value){this.#id = value;}

    get codigo(){return this.#codigo;}
    set codigo(value){this.#codigo = value;}

    get imagem(){return this.#imagem;}
    set imagem(value){this.#imagem = value;}

    get ordem(){return this.#ordem;}
    set ordem(value){this.#ordem = value;}

    get visivel(){return this.#visivel;}
    set visivel(value){this.#visivel = value;}

    get valor(){return this.#valor;}
    set valor(value){this.#valor = value;}

    get naipe(){return this.#naipe;}
    set naipe(value){this.#naipe = value;}

    // par_id nulo significa que a carta é do dealer
    get parId(){return this.#parId;}
    set parId(value){this.#parId = value;}

    get rodId(){return this.#rodId;}
    set rodId(value){this.#rodId = value;}

    // O Ás é guardado como 11, a mão reduz para 1 quando precisa
    get ehAs(){return this.#valor === 11;}

    get estaVisivel(){return this.#visivel === "S";}

    constructor(id, codigo, imagem, ordem, visivel, valor, naipe, parId, rodId) {
        this.#id = id;
        this.#codigo = codigo;
        this.#imagem = imagem;
        this.#ordem = ordem;
        this.#visivel = visivel;
        this.#valor = valor;
        this.#naipe = naipe;
        this.#parId = parId;
        this.#rodId = rodId;
    }

    static toMap(row) {
        return new CartaEntity(row["car_id"], row["car_codigo"], row["car_imagem"], row["car_ordem"],
            row["car_visivel"], row["car_valor"], row["car_naipe"], row["par_id"], row["rod_id"]);
    }

    // Converte uma carta da Deck of Cards API: { code, image, value, suit }
    static fromDeckApi(carta) {
        return new CartaEntity(0, carta.code, carta.image, null, "S",
            CartaEntity.valorDaCartaApi(carta.value), carta.suit, null, null);
    }

    // A API devolve "ACE", "2" a "10", "JACK", "QUEEN" e "KING"
    static valorDaCartaApi(value) {
        if(value === "ACE") return 11;
        if(value === "JACK" || value === "QUEEN" || value === "KING") return 10;

        let numero = Number(value);

        if(!Number.isInteger(numero) || numero < 2 || numero > 10){
            throw new Error("Valor de carta inválido: " + value);
        }

        return numero;
    }
}
