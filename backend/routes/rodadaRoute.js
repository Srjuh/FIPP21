import express from "express";
import RodadaController from "../controllers/rodadaController.js";
import LoginMiddleware from "../middleware/loginMiddleware.js";

const router = express.Router();
let ctrl = new RodadaController();
let auth = new LoginMiddleware();

router.post("/:salaId", auth.validar, (req, res) => {
  // #swagger.tags = ['Rodada']
  // #swagger.description = 'Cria uma rodada na sala'
  // #swagger.security = [{ "cookieAuth": [] }]
  ctrl.criarRodada(req, res);
});

router.patch("/encerrar/:rodadaId", auth.validar, (req, res) => {
  // #swagger.tags = ['Rodada']
  // #swagger.description = 'Encerra uma rodada na sala'
  // #swagger.security = [{ "cookieAuth": [] }]
  ctrl.encerrarRodada(req, res);
});

export default router;
