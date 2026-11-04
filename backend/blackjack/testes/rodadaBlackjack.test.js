import test from "node:test";
import assert from "node:assert/strict";
import BaralhoLocal from "../baralhoLocal.js";
import RodadaBlackjack from "../rodadaBlackjack.js";
import { FASES, STATUS } from "../blackjackConfig.js";

// Ordem de distribuição: jogador 1, jogador 2..., dealer (aberta), jogador 1, jogador 2..., dealer (virada).
// Depois disso vêm as cartas pedidas pelos jogadores e as compradas pelo dealer.
function rodada(codigos, participantes = [{ parId: 1, saldo: 1000 }]) {
    return new RodadaBlackjack(1, BaralhoLocal.deOrdemFixa(codigos), participantes);
}

function jogador(estado, parId) {
    return estado.jogadores.find(j => j.parId === parId);
}

async function codigoDoErro(promessa) {
    try { await promessa; }
    catch(ex) { return ex.codigo; }
    return null;
}

test("jogador para com 19 e vence o dealer com 17: paga 1:1", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"]);
    await r.apostar(1, 100);
    let estado = await r.parar(1);

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).status, STATUS.GANHOU);
    assert.equal(jogador(estado, 1).lucro, 100);
    assert.equal(jogador(estado, 1).saldo, 1100);
});

test("a carta virada do dealer fica escondida até o fim", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"]);
    let estado = await r.apostar(1, 100);

    assert.equal(estado.fase, FASES.JOGADORES);
    assert.deepEqual(estado.dealer.cartas[1], { visivel: false });
    assert.equal(estado.dealer.pontos, 7);

    estado = await r.parar(1);
    assert.equal(estado.dealer.cartas[1].codigo, "KD");
    assert.equal(estado.dealer.pontos, 17);
});

test("dealer compra até chegar em 17 ou mais", async () => {
    let r = rodada(["KS", "6H", "9S", "5D", "KH"]);   // dealer 11, compra K = 21
    await r.apostar(1, 100);
    let estado = await r.parar(1);

    assert.equal(estado.dealer.cartas.length, 3);
    assert.equal(estado.dealer.pontos, 21);
    assert.equal(jogador(estado, 1).status, STATUS.PERDEU);
    assert.equal(jogador(estado, 1).saldo, 900);
});

test("blackjack natural paga 3:2 e a rodada termina sozinha", async () => {
    let r = rodada(["AS", "7H", "KS", "KD"]);
    let estado = await r.apostar(1, 100);

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).status, STATUS.BLACKJACK);
    assert.equal(jogador(estado, 1).lucro, 150);
    assert.equal(jogador(estado, 1).saldo, 1150);
});

test("dealer com blackjack natural encerra a rodada sem ninguém jogar", async () => {
    let r = rodada(["KS", "AH", "9S", "KD"]);
    let estado = await r.apostar(1, 100);

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(estado.dealer.cartas[1].visivel, true);
    assert.equal(jogador(estado, 1).status, STATUS.PERDEU);
    assert.equal(jogador(estado, 1).saldo, 900);
});

test("natural contra natural é empate e devolve a aposta", async () => {
    let r = rodada(["AS", "AH", "KS", "KD"]);
    let estado = await r.apostar(1, 100);

    assert.equal(jogador(estado, 1).status, STATUS.EMPATOU);
    assert.equal(jogador(estado, 1).lucro, 0);
    assert.equal(jogador(estado, 1).saldo, 1000);
});

test("empate com 18 devolve a aposta", async () => {
    let r = rodada(["KS", "KH", "8S", "8D"]);
    await r.apostar(1, 100);
    let estado = await r.parar(1);

    assert.equal(jogador(estado, 1).status, STATUS.EMPATOU);
    assert.equal(jogador(estado, 1).saldo, 1000);
});

test("jogador que estoura perde e o dealer não compra cartas", async () => {
    let r = rodada(["KS", "6H", "6S", "5D", "9H", "KH"]);   // jogador 16 -> 25; dealer 11 não deve comprar
    await r.apostar(1, 100);
    let estado = await r.pedirCarta(1);

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).status, STATUS.ESTOUROU);
    assert.equal(jogador(estado, 1).saldo, 900);
    assert.equal(estado.dealer.cartas.length, 2);
});

test("chegar em 21 pedindo carta para automaticamente", async () => {
    let r = rodada(["5S", "7H", "6S", "9D", "KH", "2H"]);   // 11 + K = 21; dealer 16 compra 2 = 18
    await r.apostar(1, 100);
    let estado = await r.pedirCarta(1);

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).status, STATUS.GANHOU);
    assert.equal(jogador(estado, 1).saldo, 1100);
});

test("vários jogadores: respeita a ordem dos turnos e paga cada um separadamente", async () => {
    let participantes = [{ parId: 1, saldo: 1000, ordem: 1 }, { parId: 2, saldo: 500, ordem: 2 }];
    // J1: 5S 6D (11) | J2: KS 7S (17) | dealer: 6H + 0C (16)
    let r = rodada(["5S", "KS", "6H", "6D", "7S", "0C", "9H", "2C"], participantes);

    await r.apostar(2, 50);
    let estado = await r.apostar(1, 100);

    assert.equal(estado.jogadorDaVez, 1);
    assert.equal(await codigoDoErro(r.parar(2)), "NAO_E_SUA_VEZ");

    estado = await r.pedirCarta(1);                       // 11 + 9 = 20
    assert.equal(jogador(estado, 1).pontos, 20);
    estado = await r.parar(1);
    assert.equal(estado.jogadorDaVez, 2);
    estado = await r.parar(2);                            // dealer 16 compra 2 = 18

    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).status, STATUS.GANHOU);
    assert.equal(jogador(estado, 1).saldo, 1100);
    assert.equal(jogador(estado, 2).status, STATUS.PERDEU);
    assert.equal(jogador(estado, 2).saldo, 450);
});

test("validações de aposta e de fase", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"]);

    assert.equal(await codigoDoErro(r.apostar(1, 5)), "APOSTA_INVALIDA");
    assert.equal(await codigoDoErro(r.apostar(1, 5000)), "SALDO_INSUFICIENTE");
    assert.equal(await codigoDoErro(r.apostar(99, 100)), "PARTICIPANTE_NAO_ENCONTRADO");
    assert.equal(await codigoDoErro(r.parar(1)), "FASE_INVALIDA");   // ainda está nas apostas

    await r.apostar(1, 100);
    assert.equal(await codigoDoErro(r.apostar(1, 100)), "FASE_INVALIDA");
});

test("participante com saldo 10 ou menos fica fora da rodada", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"], [{ parId: 1, saldo: 1000 }, { parId: 2, saldo: 10 }]);
    assert.equal(await codigoDoErro(r.apostar(2, 10)), "PARTICIPANTE_NAO_ENCONTRADO");

    let estado = await r.apostar(1, 100);
    assert.equal(estado.jogadores.length, 1);
    assert.throws(() => rodada([], [{ parId: 2, saldo: 10 }]), { name: "ErroBlackjack" });
});

test("quem não apostou fica fora quando a distribuição é iniciada à força", async () => {
    let participantes = [{ parId: 1, saldo: 1000 }, { parId: 2, saldo: 1000 }];
    let r = rodada(["KS", "7H", "9S", "KD"], participantes);

    await r.apostar(1, 100);
    let estado = await r.iniciarDistribuicao();

    assert.equal(jogador(estado, 2).status, STATUS.FORA);
    assert.equal(jogador(estado, 2).cartas.length, 0);

    estado = await r.parar(1);
    assert.equal(r.obterResultados().jogadores.length, 1);
});

test("iniciarDistribuicao sem nenhuma aposta é recusado", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"]);
    assert.equal(await codigoDoErro(r.iniciarDistribuicao()), "SEM_APOSTAS");
});

test("sair da rodada: nas apostas cancela, jogando faz o jogador parar", async () => {
    let participantes = [{ parId: 1, saldo: 1000 }, { parId: 2, saldo: 1000 }];
    let r = rodada(["5S", "KS", "6H", "8D"], participantes);   // J1 = 11, dealer = 18

    await r.apostar(1, 100);
    let estado = await r.sairDaRodada(2);              // J2 sai antes de apostar, J1 era o único pendente
    assert.equal(estado.fase, FASES.JOGADORES);
    assert.equal(estado.jogadores.length, 1);

    estado = await r.sairDaRodada(1);                  // J1 sai na sua vez: para com 11 e perde para o dealer
    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(jogador(estado, 1).saldo, 900);
});

test("obterResultados só funciona com a rodada finalizada", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"]);
    await r.apostar(1, 100);
    assert.throws(() => r.obterResultados(), { codigo: "RODADA_EM_ANDAMENTO" });

    await r.parar(1);
    let resultados = r.obterResultados();
    assert.equal(resultados.dealerPontos, 17);
    assert.deepEqual(resultados.jogadores[0], {
        parId: 1, aposta: 100, somaCartas: 19, status: STATUS.GANHOU, lucro: 100, saldoFinal: 1100
    });
    assert.equal(r.cartasDaRodada.length, 4);
});

test("saldo vindo do banco como texto funciona", async () => {
    let r = rodada(["KS", "7H", "9S", "KD"], [{ parId: 1, saldo: "1000.00" }]);
    await r.apostar(1, "100");
    let estado = await r.parar(1);
    assert.equal(jogador(estado, 1).saldo, 1100);
});

test("ações simultâneas são executadas uma por vez (sem comprar carta em dobro)", async () => {
    let base = BaralhoLocal.deOrdemFixa(["5S", "7H", "6S", "9D", "KH", "2H", "3C"]);
    let lento = { comprar: async () => { await new Promise(res => setTimeout(res, 10)); return base.comprar(); } };
    let r = new RodadaBlackjack(1, lento, [{ parId: 1, saldo: 1000 }]);

    await r.apostar(1, 100);
    let resultados = await Promise.allSettled([r.pedirCarta(1), r.pedirCarta(1)]);

    assert.equal(resultados[0].status, "fulfilled");
    assert.equal(resultados[1].status, "rejected");
    assert.equal(resultados[1].reason.codigo, "FASE_INVALIDA");
    assert.equal(jogador(r.obterEstado(), 1).cartas.length, 3);
});

test("simulação de 3000 rodadas aleatórias mantém as regras consistentes", async () => {
    for(let n = 0; n < 3000; n++){
        let participantes = [
            { parId: 1, saldo: 1000 }, { parId: 2, saldo: 250.5 }, { parId: 3, saldo: 11 }
        ];
        let r = new RodadaBlackjack(n, new BaralhoLocal(), participantes);
        let apostas = { 1: 10 + Math.floor(Math.random() * 990), 2: 10 + Math.floor(Math.random() * 240), 3: 11 };

        for(let parId of [1, 2, 3]){
            await r.apostar(parId, apostas[parId]);
        }

        let estado = r.obterEstado();
        let guarda = 0;

        while(estado.fase === FASES.JOGADORES){
            assert.ok(guarda++ < 100, "rodada não terminou");
            let atual = jogador(estado, estado.jogadorDaVez);

            if(atual.pontos < 12 + Math.floor(Math.random() * 6)){
                estado = await r.pedirCarta(atual.parId);
            } else {
                estado = await r.parar(atual.parId);
            }
        }

        assert.equal(estado.fase, FASES.FINALIZADA);

        for(let j of estado.jogadores){
            let saldoInicial = participantes.find(p => p.parId === j.parId).saldo;

            assert.ok([STATUS.GANHOU, STATUS.PERDEU, STATUS.EMPATOU, STATUS.BLACKJACK, STATUS.ESTOUROU].includes(j.status));
            assert.equal(j.saldo, Math.round((saldoInicial + j.lucro) * 100) / 100);
            assert.ok(j.saldo >= 0);

            if(j.status === STATUS.ESTOUROU){
                assert.ok(j.pontos > 21);
                assert.equal(j.lucro, -j.aposta);
            } else {
                assert.ok(j.pontos <= 21);
            }

            if(j.status === STATUS.GANHOU) assert.equal(j.lucro, j.aposta);
            if(j.status === STATUS.EMPATOU) assert.equal(j.lucro, 0);
            if(j.status === STATUS.PERDEU) assert.equal(j.lucro, -j.aposta);
            if(j.status === STATUS.BLACKJACK) assert.equal(j.lucro, Math.round(j.aposta * 150) / 100);
        }

        assert.ok(estado.dealer.cartas.every(c => c.visivel));
        // Se o dealer comprou alguma carta, só pode ter parado com 17 ou mais
        if(estado.dealer.cartas.length > 2){
            assert.ok(estado.dealer.pontos >= 17);
        }
    }
});
