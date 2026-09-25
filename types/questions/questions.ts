export interface SimpleQuestionState {
    label: string,
    reached: boolean,
}

export interface ProgressState {
    label: string,
    state: ProgressQuestionStateEn,
}

export enum ProgressQuestionStateEn {
    REACHED = "REACHED",
    LEAVING = "LEAVING",
    NOT_REACHED = "NOT_REACHED",
    UNCERTAIN = "UNCERTAIN",
}
export interface SimpleQuestionUpdate {
    remembered: boolean | null,
    archived: boolean | null,
}
