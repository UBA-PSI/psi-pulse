# Introduction
Pulse can be integrated into any website if you can access the source code. Access to the source code is required for a basic setup to design Pulse questions. A Pulse question can consist of question and answer but can also be highly customized by groups and custom states.
# Setup
To use Pulse on your website, you must include two additional resources in your `<head>`. The first resource is a script, which you can integrate with:
```
<script src="%%HOST_URL%%/integrate/pulse.min.js"></script>
```
The second resource is the design file, which you can integrate with:
```
<link rel="stylesheet" href="%%HOST_URL%%/integrate/pulse.min.css">
```
Create a copy of this file and modify the properties of the classes if you want to customize the design of the Pulse elements.
\
\
The final step involves encapsulating all the content within your `<body>` tag using the `<pulse-page>` element. Assign a unique name to this `<pulse-page>` element. This name, which will appear in Pulse, should be descriptive of your page's content for easy recognition.
\
\
Post-setup, your page structure should resemble the following example:
```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>

    <script src="%%HOST_URL%%/public/pulse.min.js"></script>
    <link rel="stylesheet" href="%%HOST_URL%%/public/pulse.min.css">
</head>
<body>
    <pulse-page name="My Unique Page">
        <!--...-->
    </pulse-page>
</body>
</html>
```
# Question Design
After completing the initial setup, you can begin designing questions on your website using two special HTML elements: `<pulse-question>` and `<pulse-stack>`. Utilize these elements to structure and organize your questions effectively.

## Pulse-Question
Utilize the `<pulse-question>` element to create and display a question at the desired location on your page. This element requires attributes for both the `question` and the `answer`. Ensure that each question is unique to your page.
\
\
For instance, to ask "How much is the fish?" with the answer "42," you would write:
```
<pulse-question
	question="How much is the fish?"
	answer="42">
</pulse-question>
```
## Pulse-Stack
The `<pulse-stack>` element is used when you want to display multiple questions in succession at the same location. Enclose the `<pulse-question>` elements within a `<pulse-stack>`. Note that the stack is only for organization on your page and doesn't affect the display or order on the Pulse website.
\
\
For example, if you want to sequentially display "What is the first index of an array?" with the answer "0", followed by "What is the second index of an array?" with the answer "1", use this structure:
```
<pulse-stack>
	<pulse-question
		question="What is the first index of an array?"
		answer="0">
	</pulse-question>
	<pulse-question
		question="What is the second index of an array?"
		answer="1">
	</pulse-question>
</pulse-stack>
```
## Groups
To effectively categorize related questions on Pulse, you can use the optional `group` attribute with both `<pulse-question>` and `<pulse-stack>` elements. If you want to group all questions within a `<pulse-stack>` together, apply the `group` attribute to the `<pulse-stack>` itself. Conversely, if you intend to categorize individual questions separately, assign the `group` attribute to each respective `<pulse-question>`. The grouping will not be visible on your website, but it will be displayed and used for organization on the Pulse website.
\
\
When you combine the previous examples of `<pulse-question>` and `<pulse-stack>` and include group assignments, your code might look something like this:
```
<pulse-question
	question="How much is the fish?"
	answer="42"
	group="songs">
</pulse-question>

<pulse-stack
	group="arrays">
	<pulse-question
		question="What is the first index of an array?"
		answer="0">
	</pulse-question>
	<pulse-question
		question="What is the second index of an array?"
		answer="1">
	</pulse-question>
</pulse-stack>
```
## States
In Pulse, each question progresses through various states, with each state characterized by a `label` and an `offset` in days. By default, the questions transition through these predefined states:   
|    Prefix | Label | Offset |
|:--------------|:----------|:-----------|
| state-initial |   in-text |          0 |
|       state-1 |     1 day |          1 |
|       state-2 |    2 days |          2 |
|       state-3 |    4 days |          4 |
|       state-4 |    1 week |          7 |
|   state-final |   2 weeks |         14 |

To customize these states, you can override the defaults at the `<pulse-page>`, `<pulse-stack>`, or `<pulse-question>` levels by using specific attributes. It is mandatory to redefine `state-initial`, `state-1`, and `state-final` if you're planning to override the default states. Optional states (`state-2` to `state-4`) can also be defined but ensure to maintain the sequential integrity, i.e., define `state-3` only if `state-2` is already defined.

**Required**:

state-initial-label: string   
state-initial-offset: int   
state-1-label: string   
state-1-offset: int   
state-final-label: string   
state-final-offset: int
**Optional**:

state-2-label: string   
state-2-offset: int   
state-3-label: string   
state-3-offset: int   
state-4-label: string   
state-4-offset: int
# Changes
While you have the flexibility to modify your Pulse setup, it's important to understand that these changes will not be retroactively applied to the dataset of existing users. Consequently, the following implications will occur:
1. **Changing `<pulse-page>` Name:** If you alter the name of your `<pulse-page>`, all questions on that page will appear as new to any existing user who revisits your page.
2. **Changing Group Attribute:** Modifying the group of a `<pulse-question>` or a `<pulse-stack>` will result in all questions under the affected group appearing as new to the user.
3. **Altering Questions:** Even minor changes to the text of your `<pulse-question>` (including changes in capitalization or punctuation) will make the question appear as new.
4. **Changing/Adding Custom States:** If you decide to change or add custom states, be aware that these adjustments will only apply to new users or users who haven't interacted with the affected questions at least once.

However, note that changes to the page's domain, title, or other content not directly related to Pulse functionality will not affect how questions are managed and displayed in Pulse.
# Example
Here is a detailed example demonstrating all the features that Pulse offers for question design.
```
<pulse-page name="sandbox">
	Hello world!
    <!--        Uses default pulse group and default pulse states-->
    <pulse-question
            question="Outer without everything"
            answer="No idea">
    </pulse-question>
	
	Content 1
    <!--        Uses default default pulse states-->
    <pulse-question
            question="Outer custom group"
            group="outer-group"
            answer="No idea">
    </pulse-question>

	Content 2
	Content 3
    <!--        Uses default pulse group-->
    <pulse-question
            state-initial-label="outer init state"
            state-initial-offset="0"

            state-1-label="outer first state"
            state-1-offset="1"

            state-final-label="outer final state"
            state-final-offset="2"
            question="Outer custom state"
            answer="Ring-ding-ding">
    </pulse-question>

	Content 4
    <pulse-stack group="stack-group"
                 state-initial-label="stack init state"
                 state-initial-offset="0"

                 state-1-label="stack first state"
                 state-1-offset="1"

                 state-final-label="stack final state"
                 state-final-offset="2">
        <!--        Uses group and states of the stack-->
        <pulse-question
                question="Inner without everything"
                answer="No idea">
        </pulse-question>

        <!--        Uses states of the stack-->
        <pulse-question
                question="Inner custom group"
                group="inner-group"
                answer="No idea">
        </pulse-question>

        <!--        Uses group of the stack-->
        <pulse-question
                state-initial-label="inner init state"
                state-initial-offset="0"

                state-1-label="inner first state"
                state-1-offset="1"

                state-final-label="inner final state"
                state-final-offset="2"
                question="inner custom state"
                answer="Ring-ding-ding">
        </pulse-question>
    </pulse-stack>

	Content 5
	Content 6
</pulse-page>
```
# Specification
In the following, you can find the specification of all Pulse elements with the required and optional attributes.
## pulse-page
**Required**:   
name: string   
**Optional**:   
state-initial-label: string   
state-initial-offset: int   
state-1-label: string   
state-1-offset: int   
state-2-label: string   
state-2-offset: int   
state-3-label: string   
state-3-offset: int   
state-4-label: string   
state-4-offset: int   
state-final-label: string   
state-final-offset: int
## pulse-stack
**Required**:   
none   
**Optional:**   
group: string   
state-initial-label: string   
state-initial-offset: int   
state-1-label: string   
state-1-offset: int   
state-2-label: string   
state-2-offset: int   
state-3-label: string   
state-3-offset: int   
state-4-label: string   
state-4-offset: int   
state-final-label: string   
state-final-offset: int
## pulse-question
**Required**:   
question: string   
answer: string   
**Optional:**   
group: string   
state-initial-label: string   
state-initial-offset: int   
state-1-label: string   
state-1-offset: int   
state-2-label: string   
state-2-offset: int   
state-3-label: string   
state-3-offset: int   
state-4-label: string   
state-4-offset: int   
state-final-label: string   
state-final-offset: int   
