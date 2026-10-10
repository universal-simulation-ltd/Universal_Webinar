import { pickTranslation, useLanguage } from '@unisim/sdk'

// Every line the recording feature shows, in every language the suite speaks.
// Like noCompanyCopy.ts, these follow the suite language even though most of
// the hosting pages are still English-only: the Recording badge and the
// "may be recorded" notice are about consent, and a guest has to be able to
// read them.

export interface RecordingCopy {
  // Host stage
  record: string
  stop: string
  recordHint: string
  starting: string
  unsupported: string
  startFailed: string
  saveFailed: string
  /** {size} */
  saved: string
  savedAfterLeaving: string
  cloudRecord: string
  cloudStop: string
  cloudHint: string
  cloudPaidOnly: string
  cloudFailed: string
  cloudOn: string
  // Everyone in the room
  badge: string
  inRoomNotice: string
  joinNotice: string
  // Wrap-up
  /** {duration} {size} */
  yourRecording: string
  uploadReplay: string
  uploading: string
  uploadFile: string
  uploadHint: string
  /** {size} {max} */
  tooBig: string
  wrongType: string
  signIn: string
  noOrg: string
  noCredits: string
  uploadFailed: string
  replayReady: string
  watch: string
  remove: string
  removing: string
  cloudProcessing: string
  // Replay page
  replayTitle: string
  replayLoading: string
  replayMissing: string
  /** {host} */
  replayBy: string
}

const EN: RecordingCopy = {
  record: 'Record this webinar',
  stop: 'Stop recording',
  recordHint:
    'Records the stage and everyone’s sound in this browser and saves the video to your device. Free, and nothing is uploaded. Everyone in the room sees a Recording badge while it runs.',
  starting: 'Starting…',
  unsupported: 'This browser can’t record the webinar. Try Chrome, Edge or Safari on a computer.',
  startFailed: 'The recording couldn’t start.',
  saveFailed: 'The recording couldn’t be saved.',
  saved: 'Recording saved to your device ({size}).',
  savedAfterLeaving: 'You left the stage, so the recording stopped and was saved to your device.',
  cloudRecord: 'Record in the cloud',
  cloudStop: 'Stop cloud recording',
  cloudHint:
    'Records on our servers, so it keeps going if your browser closes. The replay link goes into the follow-up email when it’s ready.',
  cloudPaidOnly: 'Cloud recording is for paid webinars.',
  cloudFailed: 'Cloud recording couldn’t start.',
  cloudOn: 'Recording in the cloud',
  badge: 'Recording',
  inRoomNotice: 'This session is being recorded.',
  joinNotice: 'Sessions may be recorded. If one is, you’ll see a Recording badge while it runs.',
  yourRecording: 'Your recording ({duration}, {size}) is saved on this device.',
  uploadReplay: 'Upload as replay',
  uploading: 'Uploading…',
  uploadFile: 'Upload a recording file…',
  uploadHint:
    'The replay link goes into the follow-up email automatically. Replays are kept in your Universal Recorder and use your company’s online file storage, up to 2 GB a file.',
  tooBig:
    'This recording is {size}, and replays can be up to {max}. Share it another way, for example on YouTube, and paste the link below.',
  wrongType: 'Choose an MP4 or WebM video.',
  signIn: 'Sign in with your Universal ID to upload a replay.',
  noOrg: 'Set up a company (it’s free) to upload a replay.',
  noCredits:
    'Your free online storage is full. Remove a file in Universal Recorder, or buy a token, then try again.',
  uploadFailed: 'The upload didn’t finish, and nothing was charged. Try again.',
  replayReady: 'Replay ready. Its link goes out in the follow-up email.',
  watch: 'Watch the replay',
  remove: 'Remove replay',
  removing: 'Removing…',
  cloudProcessing: 'Your cloud recording is being processed. The replay appears here when it’s ready.',
  replayTitle: 'Replay',
  replayLoading: 'Loading the replay…',
  replayMissing: 'This replay isn’t available. The host may have removed it.',
  replayBy: 'Hosted by {host}',
}

const COPY: Record<string, RecordingCopy> = {
  'en-gb': EN,
  en: EN,
  fr: {
    record: 'Enregistrer ce webinaire',
    stop: 'Arrêter l’enregistrement',
    recordHint:
      'Enregistre la scène et le son de chacun dans ce navigateur, puis sauvegarde la vidéo sur votre appareil. Gratuit, et rien n’est envoyé en ligne. Tous les participants voient un badge « Enregistrement » pendant ce temps.',
    starting: 'Démarrage…',
    unsupported: 'Ce navigateur ne peut pas enregistrer le webinaire. Essayez Chrome, Edge ou Safari sur un ordinateur.',
    startFailed: 'L’enregistrement n’a pas pu démarrer.',
    saveFailed: 'L’enregistrement n’a pas pu être sauvegardé.',
    saved: 'Enregistrement sauvegardé sur votre appareil ({size}).',
    savedAfterLeaving: 'Vous avez quitté la scène : l’enregistrement s’est arrêté et a été sauvegardé sur votre appareil.',
    cloudRecord: 'Enregistrer dans le cloud',
    cloudStop: 'Arrêter l’enregistrement cloud',
    cloudHint:
      'Enregistre sur nos serveurs, donc il continue même si votre navigateur se ferme. Le lien du replay est ajouté à l’e-mail de suivi dès qu’il est prêt.',
    cloudPaidOnly: 'L’enregistrement cloud est réservé aux webinaires payants.',
    cloudFailed: 'L’enregistrement cloud n’a pas pu démarrer.',
    cloudOn: 'Enregistrement dans le cloud',
    badge: 'Enregistrement',
    inRoomNotice: 'Cette session est enregistrée.',
    joinNotice: 'Les sessions peuvent être enregistrées. Si c’est le cas, un badge « Enregistrement » s’affiche pendant ce temps.',
    yourRecording: 'Votre enregistrement ({duration}, {size}) est sauvegardé sur cet appareil.',
    uploadReplay: 'Mettre en ligne comme replay',
    uploading: 'Envoi…',
    uploadFile: 'Envoyer un fichier d’enregistrement…',
    uploadHint:
      'Le lien du replay est ajouté automatiquement à l’e-mail de suivi. Les replays sont conservés dans votre Universal Recorder et utilisent le stockage en ligne de votre entreprise, jusqu’à 2 Go par fichier.',
    tooBig:
      'Cet enregistrement fait {size}, et un replay peut faire jusqu’à {max}. Partagez-le autrement, par exemple sur YouTube, et collez le lien ci-dessous.',
    wrongType: 'Choisissez une vidéo MP4 ou WebM.',
    signIn: 'Connectez-vous avec votre Universal ID pour mettre un replay en ligne.',
    noOrg: 'Créez une entreprise (c’est gratuit) pour mettre un replay en ligne.',
    noCredits:
      'Votre stockage en ligne gratuit est plein. Supprimez un fichier dans Universal Recorder ou achetez un jeton, puis réessayez.',
    uploadFailed: 'L’envoi n’a pas abouti et rien n’a été facturé. Réessayez.',
    replayReady: 'Replay prêt. Son lien part dans l’e-mail de suivi.',
    watch: 'Voir le replay',
    remove: 'Supprimer le replay',
    removing: 'Suppression…',
    cloudProcessing: 'Votre enregistrement cloud est en cours de traitement. Le replay apparaîtra ici dès qu’il sera prêt.',
    replayTitle: 'Replay',
    replayLoading: 'Chargement du replay…',
    replayMissing: 'Ce replay n’est pas disponible. L’organisateur l’a peut-être supprimé.',
    replayBy: 'Organisé par {host}',
  },
  es: {
    record: 'Grabar este webinar',
    stop: 'Detener la grabación',
    recordHint:
      'Graba el escenario y el sonido de todos en este navegador y guarda el vídeo en tu dispositivo. Gratis, y no se sube nada. Todos en la sala ven una insignia de «Grabando» mientras tanto.',
    starting: 'Iniciando…',
    unsupported: 'Este navegador no puede grabar el webinar. Prueba con Chrome, Edge o Safari en un ordenador.',
    startFailed: 'No se pudo iniciar la grabación.',
    saveFailed: 'No se pudo guardar la grabación.',
    saved: 'Grabación guardada en tu dispositivo ({size}).',
    savedAfterLeaving: 'Saliste del escenario, así que la grabación se detuvo y se guardó en tu dispositivo.',
    cloudRecord: 'Grabar en la nube',
    cloudStop: 'Detener la grabación en la nube',
    cloudHint:
      'Graba en nuestros servidores, así que sigue aunque se cierre tu navegador. El enlace a la repetición se añade al correo de seguimiento cuando esté lista.',
    cloudPaidOnly: 'La grabación en la nube es para webinars de pago.',
    cloudFailed: 'No se pudo iniciar la grabación en la nube.',
    cloudOn: 'Grabando en la nube',
    badge: 'Grabando',
    inRoomNotice: 'Esta sesión se está grabando.',
    joinNotice: 'Las sesiones pueden grabarse. Si es así, verás una insignia de «Grabando» mientras tanto.',
    yourRecording: 'Tu grabación ({duration}, {size}) está guardada en este dispositivo.',
    uploadReplay: 'Subir como repetición',
    uploading: 'Subiendo…',
    uploadFile: 'Subir un archivo de grabación…',
    uploadHint:
      'El enlace a la repetición se añade automáticamente al correo de seguimiento. Las repeticiones se guardan en tu Universal Recorder y usan el almacenamiento en línea de tu empresa, hasta 2 GB por archivo.',
    tooBig:
      'Esta grabación ocupa {size} y una repetición puede ocupar hasta {max}. Compártela de otra forma, por ejemplo en YouTube, y pega el enlace abajo.',
    wrongType: 'Elige un vídeo MP4 o WebM.',
    signIn: 'Inicia sesión con tu Universal ID para subir una repetición.',
    noOrg: 'Crea una empresa (es gratis) para subir una repetición.',
    noCredits:
      'Tu almacenamiento en línea gratuito está lleno. Borra un archivo en Universal Recorder o compra un token y vuelve a intentarlo.',
    uploadFailed: 'La subida no terminó y no se ha cobrado nada. Vuelve a intentarlo.',
    replayReady: 'Repetición lista. Su enlace va en el correo de seguimiento.',
    watch: 'Ver la repetición',
    remove: 'Quitar la repetición',
    removing: 'Quitando…',
    cloudProcessing: 'Tu grabación en la nube se está procesando. La repetición aparecerá aquí cuando esté lista.',
    replayTitle: 'Repetición',
    replayLoading: 'Cargando la repetición…',
    replayMissing: 'Esta repetición no está disponible. Puede que el organizador la haya quitado.',
    replayBy: 'Organizado por {host}',
  },
  it: {
    record: 'Registra questo webinar',
    stop: 'Interrompi la registrazione',
    recordHint:
      'Registra il palco e l’audio di tutti in questo browser e salva il video sul tuo dispositivo. Gratis, e non viene caricato nulla. Tutti nella stanza vedono un badge «Registrazione» finché è attiva.',
    starting: 'Avvio…',
    unsupported: 'Questo browser non può registrare il webinar. Prova Chrome, Edge o Safari su un computer.',
    startFailed: 'Impossibile avviare la registrazione.',
    saveFailed: 'Impossibile salvare la registrazione.',
    saved: 'Registrazione salvata sul tuo dispositivo ({size}).',
    savedAfterLeaving: 'Hai lasciato il palco, quindi la registrazione si è fermata ed è stata salvata sul tuo dispositivo.',
    cloudRecord: 'Registra nel cloud',
    cloudStop: 'Interrompi la registrazione nel cloud',
    cloudHint:
      'Registra sui nostri server, quindi continua anche se il browser si chiude. Il link alla replica viene aggiunto all’email di follow-up quando è pronta.',
    cloudPaidOnly: 'La registrazione nel cloud è per i webinar a pagamento.',
    cloudFailed: 'Impossibile avviare la registrazione nel cloud.',
    cloudOn: 'Registrazione nel cloud',
    badge: 'Registrazione',
    inRoomNotice: 'Questa sessione viene registrata.',
    joinNotice: 'Le sessioni possono essere registrate. In quel caso vedrai un badge «Registrazione» finché è attiva.',
    yourRecording: 'La tua registrazione ({duration}, {size}) è salvata su questo dispositivo.',
    uploadReplay: 'Carica come replica',
    uploading: 'Caricamento…',
    uploadFile: 'Carica un file di registrazione…',
    uploadHint:
      'Il link alla replica viene aggiunto automaticamente all’email di follow-up. Le repliche restano nel tuo Universal Recorder e usano lo spazio online della tua azienda, fino a 2 GB per file.',
    tooBig:
      'Questa registrazione pesa {size} e una replica può arrivare a {max}. Condividila in un altro modo, ad esempio su YouTube, e incolla il link qui sotto.',
    wrongType: 'Scegli un video MP4 o WebM.',
    signIn: 'Accedi con il tuo Universal ID per caricare una replica.',
    noOrg: 'Crea un’azienda (è gratis) per caricare una replica.',
    noCredits:
      'Il tuo spazio online gratuito è pieno. Elimina un file in Universal Recorder o acquista un token, poi riprova.',
    uploadFailed: 'Il caricamento non è stato completato e non è stato addebitato nulla. Riprova.',
    replayReady: 'Replica pronta. Il suo link parte con l’email di follow-up.',
    watch: 'Guarda la replica',
    remove: 'Rimuovi la replica',
    removing: 'Rimozione…',
    cloudProcessing: 'La registrazione nel cloud è in elaborazione. La replica apparirà qui quando sarà pronta.',
    replayTitle: 'Replica',
    replayLoading: 'Caricamento della replica…',
    replayMissing: 'Questa replica non è disponibile. Forse l’organizzatore l’ha rimossa.',
    replayBy: 'Organizzato da {host}',
  },
  de: {
    record: 'Dieses Webinar aufzeichnen',
    stop: 'Aufzeichnung beenden',
    recordHint:
      'Zeichnet die Bühne und den Ton aller Teilnehmenden in diesem Browser auf und speichert das Video auf deinem Gerät. Kostenlos, und nichts wird hochgeladen. Alle im Raum sehen währenddessen ein „Aufnahme“-Abzeichen.',
    starting: 'Wird gestartet…',
    unsupported: 'Dieser Browser kann das Webinar nicht aufzeichnen. Versuche es mit Chrome, Edge oder Safari auf einem Computer.',
    startFailed: 'Die Aufzeichnung konnte nicht gestartet werden.',
    saveFailed: 'Die Aufzeichnung konnte nicht gespeichert werden.',
    saved: 'Aufzeichnung auf deinem Gerät gespeichert ({size}).',
    savedAfterLeaving: 'Du hast die Bühne verlassen. Die Aufzeichnung wurde beendet und auf deinem Gerät gespeichert.',
    cloudRecord: 'In der Cloud aufzeichnen',
    cloudStop: 'Cloud-Aufzeichnung beenden',
    cloudHint:
      'Zeichnet auf unseren Servern auf und läuft deshalb weiter, auch wenn dein Browser geschlossen wird. Der Link zur Aufzeichnung kommt in die Follow-up-E-Mail, sobald sie fertig ist.',
    cloudPaidOnly: 'Cloud-Aufzeichnung gibt es für kostenpflichtige Webinare.',
    cloudFailed: 'Die Cloud-Aufzeichnung konnte nicht gestartet werden.',
    cloudOn: 'Aufzeichnung in der Cloud',
    badge: 'Aufnahme',
    inRoomNotice: 'Diese Sitzung wird aufgezeichnet.',
    joinNotice: 'Sitzungen können aufgezeichnet werden. Dann siehst du währenddessen ein „Aufnahme“-Abzeichen.',
    yourRecording: 'Deine Aufzeichnung ({duration}, {size}) ist auf diesem Gerät gespeichert.',
    uploadReplay: 'Als Aufzeichnung hochladen',
    uploading: 'Wird hochgeladen…',
    uploadFile: 'Aufnahmedatei hochladen…',
    uploadHint:
      'Der Link zur Aufzeichnung kommt automatisch in die Follow-up-E-Mail. Aufzeichnungen liegen in deinem Universal Recorder und nutzen den Online-Speicher deines Unternehmens, bis zu 2 GB pro Datei.',
    tooBig:
      'Diese Aufzeichnung ist {size} groß, erlaubt sind bis zu {max}. Teile sie auf anderem Weg, zum Beispiel über YouTube, und füge den Link unten ein.',
    wrongType: 'Wähle ein MP4- oder WebM-Video.',
    signIn: 'Melde dich mit deiner Universal ID an, um eine Aufzeichnung hochzuladen.',
    noOrg: 'Richte ein Unternehmen ein (kostenlos), um eine Aufzeichnung hochzuladen.',
    noCredits:
      'Dein kostenloser Online-Speicher ist voll. Lösche eine Datei in Universal Recorder oder kaufe einen Token und versuche es erneut.',
    uploadFailed: 'Der Upload wurde nicht abgeschlossen, und es wurde nichts berechnet. Versuche es erneut.',
    replayReady: 'Aufzeichnung bereit. Ihr Link geht mit der Follow-up-E-Mail raus.',
    watch: 'Aufzeichnung ansehen',
    remove: 'Aufzeichnung entfernen',
    removing: 'Wird entfernt…',
    cloudProcessing: 'Deine Cloud-Aufzeichnung wird verarbeitet. Sie erscheint hier, sobald sie fertig ist.',
    replayTitle: 'Aufzeichnung',
    replayLoading: 'Aufzeichnung wird geladen…',
    replayMissing: 'Diese Aufzeichnung ist nicht verfügbar. Vielleicht hat der Veranstalter sie entfernt.',
    replayBy: 'Veranstaltet von {host}',
  },
  'pt-BR': {
    record: 'Gravar este webinar',
    stop: 'Parar a gravação',
    recordHint:
      'Grava o palco e o som de todos neste navegador e salva o vídeo no seu dispositivo. Grátis, e nada é enviado. Todos na sala veem um selo de "Gravando" enquanto isso.',
    starting: 'Iniciando…',
    unsupported: 'Este navegador não consegue gravar o webinar. Tente o Chrome, o Edge ou o Safari em um computador.',
    startFailed: 'Não foi possível iniciar a gravação.',
    saveFailed: 'Não foi possível salvar a gravação.',
    saved: 'Gravação salva no seu dispositivo ({size}).',
    savedAfterLeaving: 'Você saiu do palco, então a gravação parou e foi salva no seu dispositivo.',
    cloudRecord: 'Gravar na nuvem',
    cloudStop: 'Parar a gravação na nuvem',
    cloudHint:
      'Grava nos nossos servidores, então continua mesmo se o seu navegador fechar. O link da reprise vai no e-mail de acompanhamento quando estiver pronto.',
    cloudPaidOnly: 'A gravação na nuvem é para webinars pagos.',
    cloudFailed: 'Não foi possível iniciar a gravação na nuvem.',
    cloudOn: 'Gravando na nuvem',
    badge: 'Gravando',
    inRoomNotice: 'Esta sessão está sendo gravada.',
    joinNotice: 'As sessões podem ser gravadas. Se for o caso, você verá um selo de "Gravando" enquanto isso.',
    yourRecording: 'Sua gravação ({duration}, {size}) está salva neste dispositivo.',
    uploadReplay: 'Enviar como reprise',
    uploading: 'Enviando…',
    uploadFile: 'Enviar um arquivo de gravação…',
    uploadHint:
      'O link da reprise vai automaticamente no e-mail de acompanhamento. As reprises ficam no seu Universal Recorder e usam o armazenamento on-line da sua empresa, até 2 GB por arquivo.',
    tooBig:
      'Esta gravação tem {size}, e uma reprise pode ter até {max}. Compartilhe de outro jeito, por exemplo no YouTube, e cole o link abaixo.',
    wrongType: 'Escolha um vídeo MP4 ou WebM.',
    signIn: 'Entre com seu Universal ID para enviar uma reprise.',
    noOrg: 'Crie uma empresa (é grátis) para enviar uma reprise.',
    noCredits:
      'Seu armazenamento on-line gratuito está cheio. Apague um arquivo no Universal Recorder ou compre um token e tente de novo.',
    uploadFailed: 'O envio não terminou e nada foi cobrado. Tente de novo.',
    replayReady: 'Reprise pronta. O link vai no e-mail de acompanhamento.',
    watch: 'Assistir à reprise',
    remove: 'Remover a reprise',
    removing: 'Removendo…',
    cloudProcessing: 'Sua gravação na nuvem está sendo processada. A reprise aparece aqui quando estiver pronta.',
    replayTitle: 'Reprise',
    replayLoading: 'Carregando a reprise…',
    replayMissing: 'Esta reprise não está disponível. Talvez o organizador a tenha removido.',
    replayBy: 'Organizado por {host}',
  },
  'pt-PT': {
    record: 'Gravar este webinar',
    stop: 'Parar a gravação',
    recordHint:
      'Grava o palco e o som de todos neste navegador e guarda o vídeo no seu dispositivo. Gratuito, e nada é carregado. Todos na sala veem um selo de "A gravar" enquanto decorre.',
    starting: 'A iniciar…',
    unsupported: 'Este navegador não consegue gravar o webinar. Experimente o Chrome, o Edge ou o Safari num computador.',
    startFailed: 'Não foi possível iniciar a gravação.',
    saveFailed: 'Não foi possível guardar a gravação.',
    saved: 'Gravação guardada no seu dispositivo ({size}).',
    savedAfterLeaving: 'Saiu do palco, por isso a gravação parou e foi guardada no seu dispositivo.',
    cloudRecord: 'Gravar na nuvem',
    cloudStop: 'Parar a gravação na nuvem',
    cloudHint:
      'Grava nos nossos servidores, por isso continua mesmo que o navegador feche. A ligação para a repetição segue no e-mail de acompanhamento quando estiver pronta.',
    cloudPaidOnly: 'A gravação na nuvem é para webinars pagos.',
    cloudFailed: 'Não foi possível iniciar a gravação na nuvem.',
    cloudOn: 'A gravar na nuvem',
    badge: 'A gravar',
    inRoomNotice: 'Esta sessão está a ser gravada.',
    joinNotice: 'As sessões podem ser gravadas. Se for o caso, verá um selo de "A gravar" enquanto decorre.',
    yourRecording: 'A sua gravação ({duration}, {size}) está guardada neste dispositivo.',
    uploadReplay: 'Carregar como repetição',
    uploading: 'A carregar…',
    uploadFile: 'Carregar um ficheiro de gravação…',
    uploadHint:
      'A ligação para a repetição segue automaticamente no e-mail de acompanhamento. As repetições ficam no seu Universal Recorder e usam o armazenamento online da sua empresa, até 2 GB por ficheiro.',
    tooBig:
      'Esta gravação tem {size}, e uma repetição pode ter até {max}. Partilhe-a de outra forma, por exemplo no YouTube, e cole a ligação abaixo.',
    wrongType: 'Escolha um vídeo MP4 ou WebM.',
    signIn: 'Inicie sessão com o seu Universal ID para carregar uma repetição.',
    noOrg: 'Crie uma empresa (é gratuito) para carregar uma repetição.',
    noCredits:
      'O seu armazenamento online gratuito está cheio. Apague um ficheiro no Universal Recorder ou compre um token e tente novamente.',
    uploadFailed: 'O carregamento não terminou e nada foi cobrado. Tente novamente.',
    replayReady: 'Repetição pronta. A ligação segue no e-mail de acompanhamento.',
    watch: 'Ver a repetição',
    remove: 'Remover a repetição',
    removing: 'A remover…',
    cloudProcessing: 'A sua gravação na nuvem está a ser processada. A repetição aparece aqui quando estiver pronta.',
    replayTitle: 'Repetição',
    replayLoading: 'A carregar a repetição…',
    replayMissing: 'Esta repetição não está disponível. O organizador pode tê-la removido.',
    replayBy: 'Organizado por {host}',
  },
  tr: {
    record: 'Bu webinarı kaydet',
    stop: 'Kaydı durdur',
    recordHint:
      'Sahneyi ve herkesin sesini bu tarayıcıda kaydeder ve videoyu cihazınıza kaydeder. Ücretsizdir ve hiçbir şey yüklenmez. Kayıt sürerken odadaki herkes bir "Kaydediliyor" rozeti görür.',
    starting: 'Başlatılıyor…',
    unsupported: 'Bu tarayıcı webinarı kaydedemiyor. Bir bilgisayarda Chrome, Edge veya Safari deneyin.',
    startFailed: 'Kayıt başlatılamadı.',
    saveFailed: 'Kayıt kaydedilemedi.',
    saved: 'Kayıt cihazınıza kaydedildi ({size}).',
    savedAfterLeaving: 'Sahneden ayrıldınız; kayıt durdu ve cihazınıza kaydedildi.',
    cloudRecord: 'Bulutta kaydet',
    cloudStop: 'Bulut kaydını durdur',
    cloudHint:
      'Sunucularımızda kaydeder, bu yüzden tarayıcınız kapansa da devam eder. Tekrar izleme bağlantısı hazır olduğunda takip e-postasına eklenir.',
    cloudPaidOnly: 'Bulut kaydı ücretli webinarlar içindir.',
    cloudFailed: 'Bulut kaydı başlatılamadı.',
    cloudOn: 'Bulutta kaydediliyor',
    badge: 'Kaydediliyor',
    inRoomNotice: 'Bu oturum kaydediliyor.',
    joinNotice: 'Oturumlar kaydedilebilir. Kaydediliyorsa, kayıt sürerken bir "Kaydediliyor" rozeti görürsünüz.',
    yourRecording: 'Kaydınız ({duration}, {size}) bu cihazda kayıtlı.',
    uploadReplay: 'Tekrar izleme olarak yükle',
    uploading: 'Yükleniyor…',
    uploadFile: 'Bir kayıt dosyası yükle…',
    uploadHint:
      'Tekrar izleme bağlantısı takip e-postasına otomatik olarak eklenir. Tekrar izlemeler Universal Recorder’ınızda saklanır ve şirketinizin çevrimiçi dosya alanını kullanır; dosya başına en fazla 2 GB.',
    tooBig:
      'Bu kayıt {size}; tekrar izlemeler en fazla {max} olabilir. Başka bir yolla, örneğin YouTube’da paylaşın ve bağlantıyı aşağıya yapıştırın.',
    wrongType: 'Bir MP4 veya WebM videosu seçin.',
    signIn: 'Tekrar izleme yüklemek için Universal ID’nizle oturum açın.',
    noOrg: 'Tekrar izleme yüklemek için bir şirket oluşturun (ücretsizdir).',
    noCredits:
      'Ücretsiz çevrimiçi alanınız dolu. Universal Recorder’da bir dosyayı silin veya bir jeton satın alın, sonra yeniden deneyin.',
    uploadFailed: 'Yükleme tamamlanmadı ve hiçbir ücret alınmadı. Yeniden deneyin.',
    replayReady: 'Tekrar izleme hazır. Bağlantısı takip e-postasıyla gider.',
    watch: 'Tekrar izle',
    remove: 'Tekrar izlemeyi kaldır',
    removing: 'Kaldırılıyor…',
    cloudProcessing: 'Bulut kaydınız işleniyor. Hazır olduğunda tekrar izleme burada görünür.',
    replayTitle: 'Tekrar izleme',
    replayLoading: 'Tekrar izleme yükleniyor…',
    replayMissing: 'Bu tekrar izleme kullanılamıyor. Düzenleyen kişi kaldırmış olabilir.',
    replayBy: 'Düzenleyen: {host}',
  },
}

export const RECORDING_LANGUAGES = Object.keys(COPY)

export function recordingCopy(language: string | null | undefined): RecordingCopy {
  return pickTranslation(COPY, language) ?? EN
}

/** The copy for the suite language the person has chosen. */
export function useRecordingCopy(): RecordingCopy {
  const { language } = useLanguage()
  return recordingCopy(language)
}

/** `fill('{a} of {b}', {a: 1, b: 2})` → '1 of 2'. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}
