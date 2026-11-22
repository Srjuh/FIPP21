import UsuarioRepository from '../repositories/usuarioRepository.js';
import UsuarioEntity from '../entities/usuarioEntity.js';

export default class UsuarioController {
    #usuRepo;

    constructor(repo = new UsuarioRepository()){
        this.#usuRepo = repo;
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
            let {nome, email, senha} = req.body ?? {};
            if(typeof nome !== "string" || !nome.trim() || nome.length > 100 ||
                typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 100 ||
                typeof senha !== "string" || !senha || senha.length > 200){
                return res.status(400).json({msg: "Nome, email ou senha inválidos!"});
            }
            nome = nome.trim();
            email = email.trim();
            if(await this.#usuRepo.obterPorEmail(email)){
                return res.status(409).json({msg: "Email já cadastrado!"});
            }
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

    async obterAtual(req, res){
        return res.status(200).json({id: req.usuario.id, nome: req.usuario.nome, email: req.usuario.email});
    }

}
