
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
const [
  fs,   net,  Url,  dgram,  os
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "fs","net","url","dgram","os"
);
//const port;
function tp(p){
  return __dirname+"/"+p;
}

function genuuid(){
  let str="";
  while(str.length<16){
    str+=Math.floor(Math.random()*36).toString(36).toUpperCase();
  }
  return str;
}
const Pack=obj=>Buffer.from(JSON.stringify(obj)+"\r\n");
const Unpack=buf=>{
  let s=buf.toString();
  return JSON.parse(s.slice(-2)=="\r\n"?s.slice(0,-2):s);
}
const AutoUnpack=(c,fn)=>{
  let rest;
  c.on("data",(buf)=>{
    if(rest)buf=Buffer.concat(rest,buf);
    buf=buf.toString("utf8").split("\r\n");
    rest=buf.pop();
    buf=buf.map(x=>Unpack(x));
    buf.forEach(fn);
  });
}

/*
格式
{
  method:方法
  status:响应状态，0成功1失败，请求是2
  reason:失败原因
}
用\r\n分割
*/
let wlan;
setInterval(()=>wlan=getWlanIP(),5000);
wlan=getWlanIP();

const createServer=function(){
  /*
  hostjoin(code)事件
  clientjoin(code)事件
  hostexit(code)事件
  clientexit()事件：测试版没有
  */
  let udpPort;
  const udp=dgram.createSocket("udp4");
  udp.bind(()=>{
    udpPort=udp.address().port;
  });
  let usedIds=[];
  const srv=net.createServer((c)=>{
    AutoUnpack(c,(e,i)=>{
        switch(e.method){
          //创建房间
          case "create":
            const id=Math.random().toString().slice(2,8);
            if(usedIds.includes(id)){
              c.end(Pack({
                method:"create",
                status:1,
                reason:"too many users"
              }));
              break;
            }
            usedIds.push(id);
            c.write(Pack({
              method:"create",
              status:0,
              code:id
            }));
            srv.emit("hostjoin",id);
            
            //处理连接请求
            
            function cnct(req){
              //有客户端
              AutoUnpack(req,(e)=>{
                if(e.method!="connect"||e.code!=id)return;
                //req是客户端，c是远程基站
                //验证码
                let confirm=genuuid();
                c.write(Pack({
                  method:"connect2",
                  status:2,
                  name:e.name,
                  confirm:confirm,
                  port:udpPort
                }));
                req.write(Pack({
                  method:"connect",
                  status:0,
                  confirm:confirm,
                  port:udpPort
                }))
                //建立UDP连接
                {
                  let cfm=[];
                  let canMsg=false;
                  function udpCnct(msg,rinfo){
                    let para=[rinfo.port,rinfo.address];
                    if(!canMsg){
                      if(msg.toString()==confirm){
                        cfm.push(para);
                        if(cfm.length==2){
                          canMsg=true;
                          cfm.forEach(e=>udp.send(Buffer.alloc(1),...e));
                          cfm={
                            [cfm[0].join(":")]:cfm[1],
                            [cfm[1].join(":")]:cfm[0]
                          }
                          srv.emit("clientjoin",id);
                        }
                      }
                    }else{
                      let m=cfm[para.join(":")];
                      if(m)udp.send(msg,...m);
                    }
                  }
                  udp.on("message",udpCnct);
                  c.on("close",()=>udp.off("message",udpCnct));
                }
              })
            }
            srv.on("connection",cnct);
            //基站关闭
            c.on("close",()=>{
              usedIds.forEach((e,i)=>{
                if(e==id){
                  usedIds.splice(i,1);
                  srv.emit("hostexit",id);
                }
              });
            });
            break;
          case "connect":
            if(!usedIds.includes(e.code)){
              c.end(Pack({
                method:"connect",
                status:1,
                reason:"host not found"
              }));
            }
            break;
        }
    });
  });
  return srv;
}



const createClient=function(Port,Addr,IPcode,name){
  /*
    udp：Sender对象
    state：
    Failed事件：
    Connect(udp)事件：UDP已连接到主机，然后
      TCP连接就会关闭，但仍可以接收事件
    Message(...)事件：绑定udp的Message事件
  */
  let udp;
  let c=net.createConnection(Port,Addr,()=>{
    c.write(Pack({
      method:"connect",
      status:2,
      code:IPcode,
      name:name
    }));
    AutoUnpack(c,(e)=>{
      switch(c.state){
        case "waiting":
          if(e.status){
            c.emit("Failed");
            return;
          }
          c.udp=udp=createSender(e.port,Addr,e.confirm);
          udp.on("Connect",()=>{
            c.end();
            c.state="ready";
            udp.on("Message",function(){
              c.emit("Message",...arguments);
            })
            c.emit("Connect",udp);
          });
          break;
      }
    })
  });
  c.state="waiting";
  return c;
}



const createHost=function(Port,Addr){
  /*
  state：
  Failed事件：连接失败
  Connect事件：已连接到服务器
  Join事件(name,skt)：name是请求的名字，
    skt是Sender，用于和远程主机通讯
  */
  let code;
  let c=net.createConnection(Port,Addr,()=>{
    c.write(Pack({
      method:"create",
      status:2
    }));
    //获得确认信息
    c.on("data",function(d){
      if(c.state!="waiting")return;
      d=Unpack(d);
      //状态码不是0
      if(d.status){
        c.emit("Failed",d.reason);
        c.end();
        c.state="closed";
        return;
      }
      code=c.code=d.code;
      c.state="ready"
      c.emit("Connect",code);
    });
  });
  
  c.state="waiting";
  
  AutoUnpack(c,(e)=>{
    if(c.state!="ready")return;
    if(e.method=="connect2"){
      //有请求连接
      let sdr=createSender(e.port,Addr,e.confirm);
      sdr.on("Connect",()=>{
        c.emit("Join",e.name,sdr);
      });
    }
  });
  return c;
}


const createSender=function(Port,Addr,confirm){
  /*
  只能由服务器自动创建！！
  Send(msg)：发送给服务器
  Message事件(msg,from,rinfo)：from分为server，
    local和native，分别是从服务器发来的，从
    本地主机发来的和从其它主机发来的
  Connect事件：已经可以发送数据了
  */
  const s=dgram.createSocket("udp4");
  const reminfo=[Port,Addr];
  s.state="inactive";
  s.Send=(msg,lis)=>s.send(msg,...reminfo,lis);
  s.on("message",(msg,rinfo)=>{
    if(s.state!="ready")return;
    let {port,address}=rinfo;
    if(port==Port,address==Addr){
      s.emit("Message",msg,"server",rinfo);
    }else if(address==wlan||address=="127.0.0.1"){
      s.emit("Message",msg,"local",rinfo);
    }else{
      s.emit("Message",msg,"native",rinfo);
    }
  });
  s.bind(()=>{
    s.Send(confirm,()=>{
      s.state="waiting"
    });
  });
  s.once("message",()=>{
    s.state="ready";
    s.emit("Connect");
  })
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

module.exports={
  createServer,
  createHost,
  createClient,
  getWlanIP
}
//test()
function test(){
  let srv=createServer().listen(7771);
  let host=createHost(7771,"127.0.0.1");
  host.on("Connect",(code)=>{
    console.log("编码："+code);
    let cli=createClient(7771,"127.0.0.1",code,"扒拉垫");
    cli.on("Connect",(udp)=>{
      console.log("已连接");
      udp.on("Message",(msg,from,rinfo)=>{
        console.log([msg,from,rinfo])
      })
    });
  });
  host.on("Join",(name,skt)=>{
    setInterval(()=>{
      skt.Send("yoohoo")
    },1000);
  })
}