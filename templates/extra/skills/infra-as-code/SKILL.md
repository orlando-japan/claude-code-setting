---
name: infra-as-code
description: Manage infrastructure in version control so it's reviewable, reproducible, and rollback-able. Invoke when provisioning new infra or cleaning up ad-hoc resources.
category: ops
group: ops
tags: [terraform, pulumi, iac, devops]
risk: high
---

# Infrastructure as code

Infra changes through code review and version control, not through clicking in the cloud console. Anything else drifts into "only Alice knows how this cluster was set up."

## Principles

- **Everything in version control.** Every resource that exists in prod should exist in code. If it's manual, fix it.
- **Declarative over imperative.** Describe the desired state; let the tool figure out the diff. (Terraform, Pulumi with state, CloudFormation, Kubernetes manifests.)
- **Reviewable.** Every change goes through a PR. Plan output is visible to reviewers.
- **Reproducible.** From an empty account, the code should reconstruct the infrastructure.
- **Rollback-able.** Revert a commit, reapply, get the old state back.

## Tool choice

- **Terraform / OpenTofu** — dominant, cloud-agnostic, mature, HCL syntax. State file is load-bearing.
- **Pulumi** — real programming languages, good for teams that hate HCL. State model similar to Terraform.
- **CloudFormation / CDK** — AWS-native, tight integration, less cloud-agnostic.
- **Kubernetes manifests / Helm / Kustomize** — for k8s-specific resources.

Pick one primary, be consistent. Mixing creates drift.

## Structure

### Modules

Extract repeatable patterns into modules: "a web service," "a VPC with public/private subnets," "a Postgres instance with backups."

- **Inputs** are small, named, typed.
- **Outputs** are what callers need to wire into other modules.
- **Modules should be stable.** Breaking changes = new version.

### Environments

- **Separate state per environment.** Don't share state between dev and prod.
- **Same code, different inputs.** The same module used for dev and prod with different parameters (size, region, replicas).
- **Dev is not a stripped-down prod.** It should exercise the same code path.

### Directory layout (typical)

```
infra/
├── modules/
│   ├── web-service/
│   ├── database/
│   └── vpc/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── README.md
```

## State management

The state file is the map between your code and the real resources. Treat it as production data.

- **Remote state:** S3 + DynamoDB lock, GCS + lock, Terraform Cloud. Never commit state to git.
- **Backup state** regularly. State file corruption is painful to recover.
- **Lock during apply.** Two concurrent applies = corrupt state.
- **Never hand-edit state.** Use `terraform state mv`, `import`, etc. Hand edits break invariants.

## Drift

Drift = reality diverges from code. Causes:

- Manual console changes during an incident.
- Partial applies that failed mid-run.
- External automation (another IaC tool, a Lambda) modifying resources.

Detect:

- **`terraform plan`** regularly (not just on change).
- **Drift detection tools** (driftctl, cloudquery) on a schedule.
- **Immutable infra where possible** — rebuild instead of edit.

Fix by either:

- **Reconcile code to reality** (if the manual change was intentional), or
- **Reconcile reality to code** (re-apply, undoing the manual change).

## Secrets in IaC

- **Never commit secrets to IaC source.** Use a secret manager (AWS Secrets Manager, Vault, GCP Secret Manager) and reference by name.
- **Marshal secrets into environment or mount them** at runtime, not bake them into images.
- **Rotate** — IaC should support rotation without resource recreation.

## Review rules

Infra PRs are higher stakes than app PRs. A bad infra merge can delete a database.

- **Every PR has a `terraform plan` output attached.** Automated via CI comment or required.
- **`delete` actions in the plan get extra scrutiny.** Is this really what you want?
- **Destructive changes require explicit confirmation.** Some teams require a separate PR.
- **Changes to critical resources (DBs, VPNs, network, IAM)** get a second reviewer.
- **`terraform apply` runs from a trusted environment** (CI or a bastion), not a random laptop.

## Anti-patterns

- **Clickops + IaC mixed.** Drift is inevitable. Pick one.
- **`terraform apply -auto-approve` on prod locally.** No review, no record.
- **One huge monolithic state file for all environments.** A dev mistake takes out prod.
- **Hardcoded IDs in code.** Use data sources or outputs to reference.
- **Secret in `.tfvars` checked in.** Git history is forever.
- **Production apply from a dev laptop.** Run from CI with explicit approval.
- **No tests.** `terraform validate`, `tflint`, unit tests on modules (`terratest`) — IaC has bugs too.
