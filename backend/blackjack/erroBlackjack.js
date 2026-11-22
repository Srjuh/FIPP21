// Erro lançado quando uma jogada viola as regras do blackjack.
// O "status" segue os códigos HTTP usados nos controllers, para facilitar o uso depois:
// res.status(ex.status).json({msg: ex.message})

export default class ErroBlackjack extends Error {

    #codigo; #status;

    get codigo(){return this.#codigo;}
    set codigo(value){this.#codigo = value;}

    get status(){return this.#status;}
    set status(value){this.#status = value;}

    constructor(codigo, mensagem, status = 400) {
        super(mensagem);
        this.name = "ErroBlackjack";
        this.#codigo = codigo;
        this.#status = status;
    }
}
