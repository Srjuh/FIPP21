import LoginMiddleware from "../middleware/loginMiddleware.js";
import UsuarioRepository from "../repositories/usuarioRepository.js";

export default class LoginController {

    #repoUsuario;

    constructor() {
        this.#repoUsuario = new UsuarioRepository();
    }

    async validar(req, res) {
        try{
            let {email, senha} = req.body;
            if(email && senha) {
                let usuario = await this.#repoUsuario.obterPorEmailSenha(email, senha);
                if(usuario) {
                    let middleware = new LoginMiddleware();
                    let token = middleware.gerarJWT(usuario.id);
                    res.cookie("token-pfs2", token, { httpOnly: true });
                    return res.status(200).json({token: token});
                }
                else {
                    return res.status(404).json({msg: "Usuário não encontrado!"});
                }
            }
            else {
                return res.status(400).json({msg: "Email e senha não informados corretamente!"});
            }
        }
        catch(ex) {
            console.log(ex);
            return res.status(500).json({ msg: "Erro interno ao realizar login!" });
        }
    }
}
