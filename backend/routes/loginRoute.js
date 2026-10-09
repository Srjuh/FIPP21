import express from 'express';
import LoginController from '../controllers/loginController.js';

const router = express.Router();
let controller = new LoginController();

router.post("/", (req, res) => {

    // #swagger.tags = ['Login']
    // #swagger.description = 'Validação de login do usuário'
    controller.validar(req, res);
})

export default router;
