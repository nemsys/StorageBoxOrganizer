# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.13.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.12.1...v1.13.0) (2026-08-29)


### Features

* **ui:** act on the UI/UX review — findability, touch targets, empty states ([#25](https://github.com/nemsys/StorageBoxOrganizer/issues/25)) ([0458125](https://github.com/nemsys/StorageBoxOrganizer/commit/0458125c699e59b4bec4565760918697bb143d6f))

### [1.12.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.12.0...v1.12.1) (2026-08-29)


### Bug Fixes

* **ui:** restore the original header on the top-level views ([#24](https://github.com/nemsys/StorageBoxOrganizer/issues/24)) ([6b42b2c](https://github.com/nemsys/StorageBoxOrganizer/commit/6b42b2c02c3eba42cb971312b482e04f981ff6dd))

## [1.12.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.11.0...v1.12.0) (2026-08-29)


### Features

* **ui:** give the box view a full-bleed hero image and stop clipping menu labels ([#23](https://github.com/nemsys/StorageBoxOrganizer/issues/23)) ([06259ce](https://github.com/nemsys/StorageBoxOrganizer/commit/06259ce48623d47e15c63a9c583eba130413f141))

## [1.11.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.10.1...v1.11.0) (2026-08-28)


### Features

* **tags:** case-insensitive tags, with reachable rename and delete ([#22](https://github.com/nemsys/StorageBoxOrganizer/issues/22)) ([45d481b](https://github.com/nemsys/StorageBoxOrganizer/commit/45d481b32b0d5a3554da67216d7199620a7bd0ee))

### [1.10.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.10.0...v1.10.1) (2026-08-28)


### Bug Fixes

* **import:** stop export/import round trip duplicating everything ([#21](https://github.com/nemsys/StorageBoxOrganizer/issues/21)) ([e40d52b](https://github.com/nemsys/StorageBoxOrganizer/commit/e40d52be1374c6c09edf1b122d78adc679b1757f))

## [1.10.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.9.2...v1.10.0) (2026-08-27)


### Features

* **ui:** link the author name in About to sciscend.com ([#20](https://github.com/nemsys/StorageBoxOrganizer/issues/20)) ([21bfb70](https://github.com/nemsys/StorageBoxOrganizer/commit/21bfb70484e353d9ee49addc7dae441aa39d29d6))

### [1.9.2](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.9.1...v1.9.2) (2026-08-27)

> Backfilled by hand. Documentation only — no application code changed, so this
> version is identical to 1.9.1. Releases like this no longer happen: the Release
> workflow now ignores pushes that touch only Markdown, `docs/` or `LICENSE`.

* **i18n:** record the rule for sentences with a clickable part ([#18](https://github.com/nemsys/StorageBoxOrganizer/issues/18)) ([a70fd78](https://github.com/nemsys/StorageBoxOrganizer/commit/a70fd7848eebecb0c858ad36529b4b1526c26df2))

### [1.9.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.9.0...v1.9.1) (2026-08-27)


### Bug Fixes

* **auth:** make the sign-in/sign-up toggle look clickable ([#17](https://github.com/nemsys/StorageBoxOrganizer/issues/17)) ([2df8e3f](https://github.com/nemsys/StorageBoxOrganizer/commit/2df8e3f342ebb1adc5b1c2d9124f40ffac81c584))

## [1.9.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.8.2...v1.9.0) (2026-08-27)


### Features

* **ui:** add an About dialog with version, author and contact ([#16](https://github.com/nemsys/StorageBoxOrganizer/issues/16)) ([1c39142](https://github.com/nemsys/StorageBoxOrganizer/commit/1c391425d53ad4a6d1fff6cb24b3b83e2c6e5483))

### [1.8.2](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.8.1...v1.8.2) (2026-08-27)

> Backfilled by hand. This PR was squash-merged under a `chore:` title, so the
> tooling saw only that: it recorded nothing and released a feature as a patch.
> Everything below actually shipped in this version. The version number is left
> as it was released — only the record is corrected. A CI check now rejects a PR
> title that under-claims the changes on its branch.

### Features

* **auth:** require an approval claim for all Firestore access — signing in no longer grants data access; the owner approves accounts with `npm run access grant` ([#15](https://github.com/nemsys/StorageBoxOrganizer/issues/15)) ([8ee4447](https://github.com/nemsys/StorageBoxOrganizer/commit/8ee44470cd4cf0ccac66e4c1dcad9acebbab34d5))

### Bug Fixes

* **auth:** let permission-denied reach the approval gate ([#15](https://github.com/nemsys/StorageBoxOrganizer/issues/15))

### Miscellaneous

* add MIT LICENSE, remove GPS-tagged sample images, and stop linting generated `android/` output ([#15](https://github.com/nemsys/StorageBoxOrganizer/issues/15))

### [1.8.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.8.0...v1.8.1) (2026-08-26)


### Bug Fixes

* **ui:** keep the Gallery button labelled Gallery after picking a photo ([#14](https://github.com/nemsys/StorageBoxOrganizer/issues/14)) ([6ecc4cf](https://github.com/nemsys/StorageBoxOrganizer/commit/6ecc4cfd6f7be2b1c87b2a11b69ae143d00bd59c))

## [1.8.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.7.0...v1.8.0) (2026-08-26)


### Features

* **pwa:** make the web app installable to the home screen ([#13](https://github.com/nemsys/StorageBoxOrganizer/issues/13)) ([5444256](https://github.com/nemsys/StorageBoxOrganizer/commit/5444256c54b119ed0752efa65cd46ad4bb0dc79b))

## [1.7.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.6.3...v1.7.0) (2026-08-26)


### Features

* translate the UI into Bulgarian with an EN/BG switcher ([#12](https://github.com/nemsys/StorageBoxOrganizer/issues/12)) ([c2bdf8c](https://github.com/nemsys/StorageBoxOrganizer/commit/c2bdf8c0f60b95cc20b145721058b5723f7c069c))

### [1.6.3](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.6.2...v1.6.3) (2026-08-26)

### [1.6.2](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.6.1...v1.6.2) (2026-07-30)


### Bug Fixes

* simplify last-change label in edit box view ([#10](https://github.com/nemsys/StorageBoxOrganizer/issues/10)) ([7cd7905](https://github.com/nemsys/StorageBoxOrganizer/commit/7cd79052610aa7a024b4e7e4b28d069f73fc61f5))

### [1.6.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.6.0...v1.6.1) (2026-07-30)

## [1.6.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.5.0...v1.6.0) (2026-07-30)


### Features

* show last contents-change date on box view ([#8](https://github.com/nemsys/StorageBoxOrganizer/issues/8)) ([ab8c4be](https://github.com/nemsys/StorageBoxOrganizer/commit/ab8c4beb66e7c27c82cd2f43cce70fc2e158552e))

## [1.5.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.4.0...v1.5.0) (2026-06-15)


### Features

* add permanent Delete Item action in box view ([#7](https://github.com/nemsys/StorageBoxOrganizer/issues/7)) ([ba37637](https://github.com/nemsys/StorageBoxOrganizer/commit/ba3763722403dac1ab371b28423d6fa969e53bd0))

## [1.4.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.3.0...v1.4.0) (2026-06-15)


### Features

* unify type scale and UI consistency pass ([#6](https://github.com/nemsys/StorageBoxOrganizer/issues/6)) ([be45ee8](https://github.com/nemsys/StorageBoxOrganizer/commit/be45ee8cb865866bd07d7990000e406e07de16a4))

## [1.3.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.6...v1.3.0) (2026-06-15)


### Features

* fullscreen image viewer in edit modals + UX fixes ([#5](https://github.com/nemsys/StorageBoxOrganizer/issues/5)) ([22bc1bf](https://github.com/nemsys/StorageBoxOrganizer/commit/22bc1bf035dfc2ea825fc4892f6c3d8d0da027dd))

### [1.2.6](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.5...v1.2.6) (2026-06-14)

### [1.2.5](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.4...v1.2.5) (2026-06-14)

### [1.2.4](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.3...v1.2.4) (2026-06-14)

### [1.2.3](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.2...v1.2.3) (2026-06-14)

### [1.2.2](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.1...v1.2.2) (2026-06-13)


### Bug Fixes

* streamline Box View add affordance (FAB + empty state) ([#4](https://github.com/nemsys/StorageBoxOrganizer/issues/4)) ([9de9cd7](https://github.com/nemsys/StorageBoxOrganizer/commit/9de9cd756a993133397e5151e4683b8588ed9587))

### [1.2.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.2.0...v1.2.1) (2026-06-13)

## [1.2.0](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.1.3...v1.2.0) (2026-06-13)


### Features

* redesign edit/delete actions with overflow menus ([#2](https://github.com/nemsys/StorageBoxOrganizer/issues/2)) ([a4fb949](https://github.com/nemsys/StorageBoxOrganizer/commit/a4fb949af06c4e077e9df9a71ae96cc6f342c9b5))

### [1.1.3](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.1.2...v1.1.3) (2026-06-07)

### [1.1.2](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.1.1...v1.1.2) (2026-06-06)


### Bug Fixes

* manual trigger of release v1.1.1 ([3b976f9](https://github.com/nemsys/StorageBoxOrganizer/commit/3b976f9070b89bb2b0d97a3669fd54770a160604))

### [1.1.1](https://github.com/nemsys/StorageBoxOrganizer/compare/v1.1.0...v1.1.1) (2026-06-06)


### Bug Fixes

* **ui:** Fix fullscreen image viewer on Items ([e03ee7e](https://github.com/nemsys/StorageBoxOrganizer/commit/e03ee7eda36d11894b4ca353fe16180b64dd3511))

## [1.1.0] - 2026-06-06
### Changed
- Redesigned adding new boxes and items by adding Floating action button (FAB) to the bottom.
- Redesigned the Sort & Filter bar and made it sticky at the top.
- Updated box cards grid layout to be more compact on mobile screens.

### Fixed
- Adjusted UI spacing (smaller grid gaps, decreased vertical margins for Sort/Filter row).
- Corrected alignment by moving the Filter box to the right.

## [1.0.0] - 2026-06-04
### Added
- Core application functionalities: Box & Item Catalog.
- Multi-image support.
- Fuzzy search via Fuse.js.
- Tagging system.
- Firebase Authentication and Firestore integrations.
- Import/Export backup functionality.
- Dark and Light theme support.
