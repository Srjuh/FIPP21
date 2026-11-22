import express from 'express';
import BlackjackController from '../controllers/blackjackController.js';
import LoginMiddleware from '../middleware/loginMiddleware.js';

const router = express.Router();
let controller = new BlackjackController();
let auth = new LoginMiddleware();

router.post("/rodada", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Inicia uma rodada na sala (fase de apostas). O usuário precisa estar ativo na sala.'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 } } }
            }
        }
    } */
    controller.iniciarRodada(req, res);
})

router.post("/apostar", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Aposta na rodada. Quando todos apostam, as cartas são distribuídas automaticamente.'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 }, valor: { type: "number", example: 100 } } }
            }
        }
    } */
    controller.apostar(req, res);
})

router.post("/iniciar-distribuicao", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Encerra as apostas e distribui as cartas. Quem não apostou fica fora da rodada.'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 } } }
            }
        }
    } */
    controller.iniciarDistribuicao(req, res);
})

router.post("/pedir-carta", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Pede uma carta (apenas na vez do jogador)'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 } } }
            }
        }
    } */
    controller.pedirCarta(req, res);
})

router.post("/parar", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Para de pedir cartas (apenas na vez do jogador). Quando o último para, o dealer joga e os pagamentos são feitos.'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 } } }
            }
        }
    } */
    controller.parar(req, res);
})

router.post("/sair-rodada", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Sai da rodada atual: nas apostas cancela a aposta, jogando faz a mão parar'
    // #swagger.security = [{ "cookieAuth": [] }]
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: { salaId: { type: "integer", example: 1 } } }
            }
        }
    } */
    controller.sairDaRodada(req, res);
})

router.get("/estado/:salaId", auth.validar, (req, res) => {
    // #swagger.tags = ['Blackjack']
    // #swagger.description = 'Estado atual da rodada da sala (a carta virada do dealer não é revelada até o fim)'
    // #swagger.security = [{ "cookieAuth": [] }]
    controller.obterEstado(req, res);
})

export default router;
