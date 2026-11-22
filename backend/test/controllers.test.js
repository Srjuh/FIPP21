import test from "node:test";
import assert from "node:assert/strict";
import BaralhoLocal from "../blackjack/baralhoLocal.js";
import { criarHash, verificarSenha } from "../services/senhaService.js";

process.env.JWT_SECRET = "chave-de-teste";
const { default: BlackjackController } = await import("../controllers/blackjackController.js");
const { default: SalaController } = await import("../controllers/salaController.js");

function resposta() {
    return { statusCode: 200, status(codigo) { this.statusCode = codigo; return this; }, json(valor) { this.body = valor; return this; } };
}

test("inícios simultâneos criam apenas uma rodada e notificam a sala", async () => {
    let criadas = 0;
    const repo = {
        obterParticipanteUsuario: async () => ({ par_id: 1 }),
        obterParticipantesAtivos: async () => [{ parId: 1, saldo: 1000 }],
        obterRodadaEmAndamento: async () => null,
        verificarEstrutura: async () => true,
        criarRodada: async () => ++criadas
    };
    const notificacoes = [];
    const jogo = new BlackjackController(repo, {
        criarBaralho: async () => "deck",
        criarBaralhoDaRodada: () => BaralhoLocal.deOrdemFixa([])
    }, (...args) => notificacoes.push(args));
    const req = { usuario: { id: 1 }, body: { salaId: 5 } };
    const r1 = resposta(), r2 = resposta();
    await Promise.all([jogo.iniciarRodada(req, r1), jogo.iniciarRodada(req, r2)]);
    assert.deepEqual([r1.statusCode, r2.statusCode].sort(), [201, 409]);
    assert.equal(criadas, 1);
    assert.equal(notificacoes[0][1], "rodada");
    const estado = await jogo.entrarNaSala(5);
    assert.equal(estado.jogadores.length, 1);
    assert.equal(criadas, 1);
});

test("entrada inicia jogo e saída comunica a rodada antes de sair da sala", async () => {
    const ordem = [];
    const sala = new SalaController({
        entrarSala: async () => ({ participanteId: 7 }),
        sairSala: async () => { ordem.push("banco"); return true; }
    }, {
        entrarNaSala: async () => { ordem.push("iniciar"); return { fase: "Apostas" }; },
        sairDaSala: async () => { ordem.push("rodada"); }
    }, { obterParticipanteUsuario: async () => ({ par_id: 7 }) });
    const req = { usuario: { id: 1 }, body: { codigoSala: 3 } };
    const entrada = resposta(), saida = resposta();
    await sala.entrarSala(req, entrada);
    await sala.sairSala(req, saida);
    assert.equal(entrada.statusCode, 201);
    assert.equal(entrada.body.rodada.fase, "Apostas");
    assert.equal(saida.statusCode, 200);
    assert.deepEqual(ordem, ["iniciar", "rodada", "banco"]);
});

test("rodada não inicia se o banco ainda não recebeu o ajuste de status", async () => {
    let criouBaralho = false;
    const jogo = new BlackjackController({
        obterParticipanteUsuario: async () => ({ par_id: 1 }),
        obterRodadaEmAndamento: async () => null,
        verificarEstrutura: async () => false
    }, { criarBaralho: async () => { criouBaralho = true; } }, () => {});
    const res = resposta();
    await jogo.iniciarRodada({ usuario: { id: 1 }, body: { salaId: 1 } }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.codigo, "BANCO_DESATUALIZADO");
    assert.equal(criouBaralho, false);
});

test("senhas novas são protegidas e senhas antigas continuam aceitas", async () => {
    const hash = await criarHash("senha");
    assert.notEqual(hash, "senha");
    assert.equal(await verificarSenha("senha", hash), true);
    assert.equal(await verificarSenha("errada", hash), false);
    assert.equal(await verificarSenha("senha", "senha"), true);
    assert.equal(await verificarSenha("errada", "senha"), false);
});
