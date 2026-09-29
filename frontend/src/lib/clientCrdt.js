/**
 * Browser replica of the server's CRDT (see Crdt.java): a doubly linked list of single UTF-16
 * units, kept in sync by exchanging insert / delete / format operations.
 *
 *  - `ids` holds the ids of the VISIBLE items in order, so `ids[i]` is the item at editor index i.
 *  - Deleted items stay in `items` as tombstones so concurrent operations can still refer to them.
 *  - `integrate()` must stay identical to Crdt.insert() on the server - that is what makes every
 *    replica converge.
 */
export const clientOf = (id) => {
  const at = id.indexOf('@')
  return at < 0 ? id : id.slice(at + 1)
}

export class ClientCrdt {
  constructor(clientId) {
    this.clientId = clientId
    this.counter = 0
    this.reset([])
  }

  /** Replace everything with the server's state (list in document order, tombstones included). */
  reset(list) {
    this.items = new Map()
    this.first = null
    this.ids = []
    for (const it of list) {
      this.items.set(it.id, {
        id: it.id,
        left: it.left ?? null,
        right: it.right ?? null,
        content: it.content,
        isdeleted: !!it.isdeleted,
        isbold: !!it.isbold,
        isitalic: !!it.isitalic,
      })
      if (it.left == null) this.first = it.id
      if (!it.isdeleted) this.ids.push(it.id)
    }
  }

  /** Visible characters as runs [{text, bold, italic}] - used to paint the editor in one go. */
  runs() {
    const out = []
    for (const id of this.ids) {
      const it = this.items.get(id)
      const nl = it.content === '\n'
      const bold = !nl && it.isbold
      const italic = !nl && it.isitalic
      const last = out[out.length - 1]
      if (last && last.bold === bold && last.italic === italic) last.text += it.content
      else out.push({ text: it.content, bold, italic })
    }
    return out
  }

  #link(item) {
    this.items.set(item.id, item)
    if (item.left) this.items.get(item.left).right = item.id
    else this.first = item.id
    if (item.right) this.items.get(item.right).left = item.id
  }

  // ------------------------------------------------------------------ local edits
  // Each returns the operation(s) to publish.

  localInsert(index, ch, bold = false, italic = false) {
    const id = `${this.counter++}@${this.clientId}`
    const left = index > 0 ? this.ids[index - 1] : null
    const right = left ? this.items.get(left).right : this.first
    const item = { id, left, right, content: ch, isdeleted: false, isbold: bold, isitalic: italic }
    this.#link(item)
    this.ids.splice(index, 0, id)
    return { operation: 'insert', ...item }
  }

  localDelete(index, count) {
    const removed = this.ids.splice(index, count)
    return removed.map((id) => {
      this.items.get(id).isdeleted = true
      return { operation: 'delete', id }
    })
  }

  localFormat(index, count, attrs) {
    const ops = []
    for (let i = 0; i < count; i++) {
      const it = this.items.get(this.ids[index + i])
      if (!it || it.content === '\n') continue
      if ('bold' in attrs) it.isbold = !!attrs.bold
      if ('italic' in attrs) it.isitalic = !!attrs.italic
      ops.push({ operation: 'format', id: it.id, isbold: it.isbold, isitalic: it.isitalic })
    }
    return ops
  }

  /** Translate one Quill delta (array of ops) into CRDT operations, updating this replica. */
  applyLocalDelta(deltaOps) {
    const out = []
    let index = 0
    for (const op of deltaOps) {
      if (op.retain != null) {
        if (op.attributes) out.push(...this.localFormat(index, op.retain, op.attributes))
        index += op.retain
      } else if (typeof op.insert === 'string') {
        const a = op.attributes || {}
        for (let i = 0; i < op.insert.length; i++) {
          const nl = op.insert[i] === '\n'
          out.push(this.localInsert(index++, op.insert[i], !nl && !!a.bold, !nl && !!a.italic))
        }
      } else if (op.delete != null) {
        out.push(...this.localDelete(index, op.delete))
      }
    }
    return out
  }

  // ----------------------------------------------------------------- remote edits

  /**
   * Integrate a remote insert. Returns {index, item}, null for a duplicate,
   * or 'gap' when it refers to items we do not have (=> caller should resync).
   */
  integrate(op) {
    if (this.items.has(op.id)) return null
    const right = op.right ?? null
    let left = op.left ?? null
    if ((left && !this.items.has(left)) || (right && !this.items.has(right))) return 'gap'
    const mine = clientOf(op.id)
    const item = {
      id: op.id, left: null, right: null, content: op.content,
      isdeleted: false, isbold: !!op.isbold, isitalic: !!op.isitalic,
    }

    if (left === null) {
      if (this.first !== null && right !== this.first && clientOf(this.first) > mine) {
        left = this.first
      } else {
        item.right = this.first
        this.#link(item)
        this.ids.splice(0, 0, item.id)
        return { index: 0, item }
      }
    }
    for (;;) {
      const next = this.items.get(left).right
      if (next === right || next === null || !(clientOf(next) > mine)) break
      left = next
    }
    item.left = left
    item.right = this.items.get(left).right
    this.#link(item)

    let pred = item.left
    while (pred && this.items.get(pred).isdeleted) pred = this.items.get(pred).left
    const index = pred ? this.ids.indexOf(pred) + 1 : 0
    this.ids.splice(index, 0, item.id)
    return { index, item }
  }

  /** @returns visible index that disappeared, or -1 if nothing changed */
  remoteDelete(id) {
    const it = this.items.get(id)
    if (!it || it.isdeleted) return -1
    it.isdeleted = true
    const index = this.ids.indexOf(id)
    if (index >= 0) this.ids.splice(index, 1)
    return index
  }

  /** @returns visible index of the formatted char, or -1 */
  remoteFormat(id, bold, italic) {
    const it = this.items.get(id)
    if (!it || it.content === '\n') return -1
    it.isbold = !!bold
    it.isitalic = !!italic
    return it.isdeleted ? -1 : this.ids.indexOf(id)
  }

  get text() {
    return this.ids.map((id) => this.items.get(id).content).join('')
  }
}
