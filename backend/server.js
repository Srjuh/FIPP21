// Dependências
import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { createRequire } from "module";
import { createServer } from "http";
import { fileURLToPath } from "url";
import cors from "cors";
import { iniciarWebSocket } from "./websocket.js";

// Importação das rotas
import loginRouter from "./routes/loginRoute.js";
import usuarioRouter from "./routes/usuarioRoute.js";
import salaRouter from "./routes/salaRoute.js";
import participanteRouter from "./routes/participantesRoute.js";
import rodadaRouter from "./routes/rodadaRoute.js";
import blackjackRouter from "./routes/blackjackRoute.js";

const require = createRequire(import.meta.url);
const outputJson = require("./swagger-output.json");

const server = express();

if (process.env.FRONTEND_ORIGIN) {
  server.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
}
server.use(express.json());
server.use(cookieParser());

// Documentação Swagger
server.use("/docs", swaggerUi.serve, swaggerUi.setup(outputJson));
server.get("/teste", (_req, res) => {
  res.sendFile(fileURLToPath(new URL("./teste.html", import.meta.url)));
});

// Rotas
server.use("/login", loginRouter);
server.use("/usuario", usuarioRouter);
server.use("/sala", salaRouter);
server.use("/participante", participanteRouter);
server.use("/rodada", rodadaRouter);
server.use("/blackjack", blackjackRouter);

const httpServer = createServer(server);
iniciarWebSocket(httpServer);
httpServer.listen(5000, function () {
  console.log("servidor web em funcionamento!");
});
