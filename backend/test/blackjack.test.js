import test from "node:test";
import assert from "node:assert/strict";
import RodadaBlackjack from "../blackjack/rodadaBlackjack.js";
import BaralhoLocal from "../blackjack/baralhoLocal.js";
import { FASES, STATUS } from "../blackjack/blackjackConfig.js";
import BaralhoService from "../services/baralhoService.js";

test("rodada multiplayer respeita turnos, esconde o dealer e paga cada jogador", async () => {
    const baralho = BaralhoLocal.deOrdemFixa(["0S", "9H", "6S", "7S", "8H", "0C", "9S", "0D"]);
    const rodada = new RodadaBlackjack(1, baralho, [
        { parId: 1, saldo: 1000 }, { parId: 2, saldo: 1000 }
    ]);

    await rodada.apostar(1, 50);
    let estado = await rodada.apostar(2, 100);
    assert.equal(estado.jogadorDaVez, 1);
    assert.deepEqual(estado.dealer.cartas[1], { visivel: false });
    await assert.rejects(rodada.pedirCarta(2), { codigo: "NAO_E_SUA_VEZ" });
    estado = await rodada.parar(1);
    assert.equal(estado.jogadorDaVez, 2);
    estado = await rodada.pedirCarta(2);
    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(estado.dealer.pontos, 26);
    assert.equal(estado.dealer.cartas[1].visivel, true);
    assert.equal(estado.jogadores[0].saldo, 1050);
    assert.equal(estado.jogadores[1].saldo, 900);
    assert.equal(estado.jogadores[1].status, STATUS.ESTOUROU);
    assert.equal(rodada.cartasDaRodada.filter(carta => carta.parId === null).length, 3);
});

test("blackjack natural paga 3:2 e o dealer joga conforme suas regras", async () => {
    const rodada = new RodadaBlackjack(2, BaralhoLocal.deOrdemFixa(["AS", "9S", "KH", "7S", "0H"]), [
        { parId: 1, saldo: 1000 }
    ]);
    const estado = await rodada.apostar(1, 50);
    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(estado.jogadores[0].status, STATUS.BLACKJACK);
    assert.equal(estado.jogadores[0].saldo, 1075);
    assert.equal(estado.dealer.pontos, 26);
});

test("jogador que estoura perde a aposta antes do turno seguinte", async () => {
    const rodada = new RodadaBlackjack(5, BaralhoLocal.deOrdemFixa(["0S", "9H", "9S", "9D", "7H", "7S", "5S"]), [
        { parId: 1, saldo: 1000 }, { parId: 2, saldo: 1000 }
    ]);
    await rodada.apostar(1, 50);
    await rodada.apostar(2, 50);
    const estado = await rodada.pedirCarta(1);
    assert.equal(estado.jogadorDaVez, 2);
    assert.equal(estado.jogadores[0].status, STATUS.ESTOUROU);
    assert.equal(estado.jogadores[0].saldo, 950);
});

test("falha na distribuição não muda a fase e permite tentar novamente", async () => {
    const local = BaralhoLocal.deOrdemFixa(["9S", "9H", "7S", "8H"]);
    let falhou = false;
    const baralho = {
        async comprarVarias(n) {
            if(!falhou) { falhou = true; throw new Error("indisponível"); }
            return local.comprarVarias(n);
        },
        comprar: () => local.comprar()
    };
    const rodada = new RodadaBlackjack(3, baralho, [{ parId: 1, saldo: 1000 }]);
    await assert.rejects(rodada.apostar(1, 50), /indisponível/);
    assert.equal(rodada.fase, FASES.APOSTAS);
    assert.equal(rodada.obterEstado().jogadores[0].cartas.length, 0);
    const estado = await rodada.continuar();
    assert.equal(estado.fase, FASES.JOGADORES);
    assert.equal(estado.jogadores[0].aposta, 50);
});

test("uma falha na compra do dealer pode ser retomada sem aplicar o pagamento duas vezes", async () => {
    const local = BaralhoLocal.deOrdemFixa(["0S", "9S", "7S", "7H", "0H"]);
    let falhou = false;
    const baralho = {
        comprarVarias: n => local.comprarVarias(n),
        async comprar() {
            if(!falhou) { falhou = true; throw new Error("indisponível"); }
            return local.comprar();
        }
    };
    const rodada = new RodadaBlackjack(6, baralho, [{ parId: 1, saldo: 1000 }]);
    await rodada.apostar(1, 50);
    await assert.rejects(rodada.parar(1), /indisponível/);
    const estado = await rodada.continuar();
    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.equal(estado.jogadores[0].saldo, 1050);
    assert.equal(rodada.obterResultados().jogadores[0].lucro, 50);
});

test("a saída do último jogador na fase de apostas encerra a rodada", async () => {
    const rodada = new RodadaBlackjack(4, BaralhoLocal.deOrdemFixa([]), [{ parId: 1, saldo: 1000 }]);
    const estado = await rodada.sairDaRodada(1);
    assert.equal(estado.fase, FASES.FINALIZADA);
    assert.deepEqual(rodada.obterResultados().jogadores, []);
});

test("serviço usa um baralho externo por rodada e converte as cartas", async () => {
    const fetchOriginal = globalThis.fetch;
    const urls = [];
    globalThis.fetch = async url => {
        urls.push(String(url));
        return { ok: true, json: async () => urls.length === 1
            ? { success: true, deck_id: "baralho1" }
            : { success: true, cards: [{ code: "AS", image: "imagem", value: "ACE", suit: "SPADES" }] } };
    };
    try {
        const servico = new BaralhoService();
        const codigo = await servico.criarBaralho();
        const carta = await servico.criarBaralhoDaRodada(codigo).comprar();
        assert.match(urls[0], /deck_count=1/);
        assert.match(urls[1], /baralho1\/draw\/\?count=1/);
        assert.equal(carta.valor, 11);
        assert.equal(carta.codigo, "AS");
    } finally {
        globalThis.fetch = fetchOriginal;
    }
});
