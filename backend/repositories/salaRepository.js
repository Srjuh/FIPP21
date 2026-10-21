import Database from "../database/database.js";
import SalaEntity from "../entities/salaEntity.js";

export default class UsuarioRepository {
    
    #banco;

    constructor() {
        this.#banco = new Database();
    }
    
    // Criar novas salas
    async criarSala(entidade){
        let sql = `INSERT INTO tb_sala (sal_nome, usu_id) VALUES (?, ?)`;
        let valores = [entidade.salaNome, entidade.usuId];

        let idGerado = await this.#banco.ExecutaComandoLastInserted(sql, valores);

        if(idGerado){
            entidade.id = idGerado;
            return true;
        }

        return false;
    }

    // Listar todas as salas
    async obterTodos() {
        let sql = "select sal_id, sal_nome, usu_id from tb_sala";
        return await this.#banco.ExecutaComando(sql, []);
    }

    // Listar salas do usuário logado
    async obterSalaUsuario(usuId){
        let sql = "select sal_id, sal_nome from tb_sala where usu_id = ?";
        let valores = [usuId];

        let result = await this.#banco.ExecutaComando(sql, valores);

        return result;
    }

    // Entrada do usuário logado nas salas
    async entrarSala(codigoSala, usuId){
        let salaSql = "select sal_id from tb_sala where sal_id = ?";
        let sala = await this.#banco.ExecutaComando(salaSql, [codigoSala]);

        if(sala.length === 0){
            return null;
        }

        let participanteSql = `select par_id, sal_id from tb_participante
            where usu_id = ? and par_dtentrada is not null and par_dtsaida is null limit 1`;
        let participante = await this.#banco.ExecutaComando(participanteSql, [usuId]);

        if(participante.length > 0){
            return {
                jaParticipava: Number(participante[0].sal_id) === Number(codigoSala),
                jaEmOutraSala: Number(participante[0].sal_id) !== Number(codigoSala)
            };
        }

        let inserirSql = `insert into tb_participante
            (par_dtentrada, par_saldo, sal_id, usu_id) values (current_timestamp, 1000, ?, ?)`;
        let participanteId = await this.#banco.ExecutaComandoLastInserted(inserirSql, [codigoSala, usuId]);

        if(participanteId){
            return { jaParticipava: false, participanteId };
        }

        return false;
    }

    // Saída do usuário logado das salas
    async sairSala(codigoSala, usuId){
        let sql = `update tb_participante set par_dtsaida = current_timestamp
            where sal_id = ? and usu_id = ? and par_dtsaida is null`;

        return await this.#banco.ExecutaComandoNonQuery(sql, [codigoSala, usuId]);
    }
}
