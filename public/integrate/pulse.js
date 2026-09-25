let stacks = {};
let standaloneQuestions = [];
let loadedQuestions = null;
let openQuestions = null;
let answeredQuestions = 0

const host = '%%HOST_URL%%';
let loggedIn = false;

document.addEventListener('DOMContentLoaded', async function () {
    await setQuestionIds();
    const token = getStoredToken();
    createFloatingState();
    if (token) {
        try {
            await loadQuestionsFromServer(token);
            loggedIn = true;
            await initQuestions()
        } catch {
            if (loadedQuestions.statusCode === 401) {
                initLogBackIn()
            } else {
                await initQuestions()
            }
        }
    } else {
        await initQuestions()
    }

    if (!token || loadedQuestions === null || loadedQuestions.statusCode === 401) {
        pollToken()
    }
});

async function getLoadedQuestionByString(elem) {
    const hashOfQuestion = await sha1(elem.getAttribute('question'));
    return loadedQuestions.find((loadedQuestion) => {
        return loadedQuestion.hash === hashOfQuestion;
    });
}

async function initQuestions() {
    document.querySelectorAll('pulse-stack').forEach((stack, index) => {
        stacks[`stack_${index}`] = {
            element: stack,
            questions: Array.from(stack.querySelectorAll('pulse-question'))
        };
    });

    standaloneQuestions = Array.from(document.querySelectorAll('pulse-page pulse-question:not(pulse-stack pulse-question)'));

    for (const stackKey in stacks) {
        if (loadedQuestions) {
            let atLeastOneQuestionIsOpen = false
            for (const question of stacks[stackKey].questions) {
                const loadedQuestion = await getLoadedQuestionByString(question);
                if (loadedQuestion && loadedQuestion.isOpen === true) {
                    atLeastOneQuestionIsOpen = true
                }
            }
            if (atLeastOneQuestionIsOpen) {
                stacks[stackKey].questions = stacks[stackKey].questions.filter((question) => {
                    const loadedQuestion = loadedQuestions.find((loadedQuestion) => {
                        return loadedQuestion.hash === question.id;
                    });
                    return loadedQuestion.isOpen === true;
                });
            }
        }
        if (stacks[stackKey].questions.length > 0) {
            await transformPulseQuestionToQuestion(stacks[stackKey].questions[0], stackKey, getStates(stacks[stackKey].element), stacks[stackKey].element.getAttribute('group'));
        }
    }

    standaloneQuestions.forEach(question => {
        transformPulseQuestionToQuestion(question, undefined, undefined, undefined);
    });
}

function initLogBackIn() {
    document.querySelectorAll('pulse-stack').forEach((stack, index) => {
        transformPulseQuestionToLogBackIn(stack).then(() => {
        });
    });

    standaloneQuestions = Array.from(document.querySelectorAll('pulse-page pulse-question:not(pulse-stack pulse-question)'));
    standaloneQuestions.forEach(question => {
        transformPulseQuestionToLogBackIn(question).then(() => {
        });
    });
}

async function transformPulseQuestionToLogBackIn(pulseQuestionElement) {
    const newDivElement = document.createElement('div');
    newDivElement.className = 'pulse-background';
    newDivElement.innerHTML = `
                <h3 class="pulse-headline">Log Back In</h3>
                <div id="content">
                <p class="pulse-answer">Your login expired. Please log in again.</p>
                    <button id="loginBtn" class="pulse-button">Log In</button>
                </div>
                `;
    newDivElement.querySelector('#loginBtn').addEventListener('click', function () {
        const iframe = document.createElement('iframe');
        iframe.src = host + '/login';
        iframe.width = '100%';
        iframe.height = '550px';

        newDivElement.querySelector('#content').replaceChildren(iframe);
    });
    pulseQuestionElement.replaceChildren(newDivElement)
}

async function setQuestionIds() {
    standaloneQuestions = Array.from(document.querySelectorAll('pulse-page pulse-question'));
    for (const question of standaloneQuestions) {
        const idSpan = document.createElement('span');
        const questionText = question.getAttribute('question');
        const hashOfQuestion = await sha1(questionText);
        question.id = hashOfQuestion;
    }
    const hash = window.location.hash;
    if (hash) {
        const cleanHash = hash.substring(1);
        const targetElement = document.querySelector(`[id="${cleanHash}"]`);
        if (targetElement) {
            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - 50,
                behavior: 'smooth'
            });
        }
    }
}

function pollToken() {
    window.addEventListener("message", async function (e) {
        localStorage.setItem('pulse-token', e.data);
        loggedIn = true;
        const storedQuestions = getQuestionsFromLocalStorage();
        if (storedQuestions) {
            for (const storedQuestion of storedQuestions) {
                await createQuestion(storedQuestion);
            }
            localStorage.removeItem('pulse-questions');
        }
        await loadQuestionsFromServer(e.data);
        await initQuestions();
    }, false);
}

function getStoredToken() {
    return localStorage.getItem('pulse-token')
}


async function loadQuestionsFromServer(token) {
    const options = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-KEY': token
        }
    };
    const loadedQuestions1 = await fetch(host + '/api/v1/questions', options);
    loadedQuestions = await loadedQuestions1.json();
    openQuestions = loadedQuestions.filter((question) => {
        return question.isOpen === true;
    }).length;
    updateFloatingState();
}

function createFloatingState() {
    const button = document.createElement("button");
    button.className = "pulse-state";
    button.textContent = "Powered by Pulse";
    button.addEventListener("click", function () {
        window.open(host + "/explanation");
    });
    const pulsePage = document.querySelector("pulse-page");
    pulsePage.appendChild(button);
}

function updateFloatingState() {
    const floatingElement = document.querySelector('.pulse-state');
    if (floatingElement) {
        if (openQuestions === 0) {
            floatingElement.innerHTML = 'No open questions';
        } else {
            floatingElement.innerHTML = `${answeredQuestions} / ${openQuestions}`;
        }
    }
}

async function sha1(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function transformPulseQuestionToLogin(pulseQuestionElement) {
    const newDivElement = document.createElement('div');
    newDivElement.innerHTML = `
                <h3 class="pulse-headline">Save Questions</h3>
                <div id="content">
                <p class="pulse-answer">If you want to save these questions and get regularly questioned, <br>you can sign up at Pulse.</p>
                    <button id="loginBtn" class="pulse-button">Sign Up</button>
                </div>
                `;
    newDivElement.querySelector('#loginBtn').addEventListener('click', function () {
        const iframe = document.createElement('iframe');
        iframe.src = host + '/signup';
        iframe.width = '100%';
        iframe.height = '550px';

        newDivElement.querySelector('#content').replaceChildren(iframe);
    });
    pulseQuestionElement.replaceChildren(newDivElement)
}

async function removeQuestionFromStack(stackKey) {
    const removed = stacks[stackKey].questions.shift();
    if (stacks[stackKey].questions.length > 0) {
        await transformPulseQuestionToQuestion(stacks[stackKey].questions[0], stackKey, getStates(stacks[stackKey].element), stacks[stackKey].element.getAttribute('group'));
    } else {
        if (loggedIn) {
            const newDivElement = document.createElement('div');
            newDivElement.className = 'pulse-background';
            newDivElement.innerHTML = 'No questions left';
            removed.replaceChildren(newDivElement);
        } else {
            removed.children[0].hidden = false;
            await transformPulseQuestionToLogin(removed.children[0])
        }
    }
}

async function displayEndOfQuestions(element, customText) {
    if (loggedIn) {
        element.innerHTML = customText;
    } else {
        await transformPulseQuestionToLogin(element)
    }
}

async function transformPulseQuestionToQuestion(pulseQuestionElement, stackKey, stackStates, stackGroup) {
    const question = pulseQuestionElement.getAttribute('question');
    const answer = pulseQuestionElement.getAttribute('answer');

    let questionStates = getStates(pulseQuestionElement);
    if (!questionStates) {
        questionStates = stackStates;
    }

    let questionGroup = pulseQuestionElement.getAttribute('group');
    if (!questionGroup) {
        questionGroup = stackGroup;
    }
    const newDivElement = document.createElement('div');


    const hashOfQuestion = await sha1(question);
    newDivElement.className = 'pulse-background';
    if (stackKey) {
        newDivElement.setAttribute('stack-key', stackKey)
    }

    let loadedQuestion = undefined

    if (loadedQuestions) {
        loadedQuestion = loadedQuestions.find((loadedQuestion) => {
            return loadedQuestion.hash === hashOfQuestion;
        });
    }

    if (loadedQuestion) {
        if (loadedQuestion.isOpen === true) {
            newDivElement.innerHTML = `
                    <h3>${question}</h3>
                     <div>
                        <button class="pulse-button" id="showBtn">Show Answer</button>
                    </div>
                    <div hidden id="answerDiv">
                        <p class="pulse-answer">${answer}</p>
                        <div>
                        <button id="forgetBtn" class="pulse-button">Forgotten</button>
                        <button id="rememberBtn" class="pulse-button">Remembered</button>
                        </div>
                    </div>
                    `;

            newDivElement.querySelector('#showBtn').addEventListener('click', function () {
                this.style.display = 'none';
                newDivElement.querySelector('#answerDiv').removeAttribute('hidden');
            });

            const rememberBtn = newDivElement.querySelector('#rememberBtn');
            const forgetBtn = newDivElement.querySelector('#forgetBtn');

            rememberBtn.addEventListener('click', async function () {
                await updateQuestion(hashOfQuestion, true);
                await displayEndOfQuestions(newDivElement, 'Answered')

                if (stackKey) {
                    newDivElement.hidden = true;
                    await removeQuestionFromStack(stackKey);
                }
            });

            forgetBtn.addEventListener('click', async function () {
                await updateQuestion(hashOfQuestion, false);
                await displayEndOfQuestions(newDivElement, 'Answered')

                if (stackKey) {
                    newDivElement.hidden = true;
                    await removeQuestionFromStack(stackKey);
                }
            });
        } else {
            newDivElement.innerHTML = `
                    <h3>${question}</h3>
                    <p class="pulse-answer">The question is not open to answer.</p>
                `;
        }
    } else {
        newDivElement.innerHTML = `
                    <div class="pulse-header-container">
                        <h3 class="pulse-headline">${question}</h3>
                        <div class="question-text">You haven't encountered this question before.</div>
                    </div>
                    <div>
                        <button class="pulse-button" id="showBtn">Show Answer</button>
                    </div>
                    <div hidden id="answerDiv">
                        <p class="pulse-answer">${answer}</p>
                        <div>
                        <button id="forgetBtn"  class="pulse-button">Forgotten</button>
                        <button id="rememberBtn" class="pulse-button">Remembered</button>
                        </div>
                    </div>
                `;

        newDivElement.querySelector('#showBtn').addEventListener('click', function () {
            this.style.display = 'none';
            newDivElement.querySelector('#answerDiv').removeAttribute('hidden');
        });

        const rememberBtn = newDivElement.querySelector('#rememberBtn');
        const forgetBtn = newDivElement.querySelector('#forgetBtn');

        const website = window.location.href;
        const section = "section 1"


        rememberBtn.addEventListener('click', async function () {
            await someHowSaveQuestion(hashOfQuestion, question, answer, true, section, website, questionGroup, questionStates);

            if (stackKey) {
                newDivElement.hidden = true;
                await removeQuestionFromStack(stackKey);
            } else {
                await displayEndOfQuestions(newDivElement, 'Answered')
            }
        });

        forgetBtn.addEventListener('click', async function () {
            await someHowSaveQuestion(hashOfQuestion, question, answer, false, section, website, questionGroup, questionStates);

            if (stackKey) {
                newDivElement.hidden = true;
                await removeQuestionFromStack(stackKey);
            } else {
                await displayEndOfQuestions(newDivElement, 'Answered')
            }
        });
    }

    pulseQuestionElement.replaceChildren(newDivElement);
}


function getStates(element) {
    const stateInitialLabel = element.getAttribute('state-initial-label');
    const stateInitialOffset = parseInt(element.getAttribute('state-initial-offset'));
    const state1Label = element.getAttribute('state-1-label');
    const state1Offset = parseInt(element.getAttribute('state-1-offset'));
    const state2Label = element.getAttribute('state-2-label');
    const state2Offset = parseInt(element.getAttribute('state-2-offset'));
    const state3Label = element.getAttribute('state-3-label');
    const state3Offset = parseInt(element.getAttribute('state-3-offset'));
    const state4Label = element.getAttribute('state-4-label');
    const state4Offset = parseInt(element.getAttribute('state-4-offset'));
    const stateFinalLabel = element.getAttribute('state-final-label');
    const stateFinalOffset = parseInt(element.getAttribute('state-final-offset'));
    if (stateInitialLabel !== null && stateInitialOffset !== null && state1Label !== null && state1Offset !== null && stateFinalLabel !== null && stateFinalOffset !== null) {
        return {
            initialStateLabel: stateInitialLabel,
            initialStateOffset: stateInitialOffset,
            state1Label: state1Label,
            state1Offset: state1Offset,
            state2Label: state2Label,
            state2Offset: state2Offset,
            state3Label: state3Label,
            state3Offset: state3Offset,
            state4Label: state4Label,
            state4Offset: state4Offset,
            finalStateLabel: stateFinalLabel,
            finalStateOffset: stateFinalOffset,
        }
    } else {
        return null
    }
}

function saveQuestionToLocalStorage(body) {
    let newData
    let questions = JSON.parse(localStorage.getItem('pulse-questions'));
    if (questions) {
        questions = questions.filter((question) => {
            return question.hash !== body.hash
        });
        questions.push(body)
        newData = questions;
    } else {
        newData = [body]
    }
    localStorage.setItem('pulse-questions', JSON.stringify(newData));
}

function getQuestionsFromLocalStorage() {
    return JSON.parse(localStorage.getItem('pulse-questions'));
}

async function someHowSaveQuestion(questionId, question, answer, remembered, section, website, group, states) {
    const body = generateSaveQuestionBody(questionId, question, answer, remembered, section, website, group, states);
    if (loggedIn) {
        await createQuestion(body);
    } else {
        saveQuestionToLocalStorage(body);
    }
}

function generateSaveQuestionBody(questionId, question, answer, remembered, section, website, group, states) {
    const pulsePageElement = document.querySelector('pulse-page');
    const pageName = pulsePageElement.getAttribute('name');
    if (!states) {
        states = getStates(pulsePageElement)
    }

    return {
        question: question,
        answer: answer,
        hash: questionId,
        groupName: group,
        pageName: pageName,
        pageUrl: website,
        remembered: remembered,
        states: states,
    }
}

async function createQuestion(body) {
    const token = getStoredToken();

    const options = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Host': 'api.producthunt.com',
            'X-API-KEY': token
        },
        body: JSON.stringify(body)
    }
    const response = await fetch(host + '/api/v1/questions', options);
}

async function updateQuestion(questionId, remembered) {
    const token = getStoredToken();
    const pulsePageElement = document.querySelector('pulse-page');
    const pageName = pulsePageElement.getAttribute('name');
    answeredQuestions++;
    updateFloatingState();

    const options = {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Host': 'api.producthunt.com',
            'X-API-KEY': token
        },
        body: JSON.stringify({
            remembered: remembered,
            pageName: pageName,
        })
    }
    const response = await fetch(host + `/api/v1/questions/${questionId}`, options);
}
