import  mongoose from 'mongoose'


const SellerSignupProgressSchema = new mongoose.Schema({

    seller:{
        type :mongoose.Types.ObjectId,
        ref:'Seller'  ,
        index:true ,
        unique:true

    } ,
    stepName:{
        type:String ,
        required:true ,
        enum:['company' , 'contact']
    } ,

    stepNumber:{
        type:Number ,
        required:true ,
        default:1
    } ,
    isComplete:{
        type:Boolean ,
        required:true ,
        default:false
    }


} , {collection:'SellerSignupprogress' , timestamps:true})


export default mongoose.model('SellerSignupProgress' , SellerSignupProgressSchema)