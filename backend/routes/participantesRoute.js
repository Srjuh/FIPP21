import express from "express";
import ParticipanteController from "../controllers/participanteController.js";
import LoginMiddleware from "../middleware/loginMiddleware.js";

const router = express.Router();
let ctrl = new ParticipanteController();
let auth = new LoginMiddleware();

router.get("/:salaId", auth.validar, (req, res) => {
  // #swagger.tags = ['Participantes']
  // #swagger.description = 'Lista os participantes de uma sala'
  // #swagger.security = [{ "cookieAuth": [] }]
  ctrl.obterParticipantesSala(req, res);
});

export default router;
