import mongoose from 'mongoose'




const ServiceCustomizationSchema = new mongoose.Schema({


    serviceId:{
        type:mongoose.Schema.Types.ObjectId ,
        ref:'Service' ,
        required:true
    } ,
    designImages:[{
        type:String ,
        required:true
    
    }]
     ,


     logo:{
        type:String ,
        required:true

     } ,

     colorChoices:[
        {
            type:String ,
            required:true
        }
     
     ] ,

     rapidPrototype:{
        type:Boolean ,
        required:true ,
        default:false

     }
} , {
    collection:'ServiceCustomization' ,
    timestamps:true

})


export default mongoose.model('ServiceCustomization', ServiceCustomizationSchema)