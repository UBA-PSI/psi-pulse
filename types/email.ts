export interface EmailEntry {
    token: string,
    questions: EmailQuestion[],
}

export interface EmailQuestion {
    page: string,
    group: string,
    text: string,
    id: string,
    token: string,
}

export interface SimpleEmailPage {
    id: string,
    name: string,
    groups: SimpleEmailGroup[],
}

export interface SimpleEmailGroup {
    id: string,
    name: string,
    questions: SimpleEmailQuestion[],
}

export interface SimpleEmailQuestion {
    id: string,
    text: string,
    token: string | null,
    page: string,
    group: string,
}
