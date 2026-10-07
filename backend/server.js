import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const outputJson = require("./swagger-output.json");

const server = express();

server.use(express.json());
server.use(cookieParser());

server.use("/docs", swaggerUi.serve, swaggerUi.setup(outputJson));

server.listen(5000, function() {
    console.log("servidor web em funcionamento!");
})
