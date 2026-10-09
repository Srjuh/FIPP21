import Database from "../database/database.js";
import UsuarioEntity from "../entities/usuarioEntity.js";

export default class UsuarioRepository {
    
    #banco;

    constructor() {
        this.#banco = new Database();
    }
    
    // Cadastro de novos usuários
    async cadastrarUsuario(entidade){
        let sql = `INSERT INTO tb_usuario (usu_nome, usu_email, usu_senha) VALUES (?, ?, ?)`;
        let valores = [entidade.nome, entidade.email, entidade.senha];

        let idGerado = await this.#banco.ExecutaComandoLastInserted(sql, valores);

        if(idGerado){
            entidade.id = idGerado;
            return true;
        }

        return false;
    }

    async obterTodos() {
        let sql = "select usu_id, usu_nome, usu_email, usu_senha from tb_usuario";
        return await this.#banco.ExecutaComando(sql, []);
    }

    // Validação por Email e Senha
    async obterPorEmailSenha(email, senha) {
        let sql = "select * from tb_usuario where usu_email = ? and usu_senha = ?";
        let valores = [email, senha];

        let rows = await this.#banco.ExecutaComando(sql, valores);

        if(rows.length > 0) {
            return UsuarioEntity.toMap(rows[0]);
        }

        return null;
    }

    // Validação por ID
    async obterPorId(id) {
        let sql = "select * from tb_usuario where usu_id = ?";
        let valores = [id];

        let rows = await this.#banco.ExecutaComando(sql, valores);

        if(rows.length > 0) {
            return UsuarioEntity.toMap(rows[0]);
        }

        return null;
    }
}
