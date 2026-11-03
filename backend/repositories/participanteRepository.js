import Database from "../database/database.js";
import ParticipanteEntity from "../entities/participanteEntity.js";

export default class ParticipanteRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  //busca participantes de uma sala
  async obterParticipantesSala(salaId) {
    let sql =
      "select * from tb_participante where sal_id = ? and par_dtsaida is NULL";
    let valores = [salaId];

    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }
}
