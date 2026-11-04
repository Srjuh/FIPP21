import test from "node:test";
import assert from "node:assert/strict";
import BaralhoLocal from "../baralhoLocal.js";
import MaoBlackjack from "../maoBlackjack.js";
import RegrasBlackjack from "../regrasBlackjack.js";
import ErroBlackjack from "../erroBlackjack.js";
import { STATUS } from "../blackjackConfig.js";

function mao(...codigos) {
    return new MaoBlackjack(codigos.map(c => BaralhoLocal.criarCarta(c)));
}

test("só joga quem tem saldo superior a 10", () => {
    assert.equal(RegrasBlackjack.jogadorPodeJogar(1000), true);
    assert.equal(RegrasBlackjack.jogadorPodeJogar("10.01"), true);
    assert.equal(RegrasBlackjack.jogadorPodeJogar(10), false);
    assert.equal(RegrasBlackjack.jogadorPodeJogar(0), false);
});

test("validarAposta aceita valores corretos e devolve número", () => {
    assert.equal(RegrasBlackjack.validarAposta("1000.00", "100"), 100);
    assert.equal(RegrasBlackjack.validarAposta(500, 15.25), 15.25);
});

test("validarAposta recusa valores inválidos", () => {
    let codigo = (saldo, valor) => {
        try { RegrasBlackjack.validarAposta(saldo, valor); }
        catch(ex) { assert.ok(ex instanceof ErroBlackjack); return ex.codigo; }
        return null;
    };

    assert.equal(codigo(1000, 5), "APOSTA_INVALIDA");        // abaixo do mínimo
    assert.equal(codigo(1000, -50), "APOSTA_INVALIDA");
    assert.equal(codigo(1000, "abc"), "APOSTA_INVALIDA");
    assert.equal(codigo(1000, ""), "APOSTA_INVALIDA");
    assert.equal(codigo(1000, null), "APOSTA_INVALIDA");
    assert.equal(codigo(1000, 10.123), "APOSTA_INVALIDA");   // 3 casas
    assert.equal(codigo(100, 101), "SALDO_INSUFICIENTE");
});

test("dealer compra com 16 ou menos e para com 17 ou mais", () => {
    assert.equal(RegrasBlackjack.dealerDeveComprar(mao("KS", "6H")), true);    // 16
    assert.equal(RegrasBlackjack.dealerDeveComprar(mao("KS", "7H")), false);   // 17
    assert.equal(RegrasBlackjack.dealerDeveComprar(mao("AS", "6H")), false);   // 17 soft
});

test("jogador não pede carta com 21 nem depois de estourar", () => {
    assert.equal(RegrasBlackjack.jogadorPodePedirCarta(mao("KS", "6H")), true);
    assert.equal(RegrasBlackjack.jogadorPodePedirCarta(mao("7S", "7H", "7D")), false);
    assert.equal(RegrasBlackjack.jogadorPodePedirCarta(mao("KS", "QH", "5D")), false);
});

test("resolverResultado cobre todos os casos", () => {
    let r = (j, d) => RegrasBlackjack.resolverResultado(mao(...j), mao(...d));

    assert.equal(r(["KS", "9H"], ["KD", "7C"]), STATUS.GANHOU);               // 19 x 17
    assert.equal(r(["KS", "7H"], ["KD", "9C"]), STATUS.PERDEU);               // 17 x 19
    assert.equal(r(["KS", "8H"], ["KD", "8C"]), STATUS.EMPATOU);              // 18 x 18
    assert.equal(r(["KS", "6H", "9D"], ["KD", "6C", "9S"]), STATUS.PERDEU);   // jogador estoura e dealer também
    assert.equal(r(["KS", "9H"], ["KD", "6C", "9S"]), STATUS.GANHOU);         // dealer estoura
    assert.equal(r(["AS", "KH"], ["KD", "7C"]), STATUS.BLACKJACK);            // natural
    assert.equal(r(["AS", "KH"], ["AD", "QC"]), STATUS.EMPATOU);              // natural x natural
    assert.equal(r(["7S", "7H", "7D"], ["AD", "QC"]), STATUS.PERDEU);         // 21 com 3 cartas perde de natural
    assert.equal(r(["AS", "KH"], ["7S", "7H", "7D"]), STATUS.BLACKJACK);      // natural ganha de 21 com 3 cartas
});

test("pagamentos: 1:1, 3:2, empate devolve e derrota perde a aposta", () => {
    assert.equal(RegrasBlackjack.calcularLucro(100, STATUS.GANHOU), 100);
    assert.equal(RegrasBlackjack.calcularLucro(100, STATUS.BLACKJACK), 150);
    assert.equal(RegrasBlackjack.calcularLucro(15.25, STATUS.BLACKJACK), 22.88);
    assert.equal(RegrasBlackjack.calcularLucro(100, STATUS.EMPATOU), 0);
    assert.equal(RegrasBlackjack.calcularLucro(100, STATUS.PERDEU), -100);
});
