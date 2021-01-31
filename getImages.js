let request = require('request-promise');
let requestBT = require('request');
let cheerio = require('cheerio');
let fs = require("fs");
let path = require('path');
const REFERER ="https://toonily.com/";
const listUserAgent = JSON.parse(fs.readFileSync(path.join(__dirname,"./userAgent.json"),'utf-8'));
const ListImages = async (url)=>{
    let urlPath ;
    let newUrl ;
    let nameComic,nameChapter;
    let options = {
        method:"get",
        uri:"http://159.69.11.81/get.php?link="+url,
        headers:{
            Referer:REFERER,
            'User-Agent': listUserAgent[Math.floor(Math.random()*listUserAgent.length)]
        }
    }
    let data = await request(options);
    let $ = cheerio.load(data);
    //console.log(data);
    let listImage = [];
    console.log($(".reading-content>.page-break>img ").length)
    $(".reading-content>.page-break>img").each(function(index,element){
        let image= $(this).attr("src")||$(this).attr("data-src").trim() ;
        listImage.push(image);
        // console.log(image);
    })
    if(listImage.length>0){
        if(url[url.length-1]=="/"){
            newUrl = url.slice(0,url.length-1);
        }else {
            newUrl=url ;
        }
         nameChapter = newUrl.slice(newUrl.lastIndexOf("/")+1,newUrl.length);
         newUrl = newUrl.replace("/"+nameChapter,"");
         nameComic = newUrl.slice(newUrl.lastIndexOf("/")+1,newUrl.length);
        urlPath = path.join(__dirname,"public",nameComic,nameChapter);
        if (!fs.existsSync(urlPath)){
            fs.mkdirSync(urlPath,{recursive: true});
        }
        else {
            let listFile = fs.readdirSync(urlPath);
            if(listFile.length>0){
                listFile = listFile.map((item)=>{
                    return `${nameComic}/${nameChapter}/${item}`
                })
                return listFile ;
            }
        }
    }
    if(urlPath){
        let ArrayPromise = listImage.map((item,index)=>{
            return SaveImages(item,urlPath,index,nameComic,nameChapter);
        })
        let resultPromise = await Promise.all(ArrayPromise);
        return resultPromise;
    }

}
const SaveImages = (urlImages,urlPath,index,nameComic,nameChapter)=>{
    return new Promise((resolve,reject)=>{
        let extendFile = urlImages.slice(urlImages.lastIndexOf("."),urlImages.length);
        let options = {
            method:"GET",
            uri:urlImages,
            headers:{
                Referer:REFERER,
                'User-Agent': listUserAgent[Math.floor(Math.random()*listUserAgent.length)]
            }
        }
        //let fileName= new Date().getTime()+"_"+index+extendFile ;
        let fileName= urlImages.slice(urlImages.lastIndexOf("/")+1,urlImages.length);
        let FileUrl = path.join(urlPath,fileName);
        let fileStream = fs.createWriteStream(FileUrl);
        requestBT(options).pipe(fileStream);
        fileStream.on("finish",()=>{
            resolve( `${nameComic}/${nameChapter}/${fileName}`);
        })
        fileStream.on("error",(error)=>{
            reject(error);
        })
    })
    
}
module.exports.ListImages =ListImages ;