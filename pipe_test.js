const [
   dgram
] = (function () {
   return [...arguments].map(x => require(x));
})(
   "dgram"
);
const host = dgram.createSocket("udp4");
//let Rinfo;
host.bind(19131);
host.on("message", (msg,rinfo) => {
   console.log("房主收到：" + msg.toString());
   host.send("I can hear you!", rinfo.port, rinfo.address);
});
const client = dgram.createSocket("udp4");
client.bind(() => {
   client.setBroadcast(true);
   setInterval(() => {
      client.send("Can you hear me?", 19132, "255.255.255.255");
   }, 1000);
   client.on("message", (msg) => {
      console.log("客户端收到：" + msg.toString());
   })
})
