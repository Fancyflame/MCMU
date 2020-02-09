                                                                                                                                                                                                                                              
const [
  fs,   net,  Url,  zlib,  os
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "fs","net","url","zlib","os"
);
//const port;
function tp(p){
  return __dirname+"/"+p;
}

function gencfm(){
  let str="";
  while(str.length<16){
    str+=Math.floor(Math.random()*36).toString(36).toUpperCase();
  }
  return str;
}

function createCompress(){
  let input=zlib.createInflate({level:2});
  let output=zlib.createDeflate();
  return {
    In:input,
    Out:output
  }
}

const Pack=obj=>Buffer.from(JSON.stringify(obj)+"\r\n");
const Unpack=buf=>{
  let s=buf.toString();
  if(s=="\r\n"||!s)return null;
  return JSON.parse(s.slice(-2)=="\r\n"?s.slice(0,-2):s);
}
const AutoUnpack=(c,fn)=>{
  let rest;
  let solve=(buf)=>{
    if(rest)buf=Buffer.concat([rest,buf]);
    buf=buf.toString("utf8").split("\r\n");
    rest=Buffer.from(buf.pop());
    buf=buf.map(x=>Unpack(x));
    buf.forEach(function(e){
      if(e==null)return;
      if(e.status){
        c.emit("Error",e.reason);
        fn=()=>{};
      }
      fn.apply(null,arguments);
    });
  }
  c.on("data",solve);
  c.on("close",function(){
    c.off("data",solve);
    c.off("close",arguments.callee);
  })
}
//状态码0成功1失败
const createServer=function(){
  /*
  hostjoin(code)事件
  clientjoin(code)事件
  hostexit(code)事件
  clientexit(code)事件
  */
  let usedIds=new Map();
  let srv=net.createServer((c)=>{
    c.on("error",err=>srv.emit("Error",err));
    AutoUnpack(c,(obj)=>{
      if(obj.method=="create"){
        /*创建房间
        {
          method:create
        }
        */
        const id=Math.random().toString().slice(2,8);
        if(usedIds.has(id)){
          c.end(Pack({
            status:1,
            reason:"Too many hosts"
          }));
          return;
        }
        c.write(Pack({
          status:0,
          code:id
        }));
        usedIds.set(id,c);
        c.on("close",()=>{
          usedIds.delete(id);
          srv.emit("hostexit",id);
        });
        srv.emit("hostjoin",id);
      }
      
      else if(obj.method=="connect"){
        /*
        连接房间
        {
          method:"connect",
          code:<code>,
          name:<mame>
        }
        */
        const {code,name}=obj;
        const s=usedIds.get(code);
        const confirm=gencfm();
        if(!s){
          c.end(Pack({
            status:1,
            reason:"Host not found"
          }));
          return;
        }
        s.write(Pack({
          method:"connect2",
          confirm:confirm,
          name:name
        }));
        //与房主端对接
        srv.on("connection",function(c2){
          //c是玩家，c2是目的连接端
          c2.once("data",(d)=>{
            d=Unpack(d);
            if(d.confirm!=confirm)return;
            //对接完成
            c.write(Pack({
              status:0
            }))
            c2.pipe(c).pipe(c2);
            c2.on("close",()=>{
              srv.emit("clientexit",code);
            });
            srv.emit("clientjoin",code);
            srv.off("connection",arguments.callee);
          })
        });
      }
    })
  });
  return srv;
}

const createHost=function(Port,Addr){
  /*
  code：编码
  Connect(code)事件
  Join(name,skt)：连接请求名字，连接socket
  */
  let c=net.createConnection(Port,Addr,()=>{
    c.write(Pack({
      method:"create"
    }));
    c.state="waiting"
    AutoUnpack(c,(obj)=>{
      if(c.state=="waiting"){
        c.code=obj.code;
        c.state="ready";
        c.emit("Connect",c.code);
      }else if(c.state=="ready"&&obj.method=="connect2"){
        let confirm=obj.confirm;
        let c2=net.createConnection(Port,Addr,()=>{
          //新建一个房主本地连接者
          c2.write(Pack({
            confirm:confirm
          }));
          c2.on("close",()=>{
            c.emit("Exit",obj.name,c2);
          })
          c.emit("Join",obj.name,c2);
        })
      }
    });
  });
  return c;
}

const createClient=function(Port,Addr,IPcode,name){
  /*
  state，
  Connect事件，
  */
  let c=net.createConnection(Port,Addr,()=>{
    c.state="waiting";
    c.write(Pack({
      method:"connect",
      code:IPcode,
      name:name
    }));
    AutoUnpack(c,(obj)=>{
      if(c.state=="waiting"){
        c.state="ready";
        c.emit("Connect");
      }
    });
  });
  return c;
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
//test();
function test(){
  let s=createServer();
  s.listen(9797,()=>{
    let h=createHost(9797,"localhost");
    h.on("Connect",(code)=>{
      console.log("编码"+code);
      let c=createClient(9797,"localhost",code,"tester");
      h.on("Join",(name,skt)=>{
        console.log("I hear you,"+name);
        skt.on("data",(d)=>{
          console.log(d.toString());
        });
        setInterval(()=>{
          skt.write("Hey,dude!");
        },800);
      })
      c.on("Connect",()=>{
        console.log("已连接到服务器");
        setInterval(()=>{
          c.write("Hey there!");
        },1000);
        c.on("data",(d)=>{
          console.log(d.toString())
        })
      });
      c.on("Error",err=>console.log(err))
    })
  })
}