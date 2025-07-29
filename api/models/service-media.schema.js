import mongoose from 'mongoose'

const ServiceMediaSchema = new mongoose.Schema({

    serviceId:{
        type:mongoose.Schema.Types.ObjectId ,
        ref:'Service' ,
        required:true} ,

    images:[
        {
            type:String ,
            required:true
        }
    
    ] ,


    videos:[
        {
            type:String ,
            required:true
        }
    ] ,

    warranty:
        {
            duration:{
                type:Number ,
                required:true
            } ,

            unit:{
                type:String ,
                required:true
            
            } ,
        } ,

        industryCertifications:[
            {
                type:String ,
                required:true
            }
        ] ,

        
    


} , {collection:'ServiceMedia' , timestamps:true})

export default mongoose.model('ServiceMedia', ServiceMediaSchema)