import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import LoginMiddleware from "./middleware/loginMiddleware.js";
import BlackjackRepository from "./repositories/blackjackRepository.js";

let servidor;

export function iniciarWebSocket(httpServer, opcoes = {}) {
    const autenticar = opcoes.autenticar ?? (token => new LoginMiddleware().autenticar(token));
    const repo = opcoes.repo ?? new BlackjackRepository();
    servidor = new WebSocketServer({ noServer: true, maxPayload: 4096 });

    httpServer.on("upgrade", async (req, socket, head) => {
        try {
            const url = new URL(req.url, "http://localhost");
            if(url.pathname !== "/ws"){
                socket.destroy();
                return;
            }

            if(req.headers.origin){
                const origem = new URL(req.headers.origin);
                const permitida = process.env.FRONTEND_ORIGIN;
                if(origem.host !== req.headers.host && origem.origin !== permitida){
                    socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
                    socket.destroy();
                    return;
                }
            }

            const cookie = (req.headers.cookie ?? "").split(";")
                .map(item => item.trim())
                .find(item => item.startsWith("token-pfs2="));
            const token = cookie ? decodeURIComponent(cookie.slice("token-pfs2=".length)) : null;
            const usuario = await autenticar(token);
            if(!usuario){
                socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
                socket.destroy();
                return;
            }

            servidor.handleUpgrade(req, socket, head, ws => {
                ws.usuarioId = usuario.id;
                ws.salas = new Set();
                ws.versoes = new Map();
                const exp = jwt.decode(token)?.exp;
                const expiracao = exp ? setTimeout(() => ws.close(1008, "Sessão expirada"), Math.max(1, exp * 1000 - Date.now())) : null;
                ws.on("close", () => { if(expiracao) clearTimeout(expiracao); });
                ws.on("error", erro => console.error("Erro no WebSocket:", erro));
                ws.on("message", async dados => {
                    try {
                        const mensagem = JSON.parse(dados.toString());
                        const salaId = Number(mensagem.salaId);
                        if(mensagem.tipo !== "entrar" || !Number.isSafeInteger(salaId) || salaId <= 0){
                            ws.send(JSON.stringify({ tipo: "erro", msg: "Mensagem inválida." }));
                            return;
                        }
                        const versao = ws.versoes.get(salaId) ?? 0;
                        const participante = await repo.obterParticipanteUsuario(salaId, ws.usuarioId);
                        if(ws.readyState !== WebSocket.OPEN) return;
                        if(!participante || (ws.versoes.get(salaId) ?? 0) !== versao){
                            ws.send(JSON.stringify({ tipo: "erro", msg: "Usuário não participa desta sala." }));
                            return;
                        }
                        ws.salas.add(salaId);
                        ws.send(JSON.stringify({ tipo: "inscrito", salaId }));
                    } catch(erro) {
                        if(erro instanceof SyntaxError){
                            ws.send(JSON.stringify({ tipo: "erro", msg: "JSON inválido." }));
                        } else {
                            console.error("Erro ao inscrever WebSocket:", erro);
                            ws.send(JSON.stringify({ tipo: "erro", msg: "Não foi possível entrar na sala." }));
                        }
                    }
                });
            });
        } catch(erro) {
            console.error("Erro na conexão WebSocket:", erro);
            socket.destroy();
        }
    });

    return servidor;
}

export function notificarSala(salaId, tipo, dados = {}) {
    if(!servidor) return;
    const mensagem = JSON.stringify({ tipo, salaId: Number(salaId), ...dados });
    for(const cliente of servidor.clients){
        if(cliente.readyState === WebSocket.OPEN && cliente.salas.has(Number(salaId))){
            cliente.send(mensagem);
        }
    }
}

export function removerDaSala(salaId, usuarioId) {
    if(!servidor) return;
    for(const cliente of servidor.clients){
        if(Number(cliente.usuarioId) === Number(usuarioId)){
            const id = Number(salaId);
            cliente.salas.delete(id);
            cliente.versoes.set(id, (cliente.versoes.get(id) ?? 0) + 1);
        }
    }
}
