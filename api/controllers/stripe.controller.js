
import httpStatus from 'http-status'
import Stripe from 'stripe'
import buildErrorObject from '../utils/buildErrorObject.js'
import buildResponse from '../utils/buildResponse.js'
import handleError from '../utils/handleError.js'
const stripe = new Stripe(process.env.STRIPE_TEST_KEY)

/**
 * Controller: createPaymentIntentController
 * Description: Creates a payment intent on Stripe and returns the client secret.
 * This function is used to initiate a payment.
 *
 * @param {Object} req - Express request object containing the payment details.
 * @param {Object} res - Express response object used to send the response.
 */
export const createPaymentIntentController = async (req, res) => {
  try {
    const { amount, currencyId, tokens, projectId } = req.body
    if (!amount || !currencyId || !tokens || !projectId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        error: 'MISSING_PAYMENT_DETAILS',
      })
    }
    const userId = await isIDGood(req.user._id)
    let profile = await Users.findById(userId)

    if (!profile?._id) {
      throw buildErrorObject(httpStatus.UNAUTHORIZED, 'INVALID_USER')
    }

    const connectedWallet = await Wallet.find({
      userId: userId,
      isConnected: true,
    })

    if (!connectedWallet) {
      throw buildErrorObject(httpStatus.NOT_FOUND, 'NO CONNECTED WALLET FOUND')
    }

    const currency = await CurrenciesSchema.findById(currencyId).lean()

    const amountInCents = amount * 100

    if (amountInCents < 50) {
      return res.status(httpStatus.BAD_REQUEST).json({
        error: 'AMOUNT MUST BE ATLEAST 50 CENTS',
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.code,
      capture_method: 'automatic',
      payment_method_types: ['card'],
      metadata: {
        currencyId: currencyId,
        projectId: projectId,
        userId: userId,
        amount: amount,
        tokens: tokens,
      },
    })

    res
      .status(httpStatus.OK)
      .json(buildResponse(httpStatus.CREATED, { clientSecret: paymentIntent }))
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Controller: stripeWebhookController
 * Description: Handles events from Stripe webhooks, such as payment_intent.succeeded.
 *
 * @param {Object} req - Express request object containing the raw body and headers.
 * @param {Object} res - Express response object used to send the response.
 */
export const stripeWebhookController = async (req, res) => {
  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res
      .status(httpStatus.BAD_REQUEST)
      .send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object

        const transactionId = paymentIntent.id
        console.log(paymentIntent)

        const { userId, projectId, amount, tokens, currencyId } =
          paymentIntent.metadata
        const connectedWallet = await Wallet.findOne({
          userId: userId,
          isConnected: true,
        })

        if (!connectedWallet) {
          throw buildErrorObject(
            httpStatus.NOT_FOUND,
            'NO CONNECTED WALLET FOUND'
          )
        }
        const project = await Projects.findByIdAndUpdate(projectId, {
          $addToSet: { investors: userId },
          $inc: { investmentRaised: amount }
        })

        const fiat = amount / process.env.FIAT_TOKEN_RATE

        const transaction = await TransactionsSchema.create({
          userId,
          transactionId,
          projectId,
          walletAddress: connectedWallet.walletAddress,
          amount,
          tokens,
          currencyId,
          type: 'acquire',
          status: 'in-progress',
          fiat,
       
        })

        await mintTokens(
          connectedWallet.walletAddress,
          amount,
          project.contractAddress,
          transaction._id
        )

        break
      }
      case 'payment_intent.payment_failed': {
        const failedPaymentIntent = event.data.object
        console.log('Payment Intent failed:', failedPaymentIntent)

        break
      }

    


     
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    res.status(httpStatus.OK).json({ received: true })
  } catch (err) {
    console.error('Error processing Stripe webhook:', err)
    handleError(res, err)
  }
}





export const createFinacialConnectionSession = async(req , res)=>{
  try{

    const user = await Users.findById(req.user._id).select('+fullName +email')
    if(!user){
      throw buildErrorObject(httpStatus.UNAUTHORIZED , 'NO_SUCH_USER_EXISTS')
    }
    const customer = await stripe.customers.create({
      metadata: {
        userId: req.user._id 
      }
    });

    await Users.findOneAndUpdate({_id:req.user._id} , {stripeCustomerId:customer.id} , {upsert:true})
   
   
    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: customer.id 
      },
      permissions: ['payment_method', 'transactions'],
     
    });

     res.status(httpStatus.CREATED).json(buildResponse(httpStatus.CREATED , session.client_secret)) ;

  }catch(err){
    handleError(res , err)
  }
}