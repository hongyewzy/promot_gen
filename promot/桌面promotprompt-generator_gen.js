const fs=require("fs");const path=require("path");const base="D:\桌面\promot\prompt-generator";function w(r,l){fs.mkdirSync(path.join(base,r).split("/").slice(0,-1).join("/"),{recursive:true});fs.writeFileSync(path.join(base,r),l.join("
"));console.log("OK:",r)}
console.log('helper ready')