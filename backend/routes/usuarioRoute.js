import express from 'express';
import UsuarioController from '../controllers/usuarioController.js';

const router = express.Router();
let controller = new UsuarioController();

router.post("/", (req, res) => {

    // #swagger.tags = ['Usuário']
    // #swagger.description = 'Cadastro de novos usuários'
    controller.cadastrarUsuario(req, res);
})

export default router;
