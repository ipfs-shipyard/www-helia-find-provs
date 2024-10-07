import { CID } from 'multiformats/cid'
import { createHelia, libp2pDefaults } from 'helia'
import { devToolsMetrics } from '@libp2p/devtools-metrics'

const App = async () => {
  const DOM = {
    input: () => document.getElementById('input'),
    findBtn: () => document.getElementById('find-button'),
    output: () => document.getElementById('output'),
    terminal: () => document.getElementById('terminal')
  }

  const COLORS = {
    active: '#357edd',
    success: '#0cb892',
    error: '#ea5037'
  }

  const scrollToBottom = () => {
    const terminal = DOM.terminal()
    terminal.scroll({ top: terminal.scrollHeight, behavior: 'smooth' })
  }

  const clearStatus = () => {
    DOM.output().innerHTML = ''
  }

  const showStatus = (text, bg, id = null) => {
    const log = DOM.output()

    const line = document.createElement('p')
    line.innerHTML = text
    line.style.color = bg

    if (id) {
      line.id = id
    }

    log.appendChild(line)

    scrollToBottom(log)
  }

  const runFindProvs = async (cidString) => {
    clearStatus()

    const signal = AbortSignal.timeout(10000)
    showStatus(`Searching for providers of ${cidString}...`)
    const cid = CID.parse(cidString)
    let providers = new Map()

    const showProviders = () => {
      clearStatus()
      showStatus(`Providers:<pre>${JSON.stringify([...providers.values()], null, 2)}</pre>`, COLORS.success)
    }

    Promise.resolve().then(async () => {
      for await (const provider of helia.routing.findProviders(cid, {
        signal
      })) {
        providers.set(provider.id.toString(), provider)
        showProviders()
      }
    })
      .catch(err => {
        if (providers.size > 0) {
          return
        }

        clearStatus()
        showStatus(`Query failed:<pre>${err.message}</pre>`, COLORS.error)
      })
  }

  // Event listeners
  DOM.findBtn().onclick = async (e) => {
    e.preventDefault()

    const value = DOM.input().value ?? ''
    let cid = `${value}`.trim()

    if (!cid) {
      showStatus(`Invalid CID`, COLORS.error)
      return
    }

    try {
      await runFindProvs(cid)
    } catch (err) {
      console.error('Error running identify', err)
      showStatus(`${err}`, COLORS.error)
    }
  }

  showStatus('Creating Helia node')

  const libp2p = libp2pDefaults()
  libp2p.addresses.listen = []
  libp2p.metrics = devToolsMetrics()

  const helia = await createHelia({
    libp2p
  })

  clearStatus()
  showStatus(`Waiting for peers...`)

  while (true) {
    if (helia.libp2p.getPeers().length > 0) {
      break
    }

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  }

  clearStatus()
  showStatus('Helia node ready', COLORS.active)
  showStatus('Try running a FIND_PROVS query with a CID', COLORS.active)
  showStatus('E.g. QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D', COLORS.active)

  DOM.findBtn().disabled = false
}

App().catch(err => {
  console.error(err) // eslint-disable-line no-console
})
