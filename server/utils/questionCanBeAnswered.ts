export const questionCanBeAnswered = (question: any) => {
    const currentDate = question.question_progress.completed_at
    switch (question.question_progress.current_state) {
        case "INITIAL":
            currentDate.setDate(currentDate.getDate() + question.question_progress.initial_state.offset)
            break
        case "STATE_1":
            currentDate.setDate(currentDate.getDate() + question.question_progress.state_1.offset)
            break
        case "STATE_2":
            if (question.question_progress.state_2 != null) {
                currentDate.setDate(currentDate.getDate() + question.question_progress.state_2.offset)
            }
            break
        case "STATE_3":
            if (question.question_progress.state_3 != null) {
                currentDate.setDate(currentDate.getDate() + question.question_progress.state_3.offset)
            }
            break
        case "STATE_4":
            if (question.question_progress.state_4 != null) {
                currentDate.setDate(currentDate.getDate() + question.question_progress.state_4.offset)
            }
            break
        case "FINAL":
            currentDate.setDate(currentDate.getDate() + question.question_progress.final_state.offset)
            break
        case "LONG_TERM":
            currentDate.setDate(currentDate.getDate() + question.question_progress.final_state.offset)
            break
    }
    return currentDate < new Date()
}
