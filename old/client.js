#!/usr/bin/env node
                                                                                                                                                                                                                                                                                                                                                                                                
const pro=require("./protocol.js");
const dgram=require("dgram");
let ipcode=process.argv[2];
if(!ipcode){
  console.log("请输入编码！");
  process.exit();
}
let config;
let mcmsgrport;//信使端口
let mcgameport=0;//游戏端口
const {remoteAddr,remotePort}=config=JSON.parse(require("fs").readFileSync(__dirname+"/config.json","utf8"));
{
  let ip=pro.getWlanIP();
  if(!ip){
    console.log("请先接入局域网！");
    process.exit();
  }else{
    console.log("您的本地IP是"+ip+"\n正在连接中...");
  }
}
//发送游戏数据的

//发送连接包的
const msgr=pro.createClient({
  serverPort:remotePort,
  serverAddr:remoteAddr,
  IPcode:ipcode,
  name:"Messenger"
});
msgr.on("connected",()=>{
  console.log("已连接到房主");
})
msgr.on("Message",(msg,from,rinfo)=>{
  if(from=="server"){
    console.log("data from srv");
    //从服主那里发来的
    let s=msg.toString("binary");
    //示例：6��c��V�o�����������4VxYMCPE;Maddogchx;389;1.14.1;1;8;9636815373020996724;空的超平坦;Creative;1;62476;62477;
    s=s.split(";");
    s[1]="[MCMU]-"+s[1];
    s.splice(-3,2,mcgameport,mcgameport+1);
    /*{
      let pt=parseInt(s.slice(-3,-2)[0]);
      if(mcgameport!=pt){
        console.log(pt)
        mcgameport=pt;
        restartRecv();
      }
    }*/
    s=s.join(";");
    //console.log(s);
    if(mcmsgrport){
      //要是mcmsgrport没声明就闹鬼了，保险起见还是加吧
      //万一真碰上了呢
      msgr.send(Buffer.from(s,"binary"),mcmsgrport,pro.staticWlanIP);
    }
  }else if(pro.isLocalAddr(rinfo.address)){
    //从本地发来的
    msgr.Send(msg);
  }else console.log("useless data from"+JSON.stringify(rinfo));
});
msgr.on("close",()=>{
  console.log("连接失败");
  process.exit();
});
msgr.bind(()=>{
  let info=msgr.address();
  let n=dgram.createSocket("udp4");
  //n.bind(19132,pro.staticRaknet);
  n.bind(6789);
  n.on("message",(msg,rinfo)=>{
    if(rinfo.port!=info.port){
      //本地来的
      console.log(msg.toString());
      n.send(msg,info.port,info.address);
      mcmsgrport=rinfo.port;
    }
  })
});


let gameConnector;
let gmr;
/*function restartRecv(){
  if(gmr)gmr.close();*/
gmr=pro.createClient({
  serverPort:remotePort,
  serverAddr:remoteAddr,
  IPcode:ipcode,
  name:"Gamer"
});
gmr.bind(()=>{
  mcgameport=gmr.address().port;
  /*let te=dgram.createSocket("udp4");
  te.bind(mcgameport+1);
  te.on("message",(msg)=>{
    console.log("MSG!");
  })*/
});
gmr.on("Message",(msg,from,rinfo)=>{
  if(from=="server"&&gameConnector){
    gmr.send(msg,...gameConnector);
  }else if(rinfo==pro.staticWlanIP){
    gameConnector=[rinfo.port,rinfo.address];
    console.log("游戏端口接收到信息！");
    gmr.Send(msg);
  }else console.log(rinfo)
})
//}