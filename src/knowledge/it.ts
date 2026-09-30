import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: "Che cos'è un webinar?",
    summary: 'In cosa un webinar è diverso da una videochiamata, e chi fa cosa.',
    group: 'Le basi',
    body: `Un webinar è un evento online dal vivo: un organizzatore, o un piccolo numero di relatori, presenta a un pubblico che guarda e partecipa da dove si trova. La parola nasce dalla fusione di "web" e "seminar" (seminario).

## In cosa è diverso da una videochiamata

In una videochiamata di solito tutti sono in video e chiunque può parlare. Un webinar somiglia di più a un intervento in una sala:

- **L'organizzatore guida il palco.** Presenta, condivide materiale e decide chi altro può essere ascoltato.
- **Il pubblico guarda.** I partecipanti vedono e sentono il palco, ma non sono in video.
- **Il pubblico partecipa comunque.** Può scrivere in chat, inviare reazioni e chiedere di parlare. Se l'organizzatore accetta, va in onda per un momento e poi torna a guardare.

Questa struttura rende i webinar adatti ai gruppi numerosi, perché una sala di cinquanta o cinquecento persone non si trasforma in un caos di voci sovrapposte.

## Prima e dopo la diretta

Un webinar è più dell'ora in cui si svolge. Di solito le persone si registrano in anticipo, ricevono una conferma e dei promemoria, si collegano il giorno stabilito e in seguito ricevono di nuovo notizie dall'organizzatore, spesso con un link a una registrazione. Universal Webinar gestisce ciascuno di questi passaggi, così l'organizzatore può fare tutto da un unico posto.

## Dal vivo, non registrato

Tutto ciò che accade nella sala avviene in tempo reale. C'è un ritardo di un istante tra il momento in cui l'organizzatore parla e quello in cui il pubblico lo sente, ed è per questo che le domande in chat a volte arrivano subito dopo che l'organizzatore è passato ad altro. Conviene lasciare una breve pausa dopo aver chiesto qualcosa al pubblico.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Come il video dal vivo arriva a tutti',
    summary: "Il percorso dalla videocamera dell'organizzatore a ogni schermo della sala.",
    group: 'Le basi',
    body: `Quando un organizzatore va in diretta, la sua videocamera e il suo microfono vengono acquisiti dal browser, compressi e inviati via internet a un servizio video. Il servizio inoltra il flusso al browser di ogni partecipante, che lo decomprime e lo riproduce. L'intero percorso richiede di solito molto meno di un secondo.

## Perché c'è un servizio video nel mezzo

Il computer dell'organizzatore potrebbe inviare il video direttamente a ogni partecipante, ma significherebbe inviare lo stesso flusso una volta per ogni persona, e una connessione domestica esaurisce in fretta la capacità di upload. Invece l'organizzatore invia un solo flusso al servizio, e il servizio si occupa di copiarlo per tutti. È questo che permette a un webinar di raggiungere un pubblico ampio senza che l'organizzatore abbia bisogno di una connessione speciale.

## La tecnologia sottostante

Universal Webinar usa WebRTC, lo standard integrato nei browser moderni per audio e video dal vivo, insieme a un servizio video chiamato LiveKit che inoltra i flussi. Non serve installare nulla: fa tutto il browser.

## Quando l'immagine vacilla

Il video dal vivo si adatta alla connessione disponibile. Se la tua connessione rallenta, l'immagine può diventare meno nitida o fermarsi per un attimo mentre l'audio continua, perché il flusso preferisce restare in diretta piuttosto che restare nitido. Qualche consiglio pratico:

- Per gli organizzatori e per chiunque vada in onda, una connessione via cavo o una posizione vicina al router Wi-Fi fa la differenza maggiore.
- Chiudere le altre app che usano molto internet, come download di grandi dimensioni o altre videochiamate, libera capacità.
- Se il video resta bloccato definitivamente, ricaricare la pagina di solito ti ricollega alla sala.

## La tua videocamera e il tuo microfono

I partecipanti ricevono soltanto il video. La tua videocamera e il tuo microfono non vengono mai usati, a meno che l'organizzatore non ti mandi in onda e tu poi li attivi. La prima volta, il browser ti chiederà il permesso.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Registrarsi e partecipare',
    summary: "La conferma, i promemoria e il link di accesso, e cosa può richiedere un organizzatore prima di farti entrare.",
    group: 'Come funziona',
    body: `## Registrarsi

Per registrarti bastano il tuo nome e il tuo indirizzo email, più le risposte alle eventuali domande aggiunte dall'organizzatore. Non ti serve un account.

Una volta registrato, ricevi un'email di conferma con i dettagli della sessione, un invito da aggiungere al tuo calendario e il tuo link di accesso personale. Quel link ti porta direttamente dentro, da qualsiasi dispositivo, senza dover inserire di nuovo i tuoi dati, quindi conviene conservarlo.

## Promemoria e messaggio successivo

A meno che l'organizzatore non li abbia disattivati, ricevi anche:

- un promemoria nelle 24 ore prima dell'inizio della sessione;
- un secondo promemoria circa un'ora prima dell'inizio;
- un messaggio al termine, per ringraziarti della partecipazione o, se non c'eri, per fartelo sapere. Se l'organizzatore aggiunge un link a una registrazione, viene incluso. Il messaggio parte non appena l'organizzatore ha aggiunto una registrazione, oppure un giorno dopo la fine del webinar se non l'ha fatto.

Ogni email contiene lo stesso link di accesso personale. Gli organizzatori possono attivare o disattivare separatamente la conferma, i promemoria e il messaggio successivo.

## Cosa può richiedere un organizzatore

Gli organizzatori possono regolare l'accesso in modi diversi:

- **Approvazione** — la tua registrazione resta in attesa finché l'organizzatore non la approva. L'email di conferma con il tuo link di accesso viene inviata solo dopo l'approvazione.
- **Limite di posti** — quando il webinar è al completo, le nuove registrazioni finiscono in una lista d'attesa, e le persone avanzano automaticamente quando si libera un posto.
- **Link di accesso aperto** — l'organizzatore può permettere di partecipare il giorno stesso senza registrarsi prima, e può chiudere questo accesso in qualsiasi momento. Chi si era già registrato ed è stato approvato può comunque entrare.
- **PIN** — l'organizzatore può proteggere la sala con un PIN. Serve a tutti per entrare, anche a chi si è registrato.

Queste regole vengono verificate dal servizio, non solo dalla pagina che vedi.

## Partecipare il giorno stabilito

Apri il tuo link di accesso, o il link condiviso dall'organizzatore, e inserisci nome ed email se richiesti. Il browser li ricorda per la volta successiva. Nella sala puoi guardare, scrivere in chat, inviare reazioni e alzare la mano per chiedere di parlare.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Organizzare un webinar',
    summary: 'Il tuo link di gestione, andare in diretta, rispondere alle domande e chiudere.',
    group: 'Come funziona',
    body: `## Preparazione

Puoi compilare i dettagli di un nuovo webinar senza accedere. Per andare in diretta o programmarlo, ti serve un Universal ID gratuito: se non ne hai uno, l'app ti invia via email un codice di sei cifre, e inserendolo crei il tuo account. Ospitare webinar è gratuito con un Universal ID. Gli account gratuiti hanno un limite generoso e, se mai lo raggiungi, chiudere un webinar che hai conservato fa spazio al prossimo. Un webinar gratuito può avere fino a 25 persone e dura al massimo 90 minuti; negli ultimi dieci minuti chi lo ospita vede quanto tempo resta.

Quando crei un webinar ricevi un **link di gestione**. È la chiave del tuo webinar: chi lo possiede può cambiare le impostazioni, vedere le registrazioni e guidare la sala. Questo browser lo ricorda per te, ma conservane una copia in un posto sicuro per poter gestire il webinar da un altro dispositivo, e non condividerlo.

## Nella sala

- **Il tuo palco** — la tua videocamera e il tuo microfono vengono trasmessi a tutti nella sala.
- **Condividere un documento** — puoi mettere sul palco un PDF o un'immagine da far leggere ai partecipanti. Ognuno lo scorre per conto proprio; le pagine non sono sincronizzate con le tue.
- **Domande** — i partecipanti alzano la mano. Puoi mandare qualcuno in onda, toglierlo di nuovo, rifiutare una richiesta, oppure impedire a una persona di chiedere ancora la parola lasciandole comunque guardare e scrivere in chat.
- **Registrazioni** — puoi vedere chi si è registrato, approvare o rifiutare le persone se richiedi l'approvazione, e gestire una lista d'attesa.

## Chiusura

Al termine della sessione, la pagina di chiusura riunisce quello che resta da fare.

1. **Registrazione video** — Universal Webinar non registra la sessione in autonomia. Se l'hai registrata in un altro modo, incolla qui il link: verrà inviato nell'email successiva all'evento a tutti gli iscritti.
2. **La tua lista** — scarica un file di foglio di calcolo con nomi, indirizzi email, risposte, chi si è presentato e chi è entrato senza registrarsi.
3. **Conservare o chiudere** — scegli **Salva nel cloud** per conservare il webinar e tutte le persone che ne fanno parte per tutto il tempo che vuoi. Oppure scegli **Chiudi webinar** per fare spazio al tuo prossimo webinar. Con il piano gratuito, un webinar chiuso e le sue registrazioni vengono eliminati 30 giorni dopo, quindi scarica prima la tua lista.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'La tua privacy come partecipante',
    summary: 'Cosa condividi, chi può vederlo e per quanto tempo viene conservato.',
    group: 'Privacy e sicurezza',
    body: `## Cosa fornisci

Quando ti registri o partecipi, fornisci il tuo nome e il tuo indirizzo email, più le risposte alle eventuali domande aggiunte dall'organizzatore. L'app registra anche se sei entrato nella sala, cosa scrivi in chat, le reazioni che invii e le eventuali richieste di parola.

## Chi può vedere cosa

- **Gli altri partecipanti** vedono il tuo nome accanto ai tuoi messaggi in chat. Non vedono il tuo indirizzo email.
- **L'organizzatore** vede il tuo nome, il tuo indirizzo email, le tue risposte, se hai partecipato e i tuoi messaggi in chat. Può scaricare questa lista, come per qualsiasi evento che organizza.
- **Tutti nella sala** possono vederti e sentirti se l'organizzatore ti manda in onda e tu attivi la videocamera o il microfono. Altrimenti la tua videocamera e il tuo microfono non vengono usati.

## Le email che ricevi

Il tuo indirizzo email viene usato per inviarti la conferma, i promemoria e il messaggio successivo del webinar a cui ti sei registrato, a meno che l'organizzatore non li abbia disattivati. Viene comunicato al servizio di invio email per questo scopo.

## Video e audio dal vivo

Video e audio viaggiano su connessioni cifrate, come tutte le connessioni WebRTC. Passano dai server del servizio video per arrivare a tutti nella sala, quindi non sono cifrati end-to-end. Universal Webinar non registra la sessione; un organizzatore può registrarla con altri strumenti, e dovrebbe dirtelo se lo fa.

## Per quanto tempo viene conservato

La tua registrazione resta legata al webinar. Quando un organizzatore con il piano gratuito chiude un webinar, il webinar e le registrazioni di tutti vengono eliminati 30 giorni dopo. Un organizzatore che sceglie di conservare un webinar, o che ha un piano a pagamento, può conservarli più a lungo. Qualsiasi lista scaricata dall'organizzatore è sotto la sua responsabilità.

## Cosa ricorda il tuo browser

Il tuo browser ricorda il nome e l'email con cui hai partecipato, così la prossima volta non devi digitarli di nuovo.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Sicurezza per gli organizzatori',
    summary: 'Come tenere al sicuro il tuo link di gestione, e cosa è pubblico.',
    group: 'Privacy e sicurezza',
    body: `## Il tuo link di gestione è la chiave

Chiunque abbia il tuo link di gestione può guidare il tuo webinar: cambiarne le impostazioni, vedere i dati di ogni iscritto, mandare persone in onda e chiuderlo. Trattalo come una password. Non incollarlo nella chat della sala e non inviarlo ai partecipanti; dai loro invece il link di accesso o di registrazione.

## Cosa è pubblico e cosa no

- **Pubblico** — i dettagli del webinar, come titolo, descrizione, orario, nome dell'azienda e logo, sono pubblici così le persone possono decidere se partecipare. L'indirizzo email con cui organizzi e l'eventuale link alla registrazione che aggiungi sono salvati insieme a questi dettagli, quindi usa un indirizzo che ti va bene far vedere ai partecipanti.
- **Pubblico per chiunque abbia il link** — un documento che condividi sul palco e il tuo logo sono salvati a indirizzi web lunghi e casuali. Chiunque abbia uno di questi indirizzi può aprire il file, ed è questo che permette a tutti nella sala di vederlo. Rimuovere un documento condiviso lo elimina.
- **Privato** — gli indirizzi email e le risposte degli iscritti, così come il PIN della sala, non vengono mai mostrati nelle pagine pubbliche. Vengono restituiti solo a chi presenta il tuo link di gestione.

## Il PIN della sala

Un PIN ferma chi entra per caso. Viene verificato dal servizio, non solo dalla pagina, e il servizio limita il numero di tentativi errati possibili. Anche così, un PIN è un numero breve, quindi è più adatto a mantenere ordinato un evento che a proteggere qualcosa di davvero sensibile. Usa un PIN più lungo se è importante, e cambialo a ogni sessione.

## I dati dei tuoi iscritti

Sei responsabile di come usi la lista che scarichi. Scrivi alle persone solo in merito a ciò a cui si sono iscritte, ed elimina le copie che non ti servono più. Con il piano gratuito, chiudere un webinar lo elimina insieme alle sue registrazioni 30 giorni dopo; salvarlo nel cloud li conserva finché non lo chiudi.

## Il tuo account

Per organizzare si usa il tuo Universal ID, lo stesso account usato in tutte le app UNI·SIM. Il tuo indirizzo email viene verificato con un codice monouso prima che tu possa andare in diretta.`,
  },
]

export default articles
