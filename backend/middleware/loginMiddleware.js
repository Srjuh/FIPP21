import "dotenv/config";
import jwt from "jsonwebtoken";
import UsuarioRepository from "../repositories/usuarioRepository.js";

const SEGREDO = process.env.JWT_SECRET;

if (!SEGREDO) {
    throw new Error("JWT_SECRET precisa estar configurado.");
}

const usuarios = new UsuarioRepository();

export default class LoginMiddleware {

    gerarJWT(id) {
        return jwt.sign({ id }, SEGREDO, { expiresIn: "1h" });
    }

    async autenticar(token) {
        if (!token) return null;
        try {
            const payload = jwt.verify(token, SEGREDO);
            return await usuarios.obterPorId(payload.id);
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
                return null;
            }
            throw error;
        }
    }

    async validar(req, res, next) {
        const token = req.cookies["token-pfs2"];

        if (!token) {
            return res.status(401).json({ msg: "Token inexistente!" });
        }

        try {
            const usuario = await new LoginMiddleware().autenticar(token);

            if (!usuario) {
                return res.status(401).json({ msg: "Token inválido, expirado ou usuário não encontrado!" });
            }

            req.usuario = usuario;
            return next();

        } catch (error) {
            return next(error);
        }
    }
}
