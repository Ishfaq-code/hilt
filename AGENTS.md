# Frontend conventions

Keep the frontend easy to navigate and change. Follow these conventions in `apps/frontend`.

## Structure

- Put screens in `pages/`. A page reads its route inputs and composes the components for that screen.
- Put reusable controls and self-contained pieces of a screen in `components/`. Group related components by feature, such as `components/events/`, and shared controls in `components/ui/`.
- Keep a component's interaction state and handlers with that component. Lift state only when another component needs to share it.
- Put reusable state and effect logic in `hooks/`, non-React logic in `lib/`, and preview fixtures in `data/`.
- Keep entry points and routers focused on assembling the app and selecting pages. Import components directly from their files.
- Extract a component when it has a coherent responsibility, its own interaction, or repeated markup. Keep small helpers beside their only caller. Use feature names instead of atomic-design categories.

## Readability

- Use PascalCase for component files and component names, and camelCase for hooks and utility files. Name files after what they contain.
- Group related declarations and operations, with blank lines between distinct steps. Keep each function at a consistent level of abstraction.
- Use explicit prop types and descriptive names. Prefer straightforward conditions and early returns when they make the flow easier to follow.
- Write function components and hooks for React. Use classes for services when they own meaningful state or an interface; use ordinary functions for transformations and calculations.
- Add a short comment only when the reason or constraint is not clear from the code. Keep comments lowercase and without a trailing period.
- Run Prettier rather than formatting by hand. Keep the existing npm, TypeScript, and styling setup.

## UI and changes

- Reuse the existing controls and visual styles. Keep copy short and relevant to the user's action.
- Use semantic elements, visible labels, accessible icon buttons, and keyboard-operable controls. Check narrow screens and forms as well as desktop layouts.
- Preserve routes, storage keys, API contracts, and behavior during structural refactors.
- Implement the requested scope with the simplest sufficient design. Add abstractions when current callers need them.
- Keep the code authoritative. Document useful conventions and setup rather than maintaining a second description of the implementation.
- Verify with `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` from `apps/frontend`. Exercise affected flows in the browser. Add tests for behavior and boundary cases when logic changes.
