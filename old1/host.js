#!/usr/bin/env node
                                                                                                                                                                                                                                                                                                                                                                                                
const pro=require("./protocol.js");
let config;
const dgram=require("dgram");
const {remoteAddr,remotePort}=config=JSON.parse(require("fs").readFileSync(__dirname+"/config.json","utf8"));
const host=pro.createHost(remotePort,remoteAddr);
let mcgameport;
host.on("ready",()=>{
  console.log(`连接已完成，编码：${host.IPcode}`);
});
host.on("errorr",(err)=>{
  console.log("哎呀！连接失败了！请看看配置是否正确！\n"+err);
  process.exit(0);
});
host.on("join",(n,callback)=>{
  console.log("有玩家加入");
  if(n=="Messenger"){
    //信使
    let s=dgram.createSocket("udp4");
    callback(s);
    s.on("Message",(msg,from,rinfo)=>{
      if(from=="server"){
        s.send(msg,19130,pro.staticRaknet);
      }else if(rinfo.address==pro.staticWlanIP||rinfo.address=="127.0.0.1"){
        let str=msg.toString("binary");
        let arr=str.split(";");
        mcgameport=parseInt(arr[arr.length-2]);
        s.Send(msg);
      }else console.log(msg.toString()+rinfo)
    });
    s.bind(()=>{
      s.setBroadcast(true);
    });
  }else if(n=="Gamer"){
    if(!mcgameport){
      callback();
      return;
    }
    let s=dgram.createSocket("udp4");
    callback(s);
    s.on("Message",(msg,from,rinfo)=>{
      if(from=="server"){
        s.send(msg,mcgameport,"127.0.0.1");
      }else if(rinfo.address==pro.staticWlanIP){
        s.Send(msg);
      }
    });
    s.bind();
  }
});
host.bind();
console.log("连接中...");
{
  let explain=[28,0,0,0,0,0,21,54,138,146,99,236,202,86,221,111,148,0,255,255,0,254,254,254,254,253,253,253,253,18,52,86,120,0,89,77,67,80,69,59,77,97,100,100,111,103,99,104,120,59,51,56,57,59,49,46,49,52,46,49,59,49,59,56,59,57,54,51,54,56,49,53,51,55,51,48,50,48,57,57,54,55,50,52,59,231,169,186,231,154,132,232,182,133,229,185,179,229,157,166,59,67,114,101,97,116,105,118,101,59,49,59,54,50,52,55,54,59,54,50,52,55,55,59];
  let s=dgram.createSocket({
    type:"udp4",
    reuseAddr:true
  });
  s.bind(19130,pro.staticRaknet);
  let ri;
  setInterval(()=>{
    if(!ri)return;
    s.send(Buffer.from(explain),ri.port,ri.address);
  },500);
  s.on("message",(msg,rinfo)=>{
    ri=rinfo;
    //console.log(ri)
  })
}