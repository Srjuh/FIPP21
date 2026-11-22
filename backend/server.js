// Dependências
import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { createRequire } from "module";

// Importação das rotas
import loginRouter from "./routes/loginRoute.js";
import usuarioRouter from "./routes/usuarioRoute.js";
import salaRouter from "./routes/salaRoute.js";
import participanteRouter from "./routes/participantesRoute.js";
import rodadaRouter from "./routes/rodadaRoute.js";

const require = createRequire(import.meta.url);
const outputJson = require("./swagger-output.json");

const server = express();

server.use(express.json());
server.use(cookieParser());

// Documentação Swagger
server.use("/docs", swaggerUi.serve, swaggerUi.setup(outputJson));

// Rotas
server.use("/login", loginRouter);
server.use("/usuario", usuarioRouter);
server.use("/sala", salaRouter);
server.use("/participante", participanteRouter);
server.use("/rodada", rodadaRouter);

server.listen(5000, function () {
  console.log("servidor web em funcionamento!");
});
