import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: '¿Qué es un webinar?',
    summary: 'En qué se diferencia un webinar de una videollamada, y quién hace qué.',
    group: 'Lo básico',
    body: `Un webinar es un evento en línea en directo: un anfitrión, o un pequeño número de ponentes, presenta ante un público que mira y participa desde donde esté. La palabra es una combinación de "web" y "seminar" (seminario).

## En qué se diferencia de una videollamada

En una videollamada, normalmente todos aparecen en cámara y cualquiera puede hablar. Un webinar se parece más a una charla en un auditorio:

- **El anfitrión dirige el escenario.** Presenta, comparte material y decide quién más se escucha.
- **El público mira.** Los asistentes ven y oyen el escenario, pero no aparecen en cámara.
- **El público también participa.** Puede escribir en el chat, enviar reacciones y pedir la palabra. Si el anfitrión lo acepta, la persona sale en antena un momento y después vuelve a mirar.

Ese formato hace que los webinars sean adecuados para grupos grandes, porque una sala de cincuenta o quinientas personas no se convierte en un barullo de voces cruzadas.

## Antes y después del directo

Un webinar es más que la hora que dura. Normalmente la gente se inscribe con antelación, recibe una confirmación y recordatorios, se conecta el día señalado y, después, vuelve a tener noticias del anfitrión, a menudo con un enlace a una grabación. Universal Webinar se encarga de cada uno de esos pasos, para que el anfitrión pueda gestionarlo todo desde un solo lugar.

## En directo, no grabado

Todo lo que ocurre en la sala sucede en tiempo real. Hay un retraso de un instante entre el momento en que habla el anfitrión y el momento en que lo oye el público, y por eso las preguntas del chat a veces llegan justo después de que el anfitrión haya pasado a otro tema. Conviene dejar una breve pausa después de preguntar algo al público.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Cómo llega el vídeo en directo a todos',
    summary: 'El recorrido desde la cámara del anfitrión hasta cada pantalla de la sala.',
    group: 'Lo básico',
    body: `Cuando un anfitrión sale en directo, su navegador capta la cámara y el micrófono, los comprime y los envía por internet a un servicio de vídeo. Ese servicio transmite la señal al navegador de cada asistente, que la descomprime y la reproduce. Todo el recorrido suele tardar bastante menos de un segundo.

## Por qué hay un servicio de vídeo en medio

Sería posible que el ordenador del anfitrión enviara su vídeo directamente a cada asistente, pero eso significaría enviar la misma señal una vez por persona, y una conexión doméstica se queda enseguida sin capacidad de subida. En su lugar, el anfitrión envía una sola señal al servicio, y el servicio se encarga de copiarla para todos. Eso es lo que permite que un webinar crezca hasta tener un gran público sin que el anfitrión necesite una conexión especial.

## La tecnología de fondo

Universal Webinar utiliza WebRTC, el estándar integrado en los navegadores modernos para audio y vídeo en directo, junto con un servicio de vídeo llamado LiveKit que retransmite las señales. No hace falta instalar nada: el navegador lo hace todo.

## Cuando la imagen falla

El vídeo en directo se adapta a la conexión disponible. Si su conexión se ralentiza, la imagen puede perder nitidez o detenerse brevemente mientras el sonido continúa, porque la señal prioriza seguir en directo frente a mantenerse nítida. Algunos consejos prácticos:

- Para los anfitriones y cualquier persona que salga en antena, una conexión por cable o un lugar cerca del router wifi es lo que más se nota.
- Cerrar otras aplicaciones que usen mucho internet, como descargas grandes u otras videollamadas, libera capacidad.
- Si el vídeo se queda congelado definitivamente, recargar la página suele volver a conectarle a la sala.

## Su cámara y su micrófono

Los asistentes solo reciben vídeo. Su cámara y su micrófono nunca se utilizan, salvo que el anfitrión le saque en antena y usted los active después. La primera vez, su navegador le pedirá permiso.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Inscribirse y unirse',
    summary: 'La confirmación, los recordatorios y el enlace de acceso, y lo que un anfitrión puede exigir antes de dejarle entrar.',
    group: 'Cómo funciona',
    body: `## Inscribirse

Para inscribirse solo se piden su nombre y su dirección de correo electrónico, además de las respuestas a las preguntas que el anfitrión haya añadido. No necesita una cuenta.

Una vez inscrito, recibe un correo de confirmación con los detalles de la sesión, una invitación que puede añadir a su calendario y su propio enlace de acceso personal. Ese enlace le lleva directamente a la sesión desde cualquier dispositivo sin volver a escribir sus datos, así que conviene guardarlo.

## Recordatorios y seguimiento

Salvo que el anfitrión los haya desactivado, también recibe:

- un recordatorio en las 24 horas anteriores al inicio de la sesión;
- un segundo recordatorio aproximadamente una hora antes del inicio;
- un mensaje de seguimiento cuando termine, para agradecerle su asistencia o, si no pudo asistir, para indicárselo. Si el anfitrión añade un enlace a una grabación, se incluye. El mensaje de seguimiento se envía en cuanto el anfitrión ha añadido una grabación, o un día después de que termine el webinar si no lo ha hecho.

Cada correo incluye el mismo enlace de acceso personal. Los anfitriones pueden activar o desactivar por separado la confirmación, los recordatorios y el seguimiento.

## Qué puede exigir un anfitrión

Los anfitriones pueden configurar el acceso de distintas maneras:

- **Aprobación** — su inscripción queda en espera hasta que el anfitrión la apruebe. El correo de confirmación con su enlace de acceso solo se envía una vez que ha sido aprobado.
- **Límite de plazas** — cuando el webinar está completo, las nuevas inscripciones pasan a una lista de espera, y las personas avanzan automáticamente cuando se libera una plaza.
- **Enlace de acceso abierto** — el anfitrión puede permitir que la gente se una el mismo día sin inscribirse antes, y puede cerrar esa puerta en cualquier momento. Las personas que ya se inscribieron y fueron aprobadas pueden seguir entrando.
- **PIN** — el anfitrión puede proteger la sala con un PIN. Todo el mundo lo necesita para entrar, incluidas las personas inscritas.

Estas reglas las comprueba el servicio, no solo la página que usted ve.

## Unirse el día de la sesión

Abra su enlace de acceso, o el enlace que haya compartido el anfitrión, e introduzca su nombre y su correo electrónico si se le piden. Su navegador los recuerda para la próxima vez. En la sala puede mirar, escribir en el chat, enviar reacciones y levantar la mano para pedir la palabra.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Organizar un webinar',
    summary: 'Su enlace de gestión, salir en directo, atender preguntas y cerrar la sesión.',
    group: 'Cómo funciona',
    body: `## Preparación

Puede rellenar los detalles de un nuevo webinar sin iniciar sesión. Para salir en directo o programarlo, necesita un Universal ID gratuito: si no tiene uno, la aplicación le envía por correo un código de seis dígitos, y al introducirlo se crea su cuenta. Organizar webinars es gratis con un Universal ID. Las cuentas gratuitas tienen un límite generoso y, si alguna vez lo alcanza, cerrar un webinar que haya guardado deja sitio para el siguiente. Un webinar gratuito admite hasta 25 personas y dura como máximo 90 minutos; en los diez últimos minutos, el anfitrión ve cuánto tiempo queda.

Al crear un webinar obtiene un **enlace de gestión**. Es la llave de su webinar: quien lo tenga puede cambiar la configuración, ver las inscripciones y dirigir la sala. Este navegador lo recuerda por usted, pero guarde una copia en un lugar seguro para poder gestionar el webinar desde otro dispositivo, y no lo comparta.

## En la sala

- **Su escenario** — su cámara y su micrófono se emiten a todas las personas de la sala.
- **Compartir un documento** — puede mostrar un PDF o una imagen en el escenario para que los asistentes lo lean. Cada persona se desplaza por él por su cuenta; las páginas no se sincronizan con las suyas.
- **Preguntas** — los asistentes levantan la mano. Puede sacar a alguien en antena, volver a retirarlo, rechazar una petición o impedir que una persona vuelva a pedir la palabra sin dejar de permitirle mirar y escribir en el chat.
- **Inscripciones** — puede ver quién se ha inscrito, aprobar o rechazar a personas si exige aprobación, y gestionar una lista de espera.

## Cierre

Cuando termina la sesión, la página de cierre reúne lo que queda por hacer.

1. **Grabación** — Universal Webinar no graba la sesión por sí mismo. Si la ha grabado de otra forma, pegue aquí el enlace y se enviará en el correo de seguimiento a todas las personas inscritas.
2. **Su lista** — descargue un archivo de hoja de cálculo con los nombres, las direcciones de correo, las respuestas, quién asistió y quién se unió sin inscribirse.
3. **Guardar o cerrar** — elija **Guardar en la nube** para conservar el webinar y a todas las personas que lo integran durante el tiempo que quiera. O elija **Cerrar webinar** para dejar sitio a su próximo webinar. En el plan gratuito, un webinar cerrado y sus inscripciones se eliminan 30 días después, así que descargue antes su lista.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Su privacidad como asistente',
    summary: 'Qué comparte, quién puede verlo y durante cuánto tiempo se conserva.',
    group: 'Privacidad y seguridad',
    body: `## Lo que usted aporta

Cuando se inscribe o se une, aporta su nombre y su dirección de correo electrónico, además de las respuestas a las preguntas que el anfitrión haya añadido. La aplicación también registra si entró en la sala, lo que escribe en el chat, las reacciones que envía y cualquier petición de palabra.

## Quién puede ver qué

- **Los demás asistentes** ven su nombre junto a sus mensajes del chat. No ven su dirección de correo electrónico.
- **El anfitrión** ve su nombre, su dirección de correo, sus respuestas, si asistió y sus mensajes del chat. Puede descargar esa lista, como en cualquier evento que organice.
- **Todas las personas de la sala** pueden verle y oírle si el anfitrión le saca en antena y usted activa su cámara o su micrófono. De lo contrario, su cámara y su micrófono no se utilizan.

## Los correos que recibe

Su dirección de correo se utiliza para enviarle la confirmación, los recordatorios y el seguimiento del webinar en el que se inscribió, salvo que el anfitrión los haya desactivado. Se facilita al servicio de envío de correo con ese fin.

## Vídeo y audio en directo

El vídeo y el audio viajan por conexiones cifradas, como todas las conexiones WebRTC. Pasan por los servidores del servicio de vídeo de camino a todas las personas de la sala, así que no están cifrados de extremo a extremo. Universal Webinar no graba la sesión; un anfitrión puede grabarla con otras herramientas, y debería informarle si lo hace.

## Cuánto tiempo se conserva

Su inscripción permanece con el webinar. Cuando un anfitrión con el plan gratuito cierra un webinar, este y todas las inscripciones se eliminan 30 días después. Un anfitrión que decida conservar un webinar, o que tenga un plan de pago, puede conservarlos durante más tiempo. Cualquier lista que el anfitrión haya descargado queda bajo su responsabilidad.

## Lo que recuerda su navegador

Su navegador recuerda el nombre y el correo con los que se unió, para que no tenga que volver a escribirlos la próxima vez.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Seguridad para anfitriones',
    summary: 'Cómo proteger su enlace de gestión, y qué es público.',
    group: 'Privacidad y seguridad',
    body: `## Su enlace de gestión es la llave

Cualquiera que tenga su enlace de gestión puede dirigir su webinar: cambiar su configuración, ver los datos de cada inscrito, sacar a personas en antena y cerrarlo. Trátelo como una contraseña. No lo pegue en el chat de la sala ni lo envíe a los asistentes; deles en su lugar el enlace de acceso o de inscripción.

## Qué es público y qué no

- **Público** — los detalles del webinar, como el título, la descripción, el horario, el nombre de la empresa y el logotipo, son públicos para que la gente pueda decidir si asiste. La dirección de correo con la que organiza y cualquier enlace de grabación que añada se guardan junto a esos detalles, así que utilice una dirección que no le importe que vean los asistentes.
- **Público para cualquiera que tenga el enlace** — un documento que comparta en el escenario y su logotipo se guardan en direcciones web largas y aleatorias. Cualquiera que tenga una de esas direcciones puede abrir el archivo, que es lo que permite que toda la sala lo vea. Retirar un documento compartido lo elimina.
- **Privado** — las direcciones de correo y las respuestas de los inscritos, así como el PIN de la sala, nunca se muestran en páginas públicas. Solo se devuelven a quien presente su enlace de gestión.

## Sobre el PIN de la sala

Un PIN impide la entrada de curiosos. Lo comprueba el servicio, no solo la página, y el servicio limita el número de intentos fallidos. Aun así, un PIN es un número corto, por lo que sirve más para mantener un evento ordenado que para proteger algo realmente delicado. Use un PIN más largo si es importante, y cámbielo en cada sesión.

## Los datos de sus inscritos

Usted es responsable del uso que haga de la lista que descarga. Escriba a las personas solo sobre aquello para lo que se inscribieron, y elimine las copias que ya no necesite. En el plan gratuito, cerrar un webinar hace que este y sus inscripciones se eliminen 30 días después; guardarlo en la nube los conserva hasta que lo cierre.

## Su cuenta

Para organizar se utiliza su Universal ID, la misma cuenta que se usa en todas las aplicaciones de UNI·SIM. Su dirección de correo se verifica con un código de un solo uso antes de que pueda salir en directo.`,
  },
]

export default articles
