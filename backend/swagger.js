import swaggerAutogen from "swagger-autogen";

const doc = {
    info: {
        title: "API para o projeto bimestral FIPP21",
        description: "Documentação do conjunto de endpoints criados para o BlackJack"
    },
    host: "localhost:5000"
}

const outputFile = "./swagger-output.json";
const routes = ["./server.js"];

swaggerAutogen({openapi: '3.0.0'})(outputFile, routes, doc)
.then(async () => {
    await import("./server.js");
});
