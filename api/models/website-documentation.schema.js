import mongoose from "mongoose";

const WebsiteTemplateSchema = new mongoose.Schema({

    documentationFile:{
        type:String ,
        required:true
    } ,


    basicSitePrice:{
        type:Number ,
        required:true 
    } ,

    siteEssentialPrice:{
        type:Number ,
        required:true 
    } ,
    sitePremium:{
        type:Number ,
        required:true
    }

    

})

export default mongoose.model('WebsiteTemplate', WebsiteTemplateSchema)