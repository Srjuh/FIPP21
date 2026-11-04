// Constantes do Blackjack.
// Se a equipe mudar alguma regra, basta ajustar aqui.

export const REGRAS = {
    SALDO_INICIAL: 1000,
    SALDO_MINIMO: 10,               // só joga quem tem saldo MAIOR que esse valor
    APOSTA_MINIMA: 10,              // README não define; ajuste se a equipe decidir outro valor
    LIMITE_PONTOS: 21,
    DEALER_PARA_EM: 17,             // dealer compra com 16 ou menos e para com 17 ou mais
    PAGAMENTO_NORMAL: 1,            // vitória comum paga 1:1
    PAGAMENTO_BLACKJACK: 1.5,       // blackjack natural paga 3:2
    DEALER_ESPIA_BLACKJACK: true    // se o dealer tem blackjack natural, a rodada acaba na hora
};

export const FASES = {
    APOSTAS: "Apostas",
    JOGADORES: "Jogadores",
    FINALIZADA: "Finalizada"
};

// Os valores de status que vão para tb_turno.tur_status
// (o ENUM do banco ainda precisa de "Parou", "Empatou" e "Blackjack")
export const STATUS = {
    AGUARDANDO: "Aguardando",   // ainda não apostou
    APOSTOU: "Apostou",
    JOGANDO: "Jogando",
    PAROU: "Parou",
    ESTOUROU: "Estourou",
    BLACKJACK: "Blackjack",
    GANHOU: "Ganhou",
    PERDEU: "Perdeu",
    EMPATOU: "Empatou",
    FORA: "Fora"                // não apostou a tempo, fica de fora da rodada
};
