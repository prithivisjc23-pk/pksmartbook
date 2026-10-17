<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App data (transactions, customers, products) is read/written from the browser client with RLS scoping rows to the owner; admins get read-only access via has_role(). Why: simple CRUD with no server logic needed.
- UI strings live in src/lib/i18n.tsx (en/ta dictionaries). Why: one place for the language toggle.
- Auth is mobile + password via a synthetic email `<10 digits>@pksmartbook.app` (mobileEmail in auth.tsx); never show email in UI. Why: no SMS provider needed; auto-confirm is on.
- Super admin role is granted in handle_new_user() by matching the synthetic email of the platform owner's mobile. Why: roles stay in user_roles, never client-side.
- Data belongs to a shop id (owner uid) resolved by claim_shop(); account_type on profiles ('shop'|'personal') drives which screens show. Why: one data model for both modes.
