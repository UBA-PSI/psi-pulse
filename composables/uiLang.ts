// Sprache der Bausteine, die sowohl in der (noch englischen) App als auch auf den zweisprachigen
// Antwortseiten aus den Mails stehen (Frage, Fortschritt, Hinweise, Footer). Standard: englisch wie die App.
// Die Antwortseiten setzen sie mit useAnswerPageLang(); bis @nuxtjs/i18n kommt (PLAN.md, Block 3).
export type UiLang = "de" | "en"

export const useUiLang = () => useState<UiLang>("uiLang", () => "en")

export const useUiText = () => {
    const lang = useUiLang()
    return computed(() => UI_TEXT[lang.value])
}

// Sprache wie auf den übrigen zweisprachigen Seiten: ?lang=, sonst Accept-Language bzw. Browser, sonst Deutsch.
export const langFromRequest = (): UiLang => {
    const q = useRoute().query.lang
    if (q === "de" || q === "en") return q
    const header = useRequestHeaders(["accept-language"])["accept-language"]
    return /^de/i.test(header || (process.client ? navigator.language : "") || "de") ? "de" : "en"
}

// Antwortseiten: Sprache des Kontos (über das Token aus der Mail), sonst langFromRequest().
// Wird beim Server-Rendern aufgelöst, damit <html lang> von Anfang an stimmt.
export const useAnswerPageLang = async (query: { kind: "question" | "reminder" | "weekly", token: string, id?: string }) => {
    const lang = useUiLang()
    lang.value = langFromRequest()
    useHead({htmlAttrs: {lang}})
    // Die übrigen Seiten der App sind englisch: beim Verlassen zurücksetzen
    onBeforeUnmount(() => { lang.value = "en" })
    const {data} = await useFetch("/api/answer/lang", {query, key: `answer-lang-${query.kind}-${query.id ?? ""}-${query.token}`})
    if (data.value?.lang) lang.value = data.value.lang
    return lang
}

// Ton wie im Widget (docs/embed-v2.md, „Texte für Studierende“): Frage, gewusst / nicht gewusst, kommt per Mail wieder.
export const UI_TEXT = {
    de: {
        showAnswer: "Antwort zeigen",
        remembered: "Gewusst",
        forgotten: "Nicht gewusst",
        skip: "Überspringen",
        submitted: "Kommt per Mail wieder.",
        questionActions: "Weitere Aktionen zur Frage",
        archive: "Archivieren",
        viewPage: "Seite öffnen",
        archivedTitle: (q: string) => `„${q}“ archiviert`,
        archivedText: "Die Frage kommt nicht mehr per Mail. Rückgängig machen können Sie das in psi-pulse unter „Questions“.",
        progress: "Wiederholungsabstände",
        badgeActive: (days: number) => days < 1 ? "Rechtzeitig" : days === 1 ? "Seit 1 Tag rechtzeitig" : `Seit ${days} Tagen rechtzeitig`,
        badgePending: "Wieder aufgenommen",
        badgeNeglected: "Länger nicht wiederholt",
        position: (n: number, m: number) => `Frage ${n} von ${m}`,
        allAnswered: "Alle Fragen beantwortet. Sie kommen per Mail wieder.",
        loading: "Wird geladen …",
        dueTitle: "Jetzt zum Wiederholen",
        dueLabel: "Jetzt dran",
        archivedLabel: "Archiviert, kommt nicht mehr",
        dueExplanation: "Fragen, die jetzt wieder dran sind. Wann eine Frage wiederkommt, hängt von Ihren bisherigen Antworten ab.",
        errorTitle: "Das hat nicht geklappt",
        answerQuestionTitle: "Frage beantworten",
        answerQuestionHeading: "Frage zum Wiederholen",
        questionDone: "Erledigt. Die Frage kommt per Mail wieder.",
        reminderTitle: "Heute zum Wiederholen",
        weeklyTitle: "Wochenauswahl",
        weeklyHeading: "Ihre Wochenauswahl",
        weeklyDone: (n: number) => `Wochenauswahl abgeschlossen. Wochenserie: ${n} ${n === 1 ? "Woche" : "Wochen"} in Folge.`,
        linkInvalid: "Dieser Link gilt nicht mehr. Vielleicht haben Sie die Fragen schon beantwortet, oder es gibt inzwischen eine neuere Mail.",
        notDue: "Diese Frage ist gerade nicht dran. Sie kommt später per Mail wieder.",
        tryLater: "Bitte später noch einmal versuchen.",
        imprint: "Impressum",
        privacy: "Datenschutz",
        stateLabel: {"in-text": "im Text", "1 day": "1 Tag", "2 days": "2 Tage", "4 days": "4 Tage", "1 week": "1 Woche", "2 weeks": "2 Wochen"} as Record<string, string>,
    },
    en: {
        showAnswer: "Show answer",
        remembered: "I knew it",
        forgotten: "I didn't",
        skip: "Skip",
        submitted: "Will come back by email.",
        questionActions: "More actions for this question",
        archive: "Archive",
        viewPage: "Open page",
        archivedTitle: (q: string) => `“${q}” archived`,
        archivedText: "It will no longer come back by email. You can undo this in psi-pulse under “Questions”.",
        progress: "Review intervals",
        badgeActive: (days: number) => days < 1 ? "On time" : days === 1 ? "On time for 1 day" : `On time for ${days} days`,
        badgePending: "Picked up again",
        badgeNeglected: "Not reviewed for a while",
        position: (n: number, m: number) => `Question ${n} of ${m}`,
        allAnswered: "All questions answered. They will come back by email.",
        loading: "Loading …",
        dueTitle: "Up for review now",
        dueLabel: "Up for review",
        archivedLabel: "Archived, won't come back",
        dueExplanation: "Questions that are up for review again now. When a question comes back depends on your previous answers.",
        errorTitle: "That did not work",
        answerQuestionTitle: "Answer question",
        answerQuestionHeading: "Question to review",
        questionDone: "Done. The question will come back by email.",
        reminderTitle: "Up for review today",
        weeklyTitle: "Weekly selection",
        weeklyHeading: "Your weekly selection",
        weeklyDone: (n: number) => `Weekly selection finished. Weekly streak: ${n} ${n === 1 ? "week" : "weeks"} in a row.`,
        linkInvalid: "This link is no longer valid. Perhaps you have already answered the questions, or there is a newer email.",
        notDue: "This question is not up for review right now. It will come back later by email.",
        tryLater: "Please try again later.",
        imprint: "Imprint",
        privacy: "Privacy policy",
        stateLabel: {} as Record<string, string>,
    }
}

// Fehlertexte der Antwortseiten: die API liefert englische Meldungen für Entwickler, Studierende sehen diese Texte.
export const answerErrorText = (e: unknown, t: typeof UI_TEXT["de"] | typeof UI_TEXT["en"]) => {
    const status = (e as { response?: { status?: number } })?.response?.status
    return status === 404 ? t.linkInvalid : t.tryLater
}
