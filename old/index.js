#!/usr/bin/env node
let argv=process.argv;
if(argv.length<2){
  console.log(
`需要提供参数
open  :创建一个房间
server:运行转发服务器
join  :使用编号加入房间`);
process.exit(0);
}
const {fork}=require('child_process');
let types={
  open:"host",
  server:"server",
  join:"client"
}
fork(`./${types[argv[1]]}.js`,argv.slice(2));                   