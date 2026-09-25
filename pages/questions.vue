<template>
  <div class="flex items-center justify-between mx-auto  px-4  sm:px-6 lg:px-8">
    <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Questions Overview</h2>
  </div>
  <div class="mx-auto  px-4 mt-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-s border  border-gray-900/10 dark:border-white/10  rounded-xl overflow-hidden">
      <div class="overflow-hidden rounded-lg px-4 py-5 sm:px-6">
        <div class=" grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-7">
          <ClientOnly>
            <UFormGroup label="Actions" name="pages">
              <UButtonGroup orientation="horizontal">
                <UButton class="" color="white" variant="solid" @click="toggleSelectionMode">
                  {{ selectMode ? "Unselect" : "Select" }}
                </UButton>
                <UDropdown :items="items" :popper="{ placement: 'bottom-start' }">
                  <UButton color="white" label="" trailing-icon="i-heroicons-chevron-down-20-solid"/>
                </UDropdown>
              </UButtonGroup>
            </UFormGroup>
            <UFormGroup label="Questions" name="questions">
              <UInput v-model="questionSearchTerm" placeholder="Filter questions..."/>
            </UFormGroup>
            <UFormGroup label="Pages" name="pages">
              <USelectMenu
                  v-model="selectedPage"
                  :disabled="pagesMenuContent === null"
                  :options="pagesMenuContent"
                  class=""
                  multiple
                  option-attribute="name"
                  placeholder="Select page"
                  searchable
                  searchable-placeholder="Search a page..."
                  value-attribute="id"
              />
            </UFormGroup>
            <UFormGroup label="Groups" name="groups">
              <USelectMenu
                  v-model="selectedGroup"
                  :disabled="groupMenuContent === null"
                  :options="groupMenuContent"
                  class=""
                  multiple
                  option-attribute="name"
                  placeholder="Select page"
                  searchable
                  searchable-placeholder="Search a page..."
                  value-attribute="id"
              />
            </UFormGroup>
            <UFormGroup label="States" name="states">
              <USelectMenu
                  v-model="selectedState"
                  :options="stateTags"
                  class=""
                  multiple
                  option-attribute="name"
                  placeholder="Select state"
                  searchable
                  searchable-placeholder="Search a state..."
                  value-attribute="id"
              />
            </UFormGroup>
            <UFormGroup label="Open" name="open">
              <USelectMenu
                  v-model="selectOpen"
                  :options="isOpenMenuContent"
                  class=""
                  multiple
                  option-attribute="label"
                  placeholder="Select open"
                  value-attribute="value"
              />
            </UFormGroup>
            <UFormGroup label="Archived" name="archived">
              <USelectMenu
                  v-model="selectArchived"
                  :options="archivedMenuContent"
                  class=""
                  multiple
                  option-attribute="label"
                  placeholder="Select archived"
                  value-attribute="value"
              />
            </UFormGroup>
          </ClientOnly>
        </div>
        <UDivider class="mt-6 mb-4"/>
        <UTable v-model="selectionVmodel"
                :columns="selectedColumns"
                :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No items.' }"
                :loading="!questions" :rows="filteredRows"
                :sort="{ column: 'title' }" @select="selectAction"
        >
          <template #currentState-data="{ row }">
            {{ getCurrentState(row) }}
          </template>
          <template #attributes-data="{ row }">
            <div class="flex">
              <UPopover v-if="row.archived" :ui="{wrapper: 'flex items-center'}" mode="hover">
                <UIcon name="i-heroicons-archive-box"/>
                <template #panel>
                  <div class="p-4 max-w-sm">
                    This question is archived. It will not be asked again.
                  </div>
                </template>
              </UPopover>

              <UPopover v-else-if="row.isOpen" :ui="{wrapper: 'flex items-center'}" mode="hover">
                <UIcon name="i-heroicons-lock-open"/>
                <template #panel>
                  <div class="p-4 max-w-sm">
                    This question is open. You can answer it again.
                  </div>
                </template>
              </UPopover>
            </div>
          </template>
        </UTable>

        <UModal v-model="questionDetailOpened">
          <QuestionInfo :after-archive="() => {questionDetailOpened = false}" :question="selectedQuestion"/>
        </UModal>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type {CurrentState} from "@prisma/client";
import type {InternalQuestion} from "~/types/questions/internal";
import type {SimpleQuestionUpdate} from "~/types/questions/questions";

useHead({
  title: 'Questions'
})

definePageMeta({
  middleware: ["protected"],
});

const columns = [{
  key: 'pageName',
  label: 'Page',
  sortable: true
}, {
  key: 'groupName',
  label: 'Group',
  sortable: true
}, {
  key: 'question',
  label: 'Question',
  sortable: true
}, {
  key: 'answer',
  label: 'Answer',
  sortable: true
}, {
  key: 'currentState',
  label: 'State',
  sortable: true
}, {
  key: 'attributes',
  label: '',
  sortable: false
}]

const questions = ref<InternalQuestion[] | null>(null)

const selectMode = ref(false)
const selectedEntries = ref<InternalQuestion[]>([])
const toggleSelectionMode = () => {
  if (selectMode.value) {
    selectedEntries.value = []
  }
  selectMode.value = !selectMode.value
}

const selectAction = (row) => {
  const index = selectedEntries.value.findIndex((item) => item.id === row.id)
  if (selectMode.value) {
    if (index === -1) {
      selectedEntries.value.push(row)
    } else {
      selectedEntries.value.splice(index, 1)
    }
  } else {
    selectedQuestion.value = row
    questionDetailOpened.value = true
  }
}

const selectionVmodel = computed({
  get() {
    if (selectMode.value) {
      return selectedEntries.value
    } else {
      return undefined
    }
  },
  set(value) {
    if (selectMode.value) {
      selectedEntries.value = value
    }
  }
})

const items = [
  [{
    label: 'Archive',
    icon: 'i-heroicons-archive-box-20-solid',
    click: () => {
      archiveQuestion(true)
    }
  }, {
    label: 'Unarchive',
    icon: 'i-heroicons-archive-box-x-mark-20-solid',
    click: () => {
      archiveQuestion(false)
    }
  }], [{
    label: 'Delete',
    icon: 'i-heroicons-trash-20-solid',
    click: () => {
      deleteQuestion()
    }
  }]
]

const archiveQuestion = async (archive: boolean) => {
  for (const question of selectedEntries.value) {
    const body: SimpleQuestionUpdate = {
      remembered: null,
      archived: archive
    }
    await $fetch(`/api/questions/${question.id}`, {
      method: "PUT",
      body: body
    })
  }
  await afterAction()
}

const deleteQuestion = async () => {
  for (const question of selectedEntries.value) {
    await $fetch(`/api/questions/${question.id}`, {
      method: "DELETE"
    })
  }
  await afterAction()
}

const afterAction = async () => {
  await loadData()
  selectedEntries.value = []
  selectMode.value = false
}

const selectedColumns = ref([...columns])

const questionSearchTerm = ref('')

interface FilterState {
  id: CurrentState
  name: string
}

const stateTags: FilterState[] = [{
  id: "INITIAL",
  name: 'Initial state'
}, {
  id: "STATE_1",
  name: 'First state'
}, {
  id: "STATE_2",
  name: 'Second state'
}, {
  id: "STATE_3",
  name: 'Third state'
}, {
  id: "STATE_4",
  name: 'Fourth state'
}, {
  id: "FINAL",
  name: 'Final state'
}, {
  id: "LONG_TERM",
  name: 'Long term state'
}]
const selectedState = ref([])
const currentState = computed(() => {
  if (!selectedState.value) {
    return null
  }
  return stateTags.find((state) => state.id === selectedState.value)?.name
})

const pagesMenuContent = computed(() => {
  if (!questions.value) {
    return null
  }
  const allPages = [...new Set(questions.value.map((question) => question.pageName))]
  return allPages.map((page) => {
    return {
      id: page,
      name: page
    }
  })
})
const selectedPage = ref([])

const groupMenuContent = computed(() => {
  if (!questions.value) {
    return null
  }
  const allGroups = [...new Set(questions.value.map((question) => question.groupName))]
  const mappedGroups = allGroups.map((group) => {
    return {
      id: group,
      name: group
    }
  })
  if (selectedPage.value.length === 0) {
    return mappedGroups
  }
  return mappedGroups.filter((group) => {
    if (questions.value === null) {
      return false
    }
    const pageGroups = questions.value.filter((question) => selectedPage.value.includes(question.pageName))
    return pageGroups.some((question) => question.groupName === group.name)
  })
})
const selectedGroup = ref([])

const isOpenMenuContent = [
  {
    label: 'Open',
    value: true
  },
  {
    label: 'Closed',
    value: false
  }
]
const selectOpen = ref([true, false])

const archivedMenuContent = [
  {
    label: 'Archived',
    value: true
  },
  {
    label: 'Not archived',
    value: false
  }
]
const selectArchived = ref([true, false])

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  questions.value = null
  questions.value = await $fetch('/api/questions')
}

const getCurrentState = (question: InternalQuestion) => {
  const last = question.states.findLast((state) => state.reached)
  return last?.label
}

const filteredRows = computed(() => {
  if (!questions.value) {
    return []
  }

  let filteredEntries = questions.value.filter((question) => {
    return Object.values(question).some((value) => {
      return String(value).toLowerCase().includes(questionSearchTerm.value.toLowerCase())
    })
  })

  if (selectedState.value.length > 0) {
    filteredEntries = filteredEntries.filter((question) => {
      return selectedState.value.includes(question.currentState)
    })
  }

  if (selectOpen.value.length > 0) {
    filteredEntries = filteredEntries.filter((question) => {
      return selectOpen.value.includes(question.isOpen)
    })
  }

  if (selectArchived.value.length > 0) {
    filteredEntries = filteredEntries.filter((question) => {
      return selectArchived.value.includes(question.archived)
    })
  }

  if (selectedPage.value.length > 0) {
    filteredEntries = filteredEntries.filter((question) => {
      return selectedPage.value.includes(question.pageName)
    })
  }
  if (selectedGroup.value.length > 0) {
    filteredEntries = filteredEntries.filter((question) => {
      return selectedGroup.value.includes(question.groupName)
    })
  }
  return filteredEntries
})

const selectedQuestion = ref<InternalQuestion | null>(null)
const questionDetailOpened = ref(false)
</script>
