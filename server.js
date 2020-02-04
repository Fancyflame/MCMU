#!/usr/bin/env node
                                                                                                                                                                                                                                                                                                                                                                                                
const pro=require("./protocol.js");
let config;
const {serverAddr,serverPort}=config=JSON.parse(require("fs").readFileSync(__dirname+"/config.json","utf8"));
let server=pro.createServer();
server.on("hostjoin",(code)=>{
  console.log(`有编码为 ${code} 的服主开服`);
});
server.on("hostexit",(code)=>{
  console.log(code+" 已关闭");
});
server.on("clientjoin",(code)=>{
  console.log(`有玩家加入房间 ${code}`)
});
server.on("clientexit",()=>{
  console.log("有玩家退出");
})
server.bind(serverPort,serverAddr,()=>{
  console.log(`服务器已运行在 ${serverAddr}:${serverPort}`)
});