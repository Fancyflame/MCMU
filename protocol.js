                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
const fs=require('fs');
const os=require('os');
const dgram=require('dgram');
const {EventEmitter}=require('events');
let wlan;
let raknetIP;
{
  function test(){
    let q=getWlanIP();
    //if(!q)console.log("请先接入无线局域网！");
    if(q){
      wlan=q;
      raknetIP=q.slice(0,q.lastIndexOf(".")+1)+"255";
    }
  }
  test();
  //if(!wlan)process.exit();
  setInterval(test,5*1000);
}
function tp(p){
  return __dirname+"/"+p;
}
function unpack(buf){
  let s=buf.toString().split(" ");
  //是否为响应头
  let res=/#|\$/.test(s[0][0]);
  let o={
    method:res?s[0].slice(1):s[0],
    success:res?s[0][0]=="#":null,
    params:s.slice(1)
  };
  if(/[^a-z]/.test(o.method)||o.method.length>15)return null;
  return o;
}
function genuuid(){
  let arr=[];
  function g(n){
    let s="";
    while(n>0){
      s+=Math.floor(Math.random()*0x10).toString(16);
      n--;
    }
    arr.push(s);
  }
  g(8);g(4);g(4);g(12);
  return arr.join("-");
}

const createHost=function(Port,Addr){
  /*
    Port:中转服务器端口
    Addr:中转服务器地址
    state:连接状态，为open时方可正常工作
    ready事件:当state为ready时触发
    join(name,callback)事件:有客户端加入时
      触发。name是请求连接的名字或者口令，
      callback函数需要给出一个socket，有没有绑定
      过都无所谓，可以稍后绑定但是一定要绑定。如果
      不愿意连接则直接callback()即可。
    MessengerSocket:
      由join事件callback的参数产生。
      {
        Send(msg):给服务器发送数据
        Message(msg,from,rinfo)事件:msg是数据，from
          为"server"和"local"
      }
    IPcode:IP地址的代码，用于远程联机
    绑定后开始工作"
  */
  let s=dgram.createSocket("udp4");
  let diSymbol;
  s.state="inactive";
  s.on("listening",()=>{
    s.connect(Port,Addr,()=>{
      s.send("open");
      s.state="waiting"
    });
    setInterval(()=>{
      s.send("heartbeat")
    },10*1000)
  });
  s.on("message",(msg,rinfo)=>{
    let o=unpack(msg);
    if(o.method=="heartbeat")return
    else if(s.state=="open"&&o.method=="conn"){
      let [sktname,confirm]=o.params;
      
      //客户端加入事件
      s.emit("join",sktname,(pr)=>{
        if(!pr){
          s.send(`confirm ${confirm} refuse`,Port,Addr);
          return;
        }
        pr.Send=function(msg){
          pr.send(msg,Port,Addr);
        }
        try{
          pr.address();
          pr.Send("confirm "+confirm);
        }catch(err){
          pr.on("listening",()=>{
            pr.Send("confirm "+confirm,Port,Addr);
          });
        }
        pr.on("message",(msg,rinfo)=>{
          let {address:a,port:p}=rinfo;
          if(a==Addr&&p==Port){
            pr.emit("Message",msg,"server",rinfo);
          }else{
            pr.emit("Message",msg,"local",rinfo);
          }
        });
        pr.on("close",()=>{console.log("ouch");pr.Send(diSymbol)})
      });
      
      
    }else if(s.state=="waiting"){
      if(!o.success){
        s.close();
        s.state="closed";
        return;
      }
      s.state="open";
      s.IPcode=o.params[0];
      diSymbol=o.params[1];
      s.emit("ready");
    }
  });
  
  s.Send=s.send;
  
  s.on("close",()=>s.send(diSymbol))
  return s;
}

const createServer=function(){
  /*
  绑定后开始工作
  hostjoin(code)事件:有服主成功连接到服务器,code为服主编码
  clientjoin(code)事件:有客户端成功连接服主,code为服主编码
  hostexit(code)事件
  clientexit事件
  hosts<Map>:所有编码-主机的映射
  */
  let s=dgram.createSocket("udp4");
  let hosts=s.hosts=new Map();
  let mapps=new Map();
  const diSymbol=genuuid();
  s.on("listening",()=>{
    s.setBroadcast(true);
  })
  s.on("message",(msg,rinfo)=>{
    let {port,address}=rinfo;
    let key=[port,address];
    if(msg.toString()==diSymbol){
      let c=key.join(":");
      //看看是不是映射
      if(mapps.has(c)){
        mapps.delete(mapps.get(c));
        mapps.delete(c);
        s.emit("clientexit");
        return;
      }
      //看看是不是服主退出
      {
        let m=hosts.entries();
        for(let o of m){
          if(o[1].join(":")==c){
            hosts.delete(o[0]);
            s.emit("hostexit",o[0]);
            break;
          }
        }
      }
    }
    {
      let m=mapps.get(key.join(":"));
      //console.log([key,mapps.entries()]);
      if(m){
        s.send(msg,...m);
        return;
      }
    }
    let o=unpack(msg);
    if(!o)return;
    switch(o.method){
      case "heartbeat":
        s.send("#heartbeat",...key);
        return;
      case "open":
        let id=Math.random().toString().slice(2,10);
        if(hosts.has(id)){
          s.send("$open",...key);
          return;
        }
        hosts.set(id,key);
        s.send(`#open ${id} ${diSymbol}`,...key,()=>{
          s.emit("hostjoin",id);
        });
        break;
      case "conn":
        let [code,name]=o.params;
        let k=hosts.get(code);
        if(!k){
          s.send("$conn",...key);
          return;
        }
        let confirmCode=genuuid();
        s.send(`conn ${name} ${confirmCode}`,...k);
        s.on("message",function(msg,rinfo){
          let cnctr=[rinfo.port,rinfo.address];
          let obj=unpack(msg);
          if(!obj)return;
          if(obj.method=="confirm"&&obj.params[0]==confirmCode){
            s.off("message",arguments.callee);
            if(obj.params[1]=="refuse"){
              s.send("$conn",...key);
              return;
            }
            //成功连接
            mapps.set(key.join(":"),cnctr);
            mapps.set(cnctr.join(":"),key);
            console.log(key)
            s.send(`#conn ${diSymbol}`,...key);
            s.emit("clientjoin",code);
          }
        })
    }
  });
  return s;
}

const createClient=function(options){
  /*options{
    serverPort,
    serverAddr,
    reuseAddr,指的是本地的
    IPcode,
    name 连接的远程代理人名字
  }
  绑定本地地址后将开始工作
  state:同host，不同的是将open换成了ready
  connected事件:已可以开始发送数据包
  Message(data,from,rinfo)事件:接收到数据包。
    data是数据包内容，from为"server"或者
    "local"，意为从远程发来的或从本地。
    rinfo只有在本地发来的才会有
    接收到的
  */
  let {
    serverPort:srvp,
    serverAddr:srva
  }=options;
  let diSymbol;
  let s=dgram.createSocket({
    type:"udp4",
    reuseAddr:options.reuseAddr
  });
  s.state="inactive";
  
  s.on("listening",()=>{
    s.send(
      `conn ${options.IPcode} ${options.name}`,
      srvp,srva
    );
    s.state="waiting";
  });
  
  s.on("message",(msg,rinfo)=>{
    let o=unpack(msg);
    if(s.state=="waiting"&&o){
      //还在等待服务器连接响应
      if(rinfo.address==srva&&rinfo.port==srvp){
        if(!o.success){
          s.close();
          return;
        }
        diSymbol=o.params[0];
        //已收到#conn，连接成功
        s.state="ready";
        s.emit("connected");
      }
    }else if(s.state=="ready"){
      //已桥接的
      if(rinfo.address==srva&&rinfo.port==srvp){
        s.emit("Message",msg,"server",rinfo);
      }else{
        s.emit("Message",msg,"local",rinfo);
        //s.send(msg,srvp,srva);
      }
    }
  });
  
  s.on("close",()=>{
    if(diSymbol)s.Send(diSymbol);
  })
  
  s.Send=function(msg){
    s.send(msg,srvp,srva);
  }
  
  return s;
}

function getWlanIP(){
  let obj=os.networkInterfaces();
  for(let i in obj){
    for(let o of obj[i]){
      if(o.family!="IPv4")continue;
      if(/^192\.168\./.test(o.address)){
        return o.address;
      }
    }
  }
  return null;
}

//getWlanIP和staticWlanIP区别就在于是不是实时的
//staticWlanIP定期更新
module.exports={
  createHost,createServer,createClient,
  getWlanIP,
  getRaknet:(()=>{
    q=getWlanIP();
    if(!q)return q;
    return q.slice(0,q.lastIndexOf(".")+1)+"255";
  }),
  get staticWlanIP(){return wlan},
  get staticRaknet(){return raknetIP}
};
//Test
//test_();
function test_(){
  let s=createServer();
  s.bind(23456);
  let b=createHost(23456);
  b.bind(17777);
  b.on("join",(n,fn)=>{
    if(n=="Tester"){
      let m=dgram.createSocket("udp4");
      fn(m);
      m.bind(10001);
      m.on("message",(msg)=>{
        m.Send(msg);
      });
    }
  });
  b.on("ready",()=>{
    console.log(b.IPcode);
    let a=createClient({
      serverPort:23456,
      serverAddr:"127.0.0.1",
      IPcode:b.IPcode,
      reuseAddr:true,
      name:"Tester"
    });
    a.bind();
    a.on("connected",()=>{
      console.log("连接完成！");
    });
    a.on("Message",(msg,from)=>{
      console.log((from=="server"?"来自远程：":"来自本地：")+msg);
    });
    {
      let sender=dgram.createSocket("udp4");
      sender.bind();
      setInterval(()=>{
        sender.send("你好啊",10001)
      },1500);
    }
  })
}