-- Ajuste necessário para gravar o resultado das rodadas de blackjack.
-- O ENUM original não tem "Empatou" nem "Blackjack".
ALTER TABLE `tb_turno`
  MODIFY COLUMN `tur_status` ENUM("Jogando", "Estourou", "Ganhou", "Perdeu", "Empatou", "Blackjack") NULL;
