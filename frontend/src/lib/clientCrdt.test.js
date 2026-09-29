import test from 'node:test'
import assert from 'node:assert/strict'
import { ClientCrdt } from './clientCrdt.js'

/** Minimal stand-in for the server: applies ops in arrival order and tags them with a sequence number. */
class Server {
  constructor() { this.crdt = new ClientCrdt('_server'); this.seq = 0; this.log = [] }
  receive(op) {
    if (op.operation === 'insert') this.crdt.integrate(op)
    else if (op.operation === 'delete') this.crdt.remoteDelete(op.id)
    else this.crdt.remoteFormat(op.id, op.isbold, op.isitalic)
    const msg = { ...op, seq: ++this.seq }
    this.log.push(msg)
    return msg
  }
}
const deliver = (client, msg) => {
  if (msg.operation === 'insert') client.integrate(msg)
  else if (msg.operation === 'delete') client.remoteDelete(msg.id)
  else client.remoteFormat(msg.id, msg.isbold, msg.isitalic)
}
const type = (c, index, text) => c.applyLocalDelta([{ retain: index }, { insert: text }])

test('typing produces one insert per UTF-16 unit and keeps editor indexes', () => {
  const c = new ClientCrdt('alice')
  const ops = type(c, 0, 'a\u{1F600}b')          // emoji = 2 units
  assert.equal(ops.length, 4)
  assert.equal(c.ids.length, 4)
  assert.equal(c.text, 'a\u{1F600}b')
})

test('delete and format translate from Quill deltas', () => {
  const c = new ClientCrdt('alice')
  type(c, 0, 'hello')
  const del = c.applyLocalDelta([{ retain: 1 }, { delete: 2 }])
  assert.equal(del.length, 2)
  assert.equal(c.text, 'hlo')
  const fmt = c.applyLocalDelta([{ retain: 1 }, { retain: 2, attributes: { bold: true } }])
  assert.deepEqual(fmt.map((o) => o.isbold), [true, true])
  assert.deepEqual(c.runs(), [{ text: 'h', bold: false, italic: false }, { text: 'lo', bold: true, italic: false }])
  const unbold = c.applyLocalDelta([{ retain: 1 }, { retain: 1, attributes: { bold: null } }])
  assert.equal(unbold[0].isbold, false)
})

test('two users typing at the same spot concurrently converge', () => {
  const server = new Server()
  const alice = new ClientCrdt('alice')
  const bob = new ClientCrdt('bob')
  const base = type(alice, 0, 'ab').map((op) => server.receive(op))
  base.forEach((m) => deliver(bob, m))

  // both type between "a" and "b" before seeing each other's edit
  const fromAlice = type(alice, 1, 'X').map((op) => server.receive(op))
  const fromBob = type(bob, 1, 'Y').map((op) => server.receive(op))
  fromBob.forEach((m) => deliver(alice, m))
  fromAlice.forEach((m) => deliver(bob, m))

  assert.equal(alice.text, bob.text)
  assert.equal(alice.text, server.crdt.text)
  assert.equal(alice.text.length, 4)
})

test('concurrent typing at document start converges', () => {
  const server = new Server()
  const a = new ClientCrdt('alice')
  const b = new ClientCrdt('bob')
  const ma = type(a, 0, 'A').map((o) => server.receive(o))
  const mb = type(b, 0, 'B').map((o) => server.receive(o))
  mb.forEach((m) => deliver(a, m))
  ma.forEach((m) => deliver(b, m))
  assert.equal(a.text, b.text)
  assert.equal(a.text, server.crdt.text)
})

test('insert next to a deleted neighbour lands at the right visible index', () => {
  const server = new Server()
  const a = new ClientCrdt('alice')
  const b = new ClientCrdt('bob')
  type(a, 0, 'abc').map((o) => server.receive(o)).forEach((m) => deliver(b, m))
  // alice deletes "b" while bob types after it
  const del = a.applyLocalDelta([{ retain: 1 }, { delete: 1 }]).map((o) => server.receive(o))
  const ins = type(b, 2, 'Z').map((o) => server.receive(o))
  del.forEach((m) => deliver(b, m))
  ins.forEach((m) => deliver(a, m))
  assert.equal(a.text, 'aZc')
  assert.equal(b.text, 'aZc')
})

test('duplicates are ignored and unknown neighbours ask for a resync', () => {
  const c = new ClientCrdt('alice')
  const [op] = type(new ClientCrdt('bob'), 0, 'x')
  assert.ok(c.integrate(op))
  assert.equal(c.integrate(op), null)
  assert.equal(c.integrate({ id: '9@bob', left: 'nope@bob', right: null, content: 'y' }), 'gap')
})

test('reset rebuilds state from a server snapshot (incl. tombstones)', () => {
  const c = new ClientCrdt('me')
  c.reset([
    { id: '0@_', left: null, right: '1@_', content: 'h', isbold: true },
    { id: '1@_', left: '0@_', right: '2@_', content: 'x', isdeleted: true },
    { id: '2@_', left: '1@_', right: null, content: 'i' },
  ])
  assert.equal(c.text, 'hi')
  assert.deepEqual(c.runs(), [{ text: 'h', bold: true, italic: false }, { text: 'i', bold: false, italic: false }])
  const [op] = type(c, 2, '!')
  assert.equal(op.left, '2@_')
  assert.equal(c.text, 'hi!')
})

test('random concurrent sessions: three replicas always converge', () => {
  let seed = 12345
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n }
  for (let round = 0; round < 60; round++) {
    const server = new Server()
    const users = ['alice', 'bob', 'carol'].map((n) => new ClientCrdt(n))
    const inbox = users.map(() => [])
    const step = () => {
      const u = rnd(3)
      const c = users[u]
      const len = c.ids.length
      let ops
      if (len > 0 && rnd(4) === 0) ops = c.applyLocalDelta([{ retain: rnd(len) }, { delete: 1 }])
      else ops = type(c, rnd(len + 1), String.fromCharCode(97 + rnd(26)))
      for (const op of ops) {
        const msg = server.receive(op)
        users.forEach((_, i) => { if (i !== u) inbox[i].push(msg) })
      }
    }
    const flush = (i) => { const n = rnd(inbox[i].length + 1); inbox[i].splice(0, n).forEach((m) => deliver(users[i], m)) }
    for (let s = 0; s < 40; s++) { step(); if (rnd(2)) flush(rnd(3)) }
    users.forEach((_, i) => inbox[i].splice(0).forEach((m) => deliver(users[i], m)))
    assert.equal(users[0].text, users[1].text, `round ${round}`)
    assert.equal(users[1].text, users[2].text, `round ${round}`)
    assert.equal(users[0].text, server.crdt.text, `round ${round} vs server`)
  }
})

test('newlines never carry inline formatting', () => {
  const c = new ClientCrdt('alice')
  type(c, 0, 'a\nb')
  const ops = c.applyLocalDelta([{ retain: 0 }, { retain: 3, attributes: { bold: true } }])
  assert.equal(ops.length, 2)                                   // 'a' and 'b', not the newline
  assert.deepEqual(c.runs().map((r) => [r.text, r.bold]), [['a', true], ['\n', false], ['b', true]])
  const [ins] = c.applyLocalDelta([{ retain: 3 }, { insert: '\n', attributes: { bold: true } }])
  assert.equal(ins.isbold, false)
})
