Generate a concise commit message using Conventional Commits format. 
- Use **Conventional Commits** format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `ci`, `perf`, `style`, `revert`
- Subject: imperative mood, lowercase, no trailing period, ≤72 characters
- Body (optional): wrap at 72 characters, explain *why* not *what*
- Final line must be exactly: `Copilot-Assisted: true`. Place one blank line before this. Do not omit, duplicate, rename, or reword it.

Output only the raw commit message text — no markdown fences, no commentary.