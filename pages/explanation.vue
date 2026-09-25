<template>
  <div class="flex justify-center">
    <div class="max-w-3xl mt-10">
      <div class="flex items-center justify-between mx-auto">
        <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white mb-0">Explanation</h2>
      </div>
      <CustomCard class="mt-6">
        <div class="docs"><h1 id="introduction">Introduction</h1><p>Pulse is a web application for learning flashcards based on spaced repetition. Spaced repetition can be defined as <a href="https://www.kpu.ca/sites/default/files/Learning%20Centres/Think_SpacedRepetition_LA.pdf" rel="nofollow">a method of reviewing material at systematic intervals</a>. At systematic intervals, Pulse displays questions to the users. The user previously added these questions by visiting websites integrating Pulse in their texts. By integrating Pulse, website owners can design questions that the user can learn. The user must then answer if he remembered the Pulse question's answer (further called 'answer the question'). Depending on whether the user remembered or not, the question will be asked by Pulse more or less frequently.</p><h1 id="question-lifecycle">Question Lifecycle</h1><p>A Pulse question walks through different states to archive spaced repetition. Additional features are implemented in Pulse to increase the effectiveness of Pulse.
          <br><br>
          The lifecycle of a question always begins at a third-party website. The third-party website implements Pulse and provides designed Pulse questions. Each Pulse question consists of a question, an answer to the question, the current page name, and the states it walks through. Additionally, a group can be defined to categorize the questions further within a page. By answering the question once, the question is added to the user's account, and stepping through the different states starts. More information about the design of Pulse questions can be found in the <a href="/integrate" class="">website owner guide</a>.
          <br><br>
          Each question can walk through a maximum of six states. Each state is characterized by a label and an offset. The offset describes after how many days the question is open to be answered again in its current state after answering it the last time. While the first state describes how many days the question is asked again if the user cannot remember answering it for the first time, the final state defines how many times the user gets asked the question again if he can always remember. The state will increase if the user remembers the answer to a question again and has not previously forgotten it. The state will not increase but stay the same if the user previously forgot the answer to the question. The state will also stay the same if the user has previously remembered the question but has now forgotten it. If the user forgets a question twice in a row, the question falls back to the previous state. Overall, the goal is to keep all questions in their final state.
          <br><br>
          Pulse introduces an additional property to the Pulse question to increase user motivation. This property describes how active a user is learning a question. A question is <em>active</em> if the user always answers the question within the current state's offset since the question is opened. If the user misses answering the question within the offset once, the question is <em>neglected</em>. Answering then the question again with the offset makes it <em>pending</em>. After answering the question two times in a row, the question is marked as active again. How many of the added questions are active are displayed on the user's home screen. Additionally, on the home screen, the oldest active question is displayed. Both types of information should motivate the user to continue learning.
          <br><br>
          There are two options if the user does not want to be asked a question again. The first option is to archive the question. The question will not be checked for being opened. The second option is to delete the question entirely.</p><h1 id="emails">Emails</h1><p>Pulse features additional types of emails besides the required login email containing the magic link. These additional types aim to increase interaction with Pulse and, therefore, the learning effectivity.</p><h2 id="reminder"><a href="#reminder">Reminder</a></h2><p>Reminder emails help the user become aware of open questions and keep them active. A reminder email is sent once a day and contains a maximum of six non-archived open questions. If there are more than six non-archived open questions, the questions get selected randomly. All remaining questions walk through the same process the following day as long as they are not sent out.
          <br><br>
          A reminder email consists of two important elements. The first element is the list of the selected questions. For each question, a dedicated answer button exists, enabling answering only chosen questions. The second element is the <em>answer all questions</em> button, so the user does not need to open all questions after each other.
          <br><br>
          Reminders are enabled by default but can be disabled. If reminders are enabled, the user can customize the preferred delivery time.</p><h2 id="weekly"><a href="#weekly">Weekly</a></h2><p>The goal of weekly emails is to keep the user active by sending out a number of random, non-archived questions once a week. Sending out an email once a week prevents complete silence of Pulse in case all questions are in states with an offset of more than a week. Answering all questions of the weekly emails within a week rewards the user with an increase in the user's weekly streak. The weekly streak is displayed on the user's home screen next to the active questions and the oldest active question. Answering and not remembering the questions will only drop questions from the long-term state to the final state but will not further affect the question.
          <br><br>
          Weekly emails are enabled by default but can be disabled by the user. They are automatically disabled if reminders and, therefore, emails are disabled entirely. If weeklies are enabled, the user can customize the preferred delivery day, time, and number of maximum selected questions.</p></div>
      </CustomCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
// import markdownParser from '@nuxt/content/transformers/markdown'

useHead({
  title: 'Integration'
})

definePageMeta({
  layout: "not-authenticated",
});

// const runtimeConfig = useRuntimeConfig()

// let parsedMarkdown = ref(null)

// onMounted(async () => {
//   let response = await $fetch('/markdown/explanation.md')
//   const hostUrl = runtimeConfig.public.HOST_URL
//   response = response.replaceAll('%%HOST_URL%%', hostUrl)
//   parsedMarkdown.value = await markdownParser.parse(null, response)
// })
</script>
