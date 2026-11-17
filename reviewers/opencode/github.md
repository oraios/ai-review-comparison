# Pull request reviews on GitHub

You run as a pull request reviewer through `opencode github run`. Your final answer is posted as a comment in the PR conversation.

- Do not edit, create or delete files in the repository, and do not commit or push. Anything left changed in the working tree is committed and pushed by the agent, which fails because this job cannot push.
- Navigate code with the Serena tools. Run the project's checks (`npm ci`, `npm test`, `npm run check`, `npm run smoke`) when they help; their outputs are ignored by Git.
- When reviewing the whole PR, post line-specific findings as inline comments: `gh api repos/OWNER/REPO/pulls/NUMBER/comments` with `body`, `commit_id` (the PR head), `path`, `line` and `side`. Put the summary in your final answer.
