#!/usr/bin/env node
                                                                                                                                                                                                                                                                                                                                                    
const [
  fs,dgram,pro,zlib
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "fs","dgram","./protocol2.js","zlib"
);
//const port;
function tp(p){
  return __dirname+"/"+p;
}
function isLocal(ad){
  return (ad=="127.0.0.1"||ad==pro.getWlanIP())
}
const {
  remoteAddr:rmtaddr,
  remotePort:rmtport,
  serverPort:srvport
}=JSON.parse(fs.readFileSync(tp("config.json")));
{
  let ar=process.argv;
  //node path cmd code
  if(ar.length<3){
    ar.length=3;
  }
  switch(ar[2]){
    case "join":
      if(!ar[3]){
        console.log("请输入编号！");
        process.exit();
      }else{
        client(ar[3]);
      }
      break;
    case "open":
      host();
      break;
    case "server":
      server();
      break;
    default:
      console.log("第三个参数必须是open,join或者server");
      process.exit();
      break;
  }
}
function client(code,pwd){
  let msgr=pro.createClient(rmtport,rmtaddr,code,"Messenger");
  let game=pro.createClient(rmtport,rmtaddr,code,"Gamer");
  let msgr2=dgram.createSocket("udp4");
  let game2=dgram.createSocket("udp4");
  let fakegameport;//这是用于改写描述包的
  let mcgameport;//本地mc的
  let msgrport;
  msgr2.bind(19132,()=>{
    console.log("本地信使端口已开启");
    msgr2.on("message",(msg,rinfo)=>{
      if(isLocal(rinfo.address)){
        msgr.write(msg);
        msgrport=rinfo.port;
      }
    });
  });
  msgr.on("Connect",()=>{
    console.log("Messenger管道已连接")
    msgr.on("data",(d)=>{
      let s=d.toString("binary");
      //示例：6��c��V�o�����������4VxYMCPE;Maddogchx;389;1.14.1;1;8;9636815373020996724;空的超平坦;Creative;1;62475;62476;
      s=s.split(";");
      //s[1]="MCMU_"+s[1];
      s.splice(-3,2,fakegameport,fakegameport+1);
      s=s.join(";");
      console.log("服务器："+s);
      msgr2.send(Buffer.from(s,"binary"),msgrport);
    })
  });
  game2.bind(()=>{
    console.log("本地游戏端口已开启");
    fakegameport=game2.address().port;
    game2.on("message",(msg)=>{
      game.write(msg);
    })
  });
  game.on("Connect",()=>{
    console.log("Gamer管道已连接")
    //fakegameport=udp.address().port;
    game.on("data",()=>{
      game2.send(msg,mcgameport);
    })
  });
  msgr.on("Error",(reason)=>{
    console.log("连接失败，因为："+reason);
    process.exit();
  })
}
function host(){
  let host=pro.createHost(rmtport,rmtaddr);
  host.on("Connect",(code)=>{
    console.log("已连接到服务器，编码是"+code);
  });
  host.on("Error",(reason)=>{
    console.log("没法开服，因为："+reason);
    process.exit();
  });
  let gameport;
  host.on("Join",(name,tcp)=>{
    if(name=="Messenger"){
      console.log("Messenger joined");
      let skt=dgram.createSocket("udp4");
      skt.bind(()=>{
        skt.setBroadcast(true);
        tcp.on("data",(d)=>{
          //描述包
          let s=msg.toString().split(";");
          gameport=parseInt(s[s.length-3]);
          skt.send(msg,19132,"255.255.255.255");
        });
        skt.on("message",(msg,rinfo)=>{
          if(isLocal(rinfo.address)){
            tcp.write(msg);
          }
        });
      });
    }else if(name=="Gamer"){
      //游戏数据
      console.log("Gamer joined");
      let skt=dgram.createSocket("udp4");
      skt.bind(()=>{
        tcp.on("data",(d)=>{
          skt.send(d,gameport);
        });
        skt.on("message",(msg,rinfo)=>{
          if(isLocal(rinfo.address)){
            tcp.write(msg);
          }
        });
      })
    }
  })
}
function server(){
  let srv=pro.createServer();
  srv.listen(srvport);
  srv.on("listening",()=>{
    console.log(`服务器已在localhost:${srvport}上运行`);
  });
  srv.on("hostjoin",(id)=>{
    console.log(`有编号为${id}的房主连接`);
  });
  srv.on("hostexit",(id)=>{
    console.log(`编号为${id}的房主断开连接`);
  });
  srv.on("clientjoin",(id)=>{
    console.log(`有玩家加入${id}`)
  });
  srv.on("clientexit",(id)=>{
    console.log(`有玩家退出${id}`)
  })
}