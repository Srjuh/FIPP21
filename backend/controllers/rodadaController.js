import RodadaEntity from "../entities/rodadaEntity.js";
import RodadaRepository from "../repositories/rodadaRepository.js";
import SalaRepository from "../repositories/salaRepository.js";

export default class RodadaController {
  #repo;

  constructor() {
    this.#repo = new RodadaRepository();
  }

  async criarRodada(req, res) {
    try {
      let { salaId } = req.params;

      if (!salaId) {
        return res.status(400).json({ msg: "ID da sala não informado!" });
      }

      let sala = await new SalaRepository().obterSalaPorId(salaId);

      if (sala.length === 0) {
        return res.status(404).json({ msg: "Sala não encontrada!" });
      }

      let rodadaExiste = await this.#repo.obterRodadaEmAndamento(salaId);

      if (rodadaExiste.length > 0) {
        return res
          .status(409)
          .json({ msg: "Já existe uma rodada em andamento nesta sala!" });
      } else {
        let codigoBaralho = null;

        // Integrar a funcionalidade do baralho.

        if (!codigoBaralho) {
          return res
            .status(503)
            .json({ msg: "Integração com baralho ainda não disponível!" });
        }

        let entidade = new RodadaEntity(
          0,
          codigoBaralho,
          new Date(),
          null,
          salaId,
        );

        if (!entidade.validar()) {
          return res.status(400).json({ msg: "Parâmetros incorretos!" });
        }

        let result = await this.#repo.criarRodada(entidade);

        if (result) {
          return res.status(201).json({
            msg: "Rodada iniciada!",
            rodadaId: entidade.id,
          });
        }

        return res
          .status(500)
          .json({ msg: "Não foi possível criar a rodada!" });
      }
    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ msg: "Erro interno no servidor!" });
    }
  }
}
