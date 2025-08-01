import mongoose from "mongoose";


const WebsiteQuotationSchema = new mongoose.Schema({


    seller:{
        type:mongoose.Types.ObjectId ,
        ref:'Sellers' ,
        required:true

    } ,
    category:{
        type:mongoose.Types.ObjectId ,
        ref:'Category' ,
        required:true
    
    } ,

    itemsSold:{
        type:String , 
        required:true ,
        enum :['service' , 'product' , 'both'] ,
        required:true
    
    } ,

    websiteUrl:{
        type:String ,
        } ,


    domainName:{
        type:String ,
        required:true
    } ,

    referenceurl:{
        type:String
    } ,

    refernceWeburls:[
        {
            type:String
        }
    
    ] ,

    additionalDetails:{
        type:String ,
    }






} , 

{
    timestamps:true ,
    collection:'WebsiteQuotation'
}
)



export default mongoose.model('WebsiteQuotation' , WebsiteQuotationSchema)