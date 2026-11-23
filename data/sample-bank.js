/*
 * Bundled sample question bank (original questions written for this project, MIT licensed).
 * Works in the browser (registers itself in window.CCDV_BANKS) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  const bank = {
    schemaVersion: 1,
    id: 'sample-claude-dev',
    title: 'Sample: Claude developer fundamentals',
    description: 'Original practice questions with explanations',
    language: 'en',
    author: 'Project contributors',
    license: 'MIT',
    passThreshold: 0.75,
    timeLimitMinutes: 30,
    domains: [
      { id: 'd1', name: 'Agents and Workflows', weight: 0.147 },
      { id: 'd2', name: 'Applications and Integration', weight: 0.331 },
      { id: 'd3', name: 'Claude Code', weight: 0.031 },
      { id: 'd4', name: 'Eval, Testing, and Debugging', weight: 0.026 },
      { id: 'd5', name: 'Model Selection and Optimization', weight: 0.168 },
      { id: 'd6', name: 'Prompt and Context Engineering', weight: 0.11 },
      { id: 'd7', name: 'Security and Safety', weight: 0.081 },
      { id: 'd8', name: 'Tools and MCPs', weight: 0.106 }
    ],
    questions: [
      {
        id: '1.1', domain: 'd1', type: 'single',
        question: 'An app receives customer messages that fall into clearly different categories (billing, technical issue, general question). Each category needs its own prompt and tools.\n\nWhich workflow pattern fits best?',
        options: [
          { id: 'A', text: 'Prompt chaining: run the same fixed sequence of steps for every message' },
          { id: 'B', text: 'Parallelization: send the message to all handlers at once and merge the outputs' },
          { id: 'C', text: 'Routing: classify the message first, then hand it to a specialized prompt and tool set' },
          { id: 'D', text: 'Evaluator-optimizer: generate a reply, critique it, and loop until it passes' }
        ],
        answer: ['C'],
        explanation: 'Routing classifies the input and dispatches it to a specialized path. Chaining is one fixed sequence for every input, parallelization runs independent subtasks at the same time, and evaluator-optimizer is an iterate-and-critique loop for output quality.'
      },
      {
        id: '1.2', domain: 'd1', type: 'single',
        question: 'In a manual tool-use loop built on the Messages API, how does your code know that Claude is asking to run a tool?',
        options: [
          { id: 'A', text: 'The response has stop_reason "tool_use" and its content contains a tool_use block' },
          { id: 'B', text: 'The response has stop_reason "end_turn" and the text names a function' },
          { id: 'C', text: 'The API returns HTTP 202 and you poll for the tool call' },
          { id: 'D', text: 'The usage object reports a non-zero tool_tokens counter' }
        ],
        answer: ['A'],
        explanation: 'When Claude wants a tool, the response stops with stop_reason "tool_use" and includes tool_use content blocks (id, name, input). You run the tool and send the output back in a tool_result block in the next user message.'
      },
      {
        id: '2.1', domain: 'd2', type: 'single',
        question: 'Besides model and messages, which parameter must every Messages API request include?',
        options: [
          { id: 'A', text: 'temperature' },
          { id: 'B', text: 'system' },
          { id: 'C', text: 'stream' },
          { id: 'D', text: 'max_tokens' }
        ],
        answer: ['D'],
        explanation: 'max_tokens caps the length of the output and is required. temperature, system and stream are optional.'
      },
      {
        id: '2.2', domain: 'd2', type: 'single',
        question: 'How does an application keep a multi-turn conversation going with the Messages API?',
        options: [
          { id: 'A', text: 'Send a session ID and let the server remember earlier turns' },
          { id: 'B', text: 'Resend the earlier messages, plus the new user turn, in the messages array on every request' },
          { id: 'C', text: 'Set temperature to 0 so Claude repeats its earlier reasoning' },
          { id: 'D', text: 'Call the API once and keep the connection open between turns' }
        ],
        answer: ['B'],
        explanation: 'The API is stateless: it only knows what is in the current request. The client sends the conversation history each time and decides how to trim or summarise it as it grows.'
      },
      {
        id: '3.1', domain: 'd3', type: 'single',
        question: 'Which Claude Code permission mode makes Claude propose a plan and wait for approval before changing files?',
        options: [
          { id: 'A', text: 'acceptEdits' },
          { id: 'B', text: 'bypassPermissions' },
          { id: 'C', text: 'plan' },
          { id: 'D', text: 'dontAsk' }
        ],
        answer: ['C'],
        explanation: 'plan mode keeps Claude in a read-and-propose stage until you approve the plan. acceptEdits auto-accepts file edits and bypassPermissions skips permission checks; neither is about planning.'
      },
      {
        id: '3.2', domain: 'd3', type: 'single',
        question: 'A CI job needs one machine-readable JSON result from Claude Code, with no human at the terminal. Which invocation fits?',
        options: [
          { id: 'A', text: 'claude --resume' },
          { id: 'B', text: 'claude -p "<prompt>" --output-format json' },
          { id: 'C', text: 'claude --bare' },
          { id: 'D', text: 'claude, with the pipeline typing the prompt into the interactive session' }
        ],
        answer: ['B'],
        explanation: '-p / --print runs non-interactively and exits. --output-format json returns a single result object (stream-json emits events in real time). --resume reopens a session and --bare only trims what is loaded.'
      },
      {
        id: '4.1', domain: 'd4', type: 'single',
        question: 'You edited a production prompt and want to know whether quality regressed. What is the most reliable check?',
        options: [
          { id: 'A', text: 'Read a few outputs and trust your impression' },
          { id: 'B', text: 'Ship it and watch for complaints' },
          { id: 'C', text: 'Ask Claude whether the new prompt is better, without any test data' },
          { id: 'D', text: 'Run the same fixed eval set before and after the change and compare scores per category' }
        ],
        answer: ['D'],
        explanation: 'A fixed eval set turns "feels better" into a measurement. Comparing per-category scores before and after shows both improvements and regressions that a handful of eyeballed outputs would miss.'
      },
      {
        id: '4.2', domain: 'd4', type: 'multiple',
        question: 'Which TWO practices make an eval set more trustworthy?',
        options: [
          { id: 'A', text: 'Include edge cases and failures seen in production' },
          { id: 'B', text: 'Reuse only the examples the prompt was tuned on' },
          { id: 'C', text: 'Keep it versioned and separate from the few-shot examples in the prompt' },
          { id: 'D', text: 'Regenerate the expected answers with the model under test on every run' }
        ],
        answer: ['A', 'C'],
        explanation: 'Real edge cases reveal weaknesses, and keeping the eval set versioned and separate from prompt examples avoids leakage. Evaluating on tuning examples, or on self-generated "expected" answers, only confirms what the model already does.'
      },
      {
        id: '5.1', domain: 'd5', type: 'single',
        question: 'A response ends mid-sentence and stop_reason is "max_tokens". What happened?',
        options: [
          { id: 'A', text: 'Claude hit the max_tokens limit you set, so the output was truncated' },
          { id: 'B', text: 'The content was blocked by a safety filter' },
          { id: 'C', text: 'The request was rate limited' },
          { id: 'D', text: 'Claude decided the answer was complete' }
        ],
        answer: ['A'],
        explanation: 'stop_reason "max_tokens" means generation stopped at your output cap. It is not an error. Raise max_tokens, shorten the task, or continue the answer in a follow-up request.'
      },
      {
        id: '5.2', domain: 'd5', type: 'single',
        question: 'You need several varied marketing taglines from one prompt. Which sampling change helps most?',
        options: [
          { id: 'A', text: 'Lower temperature to 0' },
          { id: 'B', text: 'Lower max_tokens' },
          { id: 'C', text: 'Raise temperature' },
          { id: 'D', text: 'Move the call to the Batches API' }
        ],
        answer: ['C'],
        explanation: 'Higher temperature increases diversity in sampled output, while low values make it more focused. max_tokens only caps length, and batching changes cost and latency, not variety.'
      },
      {
        id: '6.1', domain: 'd6', type: 'single',
        question: 'Why does wrapping documents, instructions and examples in separate XML-style tags help?',
        options: [
          { id: 'A', text: 'Claude can only understand prompts written in XML' },
          { id: 'B', text: 'Clear structure reduces ambiguity about which text is an instruction, which is data, and which is an example' },
          { id: 'C', text: 'It makes the model deterministic' },
          { id: 'D', text: 'It reduces the token count of the prompt' }
        ],
        answer: ['B'],
        explanation: 'Tags give the prompt unambiguous boundaries, so Claude is less likely to mix up instructions with the material it should analyse. They do not make output deterministic and they add a few tokens.'
      },
      {
        id: '6.2', domain: 'd6', type: 'single',
        question: 'Which rewrite of the vague instruction "Don\'t write too much" follows prompt best practice?',
        options: [
          { id: 'A', text: 'NEVER write too much!!!' },
          { id: 'B', text: 'Write less, please.' },
          { id: 'C', text: 'Be good at being short.' },
          { id: 'D', text: 'Reply in at most three sentences of plain text, with no lists.' }
        ],
        answer: ['D'],
        explanation: 'Specific, measurable instructions are followed more reliably than emphatic or vague ones. Say what to do (length, format) rather than only what to avoid.'
      },
      {
        id: '7.1', domain: 'd7', type: 'single',
        question: 'A read-only analytics agent queries a production database. Which credential is the best choice?',
        options: [
          { id: 'A', text: 'A read-only role limited to the tables the agent needs' },
          { id: 'B', text: 'The admin account, so queries never fail' },
          { id: 'C', text: 'A shared account used by all internal tools' },
          { id: 'D', text: "The developer's personal credentials" }
        ],
        answer: ['A'],
        explanation: 'Least privilege limits the damage from mistakes or prompt injection: the agent can only do what its role allows. Admin, shared or personal credentials give it far more power than the task needs.'
      },
      {
        id: '7.2', domain: 'd7', type: 'multiple',
        question: 'Which TWO controls help keep sensitive data from leaking through model inputs and outputs?',
        options: [
          { id: 'A', text: 'Put secrets in the system prompt so Claude can use them' },
          { id: 'B', text: 'Redact secrets and personal data before sending text to the model or writing logs' },
          { id: 'C', text: 'Log every full prompt in plain text forever for debugging' },
          { id: 'D', text: 'Validate and filter model output before showing it or acting on it' }
        ],
        answer: ['B', 'D'],
        explanation: 'Minimise and redact what goes in, and check what comes out. Secrets in a prompt can be echoed back, and indefinite plain-text prompt logs create a new store of sensitive data.'
      },
      {
        id: '8.1', domain: 'd8', type: 'single',
        question: 'Which tool_choice setting forces Claude to call one specific tool?',
        options: [
          { id: 'A', text: '{"type": "auto"}' },
          { id: 'B', text: '{"type": "any"}' },
          { id: 'C', text: '{"type": "tool", "name": "get_weather"}' },
          { id: 'D', text: '{"type": "none"}' }
        ],
        answer: ['C'],
        explanation: 'tool_choice with type "tool" and a name forces that tool. "auto" lets Claude decide, "any" forces some tool but lets Claude pick which one, and "none" disallows tool calls.'
      },
      {
        id: '8.2', domain: 'd8', type: 'single',
        question: 'Which three kinds of capabilities can an MCP server expose to a client?',
        options: [
          { id: 'A', text: 'Models, datasets and checkpoints' },
          { id: 'B', text: 'Agents, hooks and plugins' },
          { id: 'C', text: 'Endpoints, queues and schedules' },
          { id: 'D', text: 'Tools, resources and prompts' }
        ],
        answer: ['D'],
        explanation: 'MCP servers expose tools (actions the model can invoke), resources (data the client can read) and prompts (reusable prompt templates).'
      }
    ]
  };

  if (typeof module === 'object' && module.exports) module.exports = bank;
  else (root.CCDV_BANKS = root.CCDV_BANKS || []).push(bank);
})(typeof self !== 'undefined' ? self : this);
