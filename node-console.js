
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
const [
  rdl
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "readline"
);
const text={
    'bold'          : ['\x1B[1m',  '\x1B[22m'],
    'italic'        : ['\x1B[3m',  '\x1B[23m'],
    'underline'     : ['\x1B[4m',  '\x1B[24m'],
    'inverse'       : ['\x1B[7m',  '\x1B[27m'],
    'strikethrough' : ['\x1B[9m',  '\x1B[29m'],
    'white'         : ['\x1B[37m', '\x1B[39m'],
    'black'         : ['\x1B[30m', '\x1B[39m'],
    'blue'          : ['\x1B[34m', '\x1B[39m'],
    'cyan'          : ['\x1B[36m', '\x1B[39m'],
    'green'         : ['\x1B[32m', '\x1B[39m'],
    'magenta'       : ['\x1B[35m', '\x1B[39m'],
    'red'           : ['\x1B[31m', '\x1B[39m'],
    'yellow'        : ['\x1B[33m', '\x1B[39m'],
    'whiteBG'       : ['\x1B[47m', '\x1B[49m'],
    'blackBG'       : ['\x1B[40m', '\x1B[49m'],
    'blueBG'        : ['\x1B[44m', '\x1B[49m'],
    'cyanBG'        : ['\x1B[46m', '\x1B[49m'],
    'greenBG'       : ['\x1B[42m', '\x1B[49m'],
    'magentaBG'     : ['\x1B[45m', '\x1B[49m'],
    'redBG'         : ['\x1B[41m', '\x1B[49m'],
    'yellowBG'      : ['\x1B[43m', '\x1B[49m'],
    
    'defaultCL'     : ['\x1B[39m', ''],
    'defaultBG'     : ['\x1B[49m', ''],
    'reset'         : ['\x1B[0m' , '']
};

function style(s){
  let head="";
  s.trim().split(" ").forEach((e)=>{
    if(!e)return;
    try{
      head+=(e[0]=="!"?text[e.slice(1)][1]:text[e][0])||"";
    }catch(err){}
  });
  return head;
}
style.clearLines=function(s){
  if(typeof s=="number"){
    s=isNaN(s)?1:Math.floor(s);
  }else if(typeof s=="string"){
    s=s.match(/\n/g).length+1;
  }
  process.stdout.moveCursor(0,-s);
  process.stdout.cursorTo(0);
  process.stdout.clearScreenDown();
  //process.stdout.moveCursor(1,0);
  /*while(s>0){
    rdl.clearLine(process.)
  }*/
}
style.progress=function(opt){
  let {
    filled,empty,length,joinWith,progress:pro,
    barWord,keepAtLeastOne:kalo
  }=opt;
  barWord=barWord||"";
  filled=filled||barWord;
  empty=empty||barWord;
  let a=Math.floor(pro/1*length);
  if(a>length)a=length;
  else if(a<0)a=0;
  if(a==0&&kalo)a=1;
  let str=Array(a+1).join(filled)+(joinWith||"")+Array(length-a+1).join(empty);
  return str;
}
/*console.log("进度条示例\n示例\n")
let prog=0;
setInterval(()=>{
  prog+=5;
  if(prog>130)prog=0//-Infinity;
  let per=prog/130;
  clearLines(1);
  let str=style("greenBG")+progress("|",".",per,30,style("defaultBG"));
  str="["+str+style("reset")+"] "+(prog/130*100).toFixed(1)+"%\n"+prog+"/"+String(130);
  process.stdout.write(str);
},200)*/
module.exports=style;