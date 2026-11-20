import { pickTranslation, useLanguage } from '@unisim/sdk'
import type { JoinState } from './joinStatus'

// The join page's "when" and "is it on?" lines, in every language the suite
// speaks. Like recordingCopy.ts, these follow the suite language although the
// rest of the join form is still English: whether the room is open is the
// first thing a guest needs to read.

export interface JoinCopy {
  state: Record<JoinState, string>
  /** The card's line once the room has ended. */
  endedBody: string
}

const EN: JoinCopy = {
  state: {
    live: 'Live now',
    soon: 'Starting soon',
    upcoming: 'Upcoming',
    waiting: 'Waiting to start',
    ended: 'Ended',
  },
  endedBody: 'This webinar has ended, so there’s nothing to join.',
}

const COPY: Record<string, JoinCopy> = {
  'en-gb': EN,
  en: EN,
  fr: {
    state: {
      live: 'En direct',
      soon: 'Commence bientôt',
      upcoming: 'À venir',
      waiting: 'En attente du début',
      ended: 'Terminé',
    },
    endedBody: 'Ce webinaire est terminé : il n’y a plus rien à rejoindre.',
  },
  es: {
    state: {
      live: 'En directo',
      soon: 'Empieza pronto',
      upcoming: 'Próximamente',
      waiting: 'Esperando a que empiece',
      ended: 'Finalizado',
    },
    endedBody: 'Este webinar ha terminado, así que ya no se puede entrar.',
  },
  it: {
    state: {
      live: 'In diretta',
      soon: 'Inizia a breve',
      upcoming: 'In programma',
      waiting: 'In attesa di iniziare',
      ended: 'Terminato',
    },
    endedBody: 'Questo webinar è terminato, quindi non c’è più nulla a cui partecipare.',
  },
  de: {
    state: {
      live: 'Jetzt live',
      soon: 'Beginnt gleich',
      upcoming: 'Demnächst',
      waiting: 'Wartet auf den Start',
      ended: 'Beendet',
    },
    endedBody: 'Dieses Webinar ist beendet, du kannst ihm also nicht mehr beitreten.',
  },
  'pt-BR': {
    state: {
      live: 'Ao vivo agora',
      soon: 'Começa em breve',
      upcoming: 'Agendado',
      waiting: 'Aguardando o início',
      ended: 'Encerrado',
    },
    endedBody: 'Este webinar foi encerrado, então não é mais possível entrar.',
  },
  'pt-PT': {
    state: {
      live: 'Em direto',
      soon: 'Começa em breve',
      upcoming: 'Agendado',
      waiting: 'A aguardar o início',
      ended: 'Terminado',
    },
    endedBody: 'Este webinar terminou, por isso já não é possível entrar.',
  },
  tr: {
    state: {
      live: 'Şu an canlı',
      soon: 'Birazdan başlıyor',
      upcoming: 'Yaklaşan',
      waiting: 'Başlaması bekleniyor',
      ended: 'Sona erdi',
    },
    endedBody: 'Bu webinar sona erdi, artık katılamazsınız.',
  },
}

export function joinCopy(language: string | null | undefined): JoinCopy {
  return pickTranslation(COPY, language) ?? EN
}

/** The copy, plus the language as an Intl locale for the date line. */
export function useJoinCopy(): { copy: JoinCopy; locale: string | undefined } {
  const { language } = useLanguage()
  return { copy: joinCopy(language), locale: language || undefined }
}
