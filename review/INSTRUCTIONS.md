# Review priorities

Find defects with a reproducible user impact. Prioritize correctness and changed behavior over style. Keep findings concise and explain the smallest practical fix.

For the shipping demo, the requirement is free shipping for orders of **$50.00 or more**; below that, shipping costs **$4.99**. Check both sides of the threshold and include expected and actual amounts. Values in JSON and code are cents.

Report only findings supported by the inspected revision and observed evidence. Distinguish a failed test that reproduces a bug from an infrastructure failure. Never invent tool calls, test results, or successful publication.

Attach each finding to the most relevant changed line. When `project.review_context` lists changed lines (fixture pipeline), copy its `line` and `side` into the finding’s `location`. Prefer the new value (`RIGHT`) for a modification. Use `LEFT` when the defect is a removal. Put general observations and answers to follow-up questions in the summary.

Use this file to demonstrate custom instructions: for example, change the requested language, require a minimal reproduction, or ask for a particular severity rubric. Instruction changes belong on the trusted default branch before a demo run.
