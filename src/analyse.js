// analyser converts AST into IR, able to be compiled after

export default tree => {
  // language-level sections
  // `type` section is built on stage of WAT compiling
  // `memory`/`table` sections are covered by arrays
  // intermediate module representation
  let ir = {
    func: {},
    export: {},
    import: {},
    global: {},
    data: {},
    range: {}
  }

  tr[tree[0]](tree, ir)

  return ir
}

// module-level transforms
const tr = {
  ';': ([,...statements], ir) => {
    for (let statement of statements) statement && tr[statement[0]]?.(statement, ir)
  },

  // @ 'math#sin', @ 'path/to/lib'
  '@': ([,[,path]], ir) => {
    let url = new URL('import:'+path)
    let {hash, pathname} = url
    ir.import[pathname] = hash ? hash.slice(1).split(',') : []
  },

  // a = b., a() = b().
  '.': ([_,statement], ir) => {
    tr[statement[0]]?.(statement, ir)
  },

  '=': (node, ir) => {
    let [,left,right] = node

    // a() = b
    if (left[0] === '(') {
      let [, name, args] = left

      args = args?.[0]===',' ? args.slice(1) : args ? [args] : []

      // init args by name
      args.forEach(arg => args[arg] = {})

      // detect overload
      if (ir.func[name]) throw Error(`Function \`${name}\` is already defined`)

      let fun = ir.func[name] = {
        name,
        args,
        local: {},
        state: {},
        body: [],
        return: []
      }

      // evaluate function body
      fun.body = mapNode(node, right, fun)

      // catch function return value
      // [a, b].
      console.log(right)
      // FIXME: detect output
      // if (op === '[' && parent[0] === '.') {
      //   fun.output.push(...args)
      // }
    }
    // a = b
    else {
      ir.global[left] = right
    }
  },
}

// maps node & analyzes internals
function mapNode(parent, node, fun) {
  let [op, ...args] = node

  // *a = init
  if (op === '*') {
    if (args.length === 1) {
      // detect state variables
      fun.state[args[0]] = parent[0] === '=' ? parent[2] : null
    }
  }

  return [op, ...args.map(arg => Array.isArray(arg) ? mapNode(node, arg, fun) : arg)]
}
