const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require("dotenv").config();
let request = require('request-promise');
let requestBT = require('request');
let cheerio = require('cheerio');
const cacheMemory = require('memory-cache');
let fs = require("fs");
let path = require('path');
const  { isCloudflareJSChallenge} = require('./common');
const REFERER ="https://toonily.com/";
const listUserAgent = JSON.parse(fs.readFileSync(path.join(__dirname,"./userAgent.json"),'utf-8'));
const USER_ARGENT=process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";
puppeteer.use(StealthPlugin());
const getCookieCloudflare=async(proxy)=>{
    const KEY_CACHE="KEY_CACHE"+proxy;
    const dataCache = cacheMemory.get(KEY_CACHE);
    if(dataCache){
        return dataCache;
    }
    let newProxyUrl ,  browser;
    if(proxy){
        newProxyUrl = await proxyChain.anonymizeProxy(proxy);
        browser = await puppeteer.launch({
            args : ['--no-sandbox', '--disable-setuid-sandbox',`--proxy-server=${newProxyUrl}`]
        });
    }else {
        browser = await puppeteer.launch({
            args : ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    
    const page = await browser.newPage();
    await page.setUserAgent(USER_ARGENT);
    await page.authenticate();
    await page.goto("https://toonily.com/",{
        timeout:45000,
        waitUntil: 'domcontentloaded'
    })
    
    let count = 1;
    let content = await page.content();
    while(isCloudflareJSChallenge(content)){
        response = await page.waitForNavigation({
            timeout: 50000,
            waitUntil: 'domcontentloaded'
        });
        content = await page.content();
        if (count++ === 10) {
          throw new Error('timeout on just a moment');
        }
    }
    const cookies = await page.cookies();
    let result ="";
    for(let cookie of cookies){
        result+= `${cookie.name}=${cookie.value};` ;
    }
    if(newProxyUrl){
        await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
    }
    await browser.close();
    cacheMemory.put(KEY_CACHE,result,1000*60*30);
    return result ;

}
const ListImages = async (url)=>{
    let urlPath ;
    let newUrl ;
    let nameComic,nameChapter;
    const cookie = await getCookieCloudflare();
    console.log(cookie);
    let options = {
        method:"get",
        uri:url,
        headers:{
            Referer:REFERER,
            'User-Agent': USER_ARGENT,
            cookie:cookie
        }
    }
    let data = await request(options);
    let $ = cheerio.load(data);
    let listImage = [];
    $(".reading-content>.page-break>img").each(function(index,element){
        let image= $(this).attr("src")||$(this).attr("data-src").trim() ;
        listImage.push(image);
        console.log(image);
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
    return new Promise(async(resolve,reject)=>{
        let extendFile = urlImages.slice(urlImages.lastIndexOf("."),urlImages.length);
        const cookie = await getCookieCloudflare();
        let options = {
            method:"GET",
            uri:urlImages,
            headers:{
                Referer:REFERER,
                'User-Agent': USER_ARGENT,
                cookie:cookie
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