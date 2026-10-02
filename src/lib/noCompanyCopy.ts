import type { Language } from '@unisim/sdk'

// A Universal ID with no company may host ONE webinar in total (universal-
// platform 0221). Since 2026-10-02 the hub no longer makes every new ID create
// a company at sign-in, so this is a normal state, not a broken one. The rest
// of the hosting form is English-only; these lines follow the suite language
// because they are the ones that send the host somewhere else to act.

// The hub's create-a-company form, as in Universal Signatures and Universal QR.
export const SET_UP_COMPANY_URL = 'https://app.unisim.co.uk/branding'

interface NoCompanyCopy {
  /** Before the one webinar is used: the limit, stated up front. */
  oneAllowed: string
  /** Once it is used. */
  used: string
  button: string
}

const EN: NoCompanyCopy = {
  oneAllowed:
    'Your Universal ID doesn’t have a company yet, so it can host one webinar. Setting up a company is free and lets you host more.',
  used:
    'You’ve hosted the one webinar a Universal ID without a company can host. Set up a company to host more. It’s free.',
  button: 'Set up a company →',
}

const COPY: Partial<Record<Language, NoCompanyCopy>> = {
  'en-gb': EN,
  en: EN,
  fr: {
    oneAllowed:
      'Votre Universal ID n’a pas encore d’entreprise : il peut donc animer un seul webinaire. Créer une entreprise est gratuit et vous permet d’en animer d’autres.',
    used:
      'Vous avez déjà animé le seul webinaire possible pour un Universal ID sans entreprise. Créez une entreprise pour en animer d’autres. C’est gratuit.',
    button: 'Créer une entreprise →',
  },
  es: {
    oneAllowed:
      'Tu Universal ID aún no tiene una empresa, así que puede organizar un solo webinar. Crear una empresa es gratis y te permite organizar más.',
    used:
      'Ya has organizado el único webinar posible para un Universal ID sin empresa. Crea una empresa para organizar más. Es gratis.',
    button: 'Crear una empresa →',
  },
  it: {
    oneAllowed:
      'Il tuo Universal ID non ha ancora un’azienda, quindi può ospitare un solo webinar. Creare un’azienda è gratis e ti permette di ospitarne altri.',
    used:
      'Hai già ospitato l’unico webinar possibile per un Universal ID senza azienda. Crea un’azienda per ospitarne altri. È gratis.',
    button: 'Crea un’azienda →',
  },
  de: {
    oneAllowed:
      'Deine Universal ID hat noch kein Unternehmen, daher kann sie ein einziges Webinar veranstalten. Ein Unternehmen einzurichten ist kostenlos und ermöglicht dir weitere.',
    used:
      'Du hast das eine Webinar, das eine Universal ID ohne Unternehmen veranstalten kann, bereits veranstaltet. Richte ein Unternehmen ein, um weitere zu veranstalten. Das ist kostenlos.',
    button: 'Unternehmen einrichten →',
  },
  'pt-BR': {
    oneAllowed:
      'Seu Universal ID ainda não tem uma empresa, então pode realizar um único webinar. Criar uma empresa é grátis e permite realizar mais.',
    used:
      'Você já realizou o único webinar possível para um Universal ID sem empresa. Crie uma empresa para realizar mais. É grátis.',
    button: 'Criar uma empresa →',
  },
  'pt-PT': {
    oneAllowed:
      'O seu Universal ID ainda não tem uma empresa, por isso pode realizar um único webinar. Criar uma empresa é gratuito e permite realizar mais.',
    used:
      'Já realizou o único webinar possível para um Universal ID sem empresa. Crie uma empresa para realizar mais. É gratuito.',
    button: 'Criar uma empresa →',
  },
  tr: {
    oneAllowed:
      'Universal ID’nizin henüz bir şirketi yok, bu yüzden yalnızca bir webinar düzenleyebilir. Şirket oluşturmak ücretsizdir ve daha fazlasını düzenlemenizi sağlar.',
    used:
      'Şirketi olmayan bir Universal ID’nin düzenleyebileceği tek webinarı zaten düzenlediniz. Daha fazlasını düzenlemek için bir şirket oluşturun. Ücretsizdir.',
    button: 'Şirket oluştur →',
  },
}

export function noCompanyCopy(language: Language): NoCompanyCopy {
  return COPY[language] ?? EN
}
