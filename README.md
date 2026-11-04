# Week Goals

A plain static site. No build step.

## Files
- index.html, style.css, app.js: the app
- config.js: your Supabase URL and key (cloud sync)
- supabase.sql: the one table sync needs
- manifest.json, icons/, sw.js: installable app ("Add to Home screen")
- vercel.json: small header rules

## Turn on cloud sync (one time)
1. Create a free project at supabase.com.
2. SQL Editor, New query: paste supabase.sql, press Run.
3. Authentication, Providers, Email: turn OFF "Confirm email" (simplest). Leave it on if you prefer, then confirm by email once.
4. Project Settings, API: copy the Project URL and the anon / publishable key into config.js. Never use the service_role / secret key.
5. Deploy again: `vercel --prod`
6. Open the site, Settings, Cloud sync, Create account. On your other device, use Sign in with the same email and password.

## Plan with an AI (no API key)
1. In the app press "Import from AI", then "Copy AI prompt".
2. Paste it into ChatGPT, Claude or Gemini. Describe your goals. It asks a few questions, then replies with one JSON code block.
3. Copy that reply, paste it into the app, press "Check and preview", then "Add to my week".
The app ignores any text outside the curly braces, fixes smart quotes and trailing commas, and warns when a day is overloaded.

## Reminders that work when the app is closed
Settings, "Add reminders to my calendar" downloads a .ics file. Open it on your phone or laptop to add one event per day with an alert. Download it in the normal browser (not the installed app) on iPhone.

## Edit anything
Each goal has an Edit button: rename, edit notes, change a task's text, move it to another day, delete it, or add your own tasks.

## Deploy
`vercel --prod` from this folder.

## Notes
- If two devices edit the same goal, the most recent edit wins for that goal. Different goals never clash.
- Syncs a moment after each change, and whenever you reopen the app.
- Changed a file later and an old copy sticks? Bump V in sw.js.
