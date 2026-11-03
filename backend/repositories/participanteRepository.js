import Database from "../database/database.js";

export default class ParticipanteRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  // Busca participantes de uma sala
  async obterParticipantesSala(salaId) {
    let sql =
      "select * from tb_participante where sal_id = ? and par_dtsaida is NULL";
    let valores = [salaId];

    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }

  // Identifica se o parcipante pode participar da rodada antes de registrar a oposta
  async obterParticipantesValidos(rodadaId) {
    let sql = `Select p.* 
      from tb_participante p 
      inner join tb_rodada r on p.sal_id = r.sal_id 
      where r.rod_id = ? 
        and p.par_dtentrada <= r.rod_dtinicio 
        and p.par_dtsaida is null 
        and p.par_saldo > 10`;
    let valores = [rodadaId];
    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }
}
