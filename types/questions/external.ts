import type {SimpleQuestionState} from "~/types/questions/questions";

export interface ExternalQuestionPutBody {
    key?: string,
    question: string,
    answer: string,
    hash: string,
    groupName: string,
    pageName: string,
    pageUrl: string,
    remembered: boolean,
    states: ExternalQuestionStatesPutBody | null,
}

export interface ExternalQuestionStatesPutBody {
    initialStateLabel: string,
    initialStateOffset: number,
    state1Label: string,
    state1Offset: number,
    state2Label: string | null
    state2Offset: number | null,
    state3Label: string | null,
    state3Offset: number | null,
    state4Label: string | null,
    state4Offset: number | null,
    finalStateLabel: string,
    finalStateOffset: number,
}

export interface ExternalQuestionPostBody {
    remembered: boolean,
    pageName: string,
    // Embed v2: aktueller Text, damit Mails nach Textkorrekturen (bei gleichem key) stimmen
    question?: string,
    answer?: string,
}

export interface ExternalQuestion {
    hash: string,
    pageName?: string,
    isOpen: boolean,
    states: SimpleQuestionState[]
}
export interface ExternalQuestionState {
    label: string,
    reached: boolean,
}
