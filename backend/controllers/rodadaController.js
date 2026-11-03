import RodadaEntity from "../entities/rodadaEntity.js";
import RodadaRepository from "../repositories/rodadaRepository.js";
import SalaRepository from "../repositories/salaRepository.js";
import TurnoRepository from "../repositories/turnoRepository.js";

export default class RodadaController {
  #repo;
  #turnoRepo;

  constructor() {
    this.#repo = new RodadaRepository();
    this.#turnoRepo = new TurnoRepository();
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

  async encerrarRodada(req, res) {
    try {
      let { rodadaId } = req.params;

      if (!rodadaId) {
        return res.status(400).json({ msg: "ID da rodada não foi encontrado" });
      }

      let rodada = await this.#repo.obterRodadaPorId(rodadaId);

      if (rodada.length === 0) {
        return res.status(404).json({ msg: "Rodada não encontrada!" });
      }

      if (rodada[0].rod_dtfim !== null) {
        return res.status(409).json({ msg: "A rodada já foi encerrada!" });
      }

      let existeTurno = await this.#turnoRepo.obterTurnosRodada(rodadaId);

      if (existeTurno.length === 0) {
        return res
          .status(409)
          .json({ msg: "A rodada ainda não possui turnos registrados!" });
      }

      let turnoIniciado =
        await this.#turnoRepo.obterTurnosEmAndamento(rodadaId);

      if (turnoIniciado.length > 0) {
        return res
          .status(409)
          .json({ msg: "Ainda existem participantes jogando!" });
      }

      // Verificação para ver se o dealer ainda está jogando
      //...
      // Verificação de resultados e pagamentos processados

      //let encerra = await this.#repo.encerrarRodada(rodadaId);
      return res.status(503).json({
        msg: "Encerramento indisponível: aguardando integração das regras do jogo!",
      });

      // Ainda falta implementar a identificação de um jogador que parou de comprar cartas e está aguardando o dealer.
    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ msg: "Erro interno no servidor!" });
    }
  }
}
