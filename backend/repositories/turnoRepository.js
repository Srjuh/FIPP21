import Database from "../database/database.js";

export default class TurnoRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  // Verifica se existem participantes ainda jogando.
  async obterTurnosEmAndamento(rodadaId) {
    let sql = "select * from tb_turno where rod_id = ? and tur_status = ?";
    let valores = [rodadaId, "Jogando"];
    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }

  // Busca os turnos da rodada
  async obterTurnosRodada(rodadaId) {
    let sql = "select * from tb_turno where rod_id = ?";
    let valores = [rodadaId];
    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }

  // O resto da implementação depende das regras e integração. Além de ser necessário verificar se os participantes estão apostando antes de realmente encerrar o turno.
}
