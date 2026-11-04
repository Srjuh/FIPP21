import test from "node:test";
import assert from "node:assert/strict";
import BlackjackController from "../../controllers/blackjackController.js";
import { FASES } from "../blackjackConfig.js";

// Repository falso: não usa banco, só guarda o que o controller mandou gravar
class RepoFalso {
    usuarios = { 1: { par_id: 10, par_saldo: "1000.00" }, 2: { par_id: 20, par_saldo: "1000.00" } };
    chamadasFinalizar = [];
    salvos = [];
    falhasRestantes = 0;

    async obterParticipanteUsuario(salaId, usuId) {
        return salaId === 1 ? (this.usuarios[usuId] ?? null) : null;
    }

    async obterParticipantesAtivos(salaId) {
        return [{ parId: 10, ordem: null, saldo: "1000.00" }];
    }

    async criarRodada(salaId, codigoBaralho) {
        return 77;
    }

    async finalizarRodada(rodId, resultados, cartas) {
        this.chamadasFinalizar.push(rodId);

        if(this.falhasRestantes > 0){
            this.falhasRestantes--;
            throw new Error("falha simulada no banco");
        }

        this.salvos.push({ rodId, resultados, cartas });
        return true;
    }
}

function req(usuarioId, body = {}, params = {}) {
    return { usuario: { id: usuarioId }, body, params };
}

function res() {
    return {
        codigo: null,
        corpo: null,
        status(c) { this.codigo = c; return this; },
        json(b) { this.corpo = b; return this; }
    };
}

async function chamar(controller, metodo, requisicao) {
    let resposta = res();
    await controller[metodo](requisicao, resposta);
    return resposta;
}

// Joga a rodada até o fim com o usuário 1, parando sempre
async function terminarRodada(controller) {
    for(let i = 0; i < 10; i++){
        let r = await chamar(controller, "obterEstado", req(1, {}, { salaId: "1" }));

        if(r.codigo === 200 && r.corpo.fase === FASES.FINALIZADA){
            return r;
        }

        if(r.codigo === 200 && r.corpo.fase === FASES.JOGADORES){
            await chamar(controller, "parar", req(1, { salaId: 1 }));
        }
    }

    throw new Error("rodada não terminou");
}

test("fluxo completo: iniciar, apostar, parar e gravar uma única vez", async () => {
    let repo = new RepoFalso();
    let controller = new BlackjackController(repo);

    let r = await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));
    assert.equal(r.codigo, 201);
    assert.equal(r.corpo.fase, FASES.APOSTAS);
    assert.equal(r.corpo.participanteId, 10);

    r = await chamar(controller, "apostar", req(1, { salaId: 1, valor: 100 }));
    assert.equal(r.codigo, 200);
    assert.equal(r.corpo.jogadores[0].aposta, 100);

    r = await terminarRodada(controller);
    assert.equal(r.corpo.fase, FASES.FINALIZADA);

    // consultar de novo não grava de novo
    await chamar(controller, "obterEstado", req(1, {}, { salaId: "1" }));
    assert.equal(repo.salvos.length, 1);
    assert.equal(repo.salvos[0].rodId, 77);
    assert.equal(repo.salvos[0].resultados.jogadores.length, 1);
    assert.equal(repo.salvos[0].resultados.jogadores[0].parId, 10);
    assert.ok(repo.salvos[0].cartas.length >= 4);
    assert.ok(repo.salvos[0].cartas.every(c => c.rodId === 77));
});

test("depois de finalizada dá para iniciar outra rodada, antes disso não", async () => {
    let controller = new BlackjackController(new RepoFalso());

    await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));

    let r = await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));
    assert.equal(r.codigo, 409);

    await chamar(controller, "apostar", req(1, { salaId: 1, valor: 100 }));
    await terminarRodada(controller);

    r = await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));
    assert.equal(r.codigo, 201);
});

test("erros de validação viram respostas HTTP", async () => {
    let controller = new BlackjackController(new RepoFalso());

    let r = await chamar(controller, "iniciarRodada", req(1, { salaId: "abc" }));
    assert.equal(r.codigo, 400);

    r = await chamar(controller, "iniciarRodada", req(1));      // sem corpo
    assert.equal(r.codigo, 400);

    r = await chamar(controller, "iniciarRodada", req(2, { salaId: 5 }));   // sala onde o usuário não está
    assert.equal(r.codigo, 403);

    r = await chamar(controller, "apostar", req(1, { salaId: 1, valor: 100 }));   // sem rodada ativa
    assert.equal(r.codigo, 404);

    await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));

    r = await chamar(controller, "apostar", req(1, { salaId: 1, valor: 5 }));
    assert.equal(r.codigo, 400);
    assert.equal(r.corpo.codigo, "APOSTA_INVALIDA");

    r = await chamar(controller, "apostar", req(1, { salaId: 1, valor: 999999 }));
    assert.equal(r.codigo, 400);
    assert.equal(r.corpo.codigo, "SALDO_INSUFICIENTE");

    r = await chamar(controller, "pedirCarta", req(1, { salaId: 1 }));   // ainda nas apostas
    assert.equal(r.codigo, 409);
    assert.equal(r.corpo.codigo, "FASE_INVALIDA");
});

test("se a gravação falhar, a próxima consulta tenta gravar de novo", async () => {
    let repo = new RepoFalso();
    repo.falhasRestantes = 1;
    let controller = new BlackjackController(repo);

    await chamar(controller, "iniciarRodada", req(1, { salaId: 1 }));
    await chamar(controller, "apostar", req(1, { salaId: 1, valor: 100 }));
    await terminarRodada(controller);

    assert.equal(repo.chamadasFinalizar.length, 2);   // 1 falha + 1 sucesso
    assert.equal(repo.salvos.length, 1);
});
