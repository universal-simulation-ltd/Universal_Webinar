import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: 'Was ist ein Webinar?',
    summary: 'Wie sich ein Webinar von einem Videoanruf unterscheidet und wer was macht.',
    group: 'Grundlagen',
    body: `Ein Webinar ist eine Live-Veranstaltung im Internet: Ein Gastgeber oder eine kleine Zahl von Vortragenden präsentiert vor einem Publikum, das von überall aus zusieht und mitmacht. Das Wort ist eine Verschmelzung von „Web“ und „Seminar“.

## Der Unterschied zu einem Videoanruf

Bei einem Videoanruf ist meist jeder mit Kamera zu sehen, und jeder kann sprechen. Ein Webinar ähnelt eher einem Vortrag in einem Saal:

- **Der Gastgeber leitet die Bühne.** Er präsentiert, teilt Material und entscheidet, wer sonst noch zu hören ist.
- **Das Publikum schaut zu.** Teilnehmende sehen und hören die Bühne, sind selbst aber nicht mit Kamera zu sehen.
- **Das Publikum macht trotzdem mit.** Es kann im Chat schreiben, Reaktionen senden und um das Wort bitten. Wenn der Gastgeber zustimmt, geht die Person kurz auf Sendung und schaut danach wieder zu.

Diese Form macht Webinare für größere Gruppen geeignet, denn ein Raum mit fünfzig oder fünfhundert Menschen versinkt nicht im Durcheinander.

## Vor und nach dem Live-Teil

Ein Webinar ist mehr als die Stunde, die es dauert. Üblicherweise melden sich die Leute vorab an, erhalten eine Bestätigung und Erinnerungen, nehmen am Tag selbst teil und hören danach noch einmal vom Gastgeber, oft mit einem Link zu einer Aufzeichnung. Universal Webinar übernimmt jeden dieser Schritte, sodass ein Gastgeber alles von einem Ort aus erledigen kann.

## Live, nicht aufgezeichnet

Alles im Raum geschieht in Echtzeit. Zwischen dem Moment, in dem der Gastgeber spricht, und dem Moment, in dem das Publikum es hört, liegt eine Verzögerung von etwa einem Augenblick. Deshalb treffen Fragen im Chat manchmal erst ein, wenn der Gastgeber schon weitergemacht hat. Es lohnt sich, nach einer Frage an das Publikum eine kurze Pause zu lassen.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Wie Live-Video alle erreicht',
    summary: 'Der Weg von der Kamera des Gastgebers zu jedem Bildschirm im Raum.',
    group: 'Grundlagen',
    body: `Wenn ein Gastgeber live geht, werden Kamera und Mikrofon von seinem Browser erfasst, komprimiert und über das Internet an einen Videodienst gesendet. Dieser Dienst leitet den Stream an den Browser jedes Teilnehmenden weiter, der ihn entpackt und abspielt. Der ganze Weg dauert meist deutlich weniger als eine Sekunde.

## Warum ein Videodienst dazwischen sitzt

Der Computer des Gastgebers könnte sein Video auch direkt an jeden Teilnehmenden senden, doch dann müsste derselbe Stream einmal pro Person verschickt werden, und bei einem Heimanschluss ist die Upload-Kapazität schnell erschöpft. Stattdessen sendet der Gastgeber einen einzigen Stream an den Dienst, und der Dienst übernimmt es, ihn an alle zu verteilen. Genau das ermöglicht es einem Webinar, ein großes Publikum zu erreichen, ohne dass der Gastgeber einen besonderen Anschluss braucht.

## Die Technik dahinter

Universal Webinar nutzt WebRTC, den in moderne Browser eingebauten Standard für Live-Audio und -Video, zusammen mit einem Videodienst namens LiveKit, der die Streams weiterleitet. Es muss nichts installiert werden: Der Browser erledigt alles.

## Wenn das Bild wackelt

Live-Video passt sich an die vorhandene Verbindung an. Wird Ihre Verbindung langsamer, kann das Bild unschärfer werden oder kurz stehen bleiben, während der Ton weiterläuft, denn der Stream gibt dem Live-Bleiben Vorrang vor der Bildschärfe. Einige praktische Tipps:

- Für Gastgeber und alle, die auf Sendung gehen, bringt eine Kabelverbindung oder ein Platz nahe am WLAN-Router den größten Unterschied.
- Wenn Sie andere Apps schließen, die das Internet stark nutzen, etwa große Downloads oder andere Videoanrufe, wird Kapazität frei.
- Bleibt das Video dauerhaft eingefroren, verbindet Sie ein Neuladen der Seite meist wieder mit dem Raum.

## Ihre Kamera und Ihr Mikrofon

Teilnehmende empfangen nur Video. Ihre eigene Kamera und Ihr Mikrofon werden nie verwendet, es sei denn, der Gastgeber holt Sie auf Sendung und Sie schalten sie dann selbst ein. Beim ersten Mal fragt Ihr Browser Sie um Erlaubnis.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Anmelden und teilnehmen',
    summary: 'Die Bestätigung, die Erinnerungen und der Teilnahmelink, und was ein Gastgeber verlangen kann, bevor Sie hineinkommen.',
    group: 'So funktioniert es',
    body: `## Anmelden

Für die Anmeldung werden Ihr Name und Ihre E-Mail-Adresse abgefragt, dazu Antworten auf eventuelle Fragen, die der Gastgeber hinzugefügt hat. Sie brauchen kein Konto.

Nach der Anmeldung erhalten Sie eine Bestätigungs-E-Mail mit den Details der Sitzung, eine Einladung, die Sie in Ihren Kalender übernehmen können, und Ihren eigenen persönlichen Teilnahmelink. Dieser Link bringt Sie auf jedem Gerät direkt hinein, ohne dass Sie Ihre Angaben erneut eingeben müssen. Es lohnt sich also, ihn aufzubewahren.

## Erinnerungen und Nachbereitung

Sofern der Gastgeber sie nicht abgeschaltet hat, erhalten Sie außerdem:

- eine Erinnerung innerhalb der 24 Stunden vor Beginn der Sitzung;
- eine zweite Erinnerung etwa eine Stunde vor Beginn;
- eine Nachricht nach dem Ende, die sich für Ihre Teilnahme bedankt oder, falls Sie es verpasst haben, darauf hinweist. Fügt der Gastgeber einen Link zu einer Aufzeichnung hinzu, ist er enthalten. Diese Nachricht wird verschickt, sobald der Gastgeber eine Aufzeichnung hinzugefügt hat, oder einen Tag nach dem Ende des Webinars, falls er das nicht getan hat.

Jede E-Mail enthält denselben persönlichen Teilnahmelink. Gastgeber können die Bestätigung, die Erinnerungen und die Nachbereitung getrennt ein- oder ausschalten.

## Was ein Gastgeber verlangen kann

Gastgeber können den Zugang auf verschiedene Weise einrichten:

- **Freigabe** — Ihre Anmeldung wartet, bis der Gastgeber sie freigibt. Die Bestätigungs-E-Mail mit Ihrem Teilnahmelink wird erst verschickt, wenn Sie freigegeben wurden.
- **Platzbegrenzung** — ist das Webinar voll, landen neue Anmeldungen auf einer Warteliste, und die Personen rücken automatisch nach, wenn ein Platz frei wird.
- **Offener Teilnahmelink** — der Gastgeber kann Leuten erlauben, am Tag selbst ohne vorherige Anmeldung teilzunehmen, und diesen Zugang jederzeit schließen. Wer sich bereits angemeldet hat und freigegeben wurde, kommt weiterhin hinein.
- **PIN** — der Gastgeber kann den Raum mit einer PIN schützen. Alle brauchen sie zum Eintreten, auch angemeldete Personen.

Diese Regeln werden vom Dienst geprüft, nicht nur von der Seite, die Sie sehen.

## Teilnahme am Tag selbst

Öffnen Sie Ihren Teilnahmelink oder den Link, den der Gastgeber geteilt hat, und geben Sie Ihren Namen und Ihre E-Mail-Adresse ein, falls danach gefragt wird. Ihr Browser merkt sie sich für das nächste Mal. Im Raum können Sie zuschauen, im Chat schreiben, Reaktionen senden und die Hand heben, um ums Wort zu bitten.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Ein Webinar veranstalten',
    summary: 'Ihr Verwaltungslink, live gehen, Fragen annehmen und abschließen.',
    group: 'So funktioniert es',
    body: `## Einrichtung

Sie können die Details eines neuen Webinars ausfüllen, ohne sich anzumelden. Um live zu gehen oder es zu planen, brauchen Sie eine kostenlose Universal ID: Wenn Sie noch keine haben, schickt Ihnen die App einen sechsstelligen Code per E-Mail, und mit dessen Eingabe wird Ihr Konto erstellt. Das Hosten ist mit einer Universal ID kostenlos. Kostenlose Konten haben ein großzügiges Limit, und falls Sie es einmal erreichen, schafft das Schließen eines gespeicherten Webinars Platz für das nächste. Ein kostenloses Webinar kann bis zu 25 Personen haben und dauert höchstens 90 Minuten; in den letzten zehn Minuten sieht der Host, wie viel Zeit noch bleibt.

Wenn Sie ein Webinar erstellen, erhalten Sie einen **Verwaltungslink**. Er ist der Schlüssel zu Ihrem Webinar: Wer ihn hat, kann die Einstellungen ändern, die Anmeldungen sehen und den Raum leiten. Dieser Browser merkt ihn sich für Sie, aber bewahren Sie eine Kopie an einem sicheren Ort auf, damit Sie das Webinar auch von einem anderen Gerät aus verwalten können, und geben Sie ihn nicht weiter.

## Im Raum

- **Ihre Bühne** — Ihre Kamera und Ihr Mikrofon werden an alle im Raum übertragen.
- **Ein Dokument teilen** — Sie können ein PDF oder ein Bild auf die Bühne stellen, damit die Teilnehmenden es lesen können. Jede Person scrollt selbst; die Seiten laufen nicht synchron mit Ihren.
- **Fragen** — Teilnehmende heben die Hand. Sie können jemanden auf Sendung holen, wieder herausnehmen, eine Anfrage ablehnen oder eine Person daran hindern, erneut zu fragen, während sie weiterhin zuschauen und im Chat schreiben kann.
- **Anmeldungen** — Sie sehen, wer sich angemeldet hat, können Personen freigeben oder ablehnen, wenn Sie eine Freigabe verlangen, und eine Warteliste verwalten.

## Abschluss

Wenn die Sitzung endet, fasst die Abschlussseite zusammen, was noch zu tun ist.

1. **Aufzeichnung** — Universal Webinar zeichnet die Sitzung nicht selbst auf. Wenn Sie sie auf andere Weise aufgezeichnet haben, fügen Sie den Link hier ein. Er wird dann in der Nachbereitungs-E-Mail an alle Angemeldeten verschickt.
2. **Ihre Liste** — laden Sie eine Tabellendatei mit Namen, E-Mail-Adressen, Antworten, den tatsächlich Erschienenen und allen herunter, die ohne Anmeldung teilgenommen haben.
3. **Behalten oder schließen** — wählen Sie **In der Cloud speichern**, um das Webinar und alle Beteiligten so lange zu behalten, wie Sie möchten. Oder wählen Sie **Webinar schließen**, um Platz für Ihr nächstes Webinar zu schaffen. Im kostenlosen Tarif werden ein geschlossenes Webinar und seine Anmeldungen 30 Tage später gelöscht. Laden Sie Ihre Liste also vorher herunter.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Ihre Privatsphäre als Teilnehmende',
    summary: 'Was Sie teilen, wer es sehen kann und wie lange es aufbewahrt wird.',
    group: 'Datenschutz und Sicherheit',
    body: `## Was Sie angeben

Wenn Sie sich anmelden oder teilnehmen, geben Sie Ihren Namen und Ihre E-Mail-Adresse an, dazu Antworten auf eventuelle Fragen des Gastgebers. Die App erfasst außerdem, ob Sie den Raum betreten haben, was Sie im Chat schreiben, welche Reaktionen Sie senden und ob Sie um das Wort gebeten haben.

## Wer was sehen kann

- **Andere Teilnehmende** sehen Ihren Namen neben Ihren Chatnachrichten. Ihre E-Mail-Adresse sehen sie nicht.
- **Der Gastgeber** sieht Ihren Namen, Ihre E-Mail-Adresse, Ihre Antworten, ob Sie teilgenommen haben, und Ihre Chatnachrichten. Er kann diese Liste herunterladen, wie bei jeder Veranstaltung, die er durchführt.
- **Alle im Raum** können Sie sehen und hören, wenn der Gastgeber Sie auf Sendung holt und Sie Ihre Kamera oder Ihr Mikrofon einschalten. Andernfalls werden Ihre Kamera und Ihr Mikrofon nicht verwendet.

## Die E-Mails, die Sie erhalten

Ihre E-Mail-Adresse wird verwendet, um Ihnen die Bestätigung, die Erinnerungen und die Nachbereitung zu dem Webinar zu schicken, für das Sie sich angemeldet haben, sofern der Gastgeber diese nicht abgeschaltet hat. Zu diesem Zweck wird sie an den E-Mail-Versanddienst weitergegeben.

## Live-Video und -Audio

Video und Audio werden über verschlüsselte Verbindungen übertragen, wie bei allen WebRTC-Verbindungen. Auf dem Weg zu allen im Raum laufen sie über die Server des Videodienstes, sie sind also nicht Ende-zu-Ende-verschlüsselt. Universal Webinar zeichnet die Sitzung nicht auf; ein Gastgeber kann sie mit anderen Werkzeugen aufzeichnen und sollte Ihnen das mitteilen, wenn er es tut.

## Wie lange es aufbewahrt wird

Ihre Anmeldung bleibt beim Webinar. Wenn ein Gastgeber im kostenlosen Tarif ein Webinar schließt, werden es und alle Anmeldungen 30 Tage später gelöscht. Ein Gastgeber, der ein Webinar behalten möchte oder einen kostenpflichtigen Tarif nutzt, kann sie länger aufbewahren. Für jede Liste, die der Gastgeber heruntergeladen hat, ist er selbst verantwortlich.

## Was Ihr Browser sich merkt

Ihr Browser merkt sich den Namen und die E-Mail-Adresse, mit denen Sie teilgenommen haben, damit Sie sie beim nächsten Mal nicht erneut eingeben müssen.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Sicherheit für Gastgeber',
    summary: 'Ihren Verwaltungslink schützen, und was öffentlich ist.',
    group: 'Datenschutz und Sicherheit',
    body: `## Ihr Verwaltungslink ist der Schlüssel

Wer Ihren Verwaltungslink hat, kann Ihr Webinar leiten: die Einstellungen ändern, die Angaben jeder angemeldeten Person sehen, Leute auf Sendung holen und es schließen. Behandeln Sie ihn wie ein Passwort. Fügen Sie ihn nicht in den Chat des Raums ein und schicken Sie ihn nicht an Teilnehmende; geben Sie ihnen stattdessen den Teilnahme- oder Anmeldelink.

## Was öffentlich ist und was nicht

- **Öffentlich** — die Details des Webinars wie Titel, Beschreibung, Zeitplan, Firmenname und Logo sind öffentlich, damit die Leute entscheiden können, ob sie kommen. Die E-Mail-Adresse, mit der Sie veranstalten, und ein etwaiger Aufzeichnungslink, den Sie hinzufügen, werden zusammen mit diesen Details gespeichert. Verwenden Sie also eine Adresse, die Teilnehmende ruhig sehen dürfen.
- **Öffentlich für alle, die den Link haben** — ein Dokument, das Sie auf der Bühne teilen, und Ihr Logo werden unter langen, zufälligen Webadressen gespeichert. Wer eine dieser Adressen hat, kann die Datei öffnen. Genau das ermöglicht es allen im Raum, sie zu sehen. Wenn Sie ein geteiltes Dokument entfernen, wird es gelöscht.
- **Privat** — die E-Mail-Adressen und Antworten der Angemeldeten sowie die PIN des Raums werden nie auf öffentlichen Seiten angezeigt. Sie werden nur an jemanden herausgegeben, der Ihren Verwaltungslink vorlegt.

## Zur PIN des Raums

Eine PIN hält zufällige Besucher fern. Sie wird vom Dienst geprüft, nicht nur von der Seite, und der Dienst begrenzt, wie viele falsche Versuche möglich sind. Trotzdem ist eine PIN eine kurze Zahl. Sie eignet sich daher eher dafür, eine Veranstaltung geordnet zu halten, als etwas wirklich Sensibles zu schützen. Verwenden Sie eine längere PIN, wenn es darauf ankommt, und ändern Sie sie für jede Sitzung.

## Die Daten Ihrer Angemeldeten

Sie sind dafür verantwortlich, wie Sie die heruntergeladene Liste verwenden. Schreiben Sie den Leuten nur zu dem, wofür sie sich angemeldet haben, und löschen Sie Kopien, die Sie nicht mehr brauchen. Im kostenlosen Tarif werden ein Webinar und seine Anmeldungen 30 Tage nach dem Schließen gelöscht; wenn Sie es in der Cloud speichern, bleiben sie erhalten, bis Sie es schließen.

## Ihr Konto

Zum Veranstalten wird Ihre Universal ID verwendet, dasselbe Konto wie in allen UNI·SIM-Apps. Ihre E-Mail-Adresse wird mit einem Einmalcode bestätigt, bevor Sie live gehen können.`,
  },
]

export default articles
