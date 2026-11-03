export default class RodadaEntity {
  #id;
  #codigoBaralho;
  #dtInicio;
  #dtFim;
  #salaId;

  get id() {
    return this.#id;
  }
  set id(value) {
    this.#id = value;
  }

  get codigoBaralho() {
    return this.#codigoBaralho;
  }
  set codigoBaralho(value) {
    this.#codigoBaralho = value;
  }

  get dtInicio() {
    return this.#dtInicio;
  }
  set dtInicio(value) {
    this.#dtInicio = value;
  }

  get dtFim() {
    return this.#dtFim;
  }
  set dtFim(value) {
    this.#dtFim = value;
  }

  get salaId() {
    return this.#salaId;
  }
  set salaId(value) {
    this.#salaId = value;
  }

  constructor(id, codigoBaralho, dtInicio, dtFim, salaId) {
    this.#id = id;
    this.#codigoBaralho = codigoBaralho;
    this.#dtInicio = dtInicio;
    this.#dtFim = dtFim;
    this.#salaId = salaId;
  }

  validar() {
    if (this.#codigoBaralho && this.#dtInicio && this.#salaId) {
      return true;
    }

    return false;
  }

  static toMap(row) {
    return new RodadaEntity(
      row["rod_id"],
      row["rod_codigobaralho"],
      row["rod_dtinicio"],
      row["rod_dtfim"],
      row["sal_id"],
    );
  }
}
