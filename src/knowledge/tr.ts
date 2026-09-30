import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: 'Webinar nedir?',
    summary: 'Bir webinarın görüntülü görüşmeden farkı ve kimin ne yaptığı.',
    group: 'Temel bilgiler',
    body: `Webinar, canlı bir çevrim içi etkinliktir: bir sunucu ya da az sayıda konuşmacı, bulunduğu yerden izleyen ve katılan bir kitleye sunum yapar. Kelime, "web" ve "seminar" (seminer) kelimelerinin birleşiminden oluşur.

## Görüntülü görüşmeden farkı

Görüntülü görüşmede genellikle herkesin kamerası açıktır ve herkes konuşabilir. Webinar ise daha çok bir salonda verilen konuşmaya benzer:

- **Sahneyi sunucu yönetir.** Sunum yapar, materyal paylaşır ve başka kimin dinleneceğine karar verir.
- **Kitle izler.** Katılımcılar sahneyi görür ve duyar, ancak kendileri kamerada görünmez.
- **Kitle yine de katılır.** Katılımcılar sohbete yazabilir, tepki gönderebilir ve söz isteyebilir. Sunucu kabul ederse kısa bir süre yayına çıkar, ardından izlemeye geri dönerler.

Bu yapı, webinarları daha büyük gruplar için uygun hale getirir, çünkü elli ya da beş yüz kişilik bir oda birbirinin sözünü kesen bir kalabalığa dönüşmez.

## Canlı bölümden önce ve sonra

Bir webinar, sürdüğü bir saatten ibaret değildir. Genellikle insanlar önceden kaydolur, bir onay ve hatırlatmalar alır, günü geldiğinde katılır ve sonrasında sunucudan, çoğu zaman bir kayıt bağlantısıyla birlikte, yeniden haber alır. Universal Webinar bu adımların her birini üstlenir; böylece sunucu her şeyi tek bir yerden yönetebilir.

## Kayıt değil, canlı

Odada olan her şey gerçek zamanlı gerçekleşir. Sunucunun konuşması ile kitlenin bunu duyması arasında bir an kadar gecikme olur; bu yüzden sohbetteki sorular bazen sunucu başka konuya geçtikten hemen sonra gelir. Kitleye bir şey sorduktan sonra kısa bir ara vermeniz faydalı olur.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'Canlı video herkese nasıl ulaşır',
    summary: 'Sunucunun kamerasından odadaki her ekrana uzanan yolculuk.',
    group: 'Temel bilgiler',
    body: `Sunucu canlı yayına geçtiğinde kamerası ve mikrofonu tarayıcısı tarafından yakalanır, sıkıştırılır ve internet üzerinden bir video hizmetine gönderilir. Bu hizmet yayını her katılımcının tarayıcısına iletir; tarayıcı da yayını açıp oynatır. Tüm yolculuk genellikle bir saniyeden çok daha kısa sürer.

## Arada neden bir video hizmeti var

Sunucunun bilgisayarı videosunu her katılımcıya doğrudan gönderebilirdi, ancak bu, aynı yayını kişi başına bir kez göndermek anlamına gelir ve bir ev bağlantısının yükleme kapasitesi hızla tükenir. Bunun yerine sunucu hizmete tek bir yayın gönderir ve yayını herkese kopyalama işini hizmet üstlenir. Bir webinarın, sunucunun özel bir bağlantıya ihtiyaç duymadan büyük bir kitleye ulaşabilmesini sağlayan budur.

## Arka plandaki teknoloji

Universal Webinar, modern tarayıcılara yerleşik canlı ses ve video standardı olan WebRTC'yi, yayınları aktaran LiveKit adlı bir video hizmetiyle birlikte kullanır. Hiçbir şey yüklemeniz gerekmez: her şeyi tarayıcı yapar.

## Görüntü bozulduğunda

Canlı video, mevcut bağlantıya göre kendini ayarlar. Bağlantınız yavaşlarsa görüntü bulanıklaşabilir ya da ses devam ederken kısa süre durabilir, çünkü yayın net kalmak yerine canlı kalmayı öncelikli tutar. Bazı pratik öneriler:

- Sunucular ve yayına alınan herkes için en büyük farkı kablolu bağlantı ya da Wi-Fi yönlendiricisine yakın bir yer yaratır.
- Büyük indirmeler veya başka görüntülü görüşmeler gibi interneti yoğun kullanan diğer uygulamaları kapatmak kapasite açar.
- Video tamamen donarsa sayfayı yeniden yüklemek genellikle sizi odaya yeniden bağlar.

## Kameranız ve mikrofonunuz

Katılımcılar yalnızca video alır. Sunucu sizi yayına almadıkça ve ardından siz onları kendiniz açmadıkça kameranız ve mikrofonunuz asla kullanılmaz. İlk seferde tarayıcınız sizden izin isteyecektir.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Kaydolma ve katılma',
    summary: 'Onay, hatırlatmalar ve katılım bağlantısı; ayrıca içeri girmeden önce sunucunun neleri şart koşabileceği.',
    group: 'Nasıl çalışır',
    body: `## Kaydolma

Kaydolmak için adınızı ve e-posta adresinizi, ayrıca sunucunun eklediği soruların yanıtlarını verirsiniz. Bir hesaba ihtiyacınız yoktur.

Kaydolduktan sonra oturum ayrıntılarını içeren bir onay e-postası, takviminize ekleyebileceğiniz bir takvim daveti ve size özel katılım bağlantınızı alırsınız. Bu bağlantı, bilgilerinizi yeniden yazmanıza gerek kalmadan sizi herhangi bir cihazdan doğrudan içeri alır; bu nedenle saklamanızda fayda vardır.

## Hatırlatmalar ve takip

Sunucu bunları kapatmadıysa ayrıca şunları alırsınız:

- oturum başlamadan önceki 24 saat içinde bir hatırlatma;
- başlamasından yaklaşık bir saat önce ikinci bir hatırlatma;
- oturum bittiğinde, katıldığınız için teşekkür eden ya da katılmadıysanız bunu belirten bir takip e-postası. Sunucu bir kayıt bağlantısı eklerse bu da e-postaya dahil edilir. Takip e-postası, sunucu bir kayıt eklediğinde ya da eklemezse webinar bittikten bir gün sonra gönderilir.

Her e-posta aynı kişisel katılım bağlantısını içerir. Sunucular onayı, hatırlatmaları ve takip e-postasını ayrı ayrı açıp kapatabilir.

## Sunucunun şart koşabilecekleri

Sunucular girişi farklı şekillerde ayarlayabilir:

- **Onay** — kaydınız sunucu onaylayana kadar bekler. Katılım bağlantınızı içeren onay e-postası ancak onaylandıktan sonra gönderilir.
- **Kontenjan sınırı** — webinar dolduğunda yeni kayıtlar bekleme listesine alınır ve bir yer boşaldığında kişiler otomatik olarak sıra atlar.
- **Açık katılım bağlantısı** — sunucu, insanların önceden kaydolmadan etkinlik günü katılmasına izin verebilir ve bu kapıyı istediği zaman kapatabilir. Daha önce kaydolmuş ve onaylanmış kişiler yine de girebilir.
- **PIN** — sunucu odaya bir PIN koyabilir. Kaydolanlar dahil herkesin girmek için bu PIN'e ihtiyacı vardır.

Bu kurallar yalnızca gördüğünüz sayfa tarafından değil, hizmet tarafından denetlenir.

## Etkinlik günü katılma

Katılım bağlantınızı ya da sunucunun paylaştığı bağlantıyı açın ve istenirse adınızı ve e-posta adresinizi girin. Tarayıcınız bir dahaki sefer için bunları hatırlar. Odada izleyebilir, sohbete yazabilir, tepki gönderebilir ve söz istemek için elinizi kaldırabilirsiniz.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Webinar sunma',
    summary: 'Yönetim bağlantınız, canlı yayına geçme, soruları alma ve kapanış.',
    group: 'Nasıl çalışır',
    body: `## Hazırlık

Yeni bir webinarın ayrıntılarını oturum açmadan doldurabilirsiniz. Canlı yayına geçmek veya webinarı planlamak için ücretsiz bir Universal ID gerekir: hesabınız yoksa uygulama size e-postayla altı haneli bir kod gönderir ve bu kodu girdiğinizde hesabınız oluşturulur. Universal ID ile webinar düzenlemek ücretsizdir. Ücretsiz hesapların cömert bir sınırı vardır; bu sınıra ulaşırsanız, sakladığınız bir webinarı kapatmak bir sonraki webinara yer açar.

Bir webinar oluşturduğunuzda bir **yönetim bağlantısı** alırsınız. Bu bağlantı webinarınızın anahtarıdır: ona sahip olan herkes ayarları değiştirebilir, kayıtları görebilir ve odayı yönetebilir. Bu tarayıcı bağlantıyı sizin için hatırlar, ancak webinarı başka bir cihazdan yönetebilmek için bir kopyasını güvenli bir yerde saklayın ve kimseyle paylaşmayın.

## Odada

- **Sahneniz** — kameranız ve mikrofonunuz odadaki herkese iletilir.
- **Belge paylaşma** — katılımcıların okuması için sahneye bir PDF ya da görsel koyabilirsiniz. Herkes belgeyi kendisi kaydırır; sayfalar sizinkiyle eşzamanlı tutulmaz.
- **Sorular** — katılımcılar el kaldırır. Birini yayına alabilir, yeniden yayından çıkarabilir, bir isteği reddedebilir ya da bir kişinin izlemeye ve sohbete yazmaya devam etmesine izin verirken yeniden söz istemesini engelleyebilirsiniz.
- **Kayıtlar** — kimlerin kaydolduğunu görebilir, onay şartı koyduysanız kişileri onaylayabilir veya reddedebilir ve bekleme listesini yönetebilirsiniz.

## Kapanış

Oturum sona erdiğinde kapanış sayfası geriye kalan işleri bir araya getirir.

1. **Kayıt** — Universal Webinar oturumu kendisi kaydetmez. Oturumu başka bir yolla kaydettiyseniz bağlantıyı buraya yapıştırın; bağlantı, kaydolan herkese giden takip e-postasına eklenir.
2. **Listeniz** — adları, e-posta adreslerini, yanıtları, kimlerin katıldığını ve kaydolmadan katılanları içeren bir elektronik tablo dosyası indirin.
3. **Saklama veya kapatma** — webinarı ve içindeki herkesi istediğiniz kadar saklamak için **Buluta kaydet** seçeneğini seçin. Ya da bir sonraki webinarınıza yer açmak için **Webinarı kapat** seçeneğini seçin. Ücretsiz planda kapatılan bir webinar ve kayıtları 30 gün sonra silinir; bu nedenle önce listenizi indirin.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Katılımcı olarak gizliliğiniz',
    summary: 'Neleri paylaştığınız, bunları kimlerin görebildiği ve ne kadar süre saklandığı.',
    group: 'Gizlilik ve güvenlik',
    body: `## Verdiğiniz bilgiler

Kaydolduğunuzda veya katıldığınızda adınızı, e-posta adresinizi ve sunucunun eklediği soruların yanıtlarını verirsiniz. Uygulama ayrıca odaya katılıp katılmadığınızı, sohbete yazdıklarınızı, gönderdiğiniz tepkileri ve söz isteklerinizi de kaydeder.

## Kim neyi görebilir

- **Diğer katılımcılar** sohbet mesajlarınızın yanında adınızı görür. E-posta adresinizi görmezler.
- **Sunucu** adınızı, e-posta adresinizi, yanıtlarınızı, katılıp katılmadığınızı ve sohbet mesajlarınızı görür. Düzenlediği her etkinlikte olduğu gibi bu listeyi indirebilir.
- **Odadaki herkes**, sunucu sizi yayına alır ve siz de kameranızı veya mikrofonunuzu açarsanız sizi görebilir ve duyabilir. Aksi halde kameranız ve mikrofonunuz kullanılmaz.

## Aldığınız e-postalar

E-posta adresiniz, sunucu bunları kapatmadıkça kaydolduğunuz webinarın onayını, hatırlatmalarını ve takip e-postasını göndermek için kullanılır. Bu amaçla e-posta gönderim hizmetine iletilir.

## Canlı video ve ses

Video ve ses, tüm WebRTC bağlantılarında olduğu gibi şifreli bağlantılar üzerinden iletilir. Odadaki herkese ulaşırken video hizmetinin sunucularından geçer; bu nedenle uçtan uca şifreli değildir. Universal Webinar oturumu kaydetmez; bir sunucu oturumu başka araçlarla kaydedebilir ve bunu yapıyorsa size bildirmelidir.

## Ne kadar süre saklanır

Kaydınız webinarla birlikte saklanır. Ücretsiz plandaki bir sunucu bir webinarı kapattığında, webinar ve herkesin kayıtları 30 gün sonra silinir. Bir webinarı saklamayı seçen ya da ücretli bir planda olan sunucu bunları daha uzun süre tutabilir. Sunucunun indirdiği listelerin sorumluluğu ona aittir.

## Tarayıcınızın hatırladıkları

Tarayıcınız, katılırken kullandığınız adı ve e-posta adresini hatırlar; böylece bir dahaki sefere bunları yeniden yazmanız gerekmez.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Sunucular için güvenlik',
    summary: 'Yönetim bağlantınızı güvende tutmak ve nelerin herkese açık olduğu.',
    group: 'Gizlilik ve güvenlik',
    body: `## Yönetim bağlantınız anahtardır

Yönetim bağlantınıza sahip olan herkes webinarınızı yönetebilir: ayarlarını değiştirebilir, tüm kayıtlı kişilerin bilgilerini görebilir, kişileri yayına alabilir ve webinarı kapatabilir. Bu bağlantıyı bir parola gibi koruyun. Oda sohbetine yapıştırmayın veya katılımcılara göndermeyin; bunun yerine onlara katılım ya da kayıt bağlantısını verin.

## Neler herkese açık, neler değil

- **Herkese açık** — webinarın başlık, açıklama, program, şirket adı ve logo gibi ayrıntıları, insanların katılıp katılmayacaklarına karar verebilmeleri için herkese açıktır. Sunum yaptığınız e-posta adresi ve eklediğiniz kayıt bağlantıları bu ayrıntılarla birlikte saklanır; bu nedenle katılımcıların görmesinde sakınca görmediğiniz bir adres kullanın.
- **Bağlantıya sahip herkese açık** — sahnede paylaştığınız belgeler ve logonuz uzun, rastgele web adreslerinde saklanır. Bu adreslerden birine sahip olan herkes dosyayı açabilir; odadaki herkesin dosyayı görebilmesini sağlayan da budur. Paylaşılan bir belgeyi kaldırmak onu siler.
- **Gizli** — kayıtlı kişilerin e-posta adresleri ve yanıtları ile oda PIN'i hiçbir zaman herkese açık sayfalarda gösterilmez. Bunlar yalnızca yönetim bağlantınızı sunan kişiye döndürülür.

## Oda PIN'i hakkında

PIN, rastgele içeri girenleri engeller. Yalnızca sayfa tarafından değil, hizmet tarafından da denetlenir ve hizmet kaç yanlış deneme yapılabileceğini sınırlar. Yine de PIN kısa bir sayıdır; bu nedenle gerçekten hassas bir şeyi korumaktan çok bir etkinliği düzenli tutmaya uygundur. Önemliyse daha uzun bir PIN kullanın ve her oturum için değiştirin.

## Kayıtlı kişilerinizin verileri

İndirdiğiniz listeyi nasıl kullandığınızdan siz sorumlusunuz. İnsanlara yalnızca kaydoldukları konuyla ilgili e-posta gönderin ve artık ihtiyacınız olmayan kopyaları silin. Ücretsiz planda bir webinarı kapatmak, webinarı ve kayıtlarını 30 gün sonra siler; buluta kaydetmek ise siz kapatana kadar bunları saklar.

## Hesabınız

Sunum yapmak, UNI·SIM uygulamalarında kullanılan aynı hesap olan Universal ID'nizi kullanır. Canlı yayına geçebilmeniz için e-posta adresiniz tek kullanımlık bir kodla doğrulanır.`,
  },
]

export default articles
