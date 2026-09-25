import type {SimpleQuestionState} from "~/types/questions/questions";
import {CurrentState} from "@prisma/client";

export interface InternalQuestion {
    pageName: string,
    pageUrl: string
    groupName: string,
    id: string,
    hash: string,
    question: string,
    answer: string,
    archived: boolean,
    isOpen: boolean,
    currentState: CurrentState,
    waitingForRemembered: boolean,
    states: SimpleQuestionState[]
    activeState: QuestionActiveState
    activeSince: Date | null
}

export enum QuestionActiveState {
    ACTIVE = "ACTIVE",
    PENDING = "PENDING",
    NEGLECTED = "NEGLECTED"
}
