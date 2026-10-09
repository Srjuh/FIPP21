import express from 'express';
import UsuarioController from '../controllers/usuarioController.js';
import LoginMiddleware from '../middleware/loginMiddleware.js';

const router = express.Router();
let controller = new UsuarioController();
let auth = new LoginMiddleware();

router.get("/", auth.validar, (req, res) => {
    // #swagger.tags = ['Usuário']
    // #swagger.description = 'Lista todos os usuários cadastrados'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.obterTodos(req, res);
})

router.post("/", (req, res) => {

    // #swagger.tags = ['Usuário']
    // #swagger.description = 'Cadastro de novos usuários'
    controller.cadastrarUsuario(req, res);
})

export default router;
