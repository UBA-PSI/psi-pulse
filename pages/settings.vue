<template>
  <div class="flex items-center justify-between mx-auto max-w-3xl px-4  sm:px-6 lg:px-8">
    <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Settings</h2>
  </div>
  <div class="max-w-3xl mx-auto px-4 mt-6 sm:px-6 lg:px-8">
    <CustomCard>
      <form @submit="onSubmit">
        <div class="space-y-12">
          <div class="border-b border-gray-900/10 dark:border-white/10 pb-12">
            <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Personal Information</h2>
            <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">Use a permanent address where you can
              receive mail.</p>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div class="sm:col-span-3">
                <UFormGroup label="How do want to be called?" name="name">
                  <UInput v-model="state.name" icon="i-heroicons-user" placeholder="John"/>
                </UFormGroup>
              </div>
              <div class="sm:col-span-3">
                <UFormGroup label="E-Mail" name="name">
                  <UInput v-model="user.email" disabled icon="i-heroicons-envelope" placeholder="foo@bar.com"/>
                </UFormGroup>
              </div>

              <div class="flex items-center justify-between sm:col-span-6">
                  <span class="flex flex-grow flex-col">
                    <span class="text-sm font-medium leading-6 text-gray-900 dark:text-white">Statistics</span>
                    <span
                        class="text-sm text-gray-500 dark:text-gray-400">Save when and how you answered your questions to allow analysis.</span>
                  </span>
                <UToggle v-model="state.logQuestions"/>
              </div>

              <div v-if="statisticsExist" class="flex items-center justify-between sm:col-span-6">
                  <span class="flex flex-grow flex-col">
                    <span class="text-sm text-gray-500 dark:text-gray-400">There are currently data stored. You can delete that if you want to.</span>
                  </span>
                <UButton color="red" size="xs" @click="showDeleteStatisticsAlert = true">
                  Delete Statistics
                </UButton>
              </div>
            </div>
          </div>

          <div class="border-b border-gray-900/10 dark:border-white/10 pb-12">
            <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">E-Mails</h2>
            <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">You can receive different kind of
              emails like reminders or
              additional questions.</p>


            <div class="mt-10 space-y-10">

              <div class="flex items-center justify-between">
    <span class="flex flex-grow flex-col">
      <span class="text-sm font-medium leading-6 text-gray-900 dark:text-white">E-Mails</span>
      <span class="text-sm text-gray-500 dark:text-gray-400">Once a day, we will send you an email with your unanswered questions.</span>
    </span>
                <UToggle v-model="state.receiveEmails"/>

              </div>

              <UFormGroup v-if="state.receiveEmails" label="Reminder Delivery Time" name="reminder delivery time">
                <USelect v-model="state.preferredReminderEmailDeliveryTime" :options="hourItems"
                         placeholder="Select..."/>
              </UFormGroup>

              <div v-if="state.receiveEmails" class="flex items-center justify-between">
    <span class="flex flex-grow flex-col">
      <span class="text-sm font-medium leading-6 text-gray-900 dark:text-white" passive>Weekly E-Mails</span>
      <span class="text-sm text-gray-500 dark:text-gray-400"> Weekly emails help you to keep on learning, even if all of your questions are answered.</span>
    </span>
                <UToggle v-model="state.receiveWeeklyEmails"/>

              </div>
              <div v-if="state.receiveEmails && state.receiveWeeklyEmails"
                   class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div class="sm:col-span-2 sm:col-start-1">
                  <UFormGroup label="Receive Weekly Email"
                              name="toggle">
                    <UInput v-model="state.weeklyEmailsNumber" type="receive weekly"/>
                  </UFormGroup>
                </div>

                <div class="sm:col-span-2">
                  <UFormGroup label="Weekly Delivery Time" name="weekly delivery time">
                    <USelect v-model="state.preferredWeeklyEmailDeliveryTime" :options="hourItems"
                             placeholder="Select..."/>
                  </UFormGroup>


                </div>

                <div class="sm:col-span-2">


                  <UFormGroup label="Weekly Delivery Day" name="weekly delivery day">
                    <USelect v-model="state.preferredWeeklyEmailDeliveryDay" :options="dayItems"
                             placeholder="Select..."/>
                  </UFormGroup>


                </div>
              </div>


            </div>


          </div>
        </div>

        <div class="mt-6 flex items-center justify-between gap-x-6">
          <div class="flex gap-x-4">
            <UButton color="red" l @click="displayDeleteAlert = true">
              Delete Account
            </UButton>
            <UButton @click="exportData">
              Export Data
            </UButton>
          </div>
          <UButton :loading="loading" type="submit">
            Save
          </UButton>
        </div>
      </form>

      <UModal v-model="displayDeleteAlert" class="w-10">
        <UCard>
          Do you really want to delete your account?
          <template #footer>
            <div class="flex justify-between">
              <UButton variant="soft" @click="displayDeleteAlert = false">
                Cancel
              </UButton>
              <UButton color="red" @click="handleDeleteAccount">
                Delete Account
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <UModal v-model="showDeleteStatisticsAlert" class="w-10">
        <UCard>
          Do you want to delete your statistics?
          <template #footer>
            <div class="flex justify-between">
              <UButton variant="soft" @click="showDeleteStatisticsAlert = false">
                Cancel
              </UButton>
              <UButton color="red" @click="handleDeleteStatistics">
                Delete Statistics
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
import type {UpdateAccountBody} from "~/types/account";

useHead({
  title: 'Settings'
})

definePageMeta({
  middleware: ["protected"]
});

const user = useUser();

function formatTime(dateString: string) {
  const date = new Date(dateString);
  let hours = date.getHours();
  return String(hours);
}


const state = reactive({
  name: undefined,
  preferredReminderEmailDeliveryTime: undefined,
  preferredWeeklyEmailDeliveryTime: undefined,
  preferredWeeklyEmailDeliveryDay: undefined,
  receiveEmails: undefined,
  receiveWeeklyEmails: undefined,
  weeklyEmailsNumber: undefined,
  logQuestions: undefined,
})

let unsubscribeEmailsToken = null
let unsubscribeWeeklyEmailsToken = null

const showDeleteStatisticsAlert = ref(false)
const statisticsExist = ref(false)
const originalStatisticsExist = ref(false)

onMounted(async () => {
  const account = await $fetch("/api/account");
  state.name = account.name;
  state.preferredReminderEmailDeliveryTime = formatTime(account.preferredReminderDeliverTime);
  state.receiveEmails = account.receiveEmails;
  state.receiveWeeklyEmails = account.receiveWeeklyEmails;
  state.weeklyEmailsNumber = account.weeklyEmailsNumber;
  state.preferredWeeklyEmailDeliveryTime = formatTime(account.preferredWeeklyDeliverTime);
  state.preferredWeeklyEmailDeliveryDay = account.preferredWeeklyDeliverDay;
  state.logQuestions = account.logQuestions
  originalStatisticsExist.value = account.logQuestions
  unsubscribeEmailsToken = account.unsubscribeEmailsToken
  unsubscribeWeeklyEmailsToken = account.unsubscribeWeeklyEmailsToken
  statisticsExist.value = account.loggedQuestions > 0
})

const displayDeleteAlert = ref(false)
const loading = ref(false)

const hourItems = Array.from({length: 24}, (_, i) => i).map((hour) => ({
  label: `${hour}:00`,
  value: hour
}));

const dayItems = [
  {label: "Monday", value: 1},
  {label: "Tuesday", value: 2},
  {label: "Wednesday", value: 3},
  {label: "Thursday", value: 4},
  {label: "Friday", value: 5},
  {label: "Saturday", value: 6},
  {label: "Sunday", value: 0},
];

const handleDeleteAccount = async (e: Event) => {
  await $fetch("/api/user", {
    method: "DELETE",
    redirect: "manual"
  });
  await navigateTo("/login");
};

const handleDeleteStatistics = async (e: Event) => {
  await $fetch("/api/account/statistics", {
    method: "DELETE",
    redirect: "manual"
  });
  statisticsExist.value = false
  originalStatisticsExist.value = state.logQuestions
  showDeleteStatisticsAlert.value = false
};

const exportData = async (e: Event) => {
  const userData = await $fetch("/api/account/export", {
    method: "GET",
    redirect: "manual"
  });

  const blob = new Blob([JSON.stringify(userData)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'pulse-data.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const onSubmit = async (e: Event) => {
  e.preventDefault()
  loading.value = true

  const body: UpdateAccountBody = {
    name: state.name,
    preferredReminderDeliveryTime: state.preferredReminderEmailDeliveryTime,
    preferredWeeklyDeliveryTime: state.preferredWeeklyEmailDeliveryTime,
    preferredWeeklyDeliveryDay: parseInt(state.preferredWeeklyEmailDeliveryDay),
    receiveEmails: state.receiveEmails,
    receiveWeeklyEmails: state.receiveWeeklyEmails,
    weeklyEmailsNumber: state.weeklyEmailsNumber,
    unsubscribeEmailsToken: unsubscribeEmailsToken,
    unsubscribeWeeklyEmailsToken: unsubscribeWeeklyEmailsToken,
    logQuestions: state.logQuestions
  }
  await $fetch("/api/account", {
    method: "PUT",
    body: body
  });
  loading.value = false
  if (statisticsExist.value && !state.logQuestions && originalStatisticsExist.value) {
    showDeleteStatisticsAlert.value = true
  }
}

</script>
