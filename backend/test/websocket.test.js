import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import WebSocket from "ws";

process.env.JWT_SECRET = "chave-de-teste";
const { iniciarWebSocket, notificarSala, removerDaSala } = await import("../websocket.js");

test("WebSocket autentica, restringe inscrição e envia eventos apenas aos participantes", async () => {
    const http = createServer();
    let concluirConsulta;
    let avisarConsulta;
    const consultaIniciada = new Promise(resolve => { avisarConsulta = resolve; });
    const wsServer = iniciarWebSocket(http, {
        autenticar: async token => token === "valido" ? { id: 1 } : null,
        repo: { obterParticipanteUsuario: async sala => {
            if(sala === 9){
                avisarConsulta();
                return new Promise(resolve => { concluirConsulta = resolve; });
            }
            return sala === 7 ? { par_id: 1 } : null;
        } }
    });
    await new Promise(resolve => http.listen(0, "127.0.0.1", resolve));
    const url = `ws://127.0.0.1:${http.address().port}/ws`;
    const ws = new WebSocket(url, { headers: { Cookie: "token-pfs2=valido" } });
    try {
        await once(ws, "open");
        let proxima = once(ws, "message");
        ws.send(JSON.stringify({ tipo: "entrar", salaId: 8 }));
        let [dados] = await proxima;
        assert.equal(JSON.parse(dados).tipo, "erro");

        proxima = once(ws, "message");
        ws.send(JSON.stringify({ tipo: "entrar", salaId: 7 }));
        [dados] = await proxima;
        assert.equal(JSON.parse(dados).tipo, "inscrito");

        proxima = once(ws, "message");
        notificarSala(7, "rodada", { estado: { fase: "Apostas" } });
        [dados] = await proxima;
        assert.equal(JSON.parse(dados).estado.fase, "Apostas");
        removerDaSala(7, 1);
        assert.equal([...wsServer.clients][0].salas.has(7), false);

        proxima = once(ws, "message");
        ws.send(JSON.stringify({ tipo: "entrar", salaId: 9 }));
        await consultaIniciada;
        removerDaSala(9, 1);
        concluirConsulta({ par_id: 1 });
        [dados] = await proxima;
        assert.equal(JSON.parse(dados).tipo, "erro");
        assert.equal([...wsServer.clients][0].salas.has(9), false);

        const status = await new Promise((resolve, reject) => {
            const naoAutorizado = new WebSocket(url);
            naoAutorizado.on("unexpected-response", (_req, response) => {
                response.resume();
                resolve(response.statusCode);
            });
            naoAutorizado.on("open", () => reject(new Error("Conexão sem token foi aceita")));
            naoAutorizado.on("error", reject);
        });
        assert.equal(status, 401);
    } finally {
        ws.close();
        await once(ws, "close");
        await new Promise(resolve => wsServer.close(resolve));
        await new Promise(resolve => http.close(resolve));
    }
});
