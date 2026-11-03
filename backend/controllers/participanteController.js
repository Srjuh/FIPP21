import ParticipanteEntity from "../entities/participanteEntity.js";
import ParticipanteRepository from "../repositories/participanteRepository.js";

export default class ParticipanteController {
  #repo;

  constructor() {
    this.#repo = new ParticipanteRepository();
  }

  async obterParticipantesSala(req, res) {
    try {
      let { salaId } = req.params;

      if (salaId) {
        let participantes = await this.#repo.obterParticipantesSala(salaId);

        return res.status(200).json(participantes);
      } else {
        return res.status(400).json({ msg: "ID da sala não foi encontrado!" });
      }
    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ msg: "Erro interno no servidor!" });
    }
  }
}
