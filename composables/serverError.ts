import type {FetchError} from "ofetch"

// Meldung für Fehler von /api/login und /api/signup. Nicht über form.setErrors(): UForm validiert kurz nach dem
// Absenden erneut und leert dabei die Fehlerliste, die Meldung war so nie zu sehen. Die App ist noch englisch.
export const serverErrorMessage = (e: unknown): string => {
    const err = e as FetchError
    const status = err?.response?.status
    const message = err?.response?._data?.message
    if (message === "Invalid email") return "Please enter a valid email address."
    if (message === "Invalid name") return "This name cannot be used. Leave it empty, or use a name without links, email addresses or angle brackets."
    if (status === 429) return "Too many requests. Please wait a moment and try again."
    return "Something went wrong. Please try again later."
}
