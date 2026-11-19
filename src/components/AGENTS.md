- Authentication pages use scoped sans-serif typography and semantic theme colors; this keeps forms legible without restyling unrelated pages.
- Login and register live under the pathless `_auth` layout (AuthLayout in auth-shell.tsx) so the mountain-scene brand panel persists; CSS transforms move it between sides and only its copy swaps, avoiding remount and View Transition conflicts.
- AuthSkeleton renders only form placeholders inside that frame and AuthStage owns the skeleton-to-form handoff; the global skeleton observer skips `.auth-shell` to avoid competing entrance animations.
- Fixed overlays rendered from the auth form side portal to document.body, because the moving form side uses a transform that would trap them.

- Navbar uses bounded primary links and an account dropdown; secondary role links stay reachable in both dropdown and mobile Sheet to prevent overflow.
- Floating help buttons share the `.sv-fab` stack (`--sv-fab-base`; bottom bars add `.sv-bottom-bar`); menus open them via `@/lib/floating-help` events so help stays reachable when buttons hide.
- Root wrapper and TeacherShell clip horizontal overflow so phones never zoom out; still fix the wide element itself.
