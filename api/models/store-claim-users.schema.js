import mongoose from "mongoose";



const StoreClaimUsers = new mongoose.Schema({
    companyName:{
        type:String, 
        required:true
    } ,

    email:{
        type:String, 
        required:true ,
        unique:true ,
        index:true
    } ,

    phoneNumber:{
        type:String, 
        required:true ,
        unique:true ,
        index:true

    }

    ,
    street:{
        type:String, 
        required:true
    } ,

    city:{
        type:String, 
        required:true
    } ,

    province:{
        type:String, 
        required:true
    } ,

    postalCode:{
        type:String, 
        required:true
    
    } ,

    isClaimed:{
        type:Boolean, 
        default:false

    }
} , {
    collection:"StoreClaimUsers" ,
    timestamps:true
})



export default mongoose.model("StoreClaimUsers" , StoreClaimUsers)