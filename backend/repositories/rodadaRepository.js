import Database from "../database/database.js";

export default class RodadaRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  // Cria uma rodada
  async criarRodada(entidade) {
    let sql =
      "insert into tb_rodada (rod_codigobaralho, rod_dtinicio, rod_dtfim, sal_id) values (?, ?, ?, ?)";
    let valores = [
      entidade.codigoBaralho,
      entidade.dtInicio,
      entidade.dtFim,
      entidade.salaId,
    ];

    let idGerado = await this.#banco.ExecutaComandoLastInserted(sql, valores);

    if (idGerado) {
      entidade.id = idGerado;
      return true;
    }

    return false;
  }

  // Verificar se a sala possui uma rodada em andamento
  async obterRodadaEmAndamento(salaId) {
    let sql =
      "select * from tb_rodada where sal_id = ? and rod_dtinicio is not NULL and rod_dtfim is NULL";
    let valores = [salaId];

    let result = await this.#banco.ExecutaComando(sql, valores);

    return result;
  }

  async encerrarRodada(rodadaId) {
    let sql =
      "update tb_rodada set rod_dtfim = current_timestamp where rod_id = ? and rod_dtfim is NULL";
    let valores = [rodadaId];

    let result = await this.#banco.ExecutaComandoNonQuery(sql, valores);

    return result;
  }
}
