import mysql from 'mysql2';
import 'dotenv/config';

export default class Database {

    #conexao;

    get conexao() {
        return this.#conexao;
    }

    set conexao(conexao) {
        this.#conexao = conexao;
    }

    constructor() {
        this.#conexao = mysql.createPool({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            idleTimeout: 30000,
            connectionLimit: 50
        });
    }

    ExecutaComando(sql, valores) {
        var cnn = this.#conexao;

        return new Promise(function(res, rej) {
            cnn.query(sql, valores, function(error, results, fields) {
                if (error)
                    rej(error);
                else
                    res(results);
            });
        });
    }

    ExecutaComandoNonQuery(sql, valores) {
        var cnn = this.#conexao;

        return new Promise(function(res, rej) {
            cnn.query(sql, valores, function(error, results, fields) {
                if (error)
                    rej(error);
                else
                    res(results.affectedRows > 0);
            });
        });
    }

    ExecutaComandoLastInserted(sql, valores) {
        var cnn = this.#conexao;

        return new Promise(function(res, rej) {
            cnn.query(sql, valores, function(error, results, fields) {
                if (error)
                    rej(error);
                else
                    res(results.insertId);
            });
        });
    }
}