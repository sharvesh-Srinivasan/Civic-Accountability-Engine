# Auto-Deploy Rule
Whenever the frontend code is changed and we reach a stable, agreed-upon state, automatically run the following to deploy:
```
npm run build
firebase deploy --only hosting
```
This ensures the live site is always perfectly synced with the local code during this project.
