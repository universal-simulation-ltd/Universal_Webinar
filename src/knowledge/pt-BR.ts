import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: 'O que é um webinar?',
    summary: 'Como um webinar se diferencia de uma videochamada, e quem faz o quê.',
    group: 'O básico',
    body: `Um webinar é um evento on-line ao vivo: um anfitrião, ou um pequeno número de palestrantes, apresenta para um público que assiste e participa de onde estiver. A palavra é uma junção de "web" e "seminar" (seminário, em inglês).

## Como ele se diferencia de uma videochamada

Em uma videochamada, normalmente todos estão com a câmera ligada e qualquer pessoa pode falar. Um webinar funciona mais como uma palestra em um auditório:

- **O anfitrião comanda o palco.** Ele apresenta, compartilha materiais e decide quem mais será ouvido.
- **O público assiste.** Os participantes veem e ouvem o palco, mas não aparecem na câmera.
- **O público ainda participa.** Os participantes podem conversar no chat, enviar reações e pedir para falar. Se o anfitrião concordar, eles entram no ar por um momento e depois voltam a assistir.

Esse formato torna os webinars adequados para grupos maiores, porque uma sala com cinquenta ou quinhentas pessoas não vira um falatório.

## Antes e depois da parte ao vivo

Um webinar é mais do que a hora em que acontece. Normalmente as pessoas se inscrevem com antecedência, recebem uma confirmação e lembretes, entram no dia e, depois, recebem notícias do anfitrião de novo, muitas vezes com um link para uma gravação. O Universal Webinar cuida de cada uma dessas etapas, para que o anfitrião possa conduzir tudo em um só lugar.

## Ao vivo, não gravado

Tudo na sala acontece em tempo real. Há um atraso de mais ou menos um instante entre o anfitrião falar e o público ouvir, e é por isso que as perguntas no chat às vezes chegam logo depois que o anfitrião já passou para outro assunto. Vale a pena fazer uma breve pausa depois de perguntar algo ao público.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Como o vídeo ao vivo chega a todos',
    summary: 'O caminho da câmera do anfitrião até cada tela da sala.',
    group: 'O básico',
    body: `Quando um anfitrião entra ao vivo, a câmera e o microfone dele são capturados pelo navegador, comprimidos e enviados pela internet a um serviço de vídeo. Esse serviço repassa a transmissão ao navegador de cada participante, que a descompacta e reproduz. Todo o caminho costuma levar bem menos de um segundo.

## Por que há um serviço de vídeo no meio

Seria possível o computador do anfitrião enviar o vídeo diretamente a cada participante, mas isso significaria enviar a mesma transmissão uma vez por pessoa, e uma conexão doméstica fica sem capacidade de upload rapidamente. Em vez disso, o anfitrião envia uma única transmissão ao serviço, e o serviço faz o trabalho de copiá-la para todos. É isso que permite que um webinar cresça até um grande público sem que o anfitrião precise de uma conexão especial.

## A tecnologia por trás

O Universal Webinar usa WebRTC, o padrão integrado aos navegadores modernos para áudio e vídeo ao vivo, junto com um serviço de vídeo chamado LiveKit, que retransmite as transmissões. Não é preciso instalar nada: o navegador faz tudo.

## Quando a imagem oscila

O vídeo ao vivo se ajusta à conexão disponível. Se a sua conexão ficar lenta, a imagem pode ficar menos nítida ou pausar brevemente enquanto o som continua, porque a transmissão prioriza continuar ao vivo em vez de continuar nítida. Algumas dicas práticas:

- Para anfitriões e para quem for colocado no ar, uma conexão por cabo ou um lugar perto do roteador Wi-Fi faz a maior diferença.
- Fechar outros aplicativos que usam muito a internet, como downloads grandes ou outras videochamadas, libera capacidade.
- Se o vídeo congelar de vez, recarregar a página normalmente reconecta você à sala.

## Sua câmera e seu microfone

Os participantes apenas recebem vídeo. Sua câmera e seu microfone nunca são usados, a menos que o anfitrião coloque você no ar e você mesmo os ligue. Na primeira vez, o navegador pedirá sua permissão.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Inscrição e entrada',
    summary: 'A confirmação, os lembretes e o link de entrada, e o que um anfitrião pode exigir antes de você entrar.',
    group: 'Como funciona',
    body: `## Inscrição

Para se inscrever, você informa seu nome e endereço de e-mail, além das respostas a quaisquer perguntas que o anfitrião tenha adicionado. Você não precisa de uma conta.

Depois de se inscrever, você recebe um e-mail de confirmação com os detalhes da sessão, um convite que pode adicionar à sua agenda e seu próprio link de entrada pessoal. Esse link leva você direto à sala em qualquer dispositivo, sem digitar seus dados de novo, então vale a pena guardá-lo.

## Lembretes e acompanhamento

A menos que o anfitrião os tenha desativado, você também recebe:

- um lembrete nas 24 horas antes do início da sessão;
- um segundo lembrete cerca de uma hora antes do início;
- uma mensagem de acompanhamento quando a sessão terminar, agradecendo sua presença ou, se você não compareceu, informando isso. Se o anfitrião adicionar um link de gravação, ele será incluído. O acompanhamento é enviado assim que o anfitrião adiciona uma gravação, ou um dia depois do fim do webinar, se ele não adicionar.

Cada e-mail traz o mesmo link de entrada pessoal. Os anfitriões podem ativar ou desativar a confirmação, os lembretes e o acompanhamento separadamente.

## O que um anfitrião pode exigir

Os anfitriões podem configurar a entrada de diferentes formas:

- **Aprovação** — sua inscrição fica aguardando até que o anfitrião a aprove. O e-mail de confirmação com seu link de entrada só é enviado depois que você for aprovado.
- **Limite de vagas** — quando o webinar lota, as novas inscrições entram em uma lista de espera, e as pessoas avançam automaticamente quando uma vaga é liberada.
- **Link de entrada aberto** — o anfitrião pode permitir que as pessoas entrem no dia sem se inscrever antes, e pode fechar essa porta a qualquer momento. Quem já se inscreveu e foi aprovado ainda pode entrar.
- **PIN** — o anfitrião pode colocar um PIN na sala. Todos precisam dele para entrar, inclusive quem se inscreveu.

Essas regras são verificadas pelo serviço, e não apenas pela página que você vê.

## Entrando no dia

Abra seu link de entrada, ou o link que o anfitrião compartilhou, e informe seu nome e e-mail, se for solicitado. O navegador se lembra deles para a próxima vez. Na sala, você pode assistir, conversar no chat, enviar reações e levantar a mão para pedir a palavra.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Como conduzir um webinar',
    summary: 'Seu link de gerenciamento, entrar ao vivo, receber perguntas e encerrar.',
    group: 'Como funciona',
    body: `## Configuração

Você pode preencher os detalhes de um novo webinar sem entrar na conta. Para entrar ao vivo ou agendá-lo, você precisa de um Universal ID gratuito: se não tiver um, o aplicativo envia por e-mail um código de seis dígitos, e digitá-lo cria sua conta. Cada conta tem um token de webinar, que fica com um webinar até você fechá-lo.

Ao criar um webinar, você recebe um **link de gerenciamento**. Ele é a chave do seu webinar: quem o tiver pode alterar as configurações, ver as inscrições e conduzir a sala. Este navegador o guarda para você, mas mantenha uma cópia em um lugar seguro para poder gerenciar o webinar em outro dispositivo, e não o compartilhe.

## Na sala

- **Seu palco** — sua câmera e seu microfone são transmitidos a todos na sala.
- **Compartilhar um documento** — você pode colocar um PDF ou uma imagem no palco para os participantes lerem. Cada pessoa rola o documento por conta própria; as páginas não acompanham as suas.
- **Perguntas** — os participantes levantam a mão. Você pode colocar alguém no ar, tirá-lo do ar de novo, recusar um pedido ou impedir que uma pessoa peça de novo, deixando que ela continue assistindo e conversando no chat.
- **Inscrições** — você pode ver quem se inscreveu, aprovar ou recusar pessoas se exigir aprovação, e gerenciar uma lista de espera.

## Encerramento

Quando a sessão termina, a página de encerramento reúne o que ainda falta fazer.

1. **Gravação** — o Universal Webinar não grava a sessão. Se você a gravou de outra forma, cole o link aqui e ele será enviado no e-mail de acompanhamento a todos que se inscreveram.
2. **Sua lista** — baixe um arquivo de planilha com nomes, endereços de e-mail, respostas, quem compareceu e quem entrou sem se inscrever.
3. **Manter ou fechar** — escolha **Salvar na nuvem** para manter o webinar e todos os inscritos pelo tempo que quiser; seu token fica com ele. Ou escolha **Fechar e liberar meu token** para recuperar seu token para o próximo webinar. No plano gratuito, um webinar fechado e suas inscrições são excluídos 30 dias depois, então baixe sua lista antes.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Sua privacidade como participante',
    summary: 'O que você compartilha, quem pode ver e por quanto tempo é guardado.',
    group: 'Privacidade e segurança',
    body: `## O que você fornece

Ao se inscrever ou entrar, você fornece seu nome e endereço de e-mail, e as respostas a quaisquer perguntas que o anfitrião tenha adicionado. O aplicativo também registra se você entrou na sala, o que você escreve no chat, as reações que envia e quaisquer pedidos para falar.

## Quem pode ver o quê

- **Outros participantes** veem seu nome ao lado das suas mensagens no chat. Eles não veem seu endereço de e-mail.
- **O anfitrião** vê seu nome, endereço de e-mail, respostas, se você compareceu e suas mensagens no chat. Ele pode baixar essa lista, como em qualquer evento que organiza.
- **Todos na sala** podem ver e ouvir você se o anfitrião colocar você no ar e você ligar sua câmera ou seu microfone. Caso contrário, sua câmera e seu microfone não são usados.

## Os e-mails que você recebe

Seu endereço de e-mail é usado para enviar a confirmação, os lembretes e o acompanhamento do webinar em que você se inscreveu, a menos que o anfitrião os tenha desativado. Ele é repassado ao serviço de entrega de e-mails para essa finalidade.

## Vídeo e áudio ao vivo

O vídeo e o áudio trafegam por conexões criptografadas, como acontece com todas as conexões WebRTC. Eles passam pelos servidores do serviço de vídeo a caminho de todos na sala, portanto não têm criptografia de ponta a ponta. O Universal Webinar não grava a sessão; um anfitrião pode gravá-la com outras ferramentas e deve avisar você se fizer isso.

## Por quanto tempo é guardado

Sua inscrição fica com o webinar. Quando um anfitrião do plano gratuito fecha um webinar, ele e as inscrições de todos são excluídos 30 dias depois. Um anfitrião que escolhe manter um webinar, ou que está em um plano pago, pode guardá-los por mais tempo. Qualquer lista que o anfitrião tenha baixado fica sob a responsabilidade dele.

## O que o seu navegador lembra

O navegador se lembra do nome e do e-mail com que você entrou, para que você não precise digitá-los de novo na próxima vez.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Segurança para anfitriões',
    summary: 'Como manter seu link de gerenciamento seguro, e o que é público.',
    group: 'Privacidade e segurança',
    body: `## Seu link de gerenciamento é a chave

Qualquer pessoa que tenha seu link de gerenciamento pode conduzir seu webinar: alterar as configurações, ver os dados de todos os inscritos, colocar pessoas no ar e fechá-lo. Trate-o como uma senha. Não cole o link no chat da sala nem o envie aos participantes; em vez disso, envie a eles o link de entrada ou de inscrição.

## O que é público, e o que não é

- **Público** — os detalhes do webinar, como título, descrição, agenda, nome da empresa e logotipo, são públicos para que as pessoas possam decidir se vão participar. O endereço de e-mail com que você conduz o webinar e qualquer link de gravação que adicionar são armazenados junto com esses detalhes, então use um endereço que você não se importe que os participantes vejam.
- **Público para quem tiver o link** — um documento que você compartilha no palco e seu logotipo são armazenados em endereços web longos e aleatórios. Qualquer pessoa que tenha um desses endereços pode abrir o arquivo, e é isso que permite que todos na sala o vejam. Remover um documento compartilhado o exclui.
- **Privado** — os endereços de e-mail e as respostas dos inscritos, e o PIN da sala, nunca são exibidos em páginas públicas. Eles só são fornecidos a quem apresentar seu link de gerenciamento.

## Sobre o PIN da sala

Um PIN impede a entrada de curiosos. Ele é verificado pelo serviço, e não apenas pela página, e o serviço limita quantas tentativas erradas podem ser feitas. Mesmo assim, um PIN é um número curto, então é mais adequado para manter um evento organizado do que para proteger algo realmente sensível. Use um PIN mais longo se isso for importante, e troque-o a cada sessão.

## Os dados dos seus inscritos

Você é responsável pela forma como usa a lista que baixa. Envie e-mails às pessoas apenas sobre aquilo em que elas se inscreveram, e exclua as cópias de que não precisa mais. No plano gratuito, fechar um webinar o exclui, junto com as inscrições, 30 dias depois; salvá-lo na nuvem os mantém até você fechá-lo.

## Sua conta

Conduzir webinars usa seu Universal ID, a mesma conta usada em todos os aplicativos UNI·SIM. Seu endereço de e-mail é verificado com um código de uso único antes que você possa entrar ao vivo.`,
  },
]

export default articles
