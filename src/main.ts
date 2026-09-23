import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { db, requestPersistentStorage } from './lib/db'
import { pwa } from './lib/pwa.svelte'
import { i18n } from './lib/i18n/index.svelte'

// Set lang/dir/title before the first render so Arabic starts right-to-left
// immediately, with no left-to-right flash.
i18n.apply()

// Open the DB up front so first-launch seeding starts immediately.
// Errors are logged, not fatal: the UI can still render (e.g. private mode without IndexedDB).
db.open().catch((err) => console.error('Failed to open database', err))
requestPersistentStorage().catch(() => {})
pwa.init()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
