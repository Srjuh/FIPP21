import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function criarHash(senha) {
    const salt = randomBytes(16).toString("hex");
    const hash = await scrypt(senha, salt, 64);
    return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function verificarSenha(senha, armazenada) {
    if(typeof senha !== "string" || typeof armazenada !== "string") return false;
    if(!armazenada.startsWith("scrypt:")) {
        const digitada = Buffer.from(senha);
        const original = Buffer.from(armazenada);
        return digitada.length === original.length && timingSafeEqual(digitada, original);
    }

    const partes = armazenada.split(":");
    if(partes.length !== 3 || !/^[0-9a-f]{32}$/.test(partes[1]) || !/^[0-9a-f]{128}$/.test(partes[2])) return false;
    const esperado = Buffer.from(partes[2], "hex");
    const calculado = await scrypt(senha, partes[1], esperado.length);
    return timingSafeEqual(calculado, esperado);
}
