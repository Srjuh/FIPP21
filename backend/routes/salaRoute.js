import express from 'express';
import SalaController from '../controllers/salaController.js';
import LoginMiddleware from '../middleware/loginMiddleware.js';

const router = express.Router();
let controller = new SalaController();
let auth = new LoginMiddleware();

router.get("/todas_salas", auth.validar, (req, res) => {
    // #swagger.tags = ['Salas']
    // #swagger.description = 'Lista todas as salas criadas'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.obterTodos(req, res);
})

router.post("/", auth.validar, (req, res) => {
    // #swagger.tags = ['Salas']
    // #swagger.description = 'Cria uma nova sala'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.criarSala(req, res);
})

router.get("/", auth.validar, (req, res) => {
    // #swagger.tags = ['Salas']
    // #swagger.description = 'Obter salas do usuário logado'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.obterSalaUsuario(req, res);
})

router.post("/entrar", auth.validar, (req, res) => {
    // #swagger.tags = ['Salas']
    // #swagger.description = 'Entra em uma sala usando seu código'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.entrarSala(req, res);
})

router.post("/sair", auth.validar, (req, res) => {
    // #swagger.tags = ['Salas']
    // #swagger.description = 'Sai de uma sala usando seu código'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.sairSala(req, res);
})

export default router;
