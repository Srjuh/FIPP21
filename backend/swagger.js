import swaggerAutogen from "swagger-autogen";

const doc = {
    info: {
        title: "API para o projeto bimestral FIPP21",
        description: "Documentação do conjunto de endpoints criados para o BlackJack"
    },
    host: "localhost:5000",
    components: {
    securitySchemes: {
        cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token-pfs2"
        }
    }
}
}

const outputFile = "./swagger-output.json";
const routes = ["./server.js"];

swaggerAutogen({openapi: '3.0.0'})(outputFile, routes, doc)
.then(async (resultado) => {
    if (!resultado.success) {
        throw new Error("Não foi possível gerar a documentação Swagger.");
    }
    await import("./server.js");
})
.catch(erro => {
    console.error(erro);
    process.exitCode = 1;
});
