let express = require("express");
require("dotenv").config();
let {ListImages} = require('./getImages');
let app = express();
app.use(express.static('public'))
app.get("/",async(req,res)=>{
    try {
        if(!req.query.url){
            return res.send("HELLO");
        }
        let result = await ListImages(req.query.url);
        return res.send(result);
    } catch (error) {
        console.log(error);
        return res.send(error);
    }
})
app.listen(process.env.PORT|4000,function(){
    console.log("App Running On PORT : " +( process.env.PORT||4000 ))
})