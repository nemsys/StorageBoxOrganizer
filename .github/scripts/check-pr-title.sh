#!/usr/bin/env bash
#
# The PR title is the release note.
#
# PRs here are squash-merged, and GitHub seeds the squash commit's subject from
# the PR title. standard-version then reads that subject — and nothing else — to
# decide the version bump and write the changelog. A branch full of well-formed
# `feat:` commits still ships as a patch with an empty changelog entry if the
# title says `chore:`. That is exactly how v1.8.2 happened.
#
# So this checks two things:
#   1. the title is a Conventional Commit
#   2. it claims a bump at least as large as the commits it contains
#
# Usage:  check-pr-title.sh "<title>" [<base-sha> <head-sha>]
# Without the two shas only the format is checked.

set -euo pipefail

TYPES='feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert'
HEADER_RE="^(${TYPES})(\([a-zA-Z0-9._/ -]+\))?(!)?: .+"
# Regexes must live in variables: bash parses unquoted parens inside [[ =~ ]]
# as shell grouping, not as pattern.
BREAKING_RE="^(${TYPES})(\([^)]*\))?!"
FEAT_RE="^feat(\([^)]*\))?:"

title="${1:?usage: check-pr-title.sh \"<title>\" [<base-sha> <head-sha>]}"
base="${2:-}"
head="${3:-}"

fail() { printf '::error::%s\n' "$1"; FAILED=1; }
FAILED=0

# ── 1. format ────────────────────────────────────────────────────────────────
if [[ ! "$title" =~ $HEADER_RE ]]; then
  fail "PR title is not a Conventional Commit: \"$title\""
  cat >&2 <<EOF

The title must look like:  type(optional-scope): description

  types: feat, fix, perf, refactor, docs, style, test, build, ci, chore, revert
  add ! before the colon for a breaking change, e.g.  feat(api)!: drop v1

This matters because the squash commit takes its subject from the title, and
that subject is the only thing the release tooling sees.
EOF
  exit 1
fi

title_type="${BASH_REMATCH[1]}"
title_bang="${BASH_REMATCH[3]:-}"

# ── bump level: 3 = major, 2 = minor, 1 = patch ──────────────────────────────
level_of() {
  local subject="$1" body="$2"
  if [[ "$subject" =~ $BREAKING_RE ]] || [[ "$body" == *"BREAKING CHANGE"* ]]; then
    echo 3
  elif [[ "$subject" =~ $FEAT_RE ]]; then
    echo 2
  else
    echo 1
  fi
}

name_of() { case "$1" in 3) echo major ;; 2) echo minor ;; *) echo patch ;; esac; }

if [[ -n "$title_bang" ]]; then
  title_level=3
elif [[ "$title_type" == "feat" ]]; then
  title_level=2
else
  title_level=1
fi

# ── 2. the title must not under-claim what the branch contains ───────────────
if [[ -n "$base" && -n "$head" ]]; then
  max_level=1
  culprit=""
  while IFS= read -r sha; do
    [[ -z "$sha" ]] && continue
    subject=$(git log -1 --format=%s "$sha")
    body=$(git log -1 --format=%b "$sha")
    lvl=$(level_of "$subject" "$body")
    if (( lvl > max_level )); then
      max_level=$lvl
      culprit="$subject"
    fi
  done < <(git rev-list "$base..$head")

  if (( max_level > title_level )); then
    fail "PR title claims a $(name_of "$title_level") release, but the branch contains a $(name_of "$max_level") change."
    cat >&2 <<EOF

  title:  $title
  commit: $culprit

The squash commit keeps only the title, so this PR would be released as a
$(name_of "$title_level") and the $(name_of "$max_level") change would never reach the changelog.
Retitle the PR to match the most significant change in it.
EOF
  fi
fi

if (( FAILED )); then exit 1; fi
echo "PR title OK — \"$title\" ($(name_of "$title_level") release)"
