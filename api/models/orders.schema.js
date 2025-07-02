import mongoose from 'mongoose'

const OrderSchema = new mongoose.Schema({
    quotationId:{
        type:mongoose.Types.ObjectId ,
        ref:'Quotation' ,
        required:true
    } ,

    shippingAddress:{
        type:mongoose.Types.ObjectId,
        ref:'Address'  ,
        required:true ,
    } 


   
})

export default mongoose.model('Orders' , OrderSchema)