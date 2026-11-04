import test from "node:test";
import assert from "node:assert/strict";
import BaralhoLocal from "../baralhoLocal.js";
import CartaEntity from "../../entities/cartaEntity.js";

test("baralho novo tem 52 cartas únicas", async () => {
    let baralho = new BaralhoLocal();
    let codigos = new Set();

    for(let i = 0; i < 52; i++){
        codigos.add((await baralho.comprar()).codigo);
    }

    assert.equal(codigos.size, 52);
    assert.equal(baralho.restantes, 0);
});

test("com 6 baralhos existem 312 cartas e ele se reabastece sozinho", async () => {
    let baralho = new BaralhoLocal(6);
    assert.equal(baralho.restantes, 312);

    for(let i = 0; i < 313; i++){
        await baralho.comprar();
    }

    assert.equal(baralho.restantes, 311);
});

test("ordem fixa entrega as cartas na ordem e acaba com erro", async () => {
    let baralho = BaralhoLocal.deOrdemFixa(["AS", "0H"]);

    assert.equal((await baralho.comprar()).codigo, "AS");
    let dez = await baralho.comprar();
    assert.equal(dez.codigo, "0H");
    assert.equal(dez.valor, 10);

    await assert.rejects(() => baralho.comprar(), /acabou/);
});

test("conversão de cartas da Deck of Cards API", () => {
    let carta = CartaEntity.fromDeckApi({ code: "KD", image: "x.png", value: "KING", suit: "DIAMONDS" });
    assert.equal(carta.valor, 10);
    assert.equal(carta.visivel, "S");
    assert.equal(carta.parId, null);

    assert.equal(CartaEntity.valorDaCartaApi("ACE"), 11);
    assert.equal(CartaEntity.valorDaCartaApi("10"), 10);
    assert.equal(CartaEntity.valorDaCartaApi("2"), 2);
    assert.throws(() => CartaEntity.valorDaCartaApi("JOKER"));
});

test("código inválido é recusado", () => {
    assert.throws(() => BaralhoLocal.criarCarta("ZZ"));
});
