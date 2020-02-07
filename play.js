
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
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

let explain=[28,0,0,0,0,0,21,54,138,146,99,236,202,86,221,111,148,0,255,255,0,254,254,254,254,253,253,253,253,18,52,86,120,0,89,77,67,80,69,59,77,97,100,100,111,103,99,104,120,59,51,56,57,59,49,46,49,52,46,49,59,49,59,56,59,57,54,51,54,56,49,53,51,55,51,48,50,48,57,57,54,55,50,52,59,231,169,186,231,154,132,232,182,133,229,185,179,229,157,166,59,67,114,101,97,116,105,118,101,59,49,59,54,50,52,55,53,59,54,50,52,55,54,59];                        
pro.createServer().listen(7777);
{
  let host=pro.createHost(7777,"127.0.0.1");
  host.on("Connect",(code)=>{
    console.log("编码："+code);
  });
  host.on("Join",(name,skt)=>{
    if(name=="Messenger"){
      /*skt.on("Message",(msg,from)=>{
        if(from=="server")
          skt.Send(Buffer.from(explain));
      });*/
      setInterval(()=>{
        skt.Send(Buffer.from(explain));
      },1000);
    }else{
      skt.close();
    }
  });
  host.on("Connect",(code)=>{
    let cli=pro.createClient(7777,"127.0.0.1",code,"Messenger");
    let lir=dgram.createSocket("udp4");
    let mcgameport;
    let rcvr=dgram.createSocket("udp4");
    rcvr.bind(()=>{
      mcgameport=rcvr.address().port;
    });
    rcvr.on("message",(msg)=>{
      console.log("接收到信号：");
    });
    let msgrinfo;
    cli.on("Connect",(udp)=>{
      lir.bind(19132,()=>{
        lir.on("message",(msg,rinfo)=>{
          console.log(msg.toString())
          if(isLocal(rinfo.address)){
            msgrinfo=[rinfo.port,rinfo.address];
            udp.Send(msg);
          }
        });
        udp.on("Message",(msg,from)=>{
          if(from=="server"&&msgrinfo){
            let s=msg.toString("binary");
            //示例：6��c��V�o�����������4VxYMCPE;Maddogchx;389;1.14.1;1;8;9636815373020996724;空的超平坦;Creative;1;62475;62476;
            s=s.split(";");
            s[1]="MCMU_"+s[1];
            s.splice(-3,2,mcgameport,mcgameport+1);
            s=s.join(";");
            console.log([s,rcvr.address().port])
            lir.send(Buffer.from(s,"binary"),...msgrinfo);
          }
        })
      })
    })
  })
}