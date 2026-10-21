import SalaRepository from '../repositories/salaRepository.js';
import SalaEntity from '../entities/salaEntity.js';

export default class SalaController {
    #Repo;

    constructor(){
        this.#Repo = new SalaRepository();
    }

    async obterTodos(req, res){
        try {
            let usuarios = await this.#Repo.obterTodos();
            return res.status(200).json(usuarios);
        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

    async criarSala(req, res){
        try {
            let usuId = req.usuario.id;
            let { salaNome } = req.body;
            let entidade;

            if(usuId){
                entidade = new SalaEntity(0, salaNome, usuId);
            } else {
                return res.status(404).json({msg: "Id do usuário não encontrado via login!"});
            }

            if(entidade) {
                let result = await this.#Repo.criarSala(entidade);

                if(result) {
                    return res.status(201).json({msg: "Sala criada!"});
                }

                return res.status(404).json({msg: "Entidade não encontrada!"});
            }
            else {
                return res.status(400).json({msg: "Parâmetros incorretos!"});
            }

        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

    async obterSalaUsuario(req, res){
        try {
            let usuarioId = req.usuario.id;

            if(!usuarioId){
                return res.status(404).json({msg: "Token do usuário não encontrado!"});
            }

            let entidade = await this.#Repo.obterSalaUsuario(usuarioId);
            return res.status(200).json(entidade);

        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

    async entrarSala(req, res){
        try {
            let usuarioId = req.usuario.id;
            let { codigoSala } = req.body;

            if(!usuarioId){
                return res.status(401).json({msg: "Token do usuário não encontrado!"});
            }

            let resultado = await this.#Repo.entrarSala(codigoSala, usuarioId);

            if(resultado == null){
                return res.status(404).json({msg: "Sala não encontrada!"});
            } else if(resultado == false){
                return res.status(500).json({msg: "Não foi possível entrar na sala!"});
            }

            if(resultado.jaParticipava){
                return res.status(409).json({msg: "O usuário já está nesta sala!"});
            }

            if(resultado.jaEmOutraSala){
                return res.status(409).json({msg: "O usuário já está ativo em outra sala!"});
            }

            return res.status(201).json({
                msg: "Entrada na sala realizada!",
                salaId: codigoSala,
                participanteId: resultado.participanteId
            });
        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

    async sairSala(req, res){
        try {
            let usuarioId = req.usuario.id;
            let { codigoSala } = req.body;
            let salaId = Number(codigoSala);

            if(!usuarioId){
                return res.status(401).json({msg: "Token do usuário não encontrado!"});
            }

            if(!Number.isSafeInteger(salaId) || salaId <= 0){
                return res.status(400).json({msg: "Código da sala inválido!"});
            }

            let resultado = await this.#Repo.sairSala(salaId, usuarioId);

            if(!resultado){
                return res.status(404).json({msg: "Participante não está ativo na sala!"});
            }

            return res.status(200).json({msg: "Saída da sala realizada!"});
        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

}
