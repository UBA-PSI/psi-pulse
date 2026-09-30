<template>
  <div class="mx-auto max-w-7xl border border-gray-900/10 dark:border-white/10 rounded-xl overflow-auto mt-6 ">
    <dl class="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.key" class="px-4 py-6 sm:px-6 lg:px-8 flex flex-col">
        <dt class="text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">{{ stat.name }}</dt>
        <dd class="mt-2 flex items-baseline gap-x-2">
          <template v-if="stat.value != null">
            <span class="text-3xl font-semibold tracking-tight dark:text-white">{{ stat.value }}</span>
            <span v-if="stat.unit" class="text-sm text-gray-600 dark:text-gray-300">{{ stat.unit }}</span>
          </template>
          <template v-else>
            <USkeleton class="h-9 w-12"/>
            <USkeleton class="h-4 w-8"/>
          </template>
        </dd>
        <!-- Erklärungen sichtbar bzw. per <details> aufklappbar statt Hover-Tooltip (WCAG 2.1.1, 1.4.13) -->
        <dd class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          <p>{{ stat.short }}</p>
          <details class="mt-1">
            <summary class="cursor-pointer underline underline-offset-2">{{ t.more }}<span class="sr-only">: {{ stat.name }}</span></summary>
            <p class="mt-1">{{ stat.long }}</p>
          </details>
        </dd>
      </div>
    </dl>
  </div>
</template>
<script lang="ts" setup>

import type {AccountStats} from "~/types/account";

const props = defineProps<{
  stats: AccountStats | null
}>()

// Jede Aussage entspricht dem Code:
// - Fragen: /api/account/stats zählt alle Fragen des Kontos, auch archivierte. Eine Frage entsteht mit der ersten
//   Antwort im Widget (api/v1/questions POST).
// - Rechtzeitig: Frage ist „active“. plugins/backgroundScheduler.ts setzt active=false und active_since=null, wenn seit der
//   letzten Antwort (completed_at) das Doppelte des Abstands der aktuellen Stufe vergangen ist; ein Abstand unter einem Tag
//   (Stufe „im Text“, 0) zählt wie ein Tag, also frühestens nach zwei Tagen (A18). utils/editQuestion.ts
//   (updateQuestionState): die nächste Antwort setzt active_since (Zustand „pending“), die übernächste active=true.
//   Antworten in der Wochenauswahl setzen completed_at nicht, verschieben den Abstand also nicht.
// - Am längsten: frühestes active_since aller Fragen (stats.get.ts); nach einer Verspätung beginnt es beim nächsten
//   Beantworten neu.
// - Wochenserie: +1, wenn die Wochenauswahl bis zum Ende durchgegangen ist (weekly/[token].put.ts, auch übersprungene
//   Fragen). plugins/emailScheduler.ts: 0, wenn die nächste Wochenauswahl fällig ist und die vorige nicht abgeschlossen
//   wurde; ist die älteste offene Wochenauswahl 14 Tage alt, ebenfalls 0 und Pause der Mails für 14 Tage.
// Sprache: useUiLang() (App bisher englisch, siehe composables/uiLang.ts).
const TEXT = {
  de: {
    more: "Mehr",
    questions: {
      name: "Fragen",
      short: "Alle Fragen, die Sie bisher beantwortet haben.",
      long: "Eine Frage kommt hinzu, sobald Sie sie angemeldet zum ersten Mal beantworten. Archivierte Fragen zählen mit.",
    },
    onTime: {
      name: "Rechtzeitig wiederholt",
      short: "Anteil Ihrer Fragen, die Sie im vorgesehenen Abstand wiederholen.",
      long: "Nach jeder Antwort kommt eine Frage nach einem bestimmten Abstand wieder, zum Beispiel nach 4 Tagen; wenn Sie die Antwort wussten, wird der Abstand bis zum längsten Abstand größer. Rechtzeitig ist eine Frage, solange Sie sie spätestens nach dem Doppelten dieses Abstands beantworten, im Beispiel also nach 8 Tagen. Ist der Abstand kürzer als ein Tag, etwa direkt nach „Nicht gewusst“, haben Sie zwei Tage Zeit. Wird es später, gilt sie nicht mehr als rechtzeitig, bis Sie sie wieder zweimal beantwortet haben. Antworten in der Wochenauswahl verschieben den Abstand nicht.",
    },
    longest: {
      name: "Am längsten rechtzeitig",
      unit: (n: number) => n === 1 ? "Tag" : "Tage",
      short: "So lange wiederholen Sie eine Ihrer Fragen schon ohne Unterbrechung rechtzeitig.",
      long: "Gezählt wird ab der ersten Antwort. Wird eine Frage zu spät wiederholt, beginnt ihre Zählung beim nächsten Beantworten von vorn.",
    },
    streak: {
      name: "Wochenserie",
      unit: (n: number) => n === 1 ? "Woche" : "Wochen",
      short: "Wochen in Folge, in denen Sie die Wochenauswahl aus der Mail abgeschlossen haben.",
      long: "Abgeschlossen ist sie, wenn Sie alle Fragen darin beantwortet oder übersprungen haben. Kommt die nächste Wochenauswahl, bevor die vorige abgeschlossen ist, beginnt die Serie wieder bei 0. Bleibt eine Wochenauswahl 14 Tage offen, pausieren die Mails für 14 Tage.",
    },
  },
  en: {
    more: "More",
    questions: {
      name: "Questions",
      short: "All questions you have answered so far.",
      long: "A question is added the first time you answer it while signed in. Archived questions are included.",
    },
    onTime: {
      name: "Reviewed on time",
      short: "Share of your questions that you review at the planned interval.",
      long: "After each answer, a question comes back after a certain interval, for example after 4 days; if you knew the answer, the interval gets longer, up to the longest interval. A question is on time as long as you answer it within twice that interval, in the example within 8 days. If the interval is shorter than a day, for example right after “I didn't”, you have two days. If it gets later, it no longer counts as on time until you have answered it twice again. Answers in the weekly selection do not change the interval.",
    },
    longest: {
      name: "Longest on time",
      unit: (n: number) => n === 1 ? "day" : "days",
      short: "How long you have been reviewing one of your questions on time without a break.",
      long: "Counting starts with the first answer. If a question is reviewed too late, its count starts over the next time you answer it.",
    },
    streak: {
      name: "Weekly streak",
      unit: (n: number) => n === 1 ? "week" : "weeks",
      short: "Weeks in a row in which you finished the weekly selection from the email.",
      long: "It is finished when you have answered or skipped all questions in it. If the next weekly selection arrives before the previous one is finished, the streak starts again at 0. If a weekly selection stays open for 14 days, the emails pause for 14 days.",
    },
  },
}
const lang = useUiLang()
const t = computed(() => TEXT[lang.value])

const activeRatio = computed(() => {
  if (props.stats === null) return null
  if (props.stats.questions === 0) return 0
  return Math.floor(props.stats.activeQuestion / props.stats.questions * 100)
})

const stats = computed(() => {
  const s = props.stats
  const longest = s ? daysSince(s.oldestQuestion) : null
  const streak = s ? s.weeklyStreak : null
  return [
    {key: "questions", ...t.value.questions, value: s ? s.questions : null, unit: ""},
    {key: "onTime", ...t.value.onTime, value: activeRatio.value, unit: "%"},
    {key: "longest", ...t.value.longest, value: longest, unit: t.value.longest.unit(longest ?? 0)},
    {key: "streak", ...t.value.streak, value: streak, unit: t.value.streak.unit(streak ?? 0)},
  ]
})

function daysSince(date: Date) {
  const today = new Date();
  const pastDate = new Date(date);
  const differenceInMilliseconds = today.getTime() - pastDate.getTime();
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}
</script>
