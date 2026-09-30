import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: 'O que é um webinar?',
    summary: 'Em que um webinar difere de uma videochamada, e quem faz o quê.',
    group: 'O essencial',
    body: `Um webinar é um evento online em direto: um anfitrião, ou um pequeno número de oradores, apresenta a um público que assiste e participa a partir de onde estiver. A palavra resulta da junção de "web" e "seminar" (seminário, em inglês).

## Em que difere de uma videochamada

Numa videochamada, normalmente todos estão com a câmara ligada e qualquer pessoa pode falar. Um webinar funciona mais como uma palestra num auditório:

- **O anfitrião gere o palco.** Apresenta, partilha materiais e decide quem mais é ouvido.
- **O público assiste.** Os participantes veem e ouvem o palco, mas não aparecem na câmara.
- **O público continua a participar.** Os participantes podem escrever no chat, enviar reações e pedir para falar. Se o anfitrião concordar, entram em antena por um momento e depois voltam a assistir.

Este formato torna os webinars adequados a grupos maiores, porque uma sala com cinquenta ou quinhentas pessoas não se transforma numa confusão de vozes.

## Antes e depois da parte em direto

Um webinar é mais do que a hora que dura. Normalmente as pessoas inscrevem-se com antecedência, recebem uma confirmação e lembretes, entram no dia e, depois, voltam a receber notícias do anfitrião, muitas vezes com uma ligação para uma gravação. O Universal Webinar trata de cada um desses passos, para que o anfitrião possa gerir tudo a partir de um só sítio.

## Em direto, não gravado

Tudo na sala acontece em tempo real. Há um atraso de mais ou menos um instante entre o anfitrião falar e o público ouvir, e é por isso que as perguntas no chat por vezes chegam logo depois de o anfitrião ter passado a outro assunto. Vale a pena fazer uma breve pausa depois de perguntar algo ao público.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Como o vídeo em direto chega a todos',
    summary: 'O percurso desde a câmara do anfitrião até cada ecrã da sala.',
    group: 'O essencial',
    body: `Quando um anfitrião entra em direto, a câmara e o microfone são captados pelo navegador, comprimidos e enviados pela internet para um serviço de vídeo. Esse serviço reencaminha a transmissão para o navegador de cada participante, que a descomprime e reproduz. Todo o percurso demora normalmente bem menos de um segundo.

## Porque existe um serviço de vídeo pelo meio

Seria possível o computador do anfitrião enviar o vídeo diretamente a cada participante, mas isso implicaria enviar a mesma transmissão uma vez por pessoa, e uma ligação doméstica esgota rapidamente a capacidade de envio. Em vez disso, o anfitrião envia uma única transmissão para o serviço, e é o serviço que faz o trabalho de a copiar para todos. É isso que permite a um webinar crescer até um grande público sem que o anfitrião precise de uma ligação especial.

## A tecnologia por trás

O Universal Webinar utiliza WebRTC, a norma integrada nos navegadores modernos para áudio e vídeo em direto, juntamente com um serviço de vídeo chamado LiveKit, que retransmite as transmissões. Não é preciso instalar nada: o navegador faz tudo.

## Quando a imagem oscila

O vídeo em direto ajusta-se à ligação disponível. Se a sua ligação ficar mais lenta, a imagem pode perder nitidez ou parar brevemente enquanto o som continua, porque a transmissão dá prioridade a manter-se em direto em vez de se manter nítida. Algumas dicas práticas:

- Para anfitriões e para quem for colocado em antena, uma ligação por cabo ou um lugar perto do router Wi-Fi é o que faz mais diferença.
- Fechar outras aplicações que usam muito a internet, como transferências grandes ou outras videochamadas, liberta capacidade.
- Se o vídeo ficar parado de vez, recarregar a página normalmente volta a ligá-lo à sala.

## A sua câmara e o seu microfone

Os participantes apenas recebem vídeo. A sua câmara e o seu microfone nunca são usados, a menos que o anfitrião o coloque em antena e, em seguida, os ligue por iniciativa própria. Na primeira vez, o navegador pedirá a sua autorização.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Inscrição e entrada',
    summary: 'A confirmação, os lembretes e a ligação de entrada, e o que um anfitrião pode exigir antes de entrar.',
    group: 'Como funciona',
    body: `## Inscrição

Para se inscrever, indica o seu nome e endereço de e-mail, bem como as respostas a quaisquer perguntas que o anfitrião tenha acrescentado. Não precisa de uma conta.

Depois de se inscrever, recebe um e-mail de confirmação com os detalhes da sessão, um convite que pode adicionar ao seu calendário e a sua própria ligação de entrada pessoal. Essa ligação leva-o diretamente à sala em qualquer dispositivo, sem voltar a introduzir os seus dados, por isso vale a pena guardá-la.

## Lembretes e acompanhamento

A menos que o anfitrião os tenha desativado, também recebe:

- um lembrete nas 24 horas antes do início da sessão;
- um segundo lembrete cerca de uma hora antes do início;
- uma mensagem de acompanhamento quando a sessão terminar, a agradecer a sua presença ou, se não compareceu, a indicá-lo. Se o anfitrião acrescentar uma ligação para a gravação, esta é incluída. O acompanhamento é enviado assim que o anfitrião acrescenta uma gravação, ou um dia depois do fim do webinar, caso não o faça.

Cada e-mail inclui a mesma ligação de entrada pessoal. Os anfitriões podem ativar ou desativar a confirmação, os lembretes e o acompanhamento separadamente.

## O que um anfitrião pode exigir

Os anfitriões podem configurar a entrada de diferentes formas:

- **Aprovação** — a sua inscrição fica em espera até o anfitrião a aprovar. O e-mail de confirmação com a sua ligação de entrada só é enviado depois de ser aprovado.
- **Limite de lugares** — quando o webinar fica lotado, as novas inscrições passam para uma lista de espera, e as pessoas sobem automaticamente quando fica um lugar livre.
- **Ligação de entrada aberta** — o anfitrião pode permitir que as pessoas entrem no dia sem se inscreverem primeiro, e pode fechar essa porta a qualquer momento. Quem já se inscreveu e foi aprovado continua a poder entrar.
- **PIN** — o anfitrião pode colocar um PIN na sala. Todos precisam dele para entrar, incluindo quem se inscreveu.

Estas regras são verificadas pelo serviço, e não apenas pela página que vê.

## Entrar no dia

Abra a sua ligação de entrada, ou a ligação que o anfitrião partilhou, e introduza o seu nome e e-mail, se lhe for pedido. O navegador memoriza-os para a próxima vez. Na sala, pode assistir, escrever no chat, enviar reações e levantar a mão para pedir a palavra.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Como apresentar um webinar',
    summary: 'A sua ligação de gestão, entrar em direto, responder a perguntas e concluir.',
    group: 'Como funciona',
    body: `## Preparação

Pode preencher os detalhes de um novo webinar sem iniciar sessão. Para entrar em direto ou agendá-lo, precisa de um Universal ID gratuito: se não tiver um, a aplicação envia-lhe por e-mail um código de seis dígitos, e introduzi-lo cria a sua conta. Organizar webinars é gratuito com um Universal ID. As contas gratuitas têm um limite generoso e, se o atingir, fechar um webinar que tenha mantido liberta espaço para o seguinte.

Ao criar um webinar, recebe uma **ligação de gestão**. É a chave do seu webinar: quem a tiver pode alterar as definições, ver as inscrições e gerir a sala. Este navegador memoriza-a por si, mas guarde uma cópia num local seguro para poder gerir o webinar a partir de outro dispositivo, e não a partilhe.

## Na sala

- **O seu palco** — a sua câmara e o seu microfone são transmitidos a todos na sala.
- **Partilhar um documento** — pode colocar um PDF ou uma imagem no palco para os participantes lerem. Cada pessoa percorre o documento por si; as páginas não acompanham as suas.
- **Perguntas** — os participantes levantam a mão. Pode colocar alguém em antena, voltar a retirá-lo, recusar um pedido ou impedir que uma pessoa volte a pedir, deixando-a continuar a assistir e a escrever no chat.
- **Inscrições** — pode ver quem se inscreveu, aprovar ou recusar pessoas se exigir aprovação, e gerir uma lista de espera.

## Conclusão

Quando a sessão termina, a página de conclusão reúne o que falta fazer.

1. **Gravação** — o Universal Webinar não grava a sessão. Se a gravou de outra forma, cole aqui a ligação e esta será enviada no e-mail de acompanhamento a todos os inscritos.
2. **A sua lista** — transfira um ficheiro de folha de cálculo com nomes, endereços de e-mail, respostas, quem compareceu e quem entrou sem se inscrever.
3. **Manter ou fechar** — escolha **Guardar na nuvem** para manter o webinar e todos os inscritos durante o tempo que quiser. Ou escolha **Fechar webinar** para libertar espaço para o seu próximo webinar. No plano gratuito, um webinar fechado e as respetivas inscrições são eliminados 30 dias depois, por isso transfira primeiro a sua lista.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'A sua privacidade como participante',
    summary: 'O que partilha, quem o pode ver e durante quanto tempo é guardado.',
    group: 'Privacidade e segurança',
    body: `## O que fornece

Quando se inscreve ou entra, fornece o seu nome e endereço de e-mail, e as respostas a quaisquer perguntas que o anfitrião tenha acrescentado. A aplicação regista também se entrou na sala, o que escreve no chat, as reações que envia e quaisquer pedidos para falar.

## Quem pode ver o quê

- **Os outros participantes** veem o seu nome junto às suas mensagens no chat. Não veem o seu endereço de e-mail.
- **O anfitrião** vê o seu nome, endereço de e-mail, respostas, se compareceu e as suas mensagens no chat. Pode transferir essa lista, como em qualquer evento que organize.
- **Todos na sala** podem vê-lo e ouvi-lo se o anfitrião o colocar em antena e ligar a sua câmara ou o seu microfone. Caso contrário, a sua câmara e o seu microfone não são usados.

## Os e-mails que recebe

O seu endereço de e-mail é usado para enviar a confirmação, os lembretes e o acompanhamento do webinar em que se inscreveu, a menos que o anfitrião os tenha desativado. É transmitido ao serviço de entrega de e-mails para esse fim.

## Vídeo e áudio em direto

O vídeo e o áudio circulam por ligações encriptadas, como acontece com todas as ligações WebRTC. Passam pelos servidores do serviço de vídeo a caminho de todos na sala, pelo que não têm encriptação ponto a ponto. O Universal Webinar não grava a sessão; um anfitrião pode gravá-la com outras ferramentas e deve informá-lo se o fizer.

## Durante quanto tempo é guardado

A sua inscrição fica associada ao webinar. Quando um anfitrião com o plano gratuito fecha um webinar, este e as inscrições de todos são eliminados 30 dias depois. Um anfitrião que opte por manter um webinar, ou que tenha um plano pago, pode guardá-los durante mais tempo. Qualquer lista que o anfitrião tenha transferido fica sob a responsabilidade dele.

## O que o seu navegador memoriza

O navegador memoriza o nome e o e-mail com que entrou, para que não tenha de os introduzir novamente da próxima vez.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Segurança para anfitriões',
    summary: 'Como manter segura a sua ligação de gestão, e o que é público.',
    group: 'Privacidade e segurança',
    body: `## A sua ligação de gestão é a chave

Qualquer pessoa que tenha a sua ligação de gestão pode gerir o seu webinar: alterar as definições, ver os dados de todos os inscritos, colocar pessoas em antena e fechá-lo. Trate-a como uma palavra-passe. Não a cole no chat da sala nem a envie aos participantes; em vez disso, dê-lhes a ligação de entrada ou de inscrição.

## O que é público, e o que não é

- **Público** — os detalhes do webinar, como o título, a descrição, o horário, o nome da empresa e o logótipo, são públicos para que as pessoas possam decidir se participam. O endereço de e-mail com que apresenta o webinar e qualquer ligação de gravação que acrescente são guardados com esses detalhes, por isso use um endereço que não se importe que os participantes vejam.
- **Público para quem tiver a ligação** — um documento que partilhe no palco e o seu logótipo são guardados em endereços web longos e aleatórios. Qualquer pessoa que tenha um desses endereços pode abrir o ficheiro, e é isso que permite a todos na sala vê-lo. Remover um documento partilhado elimina-o.
- **Privado** — os endereços de e-mail e as respostas dos inscritos, bem como o PIN da sala, nunca são mostrados em páginas públicas. Só são devolvidos a quem apresentar a sua ligação de gestão.

## Sobre o PIN da sala

Um PIN impede a entrada de curiosos. É verificado pelo serviço, e não apenas pela página, e o serviço limita o número de tentativas erradas possíveis. Mesmo assim, um PIN é um número curto, pelo que é mais adequado para manter um evento organizado do que para proteger algo verdadeiramente sensível. Use um PIN mais longo se for importante, e mude-o em cada sessão.

## Os dados dos seus inscritos

É responsável pela forma como utiliza a lista que transfere. Envie e-mails às pessoas apenas sobre aquilo em que se inscreveram, e elimine as cópias de que já não precisa. No plano gratuito, fechar um webinar elimina-o, juntamente com as inscrições, 30 dias depois; guardá-lo na nuvem mantém-nos até o fechar.

## A sua conta

Apresentar webinars utiliza o seu Universal ID, a mesma conta usada em todas as aplicações UNI·SIM. O seu endereço de e-mail é verificado com um código de utilização única antes de poder entrar em direto.`,
  },
]

export default articles
