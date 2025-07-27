import mongoose from 'mongoose'


const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: {
        type:String ,
        required:true
    }
    ,
    /**
     * Process and capabilities of the service
     */

    processType:{
        type:String,
    } ,


    materialsSupported:[
       { type: String}
    ] ,
    surfaceFinishSupported:[
        { type: String }
    ] ,

    coatingToleranceSupported:{
        value: { type: String },
        unit: { type: String }

    }

})


export default mongoose.model('Service', serviceSchema)