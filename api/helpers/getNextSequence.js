import Counter from '../models/counter.schema.js'

export const getNextSequence = async (name, session) => {
  const updated = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  )
  return updated.seq
}

export const formatInvoiceNumber = (seq, prefix = 'INV') => {
  const year = new Date().getFullYear()
  const padded = String(seq).padStart(6, '0')
  return `${prefix}-${year}-${padded}`
}


