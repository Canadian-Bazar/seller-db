import mongoose from "mongoose";



const Certifications = new mongoose.Schema({
    name:{
        type:String ,
        required:true
    } ,



   isActive:{
    type:Boolean ,
    default:true
   } ,

   isDeleted:{
    type:Boolean ,
    default:false
   }

} , { timestamps: true  , collection:'Certifications'});

export default mongoose.model('Certifications', Certifications);