var umkv = require('unordered-materialized-kv')

function createIndex (ldb) {
  var kv = umkv(ldb)

  return {
    maxBatch: 100,
    map: function (nodes, next) {
      var ops = nodes
        .filter(function (node) {
          return node.value.type === 'osm/element'
        })
        .reduce(function (accum, node) {
          var version = node.key.toString('hex') + '@' + node.seq
          accum.push({  // index id
            id: version,
            key: node.value.id,
            links: node.value.links
          })
          return accum
        }, [])
      kv.batch(ops, next)
    },
    storeState: function (state, cb) {
      ldb.put('state', state, cb)
    },
    fetchState: function (cb) {
      ldb.get('state', function (err, state) {
        if (err && err.notFound) cb()
        else if (err) cb(err)
        else cb(null, state)
      })
    },
    api: {
      get: function (core, id, cb) {
        this.ready(function () {
          kv.get(id, function (err, versions) {
            if (err && err.notFound) cb(null, [])
            else cb(err, versions)
          })
        })
      }
    }
  }
}

module.exports = createIndex
