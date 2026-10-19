# Progress

## Current phase: 1 — Vertical slice (in progress)

### Phase 0 — Plan ✅ (approved 2026-10-19)

Planning documents:

- [docs/specs.md](docs/specs.md)
- [docs/features.md](docs/features.md)
- [docs/curriculum-map.md](docs/curriculum-map.md)
- [docs/build-plan.md](docs/build-plan.md)
- [docs/open-questions.md](docs/open-questions.md)

**Owner decisions:** all defaults, except:

- **Q3 — students must save their progress.** Devices may wipe data at sign-out, so the save
  code, progress file and "Continue from a save" moved into Phase 1 (specs §12.5).
- **Q5 — Phaser 4** (4.2.x) instead of Phaser 3.

**Design change made while starting Phase 1:** overworld maps are ASCII grids in
`region.yaml` instead of Tiled files (specs §11.1). They are simpler for teachers and share
code with quest stages.

### Phase 1 — Next steps

See the milestone table in [docs/build-plan.md](docs/build-plan.md#phase-1--vertical-slice).

### Known issues

- CSTA standard descriptions are paraphrased. Verify them verbatim against csteachers.org
  (unreachable from the build environment) before the teacher guide.
