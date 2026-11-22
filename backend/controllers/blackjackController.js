import BlackjackRepository from '../repositories/blackjackRepository.js';
import RodadaBlackjack from '../blackjack/rodadaBlackjack.js';
import BaralhoService, { ErroBaralho } from '../services/baralhoService.js';
import RegrasBlackjack from '../blackjack/regrasBlackjack.js';
import ErroBlackjack from '../blackjack/erroBlackjack.js';
import { FASES } from '../blackjack/blackjackConfig.js';
import { notificarSala } from '../websocket.js';

export default class BlackjackController {
    #Repo;
    #rodadas;   // salaId -> { rodada, salvamento } (rodadas ficam em memória enquanto acontecem)
    #inicios;
    #baralho;
    #notificar;

    // O parâmetro é opcional: sem ele usa o repository real (igual aos outros controllers)
    constructor(repo = new BlackjackRepository(), baralho = new BaralhoService(), notificar = notificarSala){
        this.#Repo = repo;
        this.#rodadas = new Map();
        this.#inicios = new Map();
        this.#baralho = baralho;
        this.#notificar = notificar;
    }

    async #iniciar(salaId, aceitarExistente){
        let anterior = this.#inicios.get(salaId) ?? Promise.resolve();
        let inicio = anterior.catch(() => {}).then(async () => {
            let existente = this.#rodadas.get(salaId);
            if(existente){
                await this.#salvarSeFinalizada(existente);
                if(existente.rodada.fase !== FASES.FINALIZADA){
                    if(aceitarExistente) return existente.rodada.obterEstado();
                    throw new ErroBlackjack("RODADA_EM_ANDAMENTO", "Já existe uma rodada em andamento nessa sala!", 409);
                }
            }

            if(await this.#Repo.obterRodadaEmAndamento(salaId)){
                throw new ErroBlackjack("RODADA_NAO_RECUPERADA", "Existe uma rodada no banco que não está na memória do servidor.", 409);
            }

            if(!await this.#Repo.verificarEstrutura()){
                throw new ErroBlackjack("BANCO_DESATUALIZADO", "Execute o script database/ajustes_blackjack.sql antes de jogar.", 503);
            }

            let participantes = await this.#Repo.obterParticipantesAtivos(salaId);
            if(!participantes.some(p => RegrasBlackjack.jogadorPodeJogar(p.saldo))){
                throw new ErroBlackjack("SEM_JOGADORES", "Nenhum participante com saldo suficiente para jogar!", 400);
            }

            let codigo = await this.#baralho.criarBaralho();
            let rodId = await this.#Repo.criarRodada(salaId, codigo);
            let rodada = new RodadaBlackjack(rodId, this.#baralho.criarBaralhoDaRodada(codigo), participantes);
            this.#rodadas.set(salaId, { rodada, salvamento: null });
            let estado = rodada.obterEstado();
            this.#notificar(salaId, "rodada", { estado });
            return estado;
        });
        this.#inicios.set(salaId, inicio);
        try {
            return await inicio;
        } finally {
            if(this.#inicios.get(salaId) === inicio) this.#inicios.delete(salaId);
        }
    }

    async entrarNaSala(salaId){
        return this.#iniciar(Number(salaId), true);
    }

    async sairDaSala(salaId, participanteId){
        salaId = Number(salaId);
        if(this.#inicios.has(salaId)) await this.#inicios.get(salaId);
        let entrada = this.#rodadas.get(salaId);
        if(!entrada){
            if(await this.#Repo.obterRodadaEmAndamento(salaId)){
                throw new ErroBlackjack("RODADA_NAO_RECUPERADA", "A rodada em andamento não está na memória do servidor.", 409);
            }
            return;
        }
        let estado = await entrada.rodada.sairDaRodada(participanteId);
        await this.#salvarSeFinalizada(entrada);
        this.#notificar(salaId, "rodada", { estado });
    }

    async iniciarRodada(req, res){
        try {
            let usuarioId = req.usuario.id;
            let { salaId } = req.body ?? {};
            salaId = Number(salaId);
            if(!Number.isSafeInteger(salaId) || salaId <= 0){
                return res.status(400).json({msg: "Código da sala inválido!"});
            }
            let participante = await this.#Repo.obterParticipanteUsuario(salaId, usuarioId);
            if(!participante){
                return res.status(403).json({msg: "O usuário não está ativo nessa sala!"});
            }
            let estado = await this.#iniciar(salaId, false);

            return res.status(201).json({participanteId: participante.par_id, ...estado});
        } catch(ex) {
            return this.#tratarErro(ex, res);
        }
    }

    async apostar(req, res){
        let { salaId, valor } = req.body ?? {};
        return this.#jogar(req, res, salaId, (rodada, parId) => rodada.apostar(parId, valor));
    }

    async iniciarDistribuicao(req, res){
        let { salaId } = req.body ?? {};
        return this.#jogar(req, res, salaId, (rodada) => rodada.iniciarDistribuicao());
    }

    async pedirCarta(req, res){
        let { salaId } = req.body ?? {};
        return this.#jogar(req, res, salaId, (rodada, parId) => rodada.pedirCarta(parId));
    }

    async parar(req, res){
        let { salaId } = req.body ?? {};
        return this.#jogar(req, res, salaId, (rodada, parId) => rodada.parar(parId));
    }

    async sairDaRodada(req, res){
        let { salaId } = req.body ?? {};
        return this.#jogar(req, res, salaId, (rodada, parId) => rodada.sairDaRodada(parId));
    }

    async obterEstado(req, res){
        return this.#jogar(req, res, req.params.salaId, (rodada) => rodada.obterEstado(), false);
    }

    async continuar(req, res){
        let { salaId } = req.body ?? {};
        return this.#jogar(req, res, salaId, rodada => rodada.continuar());
    }

    async cancelarInterrompida(req, res){
        try {
            let salaId = Number(req.body?.salaId);
            if(!Number.isSafeInteger(salaId) || salaId <= 0){
                return res.status(400).json({msg: "Código da sala inválido!"});
            }
            if(!await this.#Repo.obterParticipanteUsuario(salaId, req.usuario.id)){
                return res.status(403).json({msg: "O usuário não está ativo nessa sala!"});
            }
            if(this.#inicios.has(salaId) || this.#rodadas.has(salaId)){
                return res.status(409).json({msg: "A rodada está sendo controlada pelo servidor e não pode ser cancelada."});
            }
            let rodada = await this.#Repo.obterRodadaEmAndamento(salaId);
            if(!rodada) return res.status(404).json({msg: "Não há rodada interrompida nessa sala!"});
            if(!await this.#Repo.cancelarRodadaInterrompida(rodada.rod_id)){
                return res.status(409).json({msg: "A rodada possui dados gravados e não pode ser cancelada automaticamente."});
            }
            this.#notificar(salaId, "rodada_cancelada", { rodadaId: rodada.rod_id });
            return res.status(200).json({msg: "Rodada interrompida cancelada. Uma nova rodada pode ser iniciada."});
        } catch(ex) {
            return this.#tratarErro(ex, res);
        }
    }

    async verificarEncerramento(req, res){
        try {
            let rodId = Number(req.params.rodadaId);
            if(!Number.isSafeInteger(rodId) || rodId <= 0){
                return res.status(400).json({msg: "ID da rodada inválido!"});
            }
            let rodada = await this.#Repo.obterRodadaPorId(rodId);
            if(!rodada) return res.status(404).json({msg: "Rodada não encontrada!"});
            if(!await this.#Repo.obterParticipanteUsuario(rodada.sal_id, req.usuario.id)){
                return res.status(403).json({msg: "O usuário não está ativo nessa sala!"});
            }
            if(!rodada.rod_dtfim){
                return res.status(409).json({msg: "A rodada será encerrada automaticamente após os turnos."});
            }
            return res.status(200).json({msg: "Rodada encerrada!", rodadaId: rodId});
        } catch(ex) {
            return this.#tratarErro(ex, res);
        }
    }

    // Parte comum de todas as jogadas: valida a sala, confere se o usuário participa,
    // executa a ação na rodada e grava no banco quando ela termina.
    async #jogar(req, res, salaIdBruto, acao, notificar = true){
        let entrada;
        let salaId = Number(salaIdBruto);
        try {
            let usuarioId = req.usuario.id;

            if(!Number.isSafeInteger(salaId) || salaId <= 0){
                return res.status(400).json({msg: "Código da sala inválido!"});
            }

            let participante = await this.#Repo.obterParticipanteUsuario(salaId, usuarioId);

            if(!participante){
                return res.status(403).json({msg: "O usuário não está ativo nessa sala!"});
            }

            entrada = this.#rodadas.get(salaId);

            if(!entrada){
                return res.status(404).json({msg: "Não há rodada ativa nessa sala!"});
            }

            let estado = await acao(entrada.rodada, participante.par_id);

            await this.#salvarSeFinalizada(entrada);

            if(notificar) this.#notificar(salaId, "rodada", { estado });
            return res.status(200).json({participanteId: participante.par_id, ...estado});
        } catch(ex) {
            if(entrada && notificar) this.#notificar(salaId, "rodada", {
                estado: entrada.rodada.obterEstado(),
                erro: "A jogada ou o salvamento não foi concluído. Consulte o estado antes de tentar novamente."
            });
            return this.#tratarErro(ex, res);
        }
    }

    // Grava a rodada uma única vez. Se a gravação falhar, a próxima consulta tenta de novo.
    async #salvarSeFinalizada(entrada){
        if(entrada.rodada.fase !== FASES.FINALIZADA){
            return;
        }

        if(!entrada.salvamento){
            let rodada = entrada.rodada;

            entrada.salvamento = this.#Repo
                .finalizarRodada(rodada.rodId, rodada.obterResultados(), rodada.cartasDaRodada)
                .catch(ex => {
                    entrada.salvamento = null;
                    throw ex;
                });
        }

        await entrada.salvamento;
    }

    #tratarErro(ex, res){
        if(ex instanceof ErroBlackjack){
            return res.status(ex.status).json({msg: ex.message, codigo: ex.codigo});
        }

        if(ex instanceof ErroBaralho){
            console.error(ex);
            return res.status(503).json({msg: "Baralho indisponível. Tente continuar a rodada novamente.", codigo: "BARALHO_INDISPONIVEL"});
        }
        console.log(ex);
        return res.status(500).json({msg: "Erro interno no servidor!"});
    }

}

export const blackjackController = new BlackjackController();
