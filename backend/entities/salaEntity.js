export default class SalaEntity {
    #salaId; #salaNome; #usuId;
    
    get salaId(){return this.#salaId;}
    set salaId(value){this.#salaId = value;}

    get salaNome(){return this.#salaNome;}
    set salaNome(value){this.#salaNome = value;}
    
    get usuId(){return this.#usuId;}
    set usuId(value){this.#usuId = value;}
    
    constructor(salaId, salaNome, usuId){
        this.#salaId = salaId;
        this.#salaNome = salaNome;
        this.#usuId = usuId;
    }

    static toMap(row) {
        return new SalaEntity(row["sal_id"], row["sal_nome"], row["usu_id"]);
    }
}
