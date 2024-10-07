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

  const runIdentify = async (cidString) => {
    clearStatus()

    const signal = AbortSignal.timeout(10000)
    showStatus(`Searching for providers of ${cidString}...`)
    const cid = CID.parse(cidString)

    for await (const event of helia.libp2p.services.dht.findProviders(cid, {
      signal
    })) {


      if (event.name === 'DIAL_PEER') {
        showStatus(`${event.name} ${event.peer}`)
      } else if (event.name === 'SEND_QUERY') {
        showStatus(`${event.name} To: ${event.to} Query: ${event.messageName}`)
      } else if (event.name === 'QUERY_ERROR') {
        showStatus(`${event.name} To: ${event.from} ${event.error}`)
      } else if (event.name === 'PEER_RESPONSE') {
        showStatus(`${event.name} From: ${event.from} Query: ${event.messageName}`)
        showStatus(`Closer: [`)

        for (const peerInfo of event.closer) {
          showStatus(`&nbsp;&nbsp;${peerInfo.id} [`)

          for (const ma of peerInfo.multiaddrs) {
            showStatus(`&nbsp;&nbsp;&nbsp;&nbsp;${ma.toString()} [`)
          }

          showStatus(`&nbsp;&nbsp;]`)
        }

        showStatus(`]`)
        showStatus(`Providers: [`)

        for (const peerInfo of event.providers) {
          showStatus(`&nbsp;&nbsp;${peerInfo.id.toString()} [`)

          for (const ma of peerInfo.multiaddrs) {
            showStatus(`&nbsp;&nbsp;&nbsp;&nbsp;${ma.toString()} [`)
          }

          showStatus(`&nbsp;&nbsp;]`)
        }

        showStatus(`]`)
      } else {
        showStatus(`${event.name}`)
        console.info(event)
      }
    }

    clearStatus()
    showStatus(`<pre>${JSON.stringify(data, null, 2)}</pre>`, COLORS.success)
  }

  // Event listeners
  DOM.findBtn().onclick = async (e) => {
    e.preventDefault()

    const value = DOM.input().value ?? ''
    let peerId = `${value}`.trim()

    if (!peerId) {
      showStatus(`Invalid PeerId or Multiaddr`, COLORS.error)
      return
    }

    try {
      await runIdentify(peerId)
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
