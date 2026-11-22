import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "dotenv/config";
import mysql from "mysql2/promise";
import BlackjackRepository from "../repositories/blackjackRepository.js";
import UsuarioRepository from "../repositories/usuarioRepository.js";
import UsuarioEntity from "../entities/usuarioEntity.js";
import SalaRepository from "../repositories/salaRepository.js";
import SalaEntity from "../entities/salaEntity.js";

test("finalização grava dealer, aposta e saldo atomicamente no MySQL", {
    skip: process.env.FIPP21_TEST_DB !== "1" && "Defina FIPP21_TEST_DB=1 para testar com tabelas temporárias"
}, async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    try {
        await conn.query("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
        await conn.query("CREATE TEMPORARY TABLE tb_usuario (usu_id INT PRIMARY KEY AUTO_INCREMENT, usu_nome VARCHAR(100), usu_email VARCHAR(100), usu_senha VARCHAR(200))");
        await conn.query("CREATE TEMPORARY TABLE tb_sala (sal_id INT PRIMARY KEY AUTO_INCREMENT, sal_nome VARCHAR(200), usu_id INT)");
        await conn.query("CREATE TEMPORARY TABLE tb_rodada (rod_id INT PRIMARY KEY, rod_dtfim DATETIME NULL)");
        await conn.query("CREATE TEMPORARY TABLE tb_participante (par_id INT PRIMARY KEY AUTO_INCREMENT, par_saldo DECIMAL(10,2), par_dtentrada DATETIME, par_dtsaida DATETIME, sal_id INT, usu_id INT)");
        await conn.query("CREATE TEMPORARY TABLE tb_aposta (apo_valor DECIMAL(10,2), par_id INT, rod_id INT)");
        await conn.query('CREATE TEMPORARY TABLE tb_turno (tur_somacartas INT, tur_status ENUM("Jogando","Estourou","Ganhou","Perdeu"), par_id INT NULL, rod_id INT)');
        await conn.query("CREATE TEMPORARY TABLE tb_carta (car_codigo VARCHAR(10), car_imagem VARCHAR(200), car_ordem INT, car_visivel ENUM('S','N'), car_valor INT, car_naipe VARCHAR(20), par_id INT NULL, rod_id INT)");
        const migracao = await readFile(new URL("../database/ajustes_blackjack.sql", import.meta.url), "utf8");
        await conn.query("INSERT INTO tb_rodada VALUES (1, NULL), (2, NULL)");
        await conn.query("INSERT INTO tb_participante (par_id, par_saldo) VALUES (1, 1000)");

        const banco = { conexao: { promise: () => ({ getConnection: async () => ({
            beginTransaction: () => conn.beginTransaction(),
            query: (...args) => conn.query(...args),
            commit: () => conn.commit(),
            rollback: () => conn.rollback(),
            release: () => {}
        }) }) },
        ExecutaComando: async (sql, valores) => (await conn.query(sql, valores))[0],
        ExecutaComandoNonQuery: async (sql, valores) => (await conn.query(sql, valores))[0].affectedRows > 0,
        ExecutaComandoLastInserted: async (sql, valores) => (await conn.query(sql, valores))[0].insertId };
        const usuarios = new UsuarioRepository(banco);
        const usuario = new UsuarioEntity(0, "Pessoa", "pessoa@example.com", "senha");
        await usuarios.cadastrarUsuario(usuario);
        assert.ok(await usuarios.obterPorEmailSenha("pessoa@example.com", "senha"));
        assert.equal(await usuarios.obterPorEmailSenha("pessoa@example.com", "errada"), null);
        const [listagem] = await usuarios.obterTodos();
        assert.equal(Object.hasOwn(listagem, "usu_senha"), false);
        await conn.query("INSERT INTO tb_usuario (usu_nome, usu_email, usu_senha) VALUES ('Antigo', 'antigo@example.com', 'senha-antiga')");
        assert.ok(await usuarios.obterPorEmailSenha("antigo@example.com", "senha-antiga"));
        const [[antigo]] = await conn.query("SELECT usu_senha FROM tb_usuario WHERE usu_email = 'antigo@example.com'");
        assert.match(antigo.usu_senha, /^scrypt:/);
        const salas = new SalaRepository(banco);
        const sala = new SalaEntity(0, "Mesa", usuario.id);
        assert.equal(await salas.criarSala(sala), true);
        assert.ok(sala.salaId > 0);
        const entrada = await salas.entrarSala(sala.salaId, usuario.id);
        assert.ok(entrada.participanteId);
        const [[participante]] = await conn.query("SELECT par_saldo FROM tb_participante WHERE par_id = ?", [entrada.participanteId]);
        assert.equal(Number(participante.par_saldo), 1000);
        assert.equal(await salas.sairSala(sala.salaId, usuario.id), true);
        const repo = new BlackjackRepository(banco);
        assert.equal(await repo.verificarEstrutura(), false);
        await conn.query(migracao);
        assert.equal(await repo.verificarEstrutura(), true);
        const jogador = { parId: 1, aposta: 50, somaCartas: 21, status: "Blackjack", lucro: 75 };
        const carta = { codigo: "AS", imagem: "imagem", ordem: 1, visivel: "S", valor: 11, naipe: "SPADES", parId: null, rodId: 1 };
        await repo.finalizarRodada(1, { dealerPontos: 18, jogadores: [jogador] }, [carta]);
        const [turnos] = await conn.query("SELECT tur_status, par_id FROM tb_turno WHERE rod_id = 1 ORDER BY par_id");
        assert.deepEqual(turnos.map(t => [t.tur_status, t.par_id]), [["Parou", null], ["Blackjack", 1]]);
        const [[saldo]] = await conn.query("SELECT par_saldo FROM tb_participante WHERE par_id = 1");
        assert.equal(Number(saldo.par_saldo), 1075);
        await assert.rejects(repo.finalizarRodada(1, { dealerPontos: 18, jogadores: [jogador] }, [carta]), /já foi finalizada/);

        await assert.rejects(repo.finalizarRodada(2, {
            dealerPontos: 18, jogadores: [{ ...jogador, status: "Invalido" }]
        }, []));
        const [[apostas]] = await conn.query("SELECT COUNT(*) AS total FROM tb_aposta WHERE rod_id = 2");
        const [[rodada]] = await conn.query("SELECT rod_dtfim FROM tb_rodada WHERE rod_id = 2");
        assert.equal(apostas.total, 0);
        assert.equal(rodada.rod_dtfim, null);
    } finally {
        await conn.end();
    }
});
