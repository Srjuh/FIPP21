import "dotenv/config";
import jwt from "jsonwebtoken";
import UsuarioRepository from "../repositories/usuarioRepository.js";

const SEGREDO = process.env.JWT_SECRET;

if (!SEGREDO) {
    throw new Error("JWT_SECRET precisa estar configurado.");
}

export default class LoginMiddleware {

    gerarJWT(id) {
        return jwt.sign({ id }, SEGREDO, { expiresIn: "1h" });
    }

    async validar(req, res, next) {
        const token = req.cookies["token-pfs2"];

        if (!token) {
            return res.status(401).json({ msg: "Token inexistente!" });
        }

        try {
            const payload = jwt.verify(token, SEGREDO);

            const repo = new UsuarioRepository();
            const usuario = await repo.obterPorId(payload.id);

            if (!usuario) {
                return res.status(401).json({ msg: "Usuário não encontrado!" });
            }

            req.usuario = usuario;
            return next();

        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ msg: "Token inválido ou expirado!" });
            }

            return next(error);
        }
    }
}
