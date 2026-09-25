# Introduction

Pulse is a web application for learning flashcards based on spaced repetition. Spaced repetition can be defined as [a method of reviewing material at systematic intervals](https://www.kpu.ca/sites/default/files/Learning%20Centres/Think_SpacedRepetition_LA.pdf). At systematic intervals, Pulse shows the users questions he added previously by visiting websites that integrate Pulse in their texts by designing Pulse questions. The user must then answer if he remembered the Pulse question's answer (further called 'answer the question.' Depending on whether the user remembered or not, the question will be asked by Pulse more or less frequently.

# Question Lifecycle
A Pulse question walks through different states to archive spaced repetition. Additional features are implemented in Pulse to increase the effectiveness of the spaced repetition.
\
\
The lifecycle of a question always begins at a third-party website. The third-party website implements Pulse and provides designed Pulse questions. Each Pulse question consists of a question, an answer to the question, the current page name, and the states it walks through. Additionally, a group can be defined to categorize the questions further within a page. By answering the question once, the question is added to the user's account, and stepping through the different states starts. More information about the design of Pulse questions can be found in the [website owner guide](/integrate).
\
\
Each question can walk through a maximum of six states. Each state is characterized by a label and an offset. The offset describes how many days the question is open to be answered again in its current state (further called 'question is open'). While the first state describes how many days the question is asked again if the user cannot remember answering it for the first time, the final state defines how many times the user gets asked the question again if he can always remember. The state will increase if the user remembers the answer to a question again and has not previously forgotten it. The state will not increase but stay the same if the user previously forgot the answer to the question. The state will also stay the same if the user has previously remembered the question but has now forgotten it. If the user forgets a question twice in a row, the question falls back to the previous state. Overall, the goal is to keep all questions in their final state.
\
\
Pulse introduces an additional property to the Pulse question to increase user motivation. This property describes how active a user is learning a question. A question is *active* if the user always answers the question within the current state's offset since the question is opened. If the user misses answering the question within the offset once, the question is *neglected*. Answering then the question again with the offset, it switches to *pending*. After answering the question two times in a row, the question is marked as active again. How many of the added questions are active are displayed on the user's home screen. Additionally, on the home screen, the oldest active question is displayed. Both types of information should motivate the user to continue learning.
\
\
There are two options if the user does not want to be asked a question again. The first option is to archive the question. The question will not be checked for being opened. The second option is to delete the question entirely.
# Emails
Pulse features additional types of emails besides the required login email containing the magic link. These additional types aim to increase interaction with Pulse and, therefore, the learning effectivity.
## Reminder
Reminder emails help the user become aware of open questions and keep them active. A reminder email is sent once a day and contains a maximum of six non-archived open questions. If there are more than six open questions, the questions get selected randomly. All remaining questions walk through the same process the following day as long as they are not sent out.
\
\
A reminder email consists of two important elements. The first element is the list of the selected questions. For each question, a dedicated answer button exists, enabling answering only chosen questions. The second element is the *answer all questions* button, so the user does not need to open all questions after each other.
\
\
Reminders are enabled by default but can be disabled. If reminders are enabled, the user can customize the preferred delivery time.
## Weekly
The goal of weekly emails is to keep the user active by sending out a number of random, non-archived questions once a week. Sending out an email once a week prevents complete silence of Pulse in case all questions are in states with an offset of more than a week. Answering all questions of the weekly emails within a week rewards the user with an increase in the user's weekly streak. The weekly streak is displayed on the user's home screen next to the active questions and the oldest active question. Answering and not remembering the questions will only drop questions from the long-term state to the final state but will not further affect the question.
\
\
Weekly emails are enabled by default but can be disabled by the user. They are automatically disabled if reminders and, therefore, emails are disabled entirely. If weeklies are enabled, the user can customize the preferred delivery day, time, and number of maximum selected questions.
