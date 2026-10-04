// The narrative. Each stage is a list of scenes. In reading mode they stack;
// in presenter mode each scene is one screen. `notes` are speaker notes.

import type { ReactNode } from "react";
import { BigIdea, Callout, CodeBlock, Prose, T, type Question } from "../components/ui.tsx";
import { AttentionDemo, EmbeddingDemo, NextTokenDemo, TinyLMDemo, TokenizerDemo } from "../demos/model.tsx";
import { BaseVsChatDemo, ChatTemplateDemo, ContextBudgetDemo, MemoryDemo, RagDemo } from "../demos/conversation.tsx";
import { BuildChecklist, FimDemo, Habits, MythsDemo, ProductMap, Timeline, ToolHarnessDemo, ToolsTable } from "../demos/agent.tsx";
import { Workbench } from "../demos/Workbench.tsx";
import {
  AgentAnatomy,
  AgentLoopDiagram,
  CachingDiagram,
  FeedbackLoop,
  McpDiagram,
  MemoryLayers,
  ModelPipeline,
  RagPipeline,
  RLLoop,
  StatelessSequence,
  SubagentsDiagram,
  TextToAction,
  ToolSequence,
  TrainingPipeline,
} from "../diagrams/diagrams.tsx";
import { readFileTool } from "../../agent/lib/tool-definitions.ts";
import agentsMd from "../../agent/project/AGENTS.md?raw";
import step2 from "../../agent/step-2-memory.ts?raw";
import step5 from "../../agent/step-5-loop.ts?raw";
import step7 from "../../agent/step-7-production.ts?raw";
import { href } from "../lib/router.ts";

export type Scene = {
  id: string;
  title: string;
  notes?: string;
  body: () => ReactNode;
};

export type Chapter = { scenes: Scene[]; quiz: Question[] };

/** Cut a snippet out of a source file, from the line containing `from` to the line containing `to`. */
function excerpt(source: string, from: string, to: string): string {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.includes(from));
  const end = lines.findIndex((l, i) => i > start && l.includes(to));
  if (start < 0 || end < 0) throw new Error(`excerpt markers not found: ${from} … ${to}`);
  return lines.slice(start, end + 1).join("\n");
}

const LOOP = `${excerpt(step5, "const messages: Message[]", "results(messages.at(-1)!);")}\n}`;

export const CHAPTERS: Record<string, Chapter> = {
  // ===========================================================================
  llm: {
    scenes: [
      {
        id: "function",
        title: "An LLM is a function",
        notes:
          "Open with the thesis of the whole talk. Everything today is ordinary code around this one function. Ask: who has called an LLM API? Who has wondered what actually happens?",
        body: () => (
          <>
            <BigIdea>
              An <T id="llm">LLM</T> is a function. <mark>Tokens in, a probability for every possible next token out.</mark>
            </BigIdea>
            <CodeBlock
              title="The entire interface"
              code={`type Token = number;                      // an ID from the vocabulary
type Probabilities = Map<Token, number>;  // ~100,000+ entries that sum to 1

declare function llm(context: Token[]): Probabilities;`}
            />
            <Prose>
              <p>
                It doesn't look things up, run code, or remember you. It predicts what comes next. Chat, memory, tools and
                agents are all ordinary code you write around this one function, and by the end of this guide you'll have
                seen every piece.
              </p>
            </Prose>
            <Callout kind="analogy" title="For frontend engineers">
              Think of it as a pure function, like a reducer. Same input, a probability distribution out, no side effects,
              no state between calls. The surprising part is how much you can build with it.
            </Callout>
          </>
        ),
      },
      {
        id: "tokens",
        title: "Tokens: what the model actually reads",
        notes:
          "Click through the presets. Highlight: JSON and code cost more than you'd think; Hindi costs several times more than English; 'strawberry' splits into chunks, which is why letter counting fails.",
        body: () => (
          <>
            <Prose>
              <p>
                Models don't see characters or words. A <T id="tokenizer">tokenizer</T> splits text into{" "}
                <T id="token">tokens</T> (common words, word pieces, punctuation, runs of spaces) and replaces each with a
                number. In English one token is about 4 characters.
              </p>
              <p>
                This matters because everything is measured in tokens: the <T id="context-window">context window</T>, the
                price, the speed, the output limit.
              </p>
            </Prose>
            <TokenizerDemo />
          </>
        ),
      },
      {
        id: "next-token",
        title: "Predicting the next token",
        notes:
          "Start with useState: 90% confidence, temperature does little. Switch to 'favourite colour' and sample 20 times at 0.2, then at 1.8. Point: same prompt, different outputs, by design. Top-p cuts the tail.",
        body: () => (
          <>
            <Prose>
              <p>
                That's <T id="next-token-prediction">next-token prediction</T>. The model outputs a score (
                <T id="logits">logits</T>) for every token in its <T id="vocabulary">vocabulary</T>, turned into
                probabilities. Then <T id="sampling">sampling</T> picks one, it's appended, and the whole thing
                runs again. Generating a 500-token answer means 500 runs.
              </p>
              <p>
                <T id="temperature">Temperature</T> and <T id="top-p">top-p</T> control how adventurous the pick is. That's
                why the same question can get different answers.
              </p>
            </Prose>
            <NextTokenDemo />
          </>
        ),
      },
      {
        id: "inside",
        title: "Inside the box",
        notes:
          "Don't go deep on maths. The pipeline diagram is the whole story: tokens become vectors, attention layers mix information between them, out come probabilities. Use the embedding map to show 'meaning as position', and click 'it' in the attention demo.",
        body: () => (
          <>
            <ModelPipeline />
            <Prose>
              <p>
                Each token ID becomes an <T id="embedding">embedding</T>: a long list of numbers where similar meanings sit
                close together. A <T id="transformer">Transformer</T> then runs dozens of layers of{" "}
                <T id="attention">attention</T>, where every token gathers information from the tokens before it. The
                billions of numbers that make this work are the model's <T id="parameters">parameters</T>, set during{" "}
                <T id="training">training</T> and frozen afterwards. Running the trained model is called{" "}
                <T id="inference">inference</T>, and every API call is one.
              </p>
            </Prose>
            <div className="split">
              <EmbeddingDemo />
              <AttentionDemo />
            </div>
          </>
        ),
      },
      {
        id: "tiny",
        title: "Build one in 40 lines",
        notes:
          "This is a real model, just a terrible one. Edit the corpus live: add a sentence and generate again. The point: training is learning statistics of text, inference is using them. A real LLM swaps the count table for a neural network.",
        body: () => (
          <>
            <Prose>
              <p>
                This one predicts the next word by counting which word followed the previous two in its training text.
                It's a real language model, just a tiny one. Notice it can't answer questions or follow instructions. It
                only continues text.
              </p>
            </Prose>
            <TinyLMDemo />
            <Callout title="Run it yourself">
              <code>npm run agent:0 -- "The test"</code> runs the same model in your terminal.{" "}
              <a href={href.code("step-0-complete")}>Read step 0</a>.
            </Callout>
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "You send an LLM the same prompt twice and get two different answers. Why?",
        options: ["It learned from the first request", "It samples the next token from a probability distribution", "The servers have different versions"],
        answer: 1,
        explain: "Each token is sampled. With temperature above zero, less likely tokens are sometimes picked, so outputs vary.",
      },
      {
        q: "Your 200K-token context window is roughly how much English text?",
        options: ["200K characters", "About 150K words", "200K lines"],
        answer: 1,
        explain: "A token is about ¾ of an English word, so 200K tokens is about 150K words. Code and other languages use more tokens.",
      },
    ],
  },

  // ===========================================================================
  chat: {
    scenes: [
      {
        id: "base-vs-chat",
        title: "From autocomplete to assistant",
        notes:
          "The base model 'Fix the bug' example gets a laugh: it writes a GitHub issue. Point: answering is learned behaviour, added by fine-tuning and RLHF. The prediction engine is unchanged.",
        body: () => (
          <>
            <Prose>
              <p>
                A model fresh out of <T id="pretraining">pretraining</T> is a <T id="base-model">base model</T>. Give it a
                question and it continues the text the way the internet would, often with more questions. To get an
                assistant, it's trained further on example conversations (<T id="fine-tuning">fine-tuning</T>) and on
                human preferences (<T id="rlhf">RLHF</T>).
              </p>
            </Prose>
            <BaseVsChatDemo />
            <TrainingPipeline />
          </>
        ),
      },
      {
        id: "roles",
        title: "Roles are just text",
        notes:
          "Toggle to 'What the model reads'. The chat UI, the JSON and the token string are the same conversation. This demystifies the API: messages is an array you build.",
        body: () => (
          <>
            <Prose>
              <p>
                Chat APIs take a <T id="system-prompt">system prompt</T> and a list of <T id="messages">messages</T>, each
                with a role. Before the model sees them, a <T id="chat-template">chat template</T> flattens everything into
                one sequence with special tokens, and the model predicts what the assistant says next.
              </p>
              <p>
                All of it together is the <T id="prompt">prompt</T>. Including a few worked examples in it is called{" "}
                <T id="few-shot">few-shot prompting</T>.
              </p>
            </Prose>
            <ChatTemplateDemo />
          </>
        ),
      },
      {
        id: "ask",
        title: "Ask it about our bug",
        notes:
          "Introduce the running example: 2 keyboards at $10 + 1 mouse at $5 shows $15. Click 'Call the model'. It invents useCartStore. The file is right there in the left panel, but it's not in the context. Hold that thought: it drives the next three stages.",
        body: () => (
          <>
            <Prose>
              <p>
                Meet the bug we'll follow for the rest of the journey. Our checkout shows <b>$15</b> for 2 keyboards at $10
                and 1 mouse at $5. It should be <b>$25</b>. Let's ask a chat model.
              </p>
            </Prose>
            <Workbench modes={["chat"]} initialMode="chat" />
            <Prose>
              <p>
                Fluent, confident and wrong. There is no <code>useCartStore</code>. The code is right there in the project
                panel, but it isn't in the request, so for the model it doesn't exist. That's a{" "}
                <T id="hallucination">hallucination</T>: plausible text is what next-token prediction produces when the
                facts are missing.
              </p>
            </Prose>
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "What's the difference between a base model and a chat model?",
        options: ["Chat models use a different architecture", "Chat models were further trained on conversations and feedback", "Chat models can access the internet"],
        answer: 1,
        explain: "Same architecture, same next-token prediction. Fine-tuning and RLHF teach it to answer as an assistant.",
      },
      {
        q: "Why did the model invent useCartStore?",
        options: ["It's a bug in the model", "It searched the wrong repo", "Our code wasn't in its context, so it predicted something plausible"],
        answer: 2,
        explain: "Without the real code, the most likely continuation is a generic answer that sounds right.",
      },
    ],
  },

  // ===========================================================================
  memory: {
    scenes: [
      {
        id: "stateless",
        title: "The model remembers nothing",
        notes:
          "Analogy: HTTP is stateless, so sessions re-send a cookie. Chat apps re-send the entire conversation. Show the step 2 code: the single line history.push IS the memory.",
        body: () => (
          <>
            <BigIdea>
              The model is <T id="stateless">stateless</T>. <mark>Every request starts from zero.</mark> Chat apps
              “remember” by re-sending the whole conversation every time.
            </BigIdea>
            <StatelessSequence />
            <CodeBlock
              title="agent/step-2-memory.ts"
              code={excerpt(step2, "const history: Message[]", "history.push({ role: \"assistant\"")}
              highlightLines={[7]}
            />
            <Callout kind="analogy" title="For frontend engineers">
              Like HTTP: the server doesn't remember you, so every request carries the session. Here the “session” is the
              full message history, and it grows every turn.
            </Callout>
          </>
        ),
      },
      {
        id: "try",
        title: "Try it: where memory lives",
        notes:
          "1) Introduce yourself, ask 'What's my name?': works. 2) Untick 're-send': forgets. 3) Tick it again, shrink the window to 40: the intro falls out. 4) Switch to 'Summarise oldest': the summary keeps the name. That's compaction.",
        body: () => (
          <>
            <Prose>
              <p>
                Introduce yourself, then ask for your name. Then switch off history, or shrink the window until your intro
                falls out. Watch the request panel: it's the only thing the model sees.
              </p>
            </Prose>
            <MemoryDemo />
          </>
        ),
      },
      {
        id: "window",
        title: "The context window",
        notes:
          "Drag the slider. Tool results dominate: file reads and test output. That's why agents compact. Mention context rot: more isn't always better.",
        body: () => (
          <>
            <Prose>
              <p>
                The <T id="context-window">context window</T> is the most tokens one request can hold: system prompt,
                tool definitions, history, tool results and the reply (capped by <T id="max-tokens">max tokens</T>). When
                it's full, something has to go: <T id="truncation">truncation</T> drops old messages,{" "}
                <T id="compaction">compaction</T> summarises them.
              </p>
              <p>
                Bigger isn't free. Every token is re-sent and billed on every turn (<T id="token-cost">token cost</T>), and
                models use very long contexts less reliably (<T id="context-rot">context rot</T>).
              </p>
            </Prose>
            <ContextBudgetDemo />
          </>
        ),
      },
      {
        id: "kinds",
        title: "Three kinds of memory",
        notes:
          "When someone says 'it remembers', ask which kind. Weights: frozen. Context: this request. Storage: files your code loads. Coding agents use all three.",
        body: () => (
          <>
            <MemoryLayers />
            <Prose>
              <p>
                <T id="memory">Memory</T> in any AI product is one of these. Coding agents use all three: what the model
                learned about programming, the session's context window, and files like <code>AGENTS.md</code> loaded at
                the start of each session.
              </p>
            </Prose>
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "A chatbot remembers your name 10 messages later. Where is that memory?",
        options: ["In the model's weights", "In the messages your app re-sends", "In a cache on the GPU"],
        answer: 1,
        explain: "The app re-sends the conversation each turn. Stop sending it, and the model has no idea who you are.",
      },
      {
        q: "Your agent's context is filling up with test output. What's the best fix?",
        options: ["Use a model with a bigger window", "Trim tool output and compact old results", "Lower the temperature"],
        answer: 1,
        explain: "Keep the context small and relevant. Bigger windows cost more per turn and get less reliable.",
      },
    ],
  },

  // ===========================================================================
  context: {
    scenes: [
      {
        id: "same-model",
        title: "Same model, better context",
        notes:
          "Run 'Chat only' (wrong), then '+ Code in prompt' (right). Same simulated model, same question. The only change is the request. Then note the two problems left: you had to know which file, and you have to apply the fix yourself.",
        body: () => (
          <>
            <BigIdea>
              A model can only be right about what it can see. <mark>Put the facts in the context.</mark>
            </BigIdea>
            <Workbench modes={["chat", "pasted"]} initialMode="pasted" />
            <Prose>
              <p>
                That's <T id="grounding">grounding</T>. The model already knew how <code>reduce</code> works. What it lacked
                was our code. Two problems remain: you had to know which file to paste, and you still have to apply the fix
                yourself.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "cutoff",
        title: "What the model knows, and doesn't",
        notes:
          "Two gaps: things after the knowledge cutoff, and things that were never public (your code, your docs). Both are fixed the same way: context.",
        body: () => (
          <Prose>
            <p>The model's built-in knowledge has two hard edges:</p>
            <ul>
              <li>
                <b>Time.</b> Training data stops at the <T id="knowledge-cutoff">knowledge cutoff</T>. New library
                versions, APIs and your recent changes aren't in there.
              </li>
              <li>
                <b>Privacy.</b> Your codebase, design system, tickets and internal docs were never in the training data.
              </li>
            </ul>
            <p>
              Both gaps are closed the same way: by putting the right material in the context. Deciding what goes in, on
              every call, is called <T id="context-engineering">context engineering</T>.
            </p>
          </Prose>
        ),
      },
      {
        id: "rag",
        title: "RAG: retrieve, then generate",
        notes:
          "Walk through the 4 steps for 'prices'. The no-retrieval answer is decent generic advice and wrong for this team. Point: RAG is search + paste, automated.",
        body: () => (
          <>
            <Prose>
              <p>
                <T id="rag">Retrieval-augmented generation</T> automates the pasting. Documents are split up (
                <T id="chunking">chunking</T>), embedded, and searched by meaning (<T id="vector-search">vector search</T>).
                The best matches go into the prompt next to the question.
              </p>
            </Prose>
            <RagPipeline />
            <RagDemo />
          </>
        ),
      },
      {
        id: "agentic-search",
        title: "How coding agents find code",
        notes:
          "Many coding agents skip vector search and just grep, because code has exact names. The model decides what to search for, then reads what it finds: that's agentic search, and it needs tools. Bridge to stage 4.",
        body: () => (
          <Prose>
            <p>
              Code has exact names, so many coding agents don't rely on a vector index. They use{" "}
              <T id="agentic-search">agentic search</T>: the model decides what to search for, runs a search, reads the
              files it finds, and searches again if it needs to, much like you would in your editor.
            </p>
            <p>
              But that needs the model to <em>do</em> something: search, read, open. A model can only output text. So how
              does text turn into an action? First, a short detour into why these models are so good at code at all.
            </p>
          </Prose>
        ),
      },
    ],
    quiz: [
      {
        q: "The model suggests an API that was removed in last month's release of a library. Most likely cause?",
        options: ["Knowledge cutoff: it was trained before the change", "It's reading the wrong docs", "Temperature is too high"],
        answer: 0,
        explain: "Training data ends at the cutoff. Give it current docs or code in the context.",
      },
      {
        q: "What does RAG actually change?",
        options: ["The model's weights", "What's in the prompt", "The tokenizer"],
        answer: 1,
        explain: "Retrieval finds relevant text and adds it to the prompt. The model itself is unchanged.",
      },
    ],
  },

  // ===========================================================================
  "how-code": {
    scenes: [
      {
        id: "tokens",
        title: "Code is just tokens",
        notes:
          "Code is a huge part of training data, and it's very regular. That's why models know React well and your internal framework poorly. FIM is the trick behind the autocomplete they use every day.",
        body: () => (
          <>
            <Prose>
              <p>
                To a model, code is more text. Public repositories are a big part of pretraining data (
                <T id="code-training">training on code</T>), and code is very regular, so models learn its patterns well.
                It's also why they're strongest in popular languages and frameworks, and weaker in your internal ones.
              </p>
              <p>
                Inline autocomplete (<T id="code-completion">code completion</T>) uses a training trick called <T id="fim">fill-in-the-middle</T>: the model learns to
                write the missing part between the code before and after your cursor.
              </p>
            </Prose>
            <FimDemo />
          </>
        ),
      },
      {
        id: "checkable",
        title: "Tests make code checkable",
        notes:
          "This is the key insight for why coding agents improved so fast: code can be graded automatically. Same red-to-green signal our agent uses later.",
        body: () => (
          <>
            <Prose>
              <p>
                Code has something most text doesn't: you can check whether it works. Models are now trained with{" "}
                <T id="rlvr">reinforcement learning with verifiable rewards</T>: attempt a real task, run the tests, reward
                what passes. Repeat at enormous scale. <T id="benchmark">Benchmarks</T> like SWE-bench measure the same
                thing on real GitHub issues.
              </p>
            </Prose>
            <RLLoop />
          </>
        ),
      },
      {
        id: "text-to-action",
        title: "How can text change a file?",
        notes: "The answer is the most important idea in the talk. The model writes JSON. Your code reads it and acts. That's all a tool call is.",
        body: () => (
          <>
            <BigIdea>
              The model never touches your files. <mark>It writes text that asks for an action, and your code does it.</mark>
            </BigIdea>
            <TextToAction />
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "Why are models often worse with your company's internal UI library than with React?",
        options: ["Internal code is harder", "It wasn't in the public training data", "React has better types"],
        answer: 1,
        explain: "The model learned from public code. Give it your library's docs or examples in the context.",
      },
    ],
  },

  // ===========================================================================
  tools: {
    scenes: [
      {
        id: "asks",
        title: "The model asks. Your code acts.",
        notes:
          "Walk the sequence diagram slowly. Step 3 is the moment: the model stops and returns JSON. Steps 4 and 5 happen entirely in your code.",
        body: () => (
          <>
            <BigIdea>
              A <T id="tool">tool</T> is a function your program offers. The model can request it.{" "}
              <mark>Only your code can run it.</mark>
            </BigIdea>
            <ToolSequence />
          </>
        ),
      },
      {
        id: "define",
        title: "Defining a tool",
        notes:
          "It's like documenting an API endpoint for a consumer you can't talk to. The description is a prompt. The schema is a contract.",
        body: () => (
          <>
            <Prose>
              <p>
                A tool definition has three parts: a name, a description written for the model, and a{" "}
                <T id="json-schema">JSON Schema</T> for its input. The model reads all of it on every request.
              </p>
            </Prose>
            <CodeBlock title="agent/lib/tool-definitions.ts" lang="json" code={JSON.stringify(readFileTool, null, 2)} />
            <Callout kind="analogy" title="For frontend engineers">
              You're writing API docs for a consumer you can't talk to. A vague description gets vague calls. The schema
              is the contract, and you should still validate everything that comes back, like any untrusted input.
            </Callout>
          </>
        ),
      },
      {
        id: "harness",
        title: "You are the harness",
        notes: "Let the audience call each step. Emphasise step 2: nothing has happened yet. The model is waiting on us.",
        body: () => (
          <>
            <Prose>
              <p>
                Play the part of the program. The model returns a <T id="tool-use">tool_use block</T> with stop reason{" "}
                <code>tool_use</code>. You run the function and send back a <T id="tool-result">tool_result</T>. The code
                that does this, and everything else around the model, is called the <T id="harness">harness</T>.
              </p>
            </Prose>
            <ToolHarnessDemo />
          </>
        ),
      },
      {
        id: "structured",
        title: "Tool calls are structured output",
        notes: "Quick aside for UI people: the same mechanism gives you reliable JSON for rendering.",
        body: () => (
          <Prose>
            <p>
              A tool call is a form of <T id="structured-output">structured output</T>: the model fills in JSON that
              matches a schema. The same idea is useful in UIs, for example extracting form fields from an email or
              returning cards to render, without parsing prose.
            </p>
            <p>
              We now have the model fetching what it needs. But it called exactly one tool, and our code had to know when
              to call the model again. Real tasks take many steps.
            </p>
          </Prose>
        ),
      },
    ],
    quiz: [
      {
        q: "The model returns a tool_use block for delete_file. What has been deleted?",
        options: ["The file", "Nothing yet: your code decides whether to run it", "A copy of the file"],
        answer: 1,
        explain: "A tool_use block is a request. Execution, and permission, are your code's job.",
      },
      {
        q: "Which part of a tool definition does the model use to decide when to call it?",
        options: ["Only the name", "The description (and schema)", "Your implementation code"],
        answer: 1,
        explain: "The model never sees your implementation. It reads the name, description and schema.",
      },
    ],
  },

  // ===========================================================================
  loop: {
    scenes: [
      {
        id: "loop",
        title: "An agent is a loop",
        notes: "This is the reveal people remember. It's a while loop. Pause here.",
        body: () => (
          <>
            <BigIdea>
              An <T id="agent">agent</T> is a model, some tools, and <mark>a while loop</mark>.
            </BigIdea>
            <AgentLoopDiagram />
          </>
        ),
      },
      {
        id: "code",
        title: "The loop in code",
        notes:
          "Read it line by line. Call the model; if the stop reason isn't tool_use, we're done; otherwise run each tool and push the results. That's the engine of every coding agent.",
        body: () => (
          <>
            <CodeBlock title="agent/step-5-loop.ts" code={LOOP} highlightLines={[4, 8, 13, 15]} />
            <Prose>
              <p>
                Each pass of the <T id="agent-loop">agent loop</T> is a <T id="turn">turn</T>. The <T id="stop-reason">stop reason</T> decides whether to go round
                again. The model chooses which tools to call and when to stop, which is the{" "}
                <T id="react">ReAct</T> pattern of reasoning, acting and observing.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "watch",
        title: "Watch it run",
        notes:
          "Use 'Call the model' and 'Run the requested tools' one at a time. Watch the request grow in the right panel: every tool result becomes part of the next request.",
        body: () => (
          <>
            <Workbench modes={["tools", "loop"]} initialMode="loop" />
            <Prose>
              <p>
                Step through it and watch the right panel. Every tool result is appended, so each request is bigger than
                the last. The agent found the bug by itself. But it can only read, so it still can't fix it.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "who-decides",
        title: "Workflow or agent?",
        notes: "Not everything should be an agent. If you can write the steps down in advance, write a workflow.",
        body: () => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Workflow</th>
                  <th>Agent</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Who picks the steps?</td>
                  <td>Your code, in a fixed order</td>
                  <td>The model, one turn at a time</td>
                </tr>
                <tr>
                  <td>Good for</td>
                  <td>Summarise this, translate that, extract fields</td>
                  <td>Open-ended tasks: “fix this bug”, “add this feature”</td>
                </tr>
                <tr>
                  <td>Cost and speed</td>
                  <td>Predictable</td>
                  <td>Varies with the number of turns</td>
                </tr>
                <tr>
                  <td>Example</td>
                  <td>Generate alt text for every image on upload</td>
                  <td>A coding agent</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
    quiz: [
      {
        q: "In the agent loop, what tells your code to stop looping?",
        options: ["A timer", "The model's stop reason is no longer tool_use", "The user presses stop"],
        answer: 1,
        explain: "When the model replies without asking for tools (end_turn), the loop ends. Guardrails like max turns are a backup.",
      },
    ],
  },

  // ===========================================================================
  "coding-agent": {
    scenes: [
      {
        id: "hands",
        title: "Give it hands",
        notes: "The loop doesn't change at all from step 5 to step 6. Only the tool list grows. That's the punchline of this stage.",
        body: () => (
          <>
            <Prose>
              <p>
                From stage 5 to stage 6, the loop doesn't change by a single line. Only the toolbox does. A{" "}
                <T id="coding-agent">coding agent</T> is the same loop with tools that act on a codebase.
              </p>
            </Prose>
            <ToolsTable />
            <Prose>
              <p>
                The <T id="edit-tool">edit tool</T> replaces one exact snippet instead of rewriting the whole file. That keeps
                edits small, cheap and easy to review, and it fails loudly if the model's idea of the file is out of date.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "feedback",
        title: "Close the loop with tests",
        notes:
          "The single biggest factor in agent quality is whether it can check its own work. Same signal the model was trained on.",
        body: () => (
          <>
            <BigIdea>
              The best tool you can give an agent is <mark>a way to know whether it's right.</mark>
            </BigIdea>
            <FeedbackLoop />
            <Prose>
              <p>
                With <code>run_tests</code>, the agent gets a <T id="feedback-loop">feedback loop</T>: reproduce the bug
                (red), fix it, verify (green). Type checks, linters, builds and screenshots work the same way.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "red-green",
        title: "Red to green",
        notes:
          "The demo moment. Run it step by step. Point out: it ran the tests first, searched instead of guessing, made a one-line edit, and verified. Watch the test pill turn green.",
        body: () => (
          <>
            <Workbench modes={["coding"]} initialMode="coding" />
            <Prose>
              <p>
                Six model calls. It reproduced the bug, searched for the function, read the file, made a one-line edit and
                checked the fix. The short sentence before each tool call stands in for the model's{" "}
                <T id="reasoning">reasoning</T>, which real models often do privately before acting.
              </p>
            </Prose>
            <Callout title="Run the real thing">
              <code>npm run agent:6</code> runs this loop in Node against real files and a real <code>node --test</code>{" "}
              run. <a href={href.code("step-6-coding-agent")}>Read step 6</a>.
            </Callout>
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "What changed in the code between the read-only agent (step 5) and the coding agent (step 6)?",
        options: ["The loop logic", "The tool list", "The model"],
        answer: 1,
        explain: "Same loop, same model. More capable tools, especially edit_file and run_tests.",
      },
      {
        q: "Why does the agent run the tests before changing anything?",
        options: ["To warm up the cache", "To reproduce the bug and confirm what's failing", "It's required by the API"],
        answer: 1,
        explain: "Reproducing first means the later green run actually proves the fix.",
      },
    ],
  },

  // ===========================================================================
  production: {
    scenes: [
      {
        id: "missing",
        title: "From a demo to a product",
        notes:
          "Our step 6 agent works on a toy. On a real repo it needs to know the team's rules, ask before risky actions, stay inside the context window, and not loop forever. Step 7 adds five small pieces.",
        body: () => (
          <>
            <Prose>
              <p>
                The loop is the engine. Real coding agents wrap it in a harness. Step 7 adds five small pieces, each marked
                in the code:
              </p>
            </Prose>
            <CodeBlock title="agent/step-7-production.ts" code={excerpt(step7, "// it. Here are five", "//   [5] Cost tracking")} />
          </>
        ),
      },
      {
        id: "memory",
        title: "Project memory: AGENTS.md",
        notes:
          "This is the most actionable slide for the audience. Add an AGENTS.md (or CLAUDE.md) to your repos this week: test commands, conventions, gotchas.",
        body: () => (
          <>
            <Prose>
              <p>
                <T id="project-memory">Project memory</T> is a file in the repo that the harness loads into the{" "}
                <T id="system-prompt">system prompt</T> every session. It's long-term memory you can review in a pull
                request. Different tools read different names (<code>AGENTS.md</code>, <code>CLAUDE.md</code>,{" "}
                <code>.cursor/rules</code>), but the idea is the same.
              </p>
            </Prose>
            <CodeBlock title="agent/project/AGENTS.md" lang="md" code={agentsMd} />
          </>
        ),
      },
      {
        id: "permissions",
        title: "Permissions, sandboxes and the full harness",
        notes:
          "Run it. When the approval card appears, deny once to show the model receives 'The user denied this action' as a tool result. Then reset and approve. Point out compaction notes from the harness.",
        body: () => (
          <>
            <Prose>
              <p>
                Tool requests are suggestions. <T id="permissions">Permissions</T> decide which ones run automatically and
                which need a person. A <T id="sandbox">sandbox</T> limits the damage if something goes wrong, including{" "}
                <T id="prompt-injection">prompt injection</T> hidden in a file or web page the agent reads.{" "}
                <T id="guardrails">Guardrails</T> like a turn limit stop runaway loops.
              </p>
            </Prose>
            <Workbench modes={["coding", "production"]} initialMode="production" />
          </>
        ),
      },
      {
        id: "context",
        title: "Context management and caching",
        notes: "Two cost levers: send less (compaction, trimming output) and pay less for what repeats (prompt caching).",
        body: () => (
          <>
            <Prose>
              <p>
                Every turn re-sends everything before it. Harnesses keep this under control in two ways.{" "}
                <T id="compaction">Compaction</T> summarises or clears old content so long tasks fit.{" "}
                <T id="prompt-caching">Prompt caching</T> makes the repeated start of each request cheaper and faster, as
                long as that prefix stays the same.
              </p>
            </Prose>
            <CachingDiagram />
          </>
        ),
      },
      {
        id: "mcp",
        title: "MCP: plugging in more tools",
        notes: "MCP is like USB for tools. From the loop's point of view it just adds entries to the tools array.",
        body: () => (
          <>
            <Prose>
              <p>
                The <T id="mcp">Model Context Protocol</T> is an open standard for connecting tools. Someone writes an MCP
                server for Figma or GitHub once, and any agent that speaks MCP can use it. To our loop, MCP tools are just
                more entries in the <code>tools</code> array.
              </p>
            </Prose>
            <McpDiagram />
          </>
        ),
      },
      {
        id: "subagents",
        title: "Subagents and skills",
        notes: "Subagents: a loop that calls a loop, to protect the main context. Skills: instructions loaded only when relevant.",
        body: () => (
          <>
            <Prose>
              <p>
                A <T id="subagent">subagent</T> is another agent loop started as a tool call. It gets a fresh context, does
                the noisy work (reading 40 files) and returns a short answer. <T id="skills">Skills</T> do something similar
                for instructions: detailed know-how that's loaded only when the task needs it.
              </p>
            </Prose>
            <SubagentsDiagram />
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "Where's the best place to tell an agent “run tests with pnpm test, never edit generated files”?",
        options: ["Repeat it in every prompt", "A project memory file like AGENTS.md", "Fine-tune the model"],
        answer: 1,
        explain: "The harness loads it every session, and your team can review it like code.",
      },
      {
        q: "From the agent loop's point of view, what does connecting an MCP server do?",
        options: ["Retrains the model", "Adds tools to the tools list", "Increases the context window"],
        answer: 1,
        explain: "MCP tools show up as more tool definitions. The loop doesn't change.",
      },
    ],
  },

  // ===========================================================================
  reveal: {
    scenes: [
      {
        id: "anatomy",
        title: "Anatomy of a coding agent",
        notes: "Map every layer back to a stage. Model: 0-1. Loop: 5. Harness: 4-7. Product: the UI around it.",
        body: () => (
          <>
            <BigIdea>
              Every coding agent is <mark>a model, a loop and a harness</mark>, wrapped in a product.
            </BigIdea>
            <AgentAnatomy />
          </>
        ),
      },
      {
        id: "timeline",
        title: "How we got here",
        notes: "Each step on the timeline adds one layer from our journey. The model kept getting better, and the harness grew around it.",
        body: () => (
          <>
            <Prose>
              <p>
                Each step in the history of AI coding tools added one layer of the stack you just built, up to today's{" "}
                <T id="background-agent">background agents</T>.
              </p>
            </Prose>
            <Timeline />
          </>
        ),
      },
      {
        id: "products",
        title: "Our 200 lines, in real products",
        notes: "Go row by row. The audience should leave able to point at any feature of their coding agent and name the mechanism.",
        body: () => (
          <>
            <Prose>
              <p>Next time you use a coding agent, you can name what's going on under every feature.</p>
            </Prose>
            <ProductMap />
          </>
        ),
      },
      {
        id: "myths",
        title: "Myths, revisited",
        notes: "Ask the audience to call out the answer before flipping each card.",
        body: () => <MythsDemo />,
      },
      {
        id: "build",
        title: "What you need to build one",
        notes: "Twelve parts, all of which they've now seen. The companion code has a small version of the first eleven.",
        body: () => <BuildChecklist />,
      },
      {
        id: "habits",
        title: "Working well with coding agents",
        notes: "Each habit maps to a mechanism: context, feedback loop, project memory, context rot.",
        body: () => (
          <>
            <Prose>
              <p>Each of these habits follows directly from how the machine works.</p>
            </Prose>
            <Habits />
            <Callout title="Keep going">
              Run the <a href={href.code()}>companion code</a> step by step, explore the{" "}
              <a href={href.map}>concept map</a>, or look anything up in the <a href={href.glossary}>glossary</a>.
            </Callout>
          </>
        ),
      },
    ],
    quiz: [
      {
        q: "Your coding agent “forgot” a convention you told it an hour ago in the same session. Most likely cause?",
        options: ["The model was updated", "Compaction or truncation dropped it from the context", "It decided to ignore you"],
        answer: 1,
        explain: "Long sessions get compacted. Put lasting conventions in AGENTS.md so they're loaded every time.",
      },
      {
        q: "What's the core of every coding agent?",
        options: ["A special kind of model", "A model calling tools in a loop, inside a harness", "A vector database"],
        answer: 1,
        explain: "Model, tools, loop, harness. Everything else is product polish.",
      },
    ],
  },
};
