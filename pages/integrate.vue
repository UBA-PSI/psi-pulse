<template>
  <div class="flex justify-center">
    <div class="max-w-3xl mt-10">
      <div class="flex items-center justify-between mx-auto">
        <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white mb-0">Website Owner Guide</h2>
      </div>
      <CustomCard class="mt-6">
        <div class="docs"><h1 id="introduction">Introduction</h1>
          <p>Pulse can be integrated into any website if you can access the source code. Access to the source code is
            required for a basic setup to design Pulse questions. A Pulse question can consist of question and answer
            but can also be highly customized by groups and custom states.</p>
          <h1 id="setup">Setup</h1>
          <p>To use Pulse on your website, you must include two additional resources in your <code
              class="">&lt;head&gt;</code>. The first resource is a script, which you can integrate with:</p>
          <pre class=""><code>&lt;script src="%%HOST_URL%%/integrate/pulse.min.js"&gt;&lt;/script&gt;
</code></pre>
          <p>The second resource is the design file, which you can integrate with:</p>
          <pre class=""><code>&lt;link rel="stylesheet" href="%%HOST_URL%%/integrate/pulse.min.css"&gt;
</code></pre>
          <p>Create a copy of this file and modify the properties of the classes if you want to customize the design of
            the Pulse elements.
            <br><br>
            The final step involves encapsulating all the content within your <code class="">&lt;body&gt;</code> tag
            using the <code class="">&lt;pulse-page&gt;</code> element. Assign a unique name to this <code class="">&lt;pulse-page&gt;</code>
            element. This name, which will appear in Pulse, should be descriptive of your page's content for easy
            recognition.
            <br><br>
            Post-setup, your page structure should resemble the following example:</p>
          <pre class=""><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;title&gt;Title&lt;/title&gt;

    &lt;script src="%%HOST_URL%%/public/pulse.min.js"&gt;&lt;/script&gt;
    &lt;link rel="stylesheet" href="%%HOST_URL%%/public/pulse.min.css"&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;pulse-page name="My Unique Page"&gt;
        &lt;!--...--&gt;
    &lt;/pulse-page&gt;
&lt;/body&gt;
&lt;/html&gt;
</code></pre>
          <h1 id="question-design">Question Design</h1>
          <p>After completing the initial setup, you can begin designing questions on your website using two special
            HTML elements: <code class="">&lt;pulse-question&gt;</code> and <code class="">&lt;pulse-stack&gt;</code>.
            Utilize these elements to structure and organize your questions effectively.</p>
          <h2 id="pulse-question"><a href="#pulse-question">Pulse-Question</a></h2>
          <p>Utilize the <code class="">&lt;pulse-question&gt;</code> element to create and display a question at the
            desired location on your page. This element requires attributes for both the <code class="">question</code>
            and the <code class="">answer</code>. Ensure that each question is unique to your page.
            <br><br>
            For instance, to ask "How much is the fish?" with the answer "42," you would write:</p>
          <pre class=""><code>&lt;pulse-question
    question="How much is the fish?"
    answer="42"&gt;
&lt;/pulse-question&gt;
</code></pre>
          <h2 id="pulse-stack"><a href="#pulse-stack">Pulse-Stack</a></h2>
          <p>The <code class="">&lt;pulse-stack&gt;</code> element is used when you want to display multiple questions
            in succession at the same location. Enclose the <code class="">&lt;pulse-question&gt;</code> elements within
            a <code class="">&lt;pulse-stack&gt;</code>. Note that the stack is only for organization on your page and
            doesn't affect the display or order on the Pulse website.
            <br><br>
            For example, if you want to sequentially display "What is the first index of an array?" with the answer "0",
            followed by "What is the second index of an array?" with the answer "1", use this structure:</p>
          <pre class=""><code>&lt;pulse-stack&gt;
    &lt;pulse-question
        question="What is the first index of an array?"
        answer="0"&gt;
    &lt;/pulse-question&gt;
    &lt;pulse-question
        question="What is the second index of an array?"
        answer="1"&gt;
    &lt;/pulse-question&gt;
&lt;/pulse-stack&gt;
</code></pre>
          <h2 id="groups"><a href="#groups">Groups</a></h2>
          <p>To effectively categorize related questions on Pulse, you can use the optional <code class="">group</code>
            attribute with both <code class="">&lt;pulse-question&gt;</code> and <code
                class="">&lt;pulse-stack&gt;</code> elements. If you want to group all questions within a <code
                class="">&lt;pulse-stack&gt;</code> together, apply the <code class="">group</code> attribute to the
            <code class="">&lt;pulse-stack&gt;</code> itself. Conversely, if you intend to categorize individual
            questions separately, assign the <code class="">group</code> attribute to each respective <code class="">&lt;pulse-question&gt;</code>.
            The grouping will not be visible on your website, but it will be displayed and used for organization on the
            Pulse website.
            <br><br>
            When you combine the previous examples of <code class="">&lt;pulse-question&gt;</code> and <code class="">&lt;pulse-stack&gt;</code>
            and include group assignments, your code might look something like this:</p>
          <pre class=""><code>&lt;pulse-question
    question="How much is the fish?"
    answer="42"
    group="songs"&gt;
&lt;/pulse-question&gt;

&lt;pulse-stack
    group="arrays"&gt;
    &lt;pulse-question
        question="What is the first index of an array?"
        answer="0"&gt;
    &lt;/pulse-question&gt;
    &lt;pulse-question
        question="What is the second index of an array?"
        answer="1"&gt;
    &lt;/pulse-question&gt;
&lt;/pulse-stack&gt;
</code></pre>
          <h2 id="states"><a href="#states">States</a></h2>
          <p>In Pulse, each question progresses through various states, with each state characterized by a <code
              class="">label</code> and an <code class="">offset</code> in days. By default, the questions transition
            through these predefined states:</p>


          <table>
            <thead>
            <tr>
              <th align="left">Prefix</th>
              <th align="left">Label</th>
              <th align="left">Offset</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td align="left">state-initial</td>
              <td align="left">in-text</td>
              <td align="left">0</td>
            </tr>
            <tr>
              <td align="left">state-1</td>
              <td align="left">1 day</td>
              <td align="left">1</td>
            </tr>
            <tr>
              <td align="left">state-2</td>
              <td align="left">2 days</td>
              <td align="left">2</td>
            </tr>
            <tr>
              <td align="left">state-3</td>
              <td align="left">4 days</td>
              <td align="left">4</td>
            </tr>
            <tr>
              <td align="left">state-4</td>
              <td align="left">1 week</td>
              <td align="left">7</td>
            </tr>
            <tr>
              <td align="left">state-final</td>
              <td align="left">2 weeks</td>
              <td align="left">14</td>
            </tr>
            </tbody>
          </table>
          <p>To customize these states, you can override the defaults at the <code class="">&lt;pulse-page&gt;</code>,
            <code class="">&lt;pulse-stack&gt;</code>, or <code class="">&lt;pulse-question&gt;</code> levels by using
            specific attributes. It is mandatory to redefine <code class="">state-initial</code>, <code
                class="">state-1</code>, and <code class="">state-final</code> if you're planning to override the
            default states. Optional states (<code class="">state-2</code> to <code class="">state-4</code>) can also be
            defined but ensure to maintain the sequential integrity, i.e., define <code class="">state-3</code> only if
            <code class="">state-2</code> is already defined.</p>
          <p><strong>Required</strong>:</p>
          <p>state-initial-label: string<br>
            state-initial-offset: int<br>
            state-1-label: string<br>
            state-1-offset: int<br>
            state-final-label: string<br>
            state-final-offset: int
            <strong>Optional</strong>:</p>
          <p>state-2-label: string<br>
            state-2-offset: int<br>
            state-3-label: string<br>
            state-3-offset: int<br>
            state-4-label: string<br>
            state-4-offset: int</p>
          <h1 id="changes">Changes</h1>
          <p>While you have the flexibility to modify your Pulse setup, it's important to understand that these changes
            will not be retroactively applied to the dataset of existing users. Consequently, the following implications
            will occur:</p>
          <ol>
            <li><strong>Changing <code class="">&lt;pulse-page&gt;</code> Name:</strong> If you alter the name of your
              <code class="">&lt;pulse-page&gt;</code>, all questions on that page will appear as new to any existing
              user who revisits your page.
            </li>
            <li><strong>Changing Group Attribute:</strong> Modifying the group of a <code class="">&lt;pulse-question&gt;</code>
              or a <code class="">&lt;pulse-stack&gt;</code> will result in all questions under the affected group
              appearing as new to the user.
            </li>
            <li><strong>Altering Questions:</strong> Even minor changes to the text of your <code class="">&lt;pulse-question&gt;</code>
              (including changes in capitalization or punctuation) will make the question appear as new.
            </li>
            <li><strong>Changing/Adding Custom States:</strong> If you decide to change or add custom states, be aware
              that these adjustments will only apply to new users or users who haven't interacted with the affected
              questions at least once.
            </li>
          </ol>
          <p>However, note that changes to the page's domain, title, or other content not directly related to Pulse
            functionality will not affect how questions are managed and displayed in Pulse.</p>
          <h1 id="example">Example</h1>
          <p>Here is a detailed example demonstrating all the features that Pulse offers for question design.</p>
          <pre class=""><code>&lt;pulse-page name="sandbox"&gt;
    Hello world!
    &lt;!--        Uses default pulse group and default pulse states--&gt;
    &lt;pulse-question
            question="Outer without everything"
            answer="No idea"&gt;
    &lt;/pulse-question&gt;

    Content 1
    &lt;!--        Uses default default pulse states--&gt;
    &lt;pulse-question
            question="Outer custom group"
            group="outer-group"
            answer="No idea"&gt;
    &lt;/pulse-question&gt;

    Content 2
    Content 3
    &lt;!--        Uses default pulse group--&gt;
    &lt;pulse-question
            state-initial-label="outer init state"
            state-initial-offset="0"

            state-1-label="outer first state"
            state-1-offset="1"

            state-final-label="outer final state"
            state-final-offset="2"
            question="Outer custom state"
            answer="Ring-ding-ding"&gt;
    &lt;/pulse-question&gt;

    Content 4
    &lt;pulse-stack group="stack-group"
                 state-initial-label="stack init state"
                 state-initial-offset="0"

                 state-1-label="stack first state"
                 state-1-offset="1"

                 state-final-label="stack final state"
                 state-final-offset="2"&gt;
        &lt;!--        Uses group and states of the stack--&gt;
        &lt;pulse-question
                question="Inner without everything"
                answer="No idea"&gt;
        &lt;/pulse-question&gt;

        &lt;!--        Uses states of the stack--&gt;
        &lt;pulse-question
                question="Inner custom group"
                group="inner-group"
                answer="No idea"&gt;
        &lt;/pulse-question&gt;

        &lt;!--        Uses group of the stack--&gt;
        &lt;pulse-question
                state-initial-label="inner init state"
                state-initial-offset="0"

                state-1-label="inner first state"
                state-1-offset="1"

                state-final-label="inner final state"
                state-final-offset="2"
                question="inner custom state"
                answer="Ring-ding-ding"&gt;
        &lt;/pulse-question&gt;
    &lt;/pulse-stack&gt;

    Content 5
    Content 6
&lt;/pulse-page&gt;
</code></pre>
          <h1 id="specification">Specification</h1>
          <p>In the following, you can find the specification of all Pulse elements with the required and optional
            attributes.</p>
          <h2 id="pulse-page"><a href="#pulse-page">pulse-page</a></h2>
          <p><strong>Required</strong>:<br>
            name: string<br><strong>Optional</strong>:<br>
            state-initial-label: string<br>
            state-initial-offset: int<br>
            state-1-label: string<br>
            state-1-offset: int<br>
            state-2-label: string<br>
            state-2-offset: int<br>
            state-3-label: string<br>
            state-3-offset: int<br>
            state-4-label: string<br>
            state-4-offset: int<br>
            state-final-label: string<br>
            state-final-offset: int</p>
          <h2 id="pulse-stack-1"><a href="#pulse-stack-1">pulse-stack</a></h2>
          <p><strong>Required</strong>:<br>
            none<br><strong>Optional:</strong><br>
            group: string<br>
            state-initial-label: string<br>
            state-initial-offset: int<br>
            state-1-label: string<br>
            state-1-offset: int<br>
            state-2-label: string<br>
            state-2-offset: int<br>
            state-3-label: string<br>
            state-3-offset: int<br>
            state-4-label: string<br>
            state-4-offset: int<br>
            state-final-label: string<br>
            state-final-offset: int</p>
          <h2 id="pulse-question-1"><a href="#pulse-question-1">pulse-question</a></h2>
          <p><strong>Required</strong>:<br>
            question: string<br>
            answer: string<br><strong>Optional:</strong><br>
            group: string<br>
            state-initial-label: string<br>
            state-initial-offset: int<br>
            state-1-label: string<br>
            state-1-offset: int<br>
            state-2-label: string<br>
            state-2-offset: int<br>
            state-3-label: string<br>
            state-3-offset: int<br>
            state-4-label: string<br>
            state-4-offset: int<br>
            state-final-label: string<br>
            state-final-offset: int</p></div>
      </CustomCard>
    </div>
  </div>
</template>
<script lang="ts" setup>

useHead({
  title: 'Integration'
})

definePageMeta({
  layout: "not-authenticated",
});

const runtimeConfig = useRuntimeConfig()


onMounted(async () => {
  const elements = document.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    for (let j = 0; j < element.childNodes.length; j++) {
      const node = element.childNodes[j];

      if (node.nodeType === 3) {
        const text = node.nodeValue;
        const replacedText = text.replaceAll('%%HOST_URL%%', runtimeConfig.public.HOST_URL);

        if (replacedText !== text) {
          element.replaceChild(document.createTextNode(replacedText), node);
        }
      }
    }
  }
})
</script>
