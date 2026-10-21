export default class ParticipanteEntity {
  #id;
  #dtEntrada;
  #dtSaida;
  #ordem;
  #saldo;
  #salaId;
  #usuarioId;

  get id() {
    return this.#id;
  }
  set id(value) {
    this.#id = value;
  }

  get dtEntrada() {
    return this.#dtEntrada;
  }
  set dtEntrada(value) {
    this.#dtEntrada = value;
  }

  get dtSaida() {
    return this.#dtSaida;
  }
  set dtSaida(value) {
    this.#dtSaida = value;
  }

  get ordem() {
    return this.#ordem;
  }
  set ordem(value) {
    this.#ordem = value;
  }

  get saldo() {
    return this.#saldo;
  }
  set saldo(value) {
    this.#saldo = value;
  }

  get salaId() {
    return this.#salaId;
  }
  set salaId(value) {
    this.#salaId = value;
  }

  get usuarioId() {
    return this.#usuarioId;
  }
  set usuarioId(value) {
    this.#usuarioId = value;
  }

  constructor(id, dtEntrada, dtSaida, ordem, saldo, salaId, usuarioId) {
    this.#id = id;
    this.#dtEntrada = dtEntrada;
    this.#dtSaida = dtSaida;
    this.#ordem = ordem;
    this.#saldo = saldo;
    this.#salaId = salaId;
    this.#usuarioId = usuarioId;
  }

  static toMap(row) {
    return new ParticipanteEntity(
      row["par_id"],
      row["par_dtentrada"],
      row["par_dtsaida"],
      row["par_ordem"],
      row["par_saldo"],
      row["sal_id"],
      row["usu_id"],
    );
  }
}
