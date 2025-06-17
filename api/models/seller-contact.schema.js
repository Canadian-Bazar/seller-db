import mongoose from "mongoose";


const SellerContactSchema = new mongoose.Schema({
    street:{
        type:String ,
        required:true
    } ,
    city:{
        type:String , 
        required:true ,
    } ,
    state:{
        type:String ,
        required:true ,
    } ,

    zip:{
        type:String ,
        required:true ,
    }


} , {collection:'SellerContact' , timestamps:true})

export default mongoose.model('SellerContact' , SellerContactSchema)