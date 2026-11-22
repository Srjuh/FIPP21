import BlackjackRepository from '../repositories/blackjackRepository.js';
import RodadaBlackjack from '../blackjack/rodadaBlackjack.js';
import BaralhoLocal from '../blackjack/baralhoLocal.js';
import RegrasBlackjack from '../blackjack/regrasBlackjack.js';
import ErroBlackjack from '../blackjack/erroBlackjack.js';
import { FASES } from '../blackjack/blackjackConfig.js';

export default class BlackjackController {
    #Repo;
    #rodadas;   // salaId -> { rodada, salvamento } (rodadas ficam em memória enquanto acontecem)

    // O parâmetro é opcional: sem ele usa o repository real (igual aos outros controllers)
    constructor(repo = new BlackjackRepository()){
        this.#Repo = repo;
        this.#rodadas = new Map();
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

            let existente = this.#rodadas.get(salaId);

            if(existente){
                // Garante que a rodada anterior foi gravada antes de ser substituída
                await this.#salvarSeFinalizada(existente);

                if(existente.rodada.fase !== FASES.FINALIZADA){
                    return res.status(409).json({msg: "Já existe uma rodada em andamento nessa sala!"});
                }
            }

            let participantes = await this.#Repo.obterParticipantesAtivos(salaId);

            if(!participantes.some(p => RegrasBlackjack.jogadorPodeJogar(p.saldo))){
                return res.status(400).json({msg: "Nenhum participante com saldo suficiente para jogar!"});
            }

            // Por enquanto o baralho é local. A integração com a Deck of Cards API troca só esta linha
            // (e o código do baralho gravado em tb_rodada).
            let rodId = await this.#Repo.criarRodada(salaId, "local");
            let rodada = new RodadaBlackjack(rodId, new BaralhoLocal(1), participantes);

            this.#rodadas.set(salaId, { rodada, salvamento: null });

            return res.status(201).json({participanteId: participante.par_id, ...rodada.obterEstado()});
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
        return this.#jogar(req, res, req.params.salaId, (rodada) => rodada.obterEstado());
    }

    // Parte comum de todas as jogadas: valida a sala, confere se o usuário participa,
    // executa a ação na rodada e grava no banco quando ela termina.
    async #jogar(req, res, salaIdBruto, acao){
        try {
            let usuarioId = req.usuario.id;
            let salaId = Number(salaIdBruto);

            if(!Number.isSafeInteger(salaId) || salaId <= 0){
                return res.status(400).json({msg: "Código da sala inválido!"});
            }

            let participante = await this.#Repo.obterParticipanteUsuario(salaId, usuarioId);

            if(!participante){
                return res.status(403).json({msg: "O usuário não está ativo nessa sala!"});
            }

            let entrada = this.#rodadas.get(salaId);

            if(!entrada){
                return res.status(404).json({msg: "Não há rodada ativa nessa sala!"});
            }

            let estado = await acao(entrada.rodada, participante.par_id);

            await this.#salvarSeFinalizada(entrada);

            return res.status(200).json({participanteId: participante.par_id, ...estado});
        } catch(ex) {
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

        console.log(ex);
        return res.status(500).json({msg: "Erro interno no servidor!"});
    }
}
