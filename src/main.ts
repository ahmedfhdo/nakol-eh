import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { db, requestPersistentStorage } from './lib/db'
import { pwa } from './lib/pwa.svelte'

// Open the DB up front so first-launch seeding starts immediately.
// Errors are logged, not fatal: the UI can still render (e.g. private mode without IndexedDB).
db.open().catch((err) => console.error('Failed to open database', err))
requestPersistentStorage().catch(() => {})
pwa.init()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
