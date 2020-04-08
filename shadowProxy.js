
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
const [
  fs,http,Url
  ]=(function(){
  return [...arguments].map(x=>require(x));
})(
  "fs","http","url"
);
//const port;
function tp(p){
  return __dirname+"/"+p;
}