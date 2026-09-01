#!/usr/bin/env bash
set -euo pipefail

# Read-only host gate. This deliberately does not enable, disable, or rewrite
# a firewall. Run it on the target VPS after the operator has applied the
# approved SSH CIDR rule and before DNS is opened.

if ! command -v ufw >/dev/null 2>&1; then
  echo 'ufw is required for this check; inspect the equivalent nftables policy instead.' >&2
  exit 1
fi

status="$(ufw status verbose)"
grep -Fq 'Status: active' <<<"$status" || {
  echo 'firewall is not active' >&2
  exit 1
}
grep -Eiq 'Default: deny \(incoming\)' <<<"$status" || {
  echo 'default incoming policy must be deny' >&2
  exit 1
}

for port in 80/tcp 443/tcp; do
  grep -Eiq "^[[:space:]]*${port}[[:space:]].*ALLOW[[:space:]]+IN[[:space:]]+Anywhere" <<<"$status" || {
    echo "required public rule is missing: ${port}" >&2
    exit 1
  }
done

# SSH must be explicitly restricted to an operator CIDR. An Anywhere rule is
# rejected; the exact CIDR is an operator secret/policy and is not embedded.
if grep -Eiq '^[[:space:]]*22(/tcp)?[[:space:]].*ALLOW[[:space:]]+IN[[:space:]]+Anywhere' <<<"$status"; then
  echo 'SSH is open from Anywhere; replace it with the approved operator CIDR' >&2
  exit 1
fi

for port in 8790 8791 6300 5432 8000 8080; do
  if grep -Eiq "^[[:space:]]*${port}(/tcp)?[[:space:]].*ALLOW" <<<"$status"; then
    echo "private service port is allowed by the host firewall: ${port}" >&2
    exit 1
  fi
done

echo 'Firewall read-only check passed: active deny-incoming policy, 80/443 public, SSH not Anywhere, private service ports denied.'
