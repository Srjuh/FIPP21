import UsuarioRepository from '../repositories/usuarioRepository.js';
import UsuarioEntity from '../entities/usuarioEntity.js';

export default class UsuarioController {
    #usuRepo;

    constructor(){
        this.#usuRepo = new UsuarioRepository();
    }

    async obterTodos(req, res){
        try {
            let usuarios = await this.#usuRepo.obterTodos();
            return res.status(200).json(usuarios);
        } catch(ex) {
            console.log(ex);
            return res.status(500).json({msg: "Erro interno no servidor!"});
        }
    }

    async cadastrarUsuario(req, res){
        try {
            let {nome, email, senha} = req.body;
            let entidade = new UsuarioEntity(0, nome, email, senha);
            
            if(entidade) {
                let result = await this.#usuRepo.cadastrarUsuario(entidade);

                if(result) {
                    return res.status(201).json({msg: "Cadastro concluído!"});
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

}
