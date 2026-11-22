import { blackjackController } from "./blackjackController.js";

export default class RodadaController {
  async criarRodada(req, res) {
    req.body = { ...req.body, salaId: req.params.salaId };
    return blackjackController.iniciarRodada(req, res);
  }

  async encerrarRodada(req, res) {
    return blackjackController.verificarEncerramento(req, res);
  }
}
