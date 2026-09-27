import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: "Qu'est-ce qu'un webinaire ?",
    summary: "En quoi un webinaire diffère d'un appel vidéo, et qui fait quoi.",
    group: 'Les bases',
    body: `Un webinaire est un événement en ligne en direct : un hôte, ou un petit nombre d'intervenants, présente à un public qui regarde et participe où qu'il se trouve. Le mot est la contraction de « web » et de « séminaire ».

## En quoi il diffère d'un appel vidéo

Lors d'un appel vidéo, tout le monde est généralement à l'écran et chacun peut prendre la parole. Un webinaire ressemble davantage à une conférence dans une salle :

- **L'hôte dirige la scène.** Il présente, partage des documents et décide qui d'autre peut être entendu.
- **Le public regarde.** Les participants voient et entendent la scène, mais ne sont pas eux-mêmes à l'écran.
- **Le public participe tout de même.** Il peut discuter dans le chat, envoyer des réactions et demander la parole. Si l'hôte accepte, la personne passe à l'antenne un moment, puis retourne parmi les spectateurs.

Ce format rend les webinaires adaptés aux grands groupes, car une salle de cinquante ou de cinq cents personnes ne se transforme pas en brouhaha.

## Avant et après le direct

Un webinaire ne se limite pas à l'heure pendant laquelle il se déroule. En général, les gens s'inscrivent à l'avance, reçoivent une confirmation et des rappels, se connectent le jour venu, puis ont à nouveau des nouvelles de l'hôte, souvent avec un lien vers un enregistrement. Universal Webinar prend en charge chacune de ces étapes, afin qu'un hôte puisse tout gérer depuis un seul endroit.

## En direct, pas enregistré

Tout ce qui se passe dans la salle a lieu en temps réel. Il y a un léger décalage, de l'ordre d'un instant, entre le moment où l'hôte parle et celui où le public l'entend. C'est pourquoi les questions posées dans le chat arrivent parfois juste après que l'hôte est passé à autre chose. Il est utile de marquer une courte pause après avoir posé une question au public.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Comment la vidéo en direct parvient à chacun',
    summary: "Le trajet de la caméra de l'hôte jusqu'à chaque écran de la salle.",
    group: 'Les bases',
    body: `Lorsqu'un hôte passe en direct, sa caméra et son microphone sont captés par son navigateur, compressés, puis envoyés par Internet à un service vidéo. Ce service transmet le flux au navigateur de chaque participant, qui le décompresse et le lit. L'ensemble du trajet prend généralement bien moins d'une seconde.

## Pourquoi un service vidéo se trouve au milieu

L'ordinateur de l'hôte pourrait envoyer sa vidéo directement à chaque participant, mais cela reviendrait à envoyer le même flux une fois par personne, et une connexion domestique arrive vite au bout de sa capacité d'envoi. À la place, l'hôte envoie un seul flux au service, et c'est le service qui se charge de le copier vers tout le monde. C'est ce qui permet à un webinaire d'accueillir un large public sans que l'hôte ait besoin d'une connexion particulière.

## La technologie sous-jacente

Universal Webinar utilise WebRTC, la norme intégrée aux navigateurs modernes pour l'audio et la vidéo en direct, ainsi qu'un service vidéo appelé LiveKit qui relaie les flux. Rien n'est à installer : le navigateur fait tout.

## Quand l'image vacille

La vidéo en direct s'adapte à la connexion disponible. Si votre connexion ralentit, l'image peut devenir moins nette ou se figer brièvement tandis que le son continue, car le flux privilégie le direct plutôt que la netteté. Quelques conseils pratiques :

- Pour les hôtes et toute personne mise à l'antenne, une connexion filaire ou une place proche du routeur Wi-Fi fait la plus grande différence.
- Fermer les autres applications qui utilisent beaucoup Internet, comme les gros téléchargements ou d'autres appels vidéo, libère de la capacité.
- Si la vidéo reste figée pour de bon, recharger la page vous reconnecte généralement à la salle.

## Votre caméra et votre microphone

Les participants ne font que recevoir la vidéo. Votre caméra et votre microphone ne sont jamais utilisés, sauf si l'hôte vous met à l'antenne et que vous les activez ensuite vous-même. La première fois, votre navigateur vous demandera votre autorisation.`,
  },
  {
    id: 'registering-and-joining',
    title: "S'inscrire et rejoindre",
    summary: "La confirmation, les rappels et le lien de participation, et ce qu'un hôte peut exiger avant de vous laisser entrer.",
    group: 'Fonctionnement',
    body: `## S'inscrire

Pour vous inscrire, il suffit de donner votre nom et votre adresse e-mail, ainsi que vos réponses aux éventuelles questions ajoutées par l'hôte. Vous n'avez pas besoin de compte.

Une fois inscrit, vous recevez un e-mail de confirmation avec les détails de la session, une invitation que vous pouvez ajouter à votre agenda et votre lien de participation personnel. Ce lien vous fait entrer directement, sur n'importe quel appareil, sans ressaisir vos informations : il vaut donc la peine de le conserver.

## Rappels et suivi

Sauf si l'hôte les a désactivés, vous recevez également :

- un rappel dans les 24 heures précédant le début de la session ;
- un second rappel environ une heure avant le début ;
- un message de suivi une fois la session terminée, pour vous remercier d'être venu ou, si vous l'avez manquée, pour vous le signaler. Si l'hôte ajoute un lien vers un enregistrement, celui-ci est inclus. Le message de suivi part dès que l'hôte a ajouté un enregistrement, ou un jour après la fin du webinaire s'il ne l'a pas fait.

Chaque e-mail contient le même lien de participation personnel. Les hôtes peuvent activer ou désactiver séparément la confirmation, les rappels et le message de suivi.

## Ce qu'un hôte peut exiger

Les hôtes peuvent configurer l'accès de différentes manières :

- **Approbation** — votre inscription reste en attente jusqu'à ce que l'hôte l'approuve. L'e-mail de confirmation contenant votre lien de participation n'est envoyé qu'une fois votre inscription approuvée.
- **Nombre de places limité** — une fois le webinaire complet, les nouvelles inscriptions rejoignent une liste d'attente, et les personnes avancent automatiquement lorsqu'une place se libère.
- **Lien de participation ouvert** — l'hôte peut permettre aux gens de rejoindre le jour même sans s'inscrire au préalable, et peut fermer cet accès à tout moment. Les personnes déjà inscrites et approuvées peuvent toujours entrer.
- **PIN** — l'hôte peut protéger la salle par un PIN. Tout le monde en a besoin pour entrer, y compris les personnes inscrites.

Ces règles sont vérifiées par le service, et pas seulement par la page que vous voyez.

## Rejoindre le jour venu

Ouvrez votre lien de participation, ou le lien partagé par l'hôte, et saisissez votre nom et votre adresse e-mail si on vous les demande. Votre navigateur les mémorise pour la prochaine fois. Dans la salle, vous pouvez regarder, discuter dans le chat, envoyer des réactions et lever la main pour demander la parole.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Animer un webinaire',
    summary: 'Votre lien de gestion, le passage en direct, les questions et la clôture.',
    group: 'Fonctionnement',
    body: `## Préparation

Vous pouvez remplir les détails d'un nouveau webinaire sans vous connecter. Pour passer en direct ou le programmer, vous avez besoin d'un Universal ID gratuit : si vous n'en avez pas, l'application vous envoie par e-mail un code à six chiffres, et sa saisie crée votre compte. Chaque compte dispose d'un jeton de webinaire, qu'un webinaire conserve jusqu'à ce que vous le fermiez.

Lorsque vous créez un webinaire, vous obtenez un **lien de gestion**. C'est la clé de votre webinaire : quiconque le possède peut modifier les paramètres, consulter les inscriptions et diriger la salle. Ce navigateur le mémorise pour vous, mais conservez-en une copie en lieu sûr afin de pouvoir gérer le webinaire depuis un autre appareil, et ne le partagez pas.

## Dans la salle

- **Votre scène** — votre caméra et votre microphone sont diffusés à tous les participants de la salle.
- **Partager un document** — vous pouvez afficher un PDF ou une image sur la scène pour que les participants le lisent. Chacun le fait défiler lui-même ; les pages ne sont pas synchronisées avec les vôtres.
- **Questions** — les participants lèvent la main. Vous pouvez mettre quelqu'un à l'antenne, l'en retirer, refuser une demande, ou empêcher une personne de redemander la parole tout en la laissant regarder et discuter.
- **Inscriptions** — vous pouvez voir qui s'est inscrit, approuver ou refuser des personnes si vous exigez une approbation, et gérer une liste d'attente.

## Clôture

À la fin de la session, la page de clôture rassemble ce qu'il reste à faire.

1. **Enregistrement** — Universal Webinar n'enregistre pas la session lui-même. Si vous l'avez enregistrée par un autre moyen, collez le lien ici : il sera envoyé dans l'e-mail de suivi à toutes les personnes inscrites.
2. **Votre liste** — téléchargez un fichier tableur contenant les noms, les adresses e-mail, les réponses, les personnes présentes et celles qui ont rejoint sans s'inscrire.
3. **Conserver ou fermer** — choisissez **Enregistrer dans le cloud** pour conserver le webinaire et toutes les personnes qui y sont liées aussi longtemps que vous le souhaitez ; votre jeton reste alors attaché. Ou choisissez **Fermer et libérer mon jeton** pour récupérer votre jeton pour votre prochain webinaire. Avec l'offre gratuite, un webinaire fermé et ses inscriptions sont supprimés 30 jours plus tard : téléchargez donc votre liste d'abord.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Votre confidentialité en tant que participant',
    summary: 'Ce que vous partagez, qui peut le voir et combien de temps cela est conservé.',
    group: 'Confidentialité et sécurité',
    body: `## Ce que vous fournissez

Lorsque vous vous inscrivez ou rejoignez un webinaire, vous fournissez votre nom et votre adresse e-mail, ainsi que vos réponses aux éventuelles questions ajoutées par l'hôte. L'application enregistre également si vous avez rejoint la salle, ce que vous écrivez dans le chat, les réactions que vous envoyez et vos éventuelles demandes de prise de parole.

## Qui peut voir quoi

- **Les autres participants** voient votre nom à côté de vos messages dans le chat. Ils ne voient pas votre adresse e-mail.
- **L'hôte** voit votre nom, votre adresse e-mail, vos réponses, si vous avez assisté à la session et vos messages dans le chat. Il peut télécharger cette liste, comme pour tout événement qu'il organise.
- **Toutes les personnes présentes dans la salle** peuvent vous voir et vous entendre si l'hôte vous met à l'antenne et que vous activez votre caméra ou votre microphone. Sinon, votre caméra et votre microphone ne sont pas utilisés.

## Les e-mails que vous recevez

Votre adresse e-mail sert à envoyer la confirmation, les rappels et le message de suivi du webinaire auquel vous vous êtes inscrit, sauf si l'hôte les a désactivés. Elle est transmise au service d'envoi d'e-mails à cette fin.

## Vidéo et audio en direct

La vidéo et l'audio circulent sur des connexions chiffrées, comme toutes les connexions WebRTC. Ils passent par les serveurs du service vidéo avant d'atteindre les personnes présentes dans la salle ; ils ne sont donc pas chiffrés de bout en bout. Universal Webinar n'enregistre pas la session ; un hôte peut l'enregistrer avec d'autres outils, et doit vous en informer s'il le fait.

## Durée de conservation

Votre inscription reste liée au webinaire. Lorsqu'un hôte bénéficiant de l'offre gratuite ferme un webinaire, celui-ci et toutes les inscriptions sont supprimés 30 jours plus tard. Un hôte qui choisit de conserver un webinaire, ou qui dispose d'une offre payante, peut les conserver plus longtemps. Toute liste téléchargée par l'hôte relève de sa responsabilité.

## Ce que votre navigateur mémorise

Votre navigateur mémorise le nom et l'adresse e-mail avec lesquels vous avez rejoint la session, afin que vous n'ayez pas à les ressaisir la prochaine fois.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Sécurité pour les hôtes',
    summary: 'Protéger votre lien de gestion, et ce qui est public.',
    group: 'Confidentialité et sécurité',
    body: `## Votre lien de gestion est la clé

Toute personne qui possède votre lien de gestion peut diriger votre webinaire : modifier ses paramètres, voir les informations de chaque inscrit, mettre des personnes à l'antenne et le fermer. Traitez-le comme un mot de passe. Ne le collez pas dans le chat de la salle et ne l'envoyez pas aux participants ; donnez-leur plutôt le lien de participation ou d'inscription.

## Ce qui est public, et ce qui ne l'est pas

- **Public** — les détails du webinaire, comme son titre, sa description, son horaire, le nom de l'entreprise et son logo, sont publics afin que chacun puisse décider s'il souhaite venir. L'adresse e-mail avec laquelle vous animez et tout lien d'enregistrement que vous ajoutez sont stockés avec ces détails : utilisez donc une adresse que vous acceptez de montrer aux participants.
- **Public pour toute personne disposant du lien** — un document que vous partagez sur la scène et votre logo sont stockés à des adresses web longues et aléatoires. Toute personne disposant de l'une de ces adresses peut ouvrir le fichier, ce qui permet à toute la salle de le voir. Retirer un document partagé le supprime.
- **Privé** — les adresses e-mail et les réponses des inscrits, ainsi que le PIN de la salle, ne sont jamais affichés sur les pages publiques. Ils ne sont renvoyés qu'à une personne qui présente votre lien de gestion.

## À propos du PIN de la salle

Un PIN empêche les entrées fortuites. Il est vérifié par le service, et pas seulement par la page, et le service limite le nombre de tentatives erronées possibles. Malgré tout, un PIN est un nombre court : il convient donc mieux pour garder un événement bien organisé que pour protéger quelque chose de vraiment sensible. Utilisez un PIN plus long si c'est important, et changez-le à chaque session.

## Les données de vos inscrits

Vous êtes responsable de l'usage que vous faites de la liste que vous téléchargez. N'écrivez aux personnes qu'au sujet de ce à quoi elles se sont inscrites, et supprimez les copies dont vous n'avez plus besoin. Avec l'offre gratuite, fermer un webinaire entraîne sa suppression et celle de ses inscriptions 30 jours plus tard ; l'enregistrer dans le cloud les conserve jusqu'à ce que vous le fermiez.

## Votre compte

L'animation utilise votre Universal ID, le même compte que dans toutes les applications UNI·SIM. Votre adresse e-mail est vérifiée à l'aide d'un code à usage unique avant que vous puissiez passer en direct.`,
  },
]

export default articles
