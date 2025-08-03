import mongoose from "mongoose";


const WebsiteQuotationSchema = new mongoose.Schema({


    seller:{
        type:mongoose.Types.ObjectId ,
        ref:'Seller' ,
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

    referenceWebTemplates:[
        {
            type:mongoose.Types.ObjectId ,
            ref:'WebsiteTemplate'

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