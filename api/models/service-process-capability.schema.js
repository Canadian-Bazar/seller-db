import mongoose from 'mongoose'

const SerivesProcessAndCapabilitySchema = new mongoose.Schema({

    processType:{
        type:String ,
        required:true
    } ,

    materialsSupported:[
        {
            type:String ,
            required:true
        }
    ] ,

    surfaceFinishAndCoatings:[
        {
            type:String ,
            required:true
        }
    ] ,


    tolerance:{
        type:Number ,
        required:true
    }



    }




    , {
        collection: 'SerivesProcessAndCapability',
        timestamps: true
    }




)



export default mongoose.model('SerivesProcessAndCapability', SerivesProcessAndCapabilitySchema)