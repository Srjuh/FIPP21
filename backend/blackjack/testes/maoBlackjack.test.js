import test from "node:test";
import assert from "node:assert/strict";
import BaralhoLocal from "../baralhoLocal.js";
import MaoBlackjack from "../maoBlackjack.js";

function mao(...codigos) {
    return new MaoBlackjack(codigos.map(c => BaralhoLocal.criarCarta(c)));
}

test("figuras valem 10 e cartas numéricas valem o próprio número", () => {
    assert.equal(mao("KS", "QH").pontos, 20);
    assert.equal(mao("JD", "0C").pontos, 20);
    assert.equal(mao("5S", "9H").pontos, 14);
});

test("Ás vale 11 quando cabe e a mão é soft", () => {
    let m = mao("AS", "6H");
    assert.equal(m.pontos, 17);
    assert.equal(m.ehSoft, true);
});

test("Ás vira 1 quando a soma passaria de 21", () => {
    let m = mao("AS", "6H", "5D");
    assert.equal(m.pontos, 12);
    assert.equal(m.ehSoft, false);
});

test("dois Ases valem 12 e três Ases valem 13", () => {
    assert.equal(mao("AS", "AH").pontos, 12);
    assert.equal(mao("AS", "AH", "AD").pontos, 13);
});

test("estourou apenas acima de 21", () => {
    assert.equal(mao("KS", "QH", "AD").estourou, false);   // 21
    assert.equal(mao("KS", "QH", "2D").estourou, true);    // 22
});

test("blackjack natural exige 21 com exatamente duas cartas", () => {
    assert.equal(mao("AS", "KH").ehBlackjack, true);
    assert.equal(mao("AS", "0H").ehBlackjack, true);
    assert.equal(mao("7S", "7H", "7D").ehBlackjack, false);
    assert.equal(mao("KS", "9H").ehBlackjack, false);
});

test("pontosVisiveis ignora cartas viradas", () => {
    let m = mao("7S", "KH");
    m.cartas[1].visivel = "N";
    assert.equal(m.pontosVisiveis, 7);
    assert.equal(m.pontos, 17);
});
