'use strict';
/* Built-in manual. Sections: [id, icon, title, text]. Other languages fall back to English
   (and, with an AI key, the AI helper answers in the interface language). */
window.HELP = {
  ru: [
    ['start', 'settings', 'С чего начать', `1. Установите приложение: в Chrome нажмите ⋮ → «Добавить на главный экран».
2. Настройки → Облако: войдите по email и паролю — задачи будут одинаковыми на телефоне и компьютере.
3. Настройки → Telegram → «Подключить»: бот будет присылать напоминания, даже когда приложение закрыто.
4. Настройки → AI: вставьте бесплатный ключ Gemini (aistudio.google.com → Get API key).
5. Разрешите уведомления и микрофон. Для микрофона выберите «Разрешать всегда» — тогда автозапись не будет спрашивать.`],
    ['voice', 'mic', 'Голосовые команды', `Нажмите микрофон и скажите обычными словами:
• «Завтра в 10 встреча с Василием на час»
• «Напомни через два часа позвонить бухгалтеру»
• «Что у меня сегодня после обеда?»
• «Найди свободное окно на полтора часа до пятницы»
MARKUS-A сам поймёт дату и время, спросит, чего не хватает, и предупредит, если время уже занято.`],
    ['tasks', 'check', 'Задачи, подзадачи и результат', `• Статус меняется цветными кнопками в карточке задачи: «К выполнению», «В работе», «Готово», «Отменена».
• Подзадачи: у каждой свой срок. «Выполнять после» — шаг ждёт другой (например, письмо в МВД после ответа Агентства); когда отметите первый шаг, срок второго встанет сам.
• На карточке видно % выполнения; задача «тянется» до срока последней подзадачи и не считается просроченной, пока остальные шаги в будущем.
• Отмена — с причиной, % сохраняется.
• «Результат выполнения» — прикрепите итоговый документ или скриншот переписки, что клиент принял работу.`],
    ['meetings', 'users', 'Встречи и автозапись', `• Автозапись включается сама за 2 минуты до начала и пишет до конца встречи + 30 минут (время меняется в Настройках → Запись встреч). Если забыли выключить — остановится сама.
• ВАЖНО: сайт может включить микрофон, только когда MARKUS-A открыт на экране. Если телефон заблокирован — придёт уведомление и сообщение в Telegram с кнопкой «Начать запись»: одно нажатие.
• Незаметная запись: вместо большого окна — маленькая серая точка в правом верхнем углу. Нажмите на неё: остановить, пауза, +30 минут. Значок микрофона в строке состояния Android скрыть нельзя.
• После записи всё сохраняется само, а AI делает итоги.
• Записи: Ещё → Записи — прослушать, отправить в Telegram/WhatsApp, сохранить в телефон.`],
    ['sos', 'rec', 'Экстренная запись', `Нужно срочно записать разговор (госорган, банк, неожиданная беседа)?
• Главный экран → кнопка «Запись» внизу, или долгое нажатие на значок приложения → «Экстренная запись».
• Остановите запись, когда закончите (или она остановится сама через 3 часа).
• AI сделает стенограмму и итоги: что сказали сделать, какие документы нужны, сроки, ФИО и кабинеты — и сам поставит задачи на нужные даты.`],
    ['ai', 'ai', 'AI-итоги и планы по датам', `После записи AI делает: кратко, решения, обязательства, сроки, риски и следующие шаги.
• Задачи и встречи ставятся сами на правильные даты: «через 3 дня» от встречи 25.09 = 28.09.
• Обещания собеседника — задачи «Проконтролировать: …».
• Новая встреча без времени: в 09:00 того дня приложение спросит время и включит автозапись.
• Настройки → AI → «С подтверждением» — если хотите сначала проверять задачи.
• «Прослушать итоги» — AI-итоги голосом.`],
    ['places', 'pin', 'Места, фото ориентиров, отправка партнёру', `• В задаче или встрече: «Добавить место». Мест может быть несколько.
• Вставьте ссылку из Яндекс Карт, 2ГИС или Google Maps, или нажмите «Выбрать на карте», или «Я сейчас здесь».
• Добавьте фото подходов и входа — сколько угодно.
• «Отправить партнёру» — текст со ссылками сразу на Яндекс, 2ГИС и Google + фото (в Telegram, WhatsApp).
• «Точкой в Telegram» — бот пришлёт вам точку на карте; перешлите её клиенту (удерживайте сообщение → «Переслать»).`],
    ['files', 'folder', 'Документы и где они хранятся', `• Файлы, фото и записи хранятся внутри приложения на телефоне. Если вы вошли в облако — копия уходит в облако и открывается на любом устройстве.
• Настройки → «Хранить файлы только в облаке» — телефон не забивается: файл скачивается, когда вы его открываете.
• Бесплатное облако: 1 ГБ, один файл до 50 МБ. Большие видео добавляйте ссылкой (Telegram «Избранное», Google Диск).
• Во встречу можно прикладывать всё, что хотите показать: документы любых форматов, фото, рисунки, аудио, видео, ссылки.`],
    ['drive', 'play', 'Режим «За рулём»', `Ещё → «За рулём»: крупные кнопки, экран не гаснет.
• «План на сегодня / на завтра» — MARKUS-A прочитает дела голосом.
• «Итоги встречи» — прочитает итоги последней встречи.
• «Спросить голосом» — например: «Что у меня в пятницу?» или «Что мы решили с Василием?» — ответ голосом.`],
    ['remind', 'bell', 'Напоминания', `• Важные дела без времени (дни рождения, сроки): накануне в 19:00 и утром в 09:30.
• «Напоминать до отметки «Готово»» — каждый час до 22:00, затем каждое утро, пока не отметите.
• Время напоминаний — в Настройках.
• Telegram-бот присылает напоминания, даже когда приложение закрыто.`],
    ['share', 'share', 'Поделиться, контакты, визитка', `• Ссылка на задачу или встречу: кнопка «Поделиться», можно поставить код и срок действия.
• Контакты: нажмите на номер, WhatsApp или Telegram — сразу звонок или чат.
• Моя визитка: QR-код — партнёр сохраняет ваш контакт в телефон.
• PDF: Ещё → PDF — задачи за день или период, для печати и отправки.`],
    ['look', 'globe', 'Язык и оформление', `Настройки → язык (русский, английский, узбекский, турецкий, немецкий и другие) и тема: Светлая, Тёплая, Тёмная или Бронза.`],
    ['trouble', 'x', 'Если что-то не работает', `• Автозапись не включилась: приложение было закрыто или заблокирован экран; или микрофон не разрешён — Chrome → значок слева от адреса → Разрешения → Микрофон → «Разрешить».
• Не видно изменений после обновления: закройте приложение полностью и откройте снова.
• AI не отвечает: бесплатный лимит — подождите минуту; проверьте ключ (Настройки → AI → «Проверить AI»).
• Telegram молчит: Настройки → Telegram → «Тест».`]
  ],
  en: [
    ['start', 'settings', 'Getting started', `1. Install the app: in Chrome tap ⋮ → "Add to Home screen".
2. Settings → Cloud: sign in with email and password — your tasks will be the same on phone and computer.
3. Settings → Telegram → "Connect": the bot sends reminders even when the app is closed.
4. Settings → AI: paste a free Gemini key (aistudio.google.com → Get API key).
5. Allow notifications and the microphone. For the microphone choose "Always allow" so auto-recording never asks.`],
    ['voice', 'mic', 'Voice commands', `Tap the microphone and speak naturally:
• "Meeting with Vasily tomorrow at 10 for an hour"
• "Remind me in two hours to call the accountant"
• "What do I have this afternoon?"
• "Find a free 1.5-hour slot before Friday"
MARKUS-A understands the date and time, asks for anything missing and warns you if the time is taken.`],
    ['tasks', 'check', 'Tasks, subtasks and results', `• Change the status with the coloured buttons in the task card: To do, In progress, Done, Cancelled.
• Subtasks each have their own deadline. "Do after" makes a step wait for another; when you tick the first step, the second gets its date automatically.
• Cards show the % done; a task stretches to the deadline of its last subtask and is not overdue while the remaining steps are in the future.
• Cancelling keeps the reason and the % done.
• "Result" — attach the final document or a screenshot showing the client accepted the work.`],
    ['meetings', 'users', 'Meetings and auto-recording', `• Auto-recording starts by itself 2 minutes before the start and runs until the end + 30 minutes (change in Settings → Meeting recording). If you forget to stop it, it stops itself.
• IMPORTANT: a website can switch on the microphone only while MARKUS-A is open on the screen. If the phone is locked you get a notification and a Telegram message with a "Start recording" button — one tap.
• Discreet recording: instead of a big window there is only a small grey dot in the top-right corner. Tap it: stop, pause, +30 minutes. Android's own microphone icon cannot be hidden.
• After recording everything is saved automatically and AI prepares the summary.
• Recordings: More → Recordings — listen, send to Telegram/WhatsApp, save to the phone.`],
    ['sos', 'rec', 'Emergency recording', `Need to record a conversation right now (a government office, a bank, an unexpected talk)?
• Home screen → "Record" button at the bottom, or long-press the app icon → "Emergency recording".
• Stop it when you are done (or it stops itself after 3 hours).
• AI makes a transcript and a summary: what you were told to do, which documents are needed, deadlines, names and offices — and adds tasks on the right dates.`],
    ['ai', 'ai', 'AI summaries and dated plans', `After a recording AI gives: summary, decisions, commitments, deadlines, risks and next steps.
• Tasks and meetings are added on the right dates: "in 3 days" from a meeting on 25 Sep = 28 Sep.
• What the other side promised becomes "Follow up: …" tasks.
• A new meeting without a time: at 09:00 that day the app asks for the time and turns on auto-recording.
• Settings → AI → "With confirmation" if you want to check tasks first.
• "Listen to summary" reads the AI summary aloud.`],
    ['places', 'pin', 'Places, landmark photos, sending to a partner', `• In a task or meeting: "Add place". You can add several.
• Paste a link from Yandex Maps, 2GIS or Google Maps, or tap "Pick on map", or "I am here now".
• Add photos of the approach and the entrance — as many as you like.
• "Send to partner" — text with links to Yandex, 2GIS and Google at once + photos (Telegram, WhatsApp).
• "As a pin in Telegram" — the bot sends you a map pin; forward it to the client (press and hold the message → Forward).`],
    ['files', 'folder', 'Documents and where they are kept', `• Files, photos and recordings are kept inside the app on the phone. When you are signed in to the cloud, a copy goes to the cloud and opens on any device.
• Settings → "Keep files only in the cloud" — the phone does not fill up: a file downloads when you open it.
• Free cloud: 1 GB, up to 50 MB per file. Add big videos as a link (Telegram "Saved Messages", Google Drive).
• Attach anything you want to show at a meeting: documents of any format, photos, drawings, audio, video, links.`],
    ['drive', 'play', 'Driving mode', `More → "Driving": big buttons, the screen stays on.
• "Plan for today / tomorrow" — MARKUS-A reads your day aloud.
• "Meeting summary" — reads the summary of the last meeting.
• "Ask by voice" — e.g. "What do I have on Friday?" or "What did we agree with Vasily?" — the answer is spoken.`],
    ['remind', 'bell', 'Reminders', `• Important all-day items (birthdays, deadlines): the evening before at 19:00 and in the morning at 09:30.
• "Remind until Done" — every hour until 22:00, then every morning until you tick it.
• Reminder times are in Settings.
• The Telegram bot sends reminders even when the app is closed.`],
    ['share', 'share', 'Sharing, contacts, business card', `• Link to a task or meeting: "Share" button; you can set a code and an expiry.
• Contacts: tap the number, WhatsApp or Telegram — a call or chat opens at once.
• My card: a QR code — your partner saves your contact to their phone.
• PDF: More → PDF — tasks for a day or a period, for printing and sending.`],
    ['look', 'globe', 'Language and look', `Settings → language (Russian, English, Uzbek, Turkish, German and more) and theme: Light, Warm, Dark or Bronze.`],
    ['trouble', 'x', 'If something does not work', `• Auto-recording did not start: the app was closed or the screen locked; or the microphone is not allowed — Chrome → icon left of the address → Permissions → Microphone → "Allow".
• No changes after an update: close the app completely and open it again.
• AI does not answer: the free limit — wait a minute; check the key (Settings → AI → "Test AI").
• Telegram is silent: Settings → Telegram → "Test".`]
  ],
  uz: [
    ['start', 'settings', 'Nimadan boshlash kerak', `1. Ilovani oʻrnating: Chrome’da ⋮ → «Bosh ekranga qoʻshish».
2. Sozlamalar → Bulut: email va parol bilan kiring — vazifalar telefon va kompyuterda bir xil boʻladi.
3. Sozlamalar → Telegram → «Ulash»: bot ilova yopiq boʻlsa ham eslatmalar yuboradi.
4. Sozlamalar → AI: bepul Gemini kalitini kiriting (aistudio.google.com → Get API key).
5. Bildirishnomalar va mikrofonga ruxsat bering. Mikrofon uchun «Doim ruxsat berish»ni tanlang — shunda avto-yozuv soʻramaydi.`],
    ['voice', 'mic', 'Ovozli buyruqlar', `Mikrofonni bosing va oddiy soʻzlar bilan ayting:
• «Ertaga soat 10 da Vasiliy bilan bir soatlik uchrashuv»
• «Ikki soatdan keyin buxgalterga qoʻngʻiroq qilishni eslat»
• «Bugun tushlikdan keyin nima ishlarim bor?»
MARKUS-A sana va vaqtni tushunadi, yetishmaganini soʻraydi va vaqt band boʻlsa ogohlantiradi.`],
    ['tasks', 'check', 'Vazifalar, kichik vazifalar va natija', `• Holat vazifa kartochkasidagi rangli tugmalar bilan oʻzgaradi.
• Kichik vazifalarning har biri oʻz muddatiga ega. «Keyin bajarish» — qadam boshqasini kutadi; birinchisini belgilasangiz, ikkinchisining muddati oʻzi qoʻyiladi.
• Kartochkada bajarilish foizi koʻrinadi; qolgan qadamlar kelajakda boʻlsa, vazifa muddati oʻtgan hisoblanmaydi.
• «Bajarish natijasi» — yakuniy hujjat yoki mijoz ishni qabul qilgani haqidagi skrinshotni biriktiring.`],
    ['meetings', 'users', 'Uchrashuvlar va avto-yozuv', `• Avto-yozuv boshlanishidan 2 daqiqa oldin oʻzi yoqiladi va uchrashuv tugagandan keyin yana 30 daqiqa yozadi. Oʻchirishni unutsangiz — oʻzi toʻxtaydi.
• MUHIM: sayt mikrofonni faqat MARKUS-A ekranda ochiq boʻlganda yoqa oladi. Telefon qulflangan boʻlsa, «Yozishni boshlash» tugmali bildirishnoma va Telegram xabari keladi — bitta bosish.
• Sezdirmay yozish: katta oyna oʻrniga oʻng yuqori burchakda kichik kulrang nuqta. Uni bosing: toʻxtatish, pauza, +30 daqiqa. Android mikrofon belgisini yashirib boʻlmaydi.
• Yozuvlar: Yana → Yozuvlar.`],
    ['sos', 'rec', 'Shoshilinch yozuv', `Suhbatni hozir yozib olish kerakmi (davlat idorasi, bank)?
• Bosh ekran → pastdagi «Yozuv» tugmasi yoki ilova belgisini uzoq bosing → «Shoshilinch yozuv».
• Tugagach toʻxtating. AI stenogramma va xulosa tayyorlaydi: nima qilish kerak, qanday hujjatlar, muddatlar, F.I.Sh. va xonalar — va vazifalarni kerakli sanalarga qoʻyadi.`],
    ['ai', 'ai', 'AI xulosalar va sanalar boʻyicha rejalar', `Yozuvdan soʻng AI: qisqacha, qarorlar, majburiyatlar, muddatlar, xavflar va keyingi qadamlar.
• Vazifa va uchrashuvlar toʻgʻri sanalarga qoʻyiladi: 25.09 dagi uchrashuvdan «3 kundan keyin» = 28.09.
• Vaqtsiz yangi uchrashuv: oʻsha kuni soat 09:00 da ilova vaqtni soʻraydi va avto-yozuvni yoqadi.
• «Xulosani tinglash» — AI xulosasini ovoz bilan oʻqiydi.`],
    ['places', 'pin', 'Joylar, moʻljal rasmlari, hamkorga yuborish', `• Vazifa yoki uchrashuvda: «Joy qoʻshish». Bir nechta joy boʻlishi mumkin.
• Yandex, 2GIS yoki Google havolasini qoʻying, yoki «Xaritada tanlash».
• Kirish va yoʻl rasmlarini qoʻshing.
• «Hamkorga yuborish» — uchta xarita havolalari va rasmlar bilan matn.
• «Telegram’da nuqta» — bot sizga xaritadagi nuqtani yuboradi; uni mijozga yoʻnaltiring.`],
    ['files', 'folder', 'Hujjatlar qayerda saqlanadi', `• Fayllar, rasmlar va yozuvlar telefondagi ilova ichida saqlanadi; bulutga kirgan boʻlsangiz, nusxa bulutga ketadi.
• Sozlamalar → «Fayllarni faqat bulutda saqlash» — telefon xotirasi toʻlmaydi.
• Bepul bulut: 1 GB, bitta fayl 50 MB gacha. Katta videolarni havola bilan qoʻshing.`],
    ['drive', 'play', '«Rulda» rejimi', `Yana → «Rulda»: katta tugmalar, ekran oʻchmaydi.
• «Bugungi / ertangi reja» — ishlaringizni ovoz bilan oʻqiydi.
• «Ovoz bilan soʻrash» — javob ovoz bilan beriladi.`],
    ['remind', 'bell', 'Eslatmalar', `• Muhim ishlar: bir kun oldin 19:00 da va ertalab 09:30 da.
• «Tayyor deb belgilanguncha eslatish» — har soatda 22:00 gacha, keyin har tong.
• Telegram-bot ilova yopiq boʻlsa ham eslatadi.`],
    ['share', 'share', 'Ulashish, kontaktlar, vizitka', `• «Ulashish» tugmasi — kod va muddatli havola.
• Kontaktlar: raqam, WhatsApp yoki Telegram’ni bosing — darhol qoʻngʻiroq yoki chat.
• Mening vizitkam: QR-kod.
• PDF: Yana → PDF.`],
    ['look', 'globe', 'Til va koʻrinish', `Sozlamalar → til va mavzu: Yorugʻ, Iliq, Qorongʻi yoki Bronza.`],
    ['trouble', 'x', 'Agar biror narsa ishlamasa', `• Avto-yozuv yoqilmadi: ilova yopiq yoki ekran qulflangan edi; yoki mikrofonga ruxsat yoʻq — Chrome → manzil chapidagi belgi → Ruxsatlar → Mikrofon → «Ruxsat berish».
• Yangilanishdan keyin oʻzgarish koʻrinmasa: ilovani toʻliq yopib, qayta oching.
• AI javob bermasa: bir daqiqa kuting; kalitni tekshiring.`]
  ],
  tr: [
    ['start', 'settings', 'Başlarken', `1. Uygulamayı yükleyin: Chrome’da ⋮ → "Ana ekrana ekle".
2. Ayarlar → Bulut: e-posta ve şifreyle giriş yapın — görevler telefonda ve bilgisayarda aynı olur.
3. Ayarlar → Telegram → "Bağla": bot, uygulama kapalıyken bile hatırlatır.
4. Ayarlar → AI: ücretsiz Gemini anahtarını girin (aistudio.google.com → Get API key).
5. Bildirimlere ve mikrofona izin verin. Mikrofon için "Her zaman izin ver"i seçin.`],
    ['voice', 'mic', 'Sesli komutlar', `Mikrofona dokunun ve doğal konuşun:
• "Yarın 10'da Vasiliy ile bir saatlik toplantı"
• "İki saat sonra muhasebeciyi aramamı hatırlat"
• "Bugün öğleden sonra neler var?"
MARKUS-A tarihi ve saati anlar, eksikleri sorar ve saat doluysa uyarır.`],
    ['tasks', 'check', 'Görevler, alt görevler ve sonuç', `• Durum, görev kartındaki renkli düğmelerle değişir.
• Her alt görevin kendi süresi olabilir. "Şundan sonra yap" — adım diğerini bekler; ilkini işaretlediğinizde ikincinin tarihi otomatik konur.
• Kartta tamamlanma yüzdesi görünür.
• "Sonuç" — nihai belgeyi veya müşterinin işi kabul ettiğini gösteren ekran görüntüsünü ekleyin.`],
    ['meetings', 'users', 'Toplantılar ve otomatik kayıt', `• Otomatik kayıt başlangıçtan 2 dakika önce kendiliğinden başlar ve bitişten 30 dakika sonrasına kadar sürer. Kapatmayı unutursanız kendisi durur.
• ÖNEMLİ: web sitesi mikrofonu yalnızca MARKUS-A ekranda açıkken açabilir. Telefon kilitliyse "Kayda başla" düğmeli bildirim ve Telegram mesajı gelir — tek dokunuş.
• Gizli kayıt: büyük pencere yerine sağ üstte küçük gri bir nokta. Dokunun: durdur, duraklat, +30 dk. Android’in mikrofon simgesi gizlenemez.
• Kayıtlar: Daha fazla → Kayıtlar.`],
    ['sos', 'rec', 'Acil kayıt', `Bir konuşmayı hemen kaydetmeniz mi gerekiyor?
• Ana ekran → alttaki "Kayıt" düğmesi veya uygulama simgesine uzun basın → "Acil kayıt".
• Bitince durdurun. AI döküm ve özet hazırlar: ne yapılmalı, hangi belgeler, süreler, isimler — ve görevleri doğru tarihlere ekler.`],
    ['ai', 'ai', 'AI özetleri ve tarihli planlar', `Kayıttan sonra AI: özet, kararlar, yükümlülükler, süreler, riskler ve sonraki adımlar.
• Görevler ve toplantılar doğru tarihlere eklenir: 25.09’daki toplantıdan "3 gün sonra" = 28.09.
• Saatsiz yeni toplantı: o gün 09:00’da uygulama saati sorar ve otomatik kaydı açar.
• "Özeti dinle" — AI özetini sesli okur.`],
    ['places', 'pin', 'Yerler, fotoğraflar, ortağa gönderme', `• Görevde veya toplantıda: "Yer ekle". Birden fazla yer olabilir.
• Yandex, 2GIS veya Google bağlantısı yapıştırın ya da "Haritada seç".
• Yaklaşım ve giriş fotoğrafları ekleyin.
• "Ortağa gönder" — üç haritanın bağlantıları ve fotoğraflarla metin.
• "Telegram’da konum" — bot size harita konumu gönderir; müşteriye iletin.`],
    ['files', 'folder', 'Belgeler nerede saklanır', `• Dosyalar telefonda uygulamanın içinde saklanır; buluta giriş yaptıysanız kopyası buluta gider.
• Ayarlar → "Dosyaları yalnızca bulutta sakla" — telefon dolmaz.
• Ücretsiz bulut: 1 GB, dosya başına 50 MB. Büyük videoları bağlantı olarak ekleyin.`],
    ['drive', 'play', 'Sürüş modu', `Daha fazla → "Sürüşte": büyük düğmeler, ekran kapanmaz.
• "Bugünün / yarının planı" — işlerinizi sesli okur.
• "Sesle sor" — cevap sesli verilir.`],
    ['remind', 'bell', 'Hatırlatmalar', `• Önemli işler: bir gün önce 19:00’da ve sabah 09:30’da.
• "Tamamlanana kadar hatırlat" — 22:00’ye kadar her saat, sonra her sabah.
• Telegram botu uygulama kapalıyken de hatırlatır.`],
    ['share', 'share', 'Paylaşım, kişiler, kartvizit', `• "Paylaş" — kodlu ve süreli bağlantı.
• Kişiler: numaraya, WhatsApp’a veya Telegram’a dokunun — arama veya sohbet açılır.
• Kartvizitim: QR kod. PDF: Daha fazla → PDF.`],
    ['look', 'globe', 'Dil ve görünüm', `Ayarlar → dil ve tema: Açık, Sıcak, Koyu veya Bronz.`],
    ['trouble', 'x', 'Bir şey çalışmıyorsa', `• Otomatik kayıt başlamadı: uygulama kapalıydı veya ekran kilitliydi; ya da mikrofona izin yok — Chrome → adresin solundaki simge → İzinler → Mikrofon → "İzin ver".
• Güncellemeden sonra değişiklik yoksa: uygulamayı tamamen kapatıp açın.
• AI cevap vermiyorsa: bir dakika bekleyin; anahtarı kontrol edin.`]
  ],
  de: [
    ['start', 'settings', 'Erste Schritte', `1. App installieren: in Chrome ⋮ → „Zum Startbildschirm hinzufügen“.
2. Einstellungen → Cloud: mit E-Mail und Passwort anmelden — Aufgaben sind auf Handy und Computer gleich.
3. Einstellungen → Telegram → „Verbinden“: der Bot erinnert auch bei geschlossener App.
4. Einstellungen → KI: kostenlosen Gemini-Schlüssel einfügen (aistudio.google.com → Get API key).
5. Benachrichtigungen und Mikrofon erlauben. Beim Mikrofon „Immer erlauben“ wählen.`],
    ['voice', 'mic', 'Sprachbefehle', `Mikrofon antippen und frei sprechen:
• „Morgen um 10 eine Stunde Termin mit Wassili“
• „Erinnere mich in zwei Stunden, den Buchhalter anzurufen“
• „Was habe ich heute Nachmittag?“
MARKUS-A versteht Datum und Uhrzeit, fragt Fehlendes nach und warnt, wenn die Zeit belegt ist.`],
    ['tasks', 'check', 'Aufgaben, Teilaufgaben und Ergebnis', `• Der Status wird mit den farbigen Knöpfen in der Aufgabenkarte geändert.
• Jede Teilaufgabe kann eine eigene Frist haben. „Erledigen nach“ — ein Schritt wartet auf einen anderen; beim Abhaken des ersten bekommt der zweite automatisch sein Datum.
• Die Karte zeigt den Fortschritt in %.
• „Ergebnis“ — Enddokument oder Screenshot anhängen, dass der Kunde die Arbeit angenommen hat.`],
    ['meetings', 'users', 'Termine und automatische Aufnahme', `• Die automatische Aufnahme startet 2 Minuten vor Beginn von selbst und läuft bis Ende + 30 Minuten. Vergessen Sie das Stoppen, stoppt sie selbst.
• WICHTIG: Eine Website kann das Mikrofon nur einschalten, solange MARKUS-A auf dem Bildschirm geöffnet ist. Ist das Handy gesperrt, kommen eine Benachrichtigung und eine Telegram-Nachricht mit „Aufnahme starten“ — ein Tipp.
• Diskrete Aufnahme: statt eines großen Fensters nur ein kleiner grauer Punkt oben rechts. Antippen: Stopp, Pause, +30 Min. Das Android-Mikrofonsymbol lässt sich nicht ausblenden.
• Aufnahmen: Mehr → Aufnahmen.`],
    ['sos', 'rec', 'Notfall-Aufnahme', `Ein Gespräch sofort aufnehmen (Behörde, Bank)?
• Startbildschirm → Knopf „Aufnahme“ unten, oder App-Symbol lange drücken → „Notfall-Aufnahme“.
• Am Ende stoppen. Die KI erstellt Protokoll und Zusammenfassung: was zu tun ist, welche Dokumente, Fristen, Namen — und trägt Aufgaben an den richtigen Tagen ein.`],
    ['ai', 'ai', 'KI-Zusammenfassungen und Pläne nach Datum', `Nach der Aufnahme liefert die KI: Kurzfassung, Beschlüsse, Zusagen, Fristen, Risiken, nächste Schritte.
• Aufgaben und Termine werden an den richtigen Tagen eingetragen: „in 3 Tagen“ ab einem Termin am 25.09 = 28.09.
• Neuer Termin ohne Uhrzeit: an dem Tag um 09:00 fragt die App nach der Zeit und schaltet die Aufnahme ein.
• „Zusammenfassung anhören“ liest sie vor.`],
    ['places', 'pin', 'Orte, Fotos, an Partner senden', `• In Aufgabe oder Termin: „Ort hinzufügen“. Mehrere Orte sind möglich.
• Link aus Yandex, 2GIS oder Google einfügen oder „Auf Karte wählen“.
• Fotos von Zugang und Eingang hinzufügen.
• „An Partner senden“ — Text mit Links zu drei Karten und Fotos.
• „Als Punkt in Telegram“ — der Bot schickt Ihnen einen Kartenpunkt; an den Kunden weiterleiten.`],
    ['files', 'folder', 'Wo Dokumente gespeichert werden', `• Dateien werden in der App auf dem Handy gespeichert; mit Cloud-Anmeldung geht eine Kopie in die Cloud.
• Einstellungen → „Dateien nur in der Cloud“ — der Speicher bleibt frei.
• Kostenlose Cloud: 1 GB, bis 50 MB pro Datei. Große Videos als Link hinzufügen.`],
    ['drive', 'play', 'Fahrmodus', `Mehr → „Beim Fahren“: große Knöpfe, der Bildschirm bleibt an.
• „Plan für heute / morgen“ — liest Ihren Tag vor.
• „Per Sprache fragen“ — die Antwort wird gesprochen.`],
    ['remind', 'bell', 'Erinnerungen', `• Wichtiges: am Vorabend um 19:00 und morgens um 09:30.
• „Erinnern bis Erledigt“ — stündlich bis 22:00, danach jeden Morgen.
• Der Telegram-Bot erinnert auch bei geschlossener App.`],
    ['share', 'share', 'Teilen, Kontakte, Visitenkarte', `• „Teilen“ — Link mit Code und Ablaufdatum.
• Kontakte: Nummer, WhatsApp oder Telegram antippen — Anruf oder Chat öffnet sich.
• Meine Visitenkarte: QR-Code. PDF: Mehr → PDF.`],
    ['look', 'globe', 'Sprache und Design', `Einstellungen → Sprache und Design: Hell, Warm, Dunkel oder Bronze.`],
    ['trouble', 'x', 'Wenn etwas nicht funktioniert', `• Aufnahme startete nicht: App war geschlossen oder Bildschirm gesperrt; oder Mikrofon nicht erlaubt — Chrome → Symbol links der Adresse → Berechtigungen → Mikrofon → „Erlauben“.
• Nach einem Update keine Änderung: App ganz schließen und neu öffnen.
• KI antwortet nicht: eine Minute warten; Schlüssel prüfen.`]
  ]
};
