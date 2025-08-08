import twilio from 'twilio'


const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

const client = twilio(accountSid, authToken)




export const sendTextMessage = async (to, otp , messageBody) => {
    try {
        console.log(accountSid ,authToken, twilioPhoneNumber)
        

        const body= messageBody;
        const message = await client.messages.create({
            body,
            from: twilioPhoneNumber,
            to,
        })
        return message
    } catch (error) {
        console.error('Error sending SMS:', error)
        throw error
    }
}