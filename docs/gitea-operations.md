# Gitea Production Operations

This project is ready to run in Gitea with Actions-compatible workflows and SSH remotes.

## Repository Settings Checklist

Configure these settings in the Gitea repo:

1. **Default branch**
   - Keep `master` as default (current workflow target).
2. **Protected branch**
   - Protect `master`.
   - Require pull request merge.
   - Require at least 1 approval.
   - Block force pushes and branch deletion.
3. **Required status checks**
   - Require `CI / ci` (job name in `.gitea/workflows/ci.yml`) before merge.
4. **Actions**
   - Enable Actions for this repository.
   - Ensure a runner is online and allowed to run workflows.

## Required Runner Capabilities

The workflow requires:

- Linux runner (`ubuntu-latest` compatible image).
- Node.js 22 support.
- Internet access for `npm ci`.

Recommended runner baseline:

- 2 vCPU
- 4 GB RAM
- 10+ GB free disk

## Secrets and Variables

Current CI does not require project secrets.

If you add deployment or Supabase integration jobs later, define secrets in Gitea Actions secrets (repo-level or org-level), never in `.env` committed files.

## Local Git Connectivity (SSH)

Use SSH remote:

```bash
git remote set-url origin git@gitea.apps.privateprompt.tech:david/crm-pro.git
```

And in `~/.ssh/config`, set:

```sshconfig
Host gitea.apps.privateprompt.tech
    HostName gitea.apps.privateprompt.tech
    User git
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Quick verification:

```bash
ssh -T git@gitea.apps.privateprompt.tech
git ls-remote --heads origin
```

## CI Failure Triage

When a workflow fails:

1. Open Actions log in Gitea and identify failing step.
2. Reproduce locally with:
   - `npm ci`
   - `npx tsc --noEmit`
   - `npx vitest run`
   - `npm run build`
3. Push fix branch and re-run workflow.

