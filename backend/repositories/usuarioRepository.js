import Database from "../database/database.js";
import UsuarioEntity from "../entities/usuarioEntity.js";
import { criarHash, verificarSenha } from "../services/senhaService.js";

export default class UsuarioRepository {
    
    #banco;

    constructor(banco = new Database()) {
        this.#banco = banco;
    }
    
    // Cadastro de novos usuários
    async cadastrarUsuario(entidade){
        let sql = `INSERT INTO tb_usuario (usu_nome, usu_email, usu_senha) VALUES (?, ?, ?)`;
        let valores = [entidade.nome, entidade.email, await criarHash(entidade.senha)];

        let idGerado = await this.#banco.ExecutaComandoLastInserted(sql, valores);

        if(idGerado){
            entidade.id = idGerado;
            return true;
        }

        return false;
    }

    async obterTodos() {
        let sql = "select usu_id, usu_nome, usu_email from tb_usuario";
        return await this.#banco.ExecutaComando(sql, []);
    }

    // Validação por Email e Senha
    async obterPorEmailSenha(email, senha) {
        let usuario = await this.obterPorEmail(email);
        if(usuario && await verificarSenha(senha, usuario.senha)) {
            if(!usuario.senha.startsWith("scrypt:")){
                let hash = await criarHash(senha);
                await this.#banco.ExecutaComandoNonQuery(
                    "update tb_usuario set usu_senha = ? where usu_id = ? and usu_senha = ?",
                    [hash, usuario.id, usuario.senha]);
            }
            return usuario;
        }

        return null;
    }

    async obterPorEmail(email) {
        let rows = await this.#banco.ExecutaComando("select * from tb_usuario where usu_email = ? limit 1", [email]);
        return rows.length ? UsuarioEntity.toMap(rows[0]) : null;
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
