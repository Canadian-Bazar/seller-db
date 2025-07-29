import mongoose from 'mongoose'




const ServiceCustomizationSchema = new mongoose.Schema({
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
        defaultfalse

     }
} , {
    collection:'ServiceCustomization' ,
    timestamps:true

})


export default mongoose.model('ServiceCustomization', ServiceCustomizationSchema)