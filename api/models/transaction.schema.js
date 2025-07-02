import mongoose from 'mongoose'



const TransactionSchema = new mongoose.Schema({
    quotationId:{
        type:mongoose.Types.ObjectId ,
        ref:'Quotation' ,
        required:true ,
        index:true
    } ,
        buyer:{
            type:mongoose.Types.ObjectId ,
            ref:'Buyer' ,
            required:true  ,
            index:true
    
        } ,
        seller:{
            type:mongoose.Types.ObjectId ,
            ref:'Seller' ,
            required:true,
            index:true ,
    
        } ,
     

        status:{
            type:String ,
            enum:['success' , 'false'] ,
            default:'success'
        } ,


        paymentType:{
        type:mongoose.Types.ObjectId ,
        ref:'PaymentMethod' ,
        required:true
     } 





     
} , {
    timestamps:true ,
    collection:"Transaction"
})

export default mongoose.model('Transaction' , TransactionSchema)