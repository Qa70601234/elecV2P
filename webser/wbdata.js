const { CONFIG, CONFIG_Port } = require('../config')

const { logger, list } = require('../utils')
const clog = new logger({ head: 'wbdata' })

const { CONFIG_RULE, JSLISTS } = require('../script')

module.exports = app => {
  app.get("/data", (req, res)=>{
    let type = req.query.type
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get data ${type}`)
    res.writeHead(200,{ 'Content-Type' : 'text/plain;charset=utf-8' })
    switch (type) {
      case "overview":
        res.end(JSON.stringify({
          proxyPort: CONFIG_Port.proxy,
          webifPort: CONFIG_Port.webif,
          ruleslen: CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length,
          rewriteslen: CONFIG_RULE.rewritelists.length,
          jslistslen: JSLISTS.length,
          mitmhostlen: CONFIG_RULE.mitmhost.length,
          version: CONFIG.version,
          start: CONFIG.start,
        }))
        break
      case "rules":
        res.end(JSON.stringify({
          eplists: [...CONFIG_RULE.reqlists, ...CONFIG_RULE.reslists],
          uagent: CONFIG_RULE.uagent,
          jslists: JSLISTS
        }))
        break
      case "rewritelists":
        res.end(JSON.stringify({
          rewritelists: CONFIG_RULE.rewritelists,
          subrules: CONFIG_RULE.subrules,
          jslists: JSLISTS
        }))
        break
      case "mitmhost":
        res.end(JSON.stringify({
          host: CONFIG_RULE.mitmhost,
          type: CONFIG_RULE.mitmtype
        }))
        break
      case "filter":
        res.end(list.get('filter.list'))
        break
      default: {
        res.end("404")
      }
    }
  })

  app.put("/data", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put data " + req.body.type)
    switch(req.body.type){
      case "rules":
        let fdata = req.body.data.eplists
        list.put('default.list', "[elecV2P rules]\n" + fdata.join("\n"))

        res.end("success! rules saved.")
        CONFIG_RULE.reqlists = []
        CONFIG_RULE.reslists = []
        fdata.forEach(r=>{
          if (/req$/.test(r)) CONFIG_RULE.reqlists.push(r)
          else CONFIG_RULE.reslists.push(r)
        })
        clog.notify(`default 规则 ${ CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length} 条`)
        break
      case "mitmhost":
        let mhost = req.body.data
        mhost = mhost.filter(host=>host.length>2)
        list.put('mitmhost.list', "[mitmhost]\n" + mhost.join("\n"))
        res.end("success! mitmhost list saved: " + mhost.length)
        CONFIG_RULE.mitmhost = mhost
        break
      case "mitmtype":
        let mtype = req.body.data
        CONFIG_RULE.mitmtype = mtype
        if (mtype === 'all') clog.notify('MITM 设置为全局模式')
        else if (mtype === 'none') clog.notify('MITM 已关闭')
        else clog.notify('MITM 设置为按列表域名解析模式')
        res.end('设置成功')
        break
      default:{
        res.end("data put error")
      }
    }
  })
}