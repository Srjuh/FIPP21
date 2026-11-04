import Database from "../database/database.js";

export default class BlackjackRepository {

    #banco;

    constructor() {
        this.#banco = new Database();
    }

    // Participante ativo do usuário logado em uma sala
    async obterParticipanteUsuario(salaId, usuId) {
        let sql = `select par_id, par_saldo from tb_participante
            where sal_id = ? and usu_id = ? and par_dtsaida is null limit 1`;

        let result = await this.#banco.ExecutaComando(sql, [salaId, usuId]);

        if(result.length === 0){
            return null;
        }

        return result[0];
    }

    // Participantes que ainda estão na sala, já no formato que a RodadaBlackjack espera
    async obterParticipantesAtivos(salaId) {
        let sql = `select par_id, par_ordem, par_saldo from tb_participante
            where sal_id = ? and par_dtsaida is null
            order by par_ordem is null, par_ordem, par_id`;

        let result = await this.#banco.ExecutaComando(sql, [salaId]);

        return result.map(row => ({
            parId: row["par_id"],
            ordem: row["par_ordem"],
            saldo: row["par_saldo"]
        }));
    }

    // Cria o registro da rodada e devolve o rod_id
    async criarRodada(salaId, codigoBaralho) {
        let sql = `insert into tb_rodada (rod_codigobaralho, rod_dtinicio, sal_id)
            values (?, current_timestamp, ?)`;

        return await this.#banco.ExecutaComandoLastInserted(sql, [codigoBaralho, salaId]);
    }

    // Grava tudo o que aconteceu na rodada de uma vez só (transação):
    // apostas, turnos, cartas, variação de saldo e data de término.
    // Se qualquer comando falhar, nada é gravado.
    async finalizarRodada(rodId, resultados, cartas) {
        let cnn = await this.#banco.conexao.promise().getConnection();

        try {
            await cnn.beginTransaction();

            for(let r of resultados.jogadores){
                await cnn.query(
                    "insert into tb_aposta (apo_valor, par_id, rod_id) values (?, ?, ?)",
                    [r.aposta, r.parId, rodId]);

                await cnn.query(
                    "insert into tb_turno (tur_somacartas, tur_status, par_id, rod_id) values (?, ?, ?, ?)",
                    [r.somaCartas, r.status, r.parId, rodId]);

                // Soma a variação ao saldo atual em vez de gravar o saldo calculado em memória
                await cnn.query(
                    "update tb_participante set par_saldo = par_saldo + ? where par_id = ?",
                    [r.lucro, r.parId]);
            }

            if(cartas.length > 0){
                let valores = cartas.map(c => [c.codigo, c.imagem, c.ordem, c.visivel, c.valor, c.naipe, c.parId, c.rodId]);

                await cnn.query(
                    `insert into tb_carta (car_codigo, car_imagem, car_ordem, car_visivel, car_valor, car_naipe, par_id, rod_id)
                    values ?`, [valores]);
            }

            await cnn.query("update tb_rodada set rod_dtfim = current_timestamp where rod_id = ?", [rodId]);

            await cnn.commit();
            return true;
        } catch(ex) {
            try { await cnn.rollback(); } catch(erroRollback) { console.log(erroRollback); }
            throw ex;
        } finally {
            cnn.release();
        }
    }
}
