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
    }  ,

    billingAddress:{
        type:mongoose.Types.ObjectId,
        ref:'Address'  ,
        required:true ,

    } ,
    orderId:{
        type:String , 
        required:true , 
        index:true
    } ,

    status:{
        type:String ,
        enum :['pending' , 'ready-to-shipped' , 'shipped' , 'transit' , 'out-for-delivery' , 'delivered' , 'transit' , 'cancelled' , 'returned' , 'failed-to-deliver'] ,
        default:'pending'
    } 

   

 


   
})

export default mongoose.model('Orders' , OrderSchema)