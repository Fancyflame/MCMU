                                                                                                                                                                                                                                                                                                                                                    
const [
  fs,dgram,pro
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "fs","dgram","./protocol.js"
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
  let gameport;
  let msgrport;
  game.on("Connect",(udp)=>{
    gameport=udp.address().port;
  })
  msgr.on("Connect",(udp)=>{
    console.log("已连接到服务器");
    udp.on("Message",(msg,from,rinfo)=>{
      if(from=="server"&&msgrport&&gameport){
        let s=msg.toString("binary");
        //示例：6��c��V�o�����������4VxYMCPE;Maddogchx;389;1.14.1;1;8;9636815373020996724;空的超平坦;Creative;1;62475;62476;
        s=s.split(";");
        s[1]="MCMU_"+s[1];
        s.splice(-3,2,gameport,gameport+1);
        s=s.join(";");
        udp.send(Buffer.from(s,"binary"),msgrport,rinfo.port);
      }else if(from=="local"){
        msgrport=rinfo.port;
        udp.Send(msg);
      }
    });
  });
  msgr.on("Failed",()=>{
    console.log("连接失败");
    process.exit();
  })
}
function host(){
  let host=pro.createHost(rmtport,rmtaddr);
  host.on("Connect",(code)=>{
    console.log("已连接到服务器，编码是"+code);
  });
  host.on("Failed",()=>{
    console.log("哎唷，连接失败啦！");
    process.exit();
  });
  host.on("Join",(name,skt)=>{
    let gameport;
    if(name=="Messenger"){
      console.log("Messenger joined");
      skt.on("Message",(msg,from)=>{
        if(from=="server"){
          skt.send(msg,19132,"255.255.255.255");
        }else if(from=="local"){
          //描述包
          let s=msg.toString().split(";");
          gameport=parseInt(s[s.length-3]);
          skt.Send(msg);
        }
      });
    }else if(name=="Gamer"){
      //游戏数据
      console.log("Gamer joined");
      skt.on("Message",(msg,from,rinfo)=>{
        if(from=="server"&&gameport){
          skt.send(msg,gameport,rinfo.address);
        }else if(from=="local"){
          skt.Send(msg);
        }
      })
    }else{
      console.log(skt)
      skt.close();
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
  })
}