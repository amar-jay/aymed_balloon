#!/usr/bin/env node

/**
 * Interactive serial test - send commands and receive data
 * Run with: node test-serial-interactive.js [baudRate]
 */

const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function interactiveTest(devicePath, baudRate = 9600) {
  console.log(`\n🔌 Connecting to ${devicePath} at ${baudRate} baud...`)
  
  const port = new SerialPort({
    path: devicePath,
    baudRate: baudRate
  })
  
  const parser = new ReadlineParser({ delimiter: '\n' })
  port.pipe(parser)
  
  let messageCount = 0
  
  port.on('open', () => {
    console.log('✅ Connected!\n')
    console.log('Commands you can try:')
    console.log('  - Type any text and press Enter to send')
    console.log('  - Type "exit" to quit')
    console.log('  - Try common commands: "status", "info", "help", "?\n')
    prompt()
  })
  
  parser.on('data', (data) => {
    messageCount++
    const timestamp = new Date().toLocaleTimeString()
    console.log(`\n[${timestamp}] << ${data.trim()}`)
    prompt()
  })
  
  port.on('error', (err) => {
    console.error('❌ Error:', err.message)
  })
  
  function prompt() {
    rl.question('> ', (input) => {
      const command = input.trim()
      
      if (command.toLowerCase() === 'exit') {
        console.log('\n👋 Closing connection...')
        port.close(() => {
          console.log(`Received ${messageCount} messages total.`)
          process.exit(0)
        })
        return
      }
      
      if (command) {
        port.write(command + '\n', (err) => {
          if (err) {
            console.error('❌ Write error:', err.message)
          } else {
            console.log(`>> Sent: ${command}`)
          }
          prompt()
        })
      } else {
        prompt()
      }
    })
  }
}

async function main() {
  console.log('🔧 Interactive Serial Test')
  console.log('===========================')
  
  const { SerialPort } = require('serialport')
  const ports = await SerialPort.list()
  
  const usbPorts = ports.filter(p => 
    p.path.includes('ACM') || 
    p.path.includes('USB') || 
    p.path.includes('ttyUSB') || 
    p.path.includes('ttyACM') ||
    p.path.includes('COM')
  )
  
  if (usbPorts.length === 0) {
    console.log('❌ No USB serial devices found')
    process.exit(1)
  }
  
  console.log('\nAvailable USB devices:')
  usbPorts.forEach((p, i) => {
    console.log(`  [${i}] ${p.path}${p.manufacturer ? ' - ' + p.manufacturer : ''}`)
  })
  
  const testPort = usbPorts[0].path
  const baudRate = process.argv[2] ? parseInt(process.argv[2]) : 9600
  
  console.log(`\nUsing: ${testPort}`)
  
  await interactiveTest(testPort, baudRate)
}

main().catch(err => {
  console.error('💥 Error:', err.message)
  process.exit(1)
})
