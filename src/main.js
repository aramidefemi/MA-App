import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { app } from './lib/app.js'

document.title = app.name

mount(App, { target: document.getElementById('app') })
